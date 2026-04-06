# SwarmSpace Privacy Policy

**Orbital AI · Last updated: April 2026**

-----

## What SwarmSpace is

SwarmSpace is a plugin marketplace for personal AI agents. It is infrastructure — a discovery, trust, and execution layer between AI agents and third-party capability providers. Most users interact with SwarmSpace indirectly, through LUMARA or another AI companion, rather than directly.

This policy explains what SwarmSpace collects, what it does not collect, and how data is handled when plugins execute.

-----

## What we collect

### Account data

When you create a SwarmSpace account:

- Email address
- Authentication method (email/password, Google, or GitHub OAuth)
- Account creation timestamp
- Subscription tier (free, Pro, or LUMARA Premium)

### Usage data

When you or your AI agent calls a plugin or workflow:

- Plugin slug and call timestamp
- Credit consumed per call
- Daily call count (reset at midnight UTC)
- Tier-level quota tracking

We do not log the content of plugin inputs or outputs. We log that a call happened, not what was said.

### Developer data

If you submit a plugin:

- Submitted manifest fields (name, description, endpoint URL, trust tier, pricing, tags)
- Submission timestamp and review status
- Developer UID linked to your account

### API keys

Each account is issued an `ss_` prefixed API key on signup. Keys are stored as a lookup reference, not in plaintext alongside your account document. Key regeneration is atomic — the old key is invalidated in the same operation that creates the new one.

-----

## What we do not collect

- **Personal context from your AI companion.** LUMARA’s CHRONICLE memory never passes to SwarmSpace. Interest tags derived from CHRONICLE are hashed client-side before any network call. SwarmSpace receives tag hashes, not raw content.
- **Plugin input or output content.** SwarmSpace routes calls and enforces quotas. It does not read or store what you asked or what a plugin returned.
- **Behavioral profiles.** We do not build advertising profiles or sell data to third parties.

-----

## How plugin execution works

When an agent calls a plugin through SwarmSpace, three things happen that are relevant to your privacy:

**Context minimization (PRISM).** Each plugin declares in its manifest exactly which fields of user context it needs (`privacy_data_required`). LUMARA extracts only those fields client-side. The plugin sandbox receives nothing else through the supported path. This is enforced at the V8 sandbox boundary, not by policy.

**Credential handling.** SwarmSpace manages API keys for third-party services on your behalf. Plugin code never receives raw API credentials. Keys are injected at the network egress boundary via HTTP filtering. Plugin code issues fetch requests; the credential is attached transparently.

**Network isolation.** Each plugin call runs in a V8 isolate sandbox. Outbound network access is restricted to domains declared in the plugin manifest (`network_domains`). All other destinations are blocked at the platform layer.

Plugins that have passed Verified review have been tested against these constraints before listing. Community tier plugins have passed a safety review but are not formally sandboxed at the same depth.

-----

## Third-party plugins

SwarmSpace hosts the index and trust layer. Plugin execution calls the developer’s endpoint. SwarmSpace does not audit third-party APIs or certify their upstream data handling. The Developer Agreement each plugin developer accepts covers data handling obligations, prompt injection liability, and third-party API terms compliance.

If a plugin receives user context (declared via `privacy_data_required`), that context is subject to the developer’s own privacy practices in addition to the constraints SwarmSpace enforces structurally. Review a plugin’s manifest and Swarm page before authorizing it for sensitive use cases.

-----

## Data retention

- Account and usage data: retained while your account is active.
- Call logs: retained for 90 days for quota and billing reconciliation, then deleted.
- Developer submissions: retained while the plugin is listed. Removed within 30 days of de-listing if requested.
- API keys: the current key is retained. Previous keys are not stored after regeneration.

-----

## Your rights

You can:

- Export your account data by contacting us at marcyap@orbitalai.net.
- Delete your account. Account deletion removes your developer profile, API key, and usage history. Submitted plugins will be de-listed within 7 days.
- Regenerate your API key at any time from the dashboard. The previous key is immediately invalidated.

-----

## Security

SwarmSpace uses Firebase Auth for authentication (Google, GitHub, and email/password). Firestore stores account and usage data. Cloudflare Workers handle plugin execution with V8 isolate sandboxing. Stripe handles payment processing under Stripe’s own privacy and security policies.

We do not store payment card details.

-----

## Changes to this policy

Material changes will be noted at the top of this document with an updated date. Continued use of SwarmSpace after a material change constitutes acceptance of the revised policy.

-----

## Contact

Orbital AI · San Diego, CA  
marcyap@orbitalai.net  
swarmspace.app
