# Founder License API Contract

This service is deliberately narrow. It accepts device-license metadata only; it never accepts a child, classroom, observation, photo, plan, backup, or free-text education record.

## Deployment identity

- Canonical live API origin and entitlement issuer:
  `https://maarifos-founder-license-api.otonom-hesaplama.workers.dev`.
- Production clients must verify the exact issuer above; aliases and redirects
  do not change the trust identity.
- The production D1 database is bound as `LICENSE_DB`. Its account-specific
  `database_id` is Cloudflare-side deployment state and is intentionally absent
  from checked-in source and examples; it must not be copied into logs or
  release artifacts.

## Transport rules

- HTTPS is mandatory outside loopback development.
- Requests must come from an exact `ALLOWED_ORIGINS` entry.
- Cookies and credentialed CORS are not used.
- JSON request bodies are limited to 8 KiB and reject unknown or missing fields.
- `POST /v1/founder/redeem` requires an `Idempotency-Key` header equal to the JSON `idempotencyKey`.
- Every response carries `X-Request-Id`; errors reveal only `request_rejected`.

## `POST /v1/device/challenge`

Exact request:

```json
{
  "deviceKeyThumbprint": "sha256:<RFC-7638-base64url>",
  "purpose": "redeem-code"
}
```

Exact success response:

```json
{
  "challengeId": "<UUID-v4>",
  "nonce": "<32-byte-base64url>",
  "purpose": "redeem-code",
  "deviceKeyThumbprint": "sha256:<RFC-7638-base64url>",
  "expiresAtUtc": "<ISO-8601-UTC>"
}
```

The nonce expires after five minutes.

## `POST /v1/founder/redeem`

Exact request:

```json
{
  "code": "<six digits>",
  "challengeId": "<UUID-v4>",
  "proofSignature": "<64-byte-ES256-base64url>",
  "devicePublicKeyJwk": {
    "crv": "P-256",
    "ext": true,
    "key_ops": ["verify"],
    "kty": "EC",
    "x": "<32-byte-base64url>",
    "y": "<32-byte-base64url>"
  },
  "deviceKeyThumbprint": "sha256:<RFC-7638-base64url>",
  "appVersion": "0.9.0",
  "idempotencyKey": "<UUID-v4>"
}
```

The proof signs this exact JSON serialization order:

```json
{
  "challengeId": "<challengeId>",
  "deviceKeyThumbprint": "<thumbprint>",
  "idempotencyKey": "<idempotencyKey>",
  "nonce": "<nonce>",
  "purpose": "redeem-code"
}
```

Exact success response:

```json
{
  "entitlementToken": "<compact-ES256-JWS>",
  "contentBundle": {
    "schemaVersion": 1,
    "contentReleaseId": "tymm-6072-2026-09-v3",
    "contentPackId": "maarifos-tymm-6072-2026-2027-v3",
    "contentPackVersion": "3.0.0",
    "manifestDigest": "sha256:9b4c2bcc155e3f6f8567ba5737249cd417405bc4205b75b68d194e63ca3eff1e",
    "sku": "TYMM-6072",
    "academicRelease": "2026-2027",
    "contentSha256": "sha256:b6e3b00f1bfbdd66c1ea212775f25a362330ee8f366cdd566a09e3535b5cd247",
    "contentByteLength": 143990,
    "contentJson": "<the exact unmodified UTF-8 content.v3.json text>"
  }
}
```

The entitlement grant uses `access_mode = staff-code`, has no purchase expiry, refreshes after 30 days, and permits at most 90 days of offline operation before a new signed entitlement is required.

Exact error response for invalid PIN, proof, challenge, replay, idempotency conflict, a tombstoned former founder device, or a third active device:

```json
{
  "error": "request_rejected",
  "requestId": "<UUID-v4>"
}
```
