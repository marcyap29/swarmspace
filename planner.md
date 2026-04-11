# SwarmSpace — Active Plan: Submission Portal + AST10 Compliance Page
*Started: April 11, 2026*

---

## Workstream A: Developer Submission Portal Enhancement

### Phase 1 — Backend validation function
- [ ] A1.1: Create `validatePluginSubmission.ts` (schema validation, endpoint reachability, latency check)
- [ ] A1.2: Register in `index.ts`, update integration doc
- [ ] A1.3: Update Firestore rules for `automated_checks` field

### Phase 2 — Frontend integration
- [ ] A2.1: Update `submit-plugin.html` to call validation function before Firestore write
- [ ] A2.2: Replace client-side endpoint check with server-side results
- [ ] A2.3: Add validation loading state with progressive results
- [ ] A2.4: Store `automated_checks` in submission document

### Phase 3 — Admin enhancements
- [ ] A3.1: Display `automated_checks` in admin-submissions.html detail view
- [ ] A3.2: Visual indicators (green/red/amber) for check results
- [ ] A3.3: "Re-run checks" button per submission

## Workstream B: AST10 Compliance Page

### Phase 1 — Page build
- [ ] B1.1: Create `ast10.html` from security.html template + OWASP_AST10_COMPLIANCE.md content

### Phase 2 — Integration
- [ ] B2.1: Add nav links (security.html, index.html footer)
- [ ] B2.2: Check vercel.json for routing
- [ ] B2.3: Update Docs/claude.md file structure
