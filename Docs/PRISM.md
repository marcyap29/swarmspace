# PRISM

Technical reference for **PRISM**, the privacy and context-minimization system used across **LUMARA** and **SwarmSpace**. **PRISM** is a proper noun; this document does not expand it as an acronym.

**Audience:** Developers building SwarmSpace plugins and security-conscious users evaluating the platform.

**Related:** Manifest field definitions and submission rules — [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md).

---

## 1. What PRISM Is

PRISM is the **privacy architecture** that governs how user data flows through SwarmSpace and LUMARA.

**Core principle:** Plugins receive the **minimum necessary context** to perform their function. Enforcement is **structural** wherever possible: the system is designed so that undeclared data paths are **not available** to plugin code, not merely disallowed by policy.

Three enforcement boundaries work together:

| Boundary | Role |
|----------|------|
| **Manifest declaration** | The plugin declares required context in **`privacy_data_required`** (see developer guide). That list is the contract for what may ever enter the call. |
| **Sandbox enforcement** | A **Cloudflare Dynamic Worker** V8 **isolate** runs the invocation. Only the declared subset is injected into the **`context`** parameter the plugin receives. |
| **Network control** | **`globalOutbound: null`** (default posture) blocks all outbound network access **except** hostnames allowlisted in **`network_domains`** on the manifest. |

**Structural vs policy:**  
- **Structural:** Context shape, sandbox APIs, outbound fetch allowlists, credential injection at the network layer.  
- **Policy / contract:** Safety review, Developer Agreement terms, runtime anomaly review, and third-party API compliance are **not** replaced by PRISM; they **complement** it.

---

## 2. Context minimization

When LUMARA invokes a SwarmSpace plugin, the **full** user context (e.g. CHRONICLE profile, journal-derived material, behavioral signals) is **not** passed wholesale to the plugin.

**Flow:**

1. LUMARA reads **`privacy_data_required`** from the plugin manifest (or catalogue entry derived from it).
2. LUMARA **extracts only** those fields from the user context it holds locally.
3. That **subset** is sent to SwarmSpace as part of the invocation.
4. The **Dynamic Worker** sandbox receives **only** that subset in its **`context`** argument.
5. Plugin code has **no supported mechanism** to request additional CHRONICLE fields mid-flight; undeclared channels are outside the exposed API.

This is **structural minimization** at the protocol and sandbox boundary: omitted data is not present in the request object the plugin can read, not merely “disallowed” by a comment in documentation.

### Examples: what the plugin receives

**Weather plugin** — declares location only:

```json
{
  "query": "What's the weather like this afternoon?",
  "context": {
    "location": "San Diego, CA"
  },
  "metadata": {
    "caller": "lumara",
    "request_id": "7b2c9f1a-4e8d-4b3c-9f01-123456789abc",
    "tier": "free"
  }
}
```

It does **not** receive the user’s name, journal text, full CHRONICLE graph, or other undeclared fields. Those values are never attached to this call at the client minimization step and are not injected by the worker.

**Research plugin** — declares no personal context:

Manifest: `privacy_data_required: ["none"]`

```json
{
  "query": "Summarize recent papers on transformer scaling laws",
  "context": {},
  "metadata": {
    "caller": "lumara",
    "request_id": "9d0e5a33-1111-2222-3333-444455556666",
    "tier": "free"
  }
}
```

**Policy note:** If the user **opts in** to broader sharing via client settings, LUMARA may still send **more** than the manifest minimum when the product explicitly allows that override. That behavior is **product policy**, not a bypass of PRISM’s default minimization path.

---

## 3. Sandbox enforcement (Dynamic Workers)

Each plugin call is executed inside a **Cloudflare Dynamic Worker** V8 **isolate** (see Cloudflare’s documentation for isolate lifecycle and limits; this section states **how PRISM uses** that model, not the full platform spec).

### Isolation

- Each invocation runs in its **own** isolate (or equivalent scoped execution unit).  
- **No shared mutable state** between concurrent calls or between different plugins unless explicitly provided by the platform (not by arbitrary plugin code).  
- Typical startup and memory characteristics are **short-lived** and **bounded** (milliseconds, megabyte-scale); exact limits are platform-defined.

### API boundary

- Only platform-**declared** bindings and APIs are exposed inside the isolate.  
- The plugin **cannot** import arbitrary Node modules, open raw sockets, or reach internal SwarmSpace services that are not part of the published worker surface.  
- Undeclared capabilities are **unavailable**, not merely forbidden by terms.

### Network control

- Default: **`globalOutbound: null`** — no general internet.  
- Outbound HTTP(S) is permitted **only** to origins whose hostnames appear in the manifest **`network_domains`** array.  
- Example: `network_domains: ["api.weather.example"]` means fetches to that host can be routed; fetches to other hosts are **blocked at the platform layer**, not caught only by review.

### Credential injection

- SwarmSpace (or the integration layer) holds secrets for third-party APIs.  
- Plugin code issues a normal **`fetch`** (or equivalent); the **sandbox / edge layer** attaches authorization (e.g. headers) at the **network boundary**.  
- The **raw secret is not exposed** to plugin bytecode in a way it can log or return. (Operational logging of headers must itself be constrained; this is **platform responsibility**.)

### Runtime monitoring

- Executions are **observable**: outbound targets, volume, latency, and response shapes can be compared to **declared** behavior.  
- Anomalies (calls to undeclared patterns, abnormal egress, inconsistent outputs) feed **logging and human or automated review**.  
- Monitoring is **operational enforcement** and **policy follow-up**, not a substitute for structural blocks where those blocks exist.

---

## 4. PRISM for recurring agents (Durable Objects)

Some **recurring** or **scheduled** agent flows run on **Cloudflare Durable Objects** (DO). PRISM constraints apply to **what may be stored** in the DO versus **what is fetched fresh** each run.

**Stored in the Durable Object (working state only):**

- Last-run **output snapshot** (for deltas / comparison).  
- **Schedule** configuration and alarm / trigger metadata.  
- **Run history** metadata needed to operate the schedule (not a full copy of user life data).

**Not stored in the Durable Object:**

- Full **personal context**, CHRONICLE payloads, behavioral models, **journal entries**, or other rich user state.

**On each scheduled execution:**

1. The DO requests **fresh** context from LUMARA (or the authorized client path) **at run time**.  
2. Context is injected into that **workflow run**, used for synthesis, then **discarded** from persistence in the DO.  
3. The DO may persist **only** its own **synthesized output** for the next comparison cycle.

**Principle:** Personal context exists **only for the duration** of that execution path inside the controlled pipeline; it is **not** durably held in the DO as a user profile cache.

Full Durable Objects semantics (consistency, storage accounting, regional placement) are defined by **Cloudflare**; PRISM defines **what classes of data** the product stores there.

---

## 5. PRISM for catalogue discovery

When LUMARA calls SwarmSpace’s proactive discovery surface (e.g. **`/catalogue/updates`** — exact deployment path may be prefixed by environment):

1. **Interest tags** are derived **on the client** from CHRONICLE (and related local signals).  
2. SwarmSpace receives **tag identifiers or hashes**, not raw CHRONICLE documents.  
3. With only hashed or opaque tags, SwarmSpace **cannot reconstruct** the user’s full profile from that request alone.  
4. The service returns candidate plugins by **tag overlap** and **merit** (and similar ranking signals).  
5. LUMARA performs **additional relevance filtering** using full local context **before** surfacing goal cards or auto-suggestions.

**Structural property:** The wire format for discovery is designed to **default** to **non-reversible** or **minimal** disclosure relative to raw memory.  
**Policy / product:** Exact hash construction, rotation, and tag taxonomy remain **implementation details** and may evolve; developers should not rely on a specific hash algorithm in client code without a published contract.

---

## 6. What PRISM does not do

Precision about **scope** avoids overstating guarantees.

| Topic | Reality |
|--------|---------|
| **Transport encryption** | PRISM does **not** replace **TLS**. User ↔ app ↔ SwarmSpace traffic relies on **HTTPS** as usual. |
| **End-to-end encryption of stored data** | PRISM is **not** an E2EE store for CHRONICLE or server-side blobs. Server-side encryption and E2EE are **separate** roadmap and architecture concerns. |
| **User overrides** | PRISM does **not** stop a user from **voluntarily** sharing **more** context when the product offers that control. Minimization is the **default**, not an absolute against user intent. |
| **Third-party endpoints** | PRISM does **not** audit how **external** APIs (declared in `network_domains`) handle data after the request leaves SwarmSpace. **Developer Agreement** and vendor terms address that **contractually**. |
| **Indirect prompt injection** | Content **returned** from the open web (or other untrusted sources) fetched **at runtime** can still influence model behavior. **Runtime monitoring**, review, and agreements **mitigate** abuse; **residual risk** remains an industry-wide problem, not fully “solved” by PRISM alone. |

---

## 7. Developer obligations

Developers publishing SwarmSpace plugins must:

1. **Declare `privacy_data_required` honestly** — request only fields the implementation **actually** uses. Over-declaration is a **safety-review** failure.  
2. **Declare `network_domains` completely** — any hostname contacted during normal operation must appear; undeclared egress is **blocked** structurally where the sandbox applies.  
3. **Avoid exfiltration side channels** — e.g. encoding user data into URLs or bodies to **declared** domains in ways that violate policy. **Runtime monitoring** targets such patterns.  
4. **Comply with the Developer Agreement** — including third-party API ToS and data handling clauses.  
5. **Not retain user context** beyond the API call unless **explicitly** declared, user-authorized where required, and **approved** through product/review processes.

Violations can result in **rejection**, **delisting**, or **account** action regardless of technical minimization.

---

## Implementation review

| Requirement | How it was addressed |
|-------------|----------------------|
| **Layers of enforcement** | Manifest → client minimization → Dynamic Worker isolate → network allowlist → credential injection → monitoring; DO and catalogue paths called out separately. |
| **Structural vs policy** | Called out explicitly in §1, §2 override note, §3 monitoring paragraph, §5, §6 table, §7. |
| **Examples** | JSON request bodies for `["location"]` and `["none"]`. |
| **Non-goals** | §6 lists transport, E2EE, user override, third-party handling, prompt injection residual risk without marketing language. |
| **Cloudflare** | Dynamic Workers and Durable Objects named; detailed platform specs deferred to Cloudflare docs. |
| **Path** | Document lives at **`Docs/PRISM.md`** (repository convention). If your deployment requires lowercase `docs/`, add a redirect or symlink in your publishing pipeline; links from [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) target `Docs/PRISM.md`. |
