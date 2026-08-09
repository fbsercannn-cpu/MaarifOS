# MaarifOS Founder License API

Zero-runtime-dependency Cloudflare Worker + D1 service for the two founder phones. It adds a device-bound `staff-code` entitlement without changing the commercial premium purchase path.

This private Worker is independently versioned and remains at SemVer `0.1.0`; the main MaarifOS app moving to `0.9.1` does not change the License API version.

## What is implemented

- Exact-origin CORS, no cookies, no credentialed CORS.
- Five-minute, 256-bit device challenge.
- P-256 proof bound to purpose, device thumbprint, nonce, and idempotency key.
- Six-digit PIN checked only with `FOUNDER_PIN_HMAC_KEY` and `FOUNDER_PIN_HMAC_DIGEST` secrets.
- Exactly two active D1 device slots; same-device retry/reissue does not consume another slot.
- ES256 entitlement for the exact `tymm-6072-2026-09-v3` package.
- Byte-exact private content bundle from a Worker static-asset binding.
- HMAC-pseudonymous IP/device rate limits and minimal UTC + İstanbul civil-date audit.
- Audited operator slot deactivation, append-only former-device tombstones, and safe inactive-slot reuse by a new device only.

## Live deployment boundary

The canonical live Worker origin and entitlement issuer is
`https://maarifos-founder-license-api.otonom-hesaplama.workers.dev`. The Worker
and its remote D1 binding are live; the MaarifOS Sites PWA has not yet been
deployed, so this infrastructure milestone is not an end-user product release.

## Local verification

Requirements: current Node.js and a current Wrangler CLI. The service itself has no npm dependencies.

One command runs an isolated real Wrangler process, applies the D1 migration to
a temporary local database, activates exactly two generated P-256 devices with
a generated six-digit fixture PIN, verifies idempotent ES256 responses and the
byte-exact bundle, confirms a third device gets the generic rejection, stops
the Worker, and removes its temporary secrets and state:

```powershell
npm run test:local-worker
```

For a persistent manual local environment:

```powershell
cd C:\Users\Asus\Desktop\Maarif\MaarifOS_Codex_Baslangic_Paketi\license-api
npm test
node .\scripts\prepare-local-secrets.mjs
npx wrangler@4.120.0 d1 migrations apply maarifos-founder-license-local --local --env development
npx wrangler@4.120.0 dev --local --env development --port 8787
```

In a second process, set the same PIN only for that process and run the full challenge → proof → redeem → JWS/content verification:

```powershell
$env:MAARIFOS_FOUNDER_PIN = Read-Host 'Kurucu PIN'
node .\scripts\local-smoke.mjs
Remove-Item Env:\MAARIFOS_FOUNDER_PIN
```

`prepare-local-secrets.mjs` masks interactive input and writes only gitignored `.dev.vars.development` and `.secrets/` files. It never prints the PIN, HMAC values, or private JWK. Existing secret files are not overwritten.

## D1 provisioning

The live `LICENSE_DB` binding is provisioned in Cloudflare, while
`wrangler.jsonc` intentionally omits the account-specific `database_id`. The
identifier remains Cloudflare-side deployment state and is not written to this
source tree. It must not be copied into documentation, logs, or release
artifacts. Current Wrangler automatic provisioning also creates a persistent
local D1 database for `wrangler dev`. For a separately controlled replacement
database, use:

```powershell
npx wrangler@4.120.0 d1 create maarifos-founder-license --binding LICENSE_DB --update-config
npx wrangler@4.120.0 d1 migrations apply maarifos-founder-license --remote
```

Remote publication order is strict: take/confirm the controlled D1 recovery point, apply and verify migrations `0001` → `0002` → `0003_founder_device_tombstones.sql` on the target remote database, and only then deploy the Worker code that queries the tombstone table. On an existing database, Wrangler applies only pending migrations, but `0003` must report applied before Worker deployment. Do not run the operator reset command against a database that has not applied `0003`.

The optional `--update-config` command changes local configuration. Do not
commit its account-specific ID output; the checked-in configuration must remain
portable and free of account identifiers.

Cloudflare references: [Wrangler automatic provisioning](https://developers.cloudflare.com/workers/wrangler/configuration/#automatic-provisioning), [D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/), and [static asset Worker-first routing](https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first).

## Required bindings and secrets

Bindings:

- `LICENSE_DB`: D1 database.
- `PRIVATE_ASSETS`: staged Worker static assets.

Encrypted Worker secrets:

- `FOUNDER_PIN_HMAC_KEY`: 32 random bytes, base64url.
- `FOUNDER_PIN_HMAC_DIGEST`: HMAC-SHA-256 of the normalized six digits, base64url.
- `RATE_LIMIT_HMAC_KEY`: separate 32 random bytes, base64url.
- `ENTITLEMENT_PRIVATE_JWK`: private P-256 signing JWK JSON.

Public configuration:

- `ALLOWED_ORIGINS`
- `ENTITLEMENT_ISSUER`
- `ENTITLEMENT_AUDIENCE`
- `ENTITLEMENT_KID`
- `LEGAL_TERMS_VERSION`

For an authorized deployment, upload the gitignored secret bundle alongside the Worker:

```powershell
npx wrangler@4.120.0 deploy --secrets-file .\.secrets\worker-secrets.json
```

Production `ENTITLEMENT_ISSUER` is exactly
`https://maarifos-founder-license-api.otonom-hesaplama.workers.dev`. The later
Sites production build must set the identical value for
`VITE_PREMIUM_LICENSE_API_ORIGIN` and `VITE_PREMIUM_LICENSE_ISSUER`, then add the
public JWK from the gitignored `.secrets/entitlement-trusted-keys.json` under
`ENTITLEMENT_KID` to the PWA trusted-key configuration. Never copy the private
JWK or any Worker secret into source or a Vite variable.

## Private asset staging

```powershell
npm run stage
```

The script copies and verifies exactly:

- `content.v3.json`
- `manifest.v3.json`
- predecessor `content.v2.json`
- `values-pedagogy-constitution.v1.json`
- `official-preschool-value-actions.v1.json`

The generated `private-assets/` directory is gitignored. `run_worker_first: true` prevents a direct URL from bypassing Worker authorization.

## Founder phone replacement

An operator can deactivate one slot after setting the Cloudflare account, D1 database, and API token environment variables:

```powershell
node .\scripts\deactivate-founder-slot.mjs --slot=1 --confirm=DEACTIVATE-FOUNDER-SLOT-1
```

The command uses one parameterized D1 REST batch to append the former device thumbprint and entitlement to the founder-scoped tombstone authority, increment the slot revocation generation, deactivate the binding, and write an audit event. The former device cannot redeem again with the PIN, including by replaying an old successful idempotency request; a new phone can claim the inactive slot. Repeated replacements retain every former thumbprint. No thumbprint, entitlement, PIN, or token is printed. An already offline old phone may remain usable only until its signed 90-day offline window ends.

See [API_CONTRACT.md](./API_CONTRACT.md) and [SECURITY.md](./SECURITY.md).
