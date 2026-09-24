/**
 * material-shopping-list.ts � 0.47.0
 *
 * Haftanin etkinliklerinden malzeme listesi cikarimi.
 * Duplicate detection: Map ile O(n) � ayni materyal birden cok etkinlikte varsa tek satir.
 * Cikti: A5 yazdirma HTML + WhatsApp kopya metni.
 */

export interface MaterialShoppingEntry {
  readonly name: string;
  /** Hangi etkinliklerde gerekli */
  readonly usedInActivities: readonly string[];
  readonly quantity?: string;
  readonly note?: string;
}

export interface MaterialShoppingListResult {
  readonly entries: readonly MaterialShoppingEntry[];
  readonly whatsappText: string;
  readonly printHtml: string;
}

export interface ActivityMaterial {
  readonly name: string;
  readonly quantity?: string;
  readonly note?: string;
}

export interface WeekActivity {
  readonly title: string;
  readonly civilDate: string;
  readonly materials: readonly ActivityMaterial[];
}

/**
 * Haftanin etkinliklerinden birlesik malzeme listesi olusturur.
 * Ayni isimli malzeme tek satirda gosterilir; etkinlik listesi biriktirilir.
 */
export function buildMaterialShoppingList(
  weekActivities: readonly WeekActivity[],
  weekLabel: string,
  teacherName: string,
  schoolName: string,
): MaterialShoppingListResult {
  // Map: normalize isim -> entry (O(1) erisim sonrasi)
  const entryMap = new Map<string, {
    name: string;
    usedIn: string[];
    quantity?: string;
    note?: string;
  }>();

  for (const activity of weekActivities) {
    for (const mat of activity.materials) {
      const key = mat.name.trim().toLowerCase().replace(/\s+/g, " ");
      const existing = entryMap.get(key);
      if (existing) {
        if (!existing.usedIn.includes(activity.title)) {
          existing.usedIn.push(activity.title);
        }
      } else {
        entryMap.set(key, {
          name: mat.name.trim(),
          usedIn: [activity.title],
          quantity: mat.quantity,
          note: mat.note,
        });
      }
    }
  }

  const entries: MaterialShoppingEntry[] = Array.from(entryMap.values()).map((e) => ({
    name: e.name,
    usedInActivities: e.usedIn,
    quantity: e.quantity,
    note: e.note,
  }));

  // WhatsApp metni
  const whatsappText = [
    `*${weekLabel} Malzeme Listesi*`,
    `Ogretmen: ${teacherName} | ${schoolName}`,
    "",
    ...entries.map((e, i) =>
      `${i + 1}. ${e.name}${e.quantity ? ` (${e.quantity})` : ""}${e.note ? ` � ${e.note}` : ""}`,
    ),
    "",
    "MaarifOS tarafindan olusturulmustur.",
  ].join("\n");

  // A5 print HTML
  const printHtml = `
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${weekLabel} Malzeme Listesi</title>
<style>
  @page { size: A5; margin: 15mm; }
  body { font-family: 'Inter', Arial, sans-serif; font-size: 11pt; color: #1a2a4a; }
  h1 { font-size: 14pt; margin: 0 0 4px; }
  .meta { font-size: 9pt; color: #666; margin-bottom: 16px; }
  ol { padding-left: 20px; }
  li { margin-bottom: 8px; break-inside: avoid; }
  li strong { display: block; }
  li small { color: #555; font-size: 9pt; }
  .footer { margin-top: 24px; font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding-top: 6px; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<h1>${weekLabel}</h1>
<p class="meta">${teacherName} &bull; ${schoolName}</p>
<ol>
${entries.map((e) => `<li>
  <strong>${e.name}${e.quantity ? ` &mdash; ${e.quantity}` : ""}</strong>
  ${e.note ? `<small>${e.note}</small>` : ""}
  <small>Etkinlikler: ${e.usedInActivities.join(", ")}</small>
</li>`).join("\n")}
</ol>
<div class="footer">MaarifOS &bull; Cihaz verisi &bull; ${new Date().toLocaleDateString("tr-TR")}</div>
</body>
</html>`.trim();

  return { entries, whatsappText, printHtml };
}
