import { useState } from "react";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { StoredRecord } from "../../core/domain/model.ts";
import { eraseOfficialLegacyArchive } from "./official-form-record.ts";
import { downloadBrowserFile } from "../documents/browser-file-download.ts";
export function OfficialLegacyArchiveReview({ store, records, onChange }: { store: LocalDataStore; records: StoredRecord[]; onChange: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!records.length) return null;
  return <details className="no-print"><summary>Eski form arşivini incele ({records.length})</summary>
    <p>Bu kaynaklar şifreli kasada ve yedek kapsamındadır. Çocuk kimliği doğrulanamadığı için yeni formlara otomatik aktarılmaz. Gerekli kayıtları inceleyip doğru çocuğun formuna aktarın. Bu arşivler dururken çocuk kalıcı silme işlemi durdurulur.</p>
    {records.map(record => <details key={record.id}><summary>{String(record.legacyKey)} · {record.civilDate}</summary>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "16rem", overflowY: "auto" }}>{String(record.legacyJson)}</pre>
      <button type="button" disabled={busy} onClick={() => downloadBrowserFile({ fileName: `${String(record.legacyKey)}.json`, mimeType: "application/json", bytes: new TextEncoder().encode(String(record.legacyJson)) })}>Kaynağı aynen indir</button>
      <button type="button" disabled={busy} onClick={() => {
        if (!window.confirm("Bu eski arşivin tamamı ve onu içeren kurtarma kopyaları kalıcı temizlenecek. Başka çocukların bilgileri de bulunabilir. Gerekli kayıtları aktarıp incelediğinizi doğruluyor musunuz? İndirdiğiniz dosyalar bu işlemle silinmez.")) return;
        setBusy(true);
        void eraseOfficialLegacyArchive(store, record.id, String(record.legacySha256)).then(() => { setMessage("İncelenen eski arşiv ve ilgili kurtarma kopyaları temizlendi."); onChange(); }).catch(() => setMessage("Arşiv temizlenemedi; kaynaklar korunuyor. İncelemeyi yeniden açın.")).finally(() => setBusy(false));
      }}>İncelenen arşivi kalıcı temizle</button>
    </details>)}
    {message && <p role="status">{message}</p>}
  </details>;
}
