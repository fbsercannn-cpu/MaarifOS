import { FOUNDER_CONTENT_RELEASE } from "../src/release.mjs";

const argumentsByName = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const separator = argument.indexOf("=");
    return separator === -1
      ? [argument, ""]
      : [argument.slice(0, separator), argument.slice(separator + 1)];
  }),
);
const slotText = argumentsByName["--slot"];
const slot = Number(slotText);
const expectedConfirmation = `DEACTIVATE-FOUNDER-SLOT-${slotText}`;
if (
  !Number.isInteger(slot) ||
  (slot !== 1 && slot !== 2) ||
  argumentsByName["--confirm"] !== expectedConfirmation
) {
  throw new Error(
    "Kullanım: node scripts/deactivate-founder-slot.mjs --slot=1|2 --confirm=DEACTIVATE-FOUNDER-SLOT-1|2",
  );
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
if (![accountId, databaseId, apiToken].every((value) => typeof value === "string" && value)) {
  throw new Error("Cloudflare hesap, D1 veritabanı ve API token ortam değişkenleri eksik.");
}

const endpoint = new URL(
  `/client/v4/accounts/${encodeURIComponent(accountId)}/d1/database/${encodeURIComponent(databaseId)}/query`,
  "https://api.cloudflare.com",
);
const occurredAtUtc = new Date().toISOString();
const civilParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date(occurredAtUtc));
const civilValues = Object.fromEntries(civilParts.map((part) => [part.type, part.value]));
const civilDate = `${civilValues.year}-${civilValues.month}-${civilValues.day}`;
const requestId = crypto.randomUUID();
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    batch: [
      {
        sql: `
          INSERT INTO founder_device_tombstones (
            device_thumbprint, entitlement_id, slot, revocation_generation,
            tombstoned_at_utc, operator_request_id
          )
          SELECT device_thumbprint, entitlement_id, slot,
                 revocation_generation + 1, ?, ?
            FROM founder_device_bindings
           WHERE slot = ? AND active = 1
        `,
        params: [occurredAtUtc, requestId, slot],
      },
      {
        sql: `
          UPDATE founder_device_bindings
             SET active = 0,
                 revocation_generation = revocation_generation + 1,
                 last_issued_at_utc = ?,
                 last_operator_request_id = ?
           WHERE slot = ? AND active = 1
             AND EXISTS (
               SELECT 1 FROM founder_device_tombstones
                WHERE operator_request_id = ? AND slot = ?
             )
        `,
        params: [occurredAtUtc, requestId, slot, requestId, slot],
      },
      {
        sql: `
          INSERT INTO license_audit_events (
            request_id, occurred_at_utc, civil_date, event_type, result,
            reason_code, pseudonymous_ip, pseudonymous_device, content_release_id
          )
          SELECT ?, ?, ?, 'founder_slot_deactivated', 'success',
                 'operator-confirmed-tombstoned', NULL, NULL, ?
           WHERE EXISTS (
             SELECT 1 FROM founder_device_bindings
              WHERE slot = ? AND active = 0
                AND last_issued_at_utc = ? AND last_operator_request_id = ?
           )
        `,
        params: [
          requestId,
          occurredAtUtc,
          civilDate,
          FOUNDER_CONTENT_RELEASE.contentReleaseId,
          slot,
          occurredAtUtc,
          requestId,
        ],
      },
    ],
  }),
});
const payload = await response.json().catch(() => null);
const tombstoneChanges = Number(payload?.result?.[0]?.meta?.changes ?? 0);
const changes = Number(payload?.result?.[1]?.meta?.changes ?? 0);
const auditChanges = Number(payload?.result?.[2]?.meta?.changes ?? 0);
if (
  !response.ok ||
  payload?.success !== true ||
  tombstoneChanges !== 1 ||
  changes !== 1 ||
  auditChanges !== 1
) {
  throw new Error("Kurucu cihaz yuvası devre dışı bırakılamadı; uzak durum değişmedi.");
}
process.stdout.write(
  `Kurucu cihaz yuvası ${slot} devre dışı bırakıldı; sonraki güvenli aktivasyonda yeniden bağlanabilir.\n`,
);
