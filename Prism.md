# PRISM — Context Minimization for Plugin Developers

**SwarmSpace · Orbital AI · April 2026**

-----

## What PRISM is

PRISM is SwarmSpace’s context minimization layer. Its job is to ensure that plugins receive only the user data they declared they need — nothing more — and that this constraint is enforced structurally at the execution boundary, not by policy or by trusting the plugin to behave correctly.

The name reflects the function: PRISM refracts the full user context into only the frequencies a specific plugin is authorized to see.

-----

## Why this exists

Plugins that call AI companions like LUMARA have access to a user’s AI agent, which in turn has access to persistent personal memory (CHRONICLE), behavioral patterns, goals, and journal history. Without a minimization layer, a plugin that needs to know the user’s city to return weather data could — if coded to do so — receive the user’s full context and exfiltrate it.

The OWASP Agentic Security Top 10 identifies a **lethal trifecta**: the combination of access to private data, exposure to untrusted content, and external communication capability. An unreviewed plugin with all three channels open is a high-risk execution context.

PRISM narrows the first channel. The sandbox architecture (V8 isolates, `globalOutbound: null`) narrows the third. Manifest disclosure requirements and runtime monitoring address the second.

-----

## How it works

### The `privacy_data_required` manifest field

Every plugin manifest includes a `privacy_data_required` field. This is an array of context field names your plugin is allowed to receive:

```json
{
  "name": "weather-lookup",
  "privacy_data_required": ["user_city", "user_timezone"]
}
```

At execution time, LUMARA reads this field from your manifest and extracts only those fields from the user’s context before constructing the plugin call. Your plugin’s sandbox receives a `context` object containing exactly those fields. Fields that are not declared are not present in the object — they are not redacted, they are absent.

This extraction happens client-side in LUMARA before the call reaches SwarmSpace. SwarmSpace enforces it again at the sandbox boundary. Two layers. Neither trusts the other.

### What the plugin receives

Your plugin worker receives a request body with the following structure:

```json
{
  "input": {
    // user-provided input for this call
  },
  "context": {
    // only fields declared in privacy_data_required
    "user_city": "San Diego",
    "user_timezone": "America/Los_Angeles"
  },
  "meta": {
    "plugin_slug": "weather-lookup",
    "call_id": "...",
    "trust_tier": "verified"
  }
}
```

Your plugin does not receive:

- CHRONICLE memory or journal history
- Behavioral patterns or life phase data
- Any context field not declared in `privacy_data_required`
- The user’s API key or authentication credentials
- Credentials for third-party APIs (those are injected at the network boundary — see below)

### Credential injection

If your plugin calls a third-party API that requires a key (e.g., a weather API, a search API), you declare this in your manifest via `auth_method: "api_key"`. SwarmSpace manages the key on your behalf and injects it at the network egress boundary via HTTP filtering.

Your plugin code issues a standard `fetch()` call to the declared endpoint. The API key is attached transparently. Your plugin code never receives the raw credential, cannot log it, cannot embed it in a response, and cannot pass it to an undeclared endpoint.

```javascript
// This is all your plugin needs to do. No key handling required.
const response = await fetch("https://api.weather-service.com/current", {
  method: "POST",
  body: JSON.stringify({ city: context.user_city })
});
```

-----

## Available context fields

The following fields may be declared in `privacy_data_required`. Requesting a field that does not exist in the user’s profile results in that field being omitted (not an error).

|Field               |Description                                    |Sensitivity|
|--------------------|-----------------------------------------------|-----------|
|`user_city`         |User’s current or home city                    |Low        |
|`user_timezone`     |User’s timezone string                         |Low        |
|`user_language`     |Preferred language code                        |Low        |
|`user_interests`    |High-level interest tags derived from CHRONICLE|Medium     |
|`user_role`         |Professional role or domain (if shared)        |Medium     |
|`user_goals_summary`|Brief summary of active goals (if shared)      |High       |
|`session_intent`    |What the user asked for in natural language    |High       |

Fields marked High are only available to Verified plugins. Requesting them from a Community plugin results in the field being withheld.

Do not over-declare. Requesting fields your plugin does not use is flagged during safety review and may result in rejection or demotion. The merit algorithm tracks declared vs. actually-used context fields post-listing.

-----

## Behavioral manifest fields

Three fields on your manifest determine how PRISM and the orchestrator treat your plugin in automated and chained execution contexts:

|Field           |Type   |Meaning                                                                                                                                                                                                                         |
|----------------|-------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`is_read_only`  |Boolean|Plugin only reads data. Does not write to external systems, send messages, or modify state. Read-only plugins auto-approve in scheduled `auto` execution mode.                                                                  |
|`is_destructive`|Boolean|Plugin modifies, deletes, publishes, or sends data to external systems. Destructive plugins require explicit user confirmation even inside an already-approved workflow chain, and are blocked entirely in headless `auto` mode.|
|`headless`      |Boolean|Plugin is designed to run without a user-facing confirmation step. Required for Durable Object dispatch. Verified tier only. Incompatible with `is_destructive: true`.                                                          |

Declare these accurately. They are verified during sandbox testing. Mismatches between declared behavior and observed behavior are grounds for rejection or de-listing.

-----

## Network isolation

Your plugin runs in a V8 isolate with `globalOutbound: null` by default. Only hostnames listed in `network_domains` are reachable:

```json
{
  "network_domains": ["api.weather-service.com"]
}
```

Calls to any other domain fail at the platform layer — not with an error your code can catch, but silently blocked at the network boundary. This is by design. If your plugin needs to call a domain not in your manifest, update your manifest and resubmit for review.

-----

## What to do if your plugin needs more context

If you need a context field that is not in the available list above, contact SwarmSpace via the developer Swarm channel or submit a feature request. New context fields are evaluated against privacy proportionality before being added to the available set.

Do not attempt to derive additional context from what you receive (e.g., using `user_city` to infer country, then using country to infer other attributes). This is a manifest honesty violation and will result in de-listing if detected via behavioral monitoring.

-----

## Summary for implementation

1. Declare only the context fields your plugin actually uses in `privacy_data_required`.
1. Your plugin receives a `context` object with exactly those fields. Do not expect others.
1. Use `fetch()` normally. Credential injection is handled at the network boundary.
1. Declare `is_read_only`, `is_destructive`, and `headless` accurately. These are verified.
1. Declare all outbound domains in `network_domains`. Others are blocked at the platform layer.

-----

## Related

- [Developer Guide](../DEVELOPER_GUIDE.md) — manifest specification, endpoint contract, submission flow
- [Security & Trust Architecture](https://swarmspace.app/security.html) — full OWASP mapping and honest limitations
- [OWASP Agentic Skills Top 10](https://owasp.org/www-project-agentic-skills-top-10/)

-----

*SwarmSpace by Orbital AI · 2026*
