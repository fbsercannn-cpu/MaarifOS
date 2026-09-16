# Founder Access Security and Threat Notes

## Scope and trust boundaries

The internet-facing PWA is untrusted. The Worker validates every byte at the API boundary. D1 is the atomic authority for challenges, idempotency, rate buckets, and the two founder-device slots. Worker secrets hold the PIN HMAC key/digest, rate-limit HMAC key, and ES256 private key. The static asset binding holds the private premium source chain and is never served directly because `assets.run_worker_first` is `true` for every path.

The service has no schema or route for educational data. It accepts only a device P-256 public key, its RFC 7638 thumbprint, app version, challenge material, idempotency identifier, and the transient founder PIN.

## Assets

- Exactly two active founder device bindings.
- ES256 entitlement signing key.
- Six-digit founder PIN and its HMAC verification material.
- Exact v3 premium package and its manifest/value-source chain.
- Challenge/idempotency integrity and pseudonymous audit records.

## Threats and controls

| ID | Threat | Primary controls | Residual risk |
|---|---|---|---|
| TM-001 | PIN extracted from the public PWA or repository | PIN never enters client source, Worker source, D1, or logs; verification uses secret HMAC key + digest | A person who observes the PIN can try it until rate limits or both slots stop them |
| TM-002 | Online brute force | Exact origin allowlist, 8 KiB bodies, IP HMAC bucket, device bucket, generic errors | Distributed attacks across many IPs remain possible; Cloudflare WAF/Turnstile is a later defense-in-depth option |
| TM-003 | Race claims more than two devices | D1 table exposes only slots 1 and 2; prepared `INSERT OR IGNORE`/inactive-slot update; unique device constraint | D1 availability can deny activation but cannot create a third slot |
| TM-004 | Challenge replay or proof substitution | 256-bit nonce, five-minute TTL, purpose/device/idempotency-bound P-256 signature, one claimant fingerprint per challenge | Compromised device private key remains authoritative until its slot is deactivated |
| TM-005 | Direct premium asset URL leakage | Private staged directory is gitignored; Worker runs first for all static asset paths and never forwards public asset requests; runtime digest locks | An authorized browser must see plaintext content and can copy it; this is not unbreakable DRM |
| TM-006 | Lost phone retains or reacquires access after operator reset | The same D1 batch appends an immutable founder-device tombstone, increments slot generation, deactivates the binding, and writes an audit event; idempotent and fresh redemption paths reject tombstoned devices generically; a new device can reuse the inactive slot; offline window is capped at 90 days | Without a refresh endpoint, an already offline old phone may remain active until its signed window ends |
| TM-007 | SQL injection or educational-data egress | Static SQL plus `.bind()`/REST `params`; exact schemas and recursive forbidden-field check | A future endpoint must repeat these controls and tests |
| TM-008 | Secret or raw IP leakage | No request-body logging; raw IP immediately becomes HMAC pseudonym; audit has technical reason codes only | Cloudflare platform access logs must also keep request-body logging disabled |

## Release gates

- For remote publication, first confirm the controlled D1 recovery point, then apply/verify migrations in numeric order through `0003_founder_device_tombstones.sql`, and only afterward deploy the Worker code that reads the tombstone authority. Never run operator reset before `0003` is applied.
- Replace the contract/test issuer with the final canonical HTTPS license origin in both Worker and PWA build configuration.
- Provision D1, apply migrations, upload all four required secrets, and publish the matching public entitlement JWK to the PWA trusted-key set.
- Keep Cloudflare request-body logging disabled and verify production CORS headers from the installed PWA.
- Before broad paid release, add entitlement refresh/revocation lookup, payment/webhook validation, and a KMS/HSM-backed signing key. This founder pilot does not replace the paid entitlement path.

## Operator reset

`scripts/deactivate-founder-slot.mjs` requires an explicit slot-specific confirmation. One parameterized D1 REST batch inserts the former binding into the append-only `founder_device_tombstones` authority, deactivates one slot, increments its generation, and creates a `founder_slot_deactivated` audit event with reason `operator-confirmed-tombstoned`. Claim SQL and the pre-idempotency redeem path both reject every retained tombstone, while a different device can reuse the inactive slot. The script never prints a device thumbprint, entitlement, PIN, or API token. The old device's maximum residual offline access is the 90-day signed window.
