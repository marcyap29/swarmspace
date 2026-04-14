# SwarmSpace — Active Plan
*Last cleared: April 13, 2026*

---

## Current: 3.1 Developer Submission Portal

### Phase 1: Harden Validation & Form Alignment — COMPLETE
- [x] 1.1 SSRF protection in validatePluginSubmission (isPrivateUrl, redirect:error, 5s timeout)
- [x] 1.2 Harden endpoint check (HTTPS blocking, response shape, 5xx blocking)
- [x] 1.3 Duplicate detection (same endpoint_url or name in pending/approved)
- [x] 1.4 Add missing PluginConfig fields to submit form (access_tier, capabilities, example_query, version, rate_limits)
- [x] 1.5 Extend schema validation for new fields

### Phase 2: Promotion Pipeline & Developer Experience — COMPLETE
- [x] 2.1 onSubmissionStatusChange trigger (approved → write to approved_plugins)
- [x] 2.2 Wire approved_plugins into swarmspaceRouter (TTL cache merge)
- [x] 2.3 Resubmission flow (pre-fill form, new doc, resubmission_of reference)
- [x] 2.4 Developer status dashboard (onSnapshot, timeline, review notes)
- [x] 2.5 Handle revocation (approved→rejected deletes from approved_plugins)

### Phase 3: Notifications & Monitoring — DEFERRED (future)
- [ ] 3.1 Email notification on status change (firestore-send-email extension)
- [ ] 3.2 Admin notification on new submission
- [ ] 3.3 Periodic plugin health check (scheduled function, daily)
- [ ] 3.4 Extract shared validation utilities

### Review: Pending (review agent running)
