# FOR_MARC — News Briefing Manual Refresh

How we added a "refresh now" endpoint to a Durable Object that already runs on a daily/weekly alarm — without breaking the alarm and without letting a tap-happy user hammer the orchestrator.

---

## Step 1 — Approach and reasoning

You reported a UX bug: when a user "follows" a news topic in LUMARA, the brief on that topic never visibly updates. Tapping in shows the same content from days ago.

The first instinct is "add a refresh button." That instinct is wrong on its own, because in this system the *button* is the easy half. The hard half is that there's no server-side path that does what a refresh button *implies*.

Here's the architecture you have. When a user follows a topic, LUMARA calls a Cloudflare Worker that spawns a **Durable Object** — a per-subscription tiny server that lives forever, has its own storage, and wakes itself up on a timer. That DO calls the orchestrator's `/news-brief` route, diffs the new articles against last time, stores the delta, and goes back to sleep. The diff is what LUMARA shows.

The DO has a public `GET /latest` route. That's all LUMARA ever called. But `GET /latest` *only reads stored state* — it doesn't trigger a new fetch. So even if LUMARA had a refresh button calling `/latest`, the user would just see the same delta until the alarm fired in 24 hours.

So the fix had to be a brand-new route on the DO that says "fire the alarm logic now, then give me back the delta." That's what `POST /run-now` does. Then LUMARA can wire a refresh button to that route, and now the button means something.

Why not just have LUMARA call the orchestrator directly? Because the DO owns the *state* — the previous run, the diff math, the cancellation flag, the topics, the cadence. If LUMARA called the orchestrator out-of-band, the next scheduled alarm would compute the wrong delta (newly-seen articles would still count as "new" because the DO hadn't recorded them). The single source of truth has to stay inside the DO. So we expose a route on the DO that triggers its own internal logic.

---

## Step 2 — Roads not taken

**Option A: "Just lower the cadence to 1 hour."** Tempting, lazy, wrong. It hammers the orchestrator for every subscriber whether or not they're looking, costs Gemini credits, and still gives a worse experience than on-demand. Wall-clock cadences are for *background freshness*, not user-initiated refresh.

**Option B: "Have LUMARA call the orchestrator's `/news-brief` route directly with the saved topic, bypassing the DO."** This is the "two paths" trap. You'd have one path through the DO (scheduled) and one through LUMARA (on-demand), each maintaining its own idea of "previous articles." The diff would be wrong on whichever side didn't see the other side's run. Two writers, one truth — a classic concurrency bug. Avoid.

**Option C: "Add a route that resets the alarm to fire immediately, then let the alarm do its thing."** Cute, but Cloudflare alarms fire asynchronously and the caller has no way to wait for completion. The user would tap refresh and get a "we'll get to it" response, with the actual data showing up an unknown amount of time later. Bad UX. We needed a synchronous call: tap, wait, see new data.

**Option D: "Skip the rate limit, trust the user."** No. The 60-second cooldown isn't about distrusting the user — it's about Gemini costing money. A single accidental double-tap is fine; a user mashing refresh because they're impatient could rack up an unbounded number of orchestrator calls in seconds. The rate limit costs you nothing and removes a tail risk.

**Option E: "Reset the scheduled alarm when run-now fires."** This sounds clean — "if you just refreshed, you don't need the scheduled one for another 24h." But it leaks user behavior into background timing. If you refresh once at 3pm, your "morning brief" would now arrive at 3am the next day. The schedule is the user's *cadence preference*. Manual refresh is a one-off. They shouldn't interact. So `run-now` deliberately does NOT touch the alarm clock.

---

## Step 3 — How the pieces connect

The DO worker has two halves: a **Worker fetch handler** (the HTTP front door, runs in any region) and the **Durable Object class** (the stateful actor, pinned to one location). The HTTP front door authenticates the request, looks up which DO to talk to, and forwards via a stub. The DO does the actual work.

For `/run-now` the flow is:

1. HTTP front door: Firebase ID token → extract uid. Parse `{do_id}` from URL path.
2. Front door gets a stub for that DO and forwards `POST /run-now` with `X-User-Uid` header.
3. DO checks: does `X-User-Uid` match the stored `owner_uid`? If not → 403.
4. DO checks: was this subscription cancelled? → 410.
5. DO checks: did we run a manual refresh in the last 60 seconds? → 429 with `Retry-After`.
6. DO calls `runOnce("manual")` — the same private method the scheduled alarm calls. It fetches `/news-brief`, computes the delta against `previous_output_json`, stores everything.
7. DO writes `last_manual_run_at = now`.
8. DO reads back `latest_delta_json` + `last_run_at` and returns them in the response.

The `runOnce` extraction is the load-bearing decision. Before this change, all that logic lived inline inside `alarm()`. Extracting it into a private method meant the manual path and the scheduled path share *exactly one implementation* of "what does a run mean." No drift possible. The only difference between the two callers is the alarm path also calls `scheduleNext(cadence)` after.

---

## Step 4 — Tools, methods, and frameworks

**Durable Objects** for state. Each subscription gets its own DO instance with its own SQLite storage. This is the right tool because each subscription has independent state (different topics, different owners, different last-run time), and DOs let you co-locate the state with the code that mutates it. No race conditions across requests for the same subscription — Cloudflare guarantees serial execution within one DO.

**Cloudflare alarms** for the recurring timer. `this.ctx.storage.setAlarm(timestamp)` and the runtime calls your `alarm()` method at that wall-clock time. Cheaper and simpler than cron. The alarm survives DO eviction — Cloudflare wakes the DO back up to fire it.

**`X-User-Uid` for ownership in the DO.** The Firebase token verification happens in the HTTP front door (which has access to the Firebase API key). The DO trusts the front door and uses the forwarded uid header. This keeps Firebase auth code out of the DO and lets the DO focus on ownership comparison, not authentication.

**Manual rate limiting via stored timestamp.** No Redis, no KV namespace, no clever sliding window — just store `last_manual_run_at` in the DO's own SQLite, compare to `Date.now()`. 60-second cooldown, end of story. Cheap and correct. Solving simple problems with simple tools is usually the right move.

---

## Step 5 — Tradeoffs

**60-second cooldown vs. instant feedback.** A user who actually wants the fresh data within seconds is annoyed. But the alternative — no cooldown — is unbounded cost exposure. The cooldown is reported via `429 Retry-After` so LUMARA can show "Try again in 47 seconds" instead of a generic error. That's the right asymmetry: rare frustration, never unbounded cost.

**Manual run does NOT shift the schedule.** Pro: user behavior doesn't leak into background timing. Con: a user who refreshes 30 seconds before their scheduled brief fires might see the same content twice. Acceptable — the scheduled run is cheap (one extra Gemini call) and the delta will correctly be empty.

**Sharing `runOnce` between alarm and manual.** Pro: one truth. Con: if we ever need them to behave differently (e.g., manual runs should skip the delta and always return full content), we'd need a branch on `trigger`. The `trigger` parameter exists today but is unused — a deliberate seam for a future feature, kept clean by being a single typed string.

**No queueing.** If the orchestrator is down, `run-now` returns 502 immediately. We don't queue the request for later retry. Reason: the user is *standing there with their thumb on the screen*. A queued retry that succeeds an hour later is worse than an instant honest failure that lets them try again. Background alarms can afford to be more forgiving; foreground requests can't.

---

## Step 6 — Mistakes, dead ends, and wrong turns

The first instinct on reading the code was "just call `this.alarm()` from the new handler." That's actually wrong in subtle ways: `alarm()` reschedules the next alarm at the end, which would shift the user's daily schedule. It also doesn't return the data — the manual handler still has to read storage after. So even though `alarm()` *does the right work*, it does *extra work* and *returns nothing useful*.

That's what pushed the refactor: pull the actual work out of `alarm()` into `runOnce`. `alarm()` becomes "call `runOnce` then reschedule." `handleRunNow` becomes "permission check → call `runOnce` → return latest delta." Each caller adds the wrapping behavior it needs. The shared part is the *only* part that talks to the orchestrator and storage.

Another easy mistake: forgetting that `alarm()` has its own "is this cancelled?" guard. If we'd called `runOnce` unconditionally, a cancelled subscription would still hit the orchestrator on manual refresh. The check moved to the top of `handleRunNow` explicitly so the manual path is just as defensive as the scheduled path.

---

## Step 7 — Pitfalls to watch for

**Don't reset the alarm in `run-now`.** It's tempting to say "they just refreshed, save them a duplicate run later." Don't. Cadence is a *user preference*, not a debouncing heuristic.

**Don't trust the client-provided uid.** The `X-User-Uid` header is set by *our* HTTP front door, after Firebase token verification. If a future change ever lets external traffic into the DO without going through the front door, you'd need to re-add the token verification inside the DO. Document this expectation if you ever expose the DO directly.

**60-second cooldown is per-DO, not per-user.** A user with two subscriptions can refresh both every 60s simultaneously. That's intentional. If you ever need a global per-user cap, that lives in a different layer.

**Don't return cached delta from a failed run.** Today, if the orchestrator returns 502, we return 502 and the previous delta stays untouched. Don't be tempted to "soft-succeed" by returning the cached delta with a warning — the user just tapped refresh; returning the same data with a 200 is a lie.

**Wrangler version mismatch warnings are noise.** The DO worker is on Wrangler 3, repo has 4 available. The dry-run still passes. Don't upgrade in this PR — that's its own scope.

---

## Step 8 — What an expert notices

The thing that separates this fix from a sloppy version is **two callers, one truth**. A junior would copy-paste the alarm body into the manual handler and ship it. It would work today, drift apart in three months when one path gets a tweak and the other doesn't, and become a bug-finder's puzzle next year. Pulling `runOnce` out is the smallest possible refactor that makes drift impossible.

The other expert move is the *deliberate non-changes*. We didn't touch `alarm()`'s scheduling. We didn't reset the rate-limit clock on cancellation. We didn't add retry. We didn't add logging beyond what was already there. Every "didn't" is a decision someone has to defend later, and the defense is always cheaper if you state the reason in code review than if you discover the assumption was wrong at 2am.

A senior also notices that the response shape (`{latest_delta, last_run_at, cadence}`) matches `GET /latest` exactly — so on the LUMARA side, the same parsing code handles both responses. That's not an accident. Symmetric APIs let you share client code.

---

## Step 9 — Transferable lessons

**Cron-style background jobs almost always need a manual-trigger sibling.** If your system has *any* "we'll get to it eventually" path — alarms, queues, schedulers — there's a user somewhere who wants it *now*. Plan for that endpoint from day one. It's much cheaper to design with than to bolt on.

**Pull shared work into one function; let callers add wrapping behavior.** This is the Liskov-substitution principle from the other direction: instead of one type for many uses, one *implementation* for many callers, each calling site adding only what's unique to it. Works for cron + manual, for sync + async, for cached + uncached.

**Costly operations need a foreground story.** Anything that costs money (LLM tokens, paid API calls) needs *both* an answer for "the user is staring at the screen" and "we're catching up in the background." They're different operating modes with different tradeoffs. Rate limit the foreground tightly; let the background batch.

**Cross-repo features split server/client cleanly.** The DO endpoint is one deliverable, in one repo, that can ship without LUMARA. The LUMARA UI is a separate deliverable. Tightly coupled cross-repo features turn into multi-day choreography sessions. Designed split, with a written spec in a shared file (`Coordinate_SS.md`), the two halves can land independently and merge in time.

That last one is worth internalizing for the broader SwarmSpace ↔ LUMARA dance. Always write the server side as if the client doesn't exist yet, and always write a spec the client can implement without re-deriving your design.
