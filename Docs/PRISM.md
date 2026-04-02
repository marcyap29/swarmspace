# PRISM — Privacy, Rights, and Information Security Module
*Orbital AI — SwarmSpace Privacy Architecture*

## Overview

PRISM is SwarmSpace's privacy enforcement layer. It ensures that plugins handling sensitive user data (images, URLs, personal context) operate under explicit consent and auditable logging.

## How PRISM Works

### 1. Plugin Declaration

Plugins that access sensitive data must declare `privacy_data_required: true` in the plugin registry. This flag triggers the PRISM consent flow.

### 2. Consent Flow

When a user invokes a privacy-sensitive plugin:

1. **LUMARA client** detects `privacy_data_required` flag
2. **User is shown** what data will be sent (derived from `data_required` manifest field)
3. **User explicitly approves** — client sets `_prism_consent: true` in request params
4. **swarmspaceRouter** logs the consent decision in `prism_transaction` structured log
5. **Request proceeds** to the plugin worker with consent recorded

### 3. Activity Logging

Every plugin call is logged to `plugin_activity_log` with:
- `user_id`, `plugin_id`, `plugin_name`
- `user_tier`
- `privacy_required`: whether the plugin requires sensitive data
- `consent_given`: whether explicit consent was provided
- `data_fields_sent`: which sensitive fields were included (image_b64, image_url, url, etc.)
- `result`: success or error
- `called_at`: timestamp

### 4. Sensitive Payload Detection

PRISM automatically detects sensitive payloads by checking for:
- `image_b64` / `image_base64` (base64 image data)
- `image_url` (external image URL)
- `url` (any URL being read/fetched)

### 5. Plugins Under PRISM

Currently flagged plugins:
| Plugin | Why |
|---|---|
| `vision-ocr` | Processes user images (OCR / understanding) |
| `url-reader` | Fetches and reads user-provided URLs |
| `media-upload` | Stores user images in R2 |
| `social-publisher` | Publishes content to user social accounts |

### 6. OWASP Lethal Trifecta

PRISM addresses the OWASP-defined "lethal trifecta":
- **Private data access** → `data_required` field + consent flow
- **Untrusted content exposure** → output schema validation
- **External communication** → `network_permissions` allowlist + `deny_write`

## Mapping to LUMARA Subsystems

- **CHRONICLE** — Longitudinal memory. `deny_write.memory_files: true` prevents plugins from modifying CHRONICLE data
- **ARC** — Journal capture. `deny_write.context_files: true` protects active context
- **Identity** — `deny_write.identity_files: true` prevents plugins from modifying user identity/preferences

## Future Enhancements

- Block requests where `privacy_data_required && hasSensitivePayload && !consentGiven` (currently logs but allows through)
- Per-plugin consent memory (remember user's decision per plugin)
- Consent audit export for compliance reporting
