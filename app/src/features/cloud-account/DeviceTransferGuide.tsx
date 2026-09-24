import { useState } from "react";
import "./device-transfer-guide.css";

export function DeviceTransferGuide({ disabled, lastBackupAt, lastVerifiedRestoreAt, onPrepareBackup, onSelectBackup }: {
  disabled: boolean; lastBackupAt: string | null; lastVerifiedRestoreAt?: string | null;
  onPrepareBackup: () => void; onSelectBackup: () => void;
}) {
  const [device, setDevice] = useState<"old" | "new">("old");
  return <details className="device-transfer-guide">
    <summary>Telefon veya bilgisayar değiştiriyorum</summary>
    <p>Kayıtlar tarayıcıya ve uygulama adresine bağlıdır. Google hesabı olmadan da şifreli dosyayla taşınabilirsiniz.</p>
    <div className="data-action-grid" role="group" aria-label="Taşıma yapılacak cihaz">
      <button type="button" aria-pressed={device === "old"} onClick={() => setDevice("old")}>Eski cihazım</button>
      <button type="button" aria-pressed={device === "new"} onClick={() => setDevice("new")}>Yeni cihazım</button>
    </div>
    {device === "old" ? <ol>
      <li>Bu cihazda son kayıtlarınızı tamamlayın ve şifreli yedek oluşturun. <button type="button" disabled={disabled} onClick={onPrepareBackup}>Şifreli yedek alanına git</button>
        <p role="status">{lastBackupAt ? <>Bu cihazın son başarılı dosya yedeği: <time dateTime={lastBackupAt}>{new Date(lastBackupAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</time>. Bundan sonraki değişiklikler için yeni dosya oluşturun.</> : "Henüz başarılı dosya yedeği yok."}</p>
      </li>
      <li>İnen .maarifos dosyasını yeni cihaza aktarın; parolayı dosyadan ayrı saklayın.</li>
      <li>Yeni cihazda geri yükleme ve sınıf kontrolü tamamlanana kadar eski cihazdaki kayıtları koruyun.</li>
    </ol> : <ol>
      <li>Eski cihazdan gelen dosyayı seçin. <button type="button" disabled={disabled} onClick={onSelectBackup}>Taşıma dosyasını seç</button></li>
      <li>Dosyanın parolasını girin. Önizlemede sınıfı, kayıt adetlerini ve varsa çakışmaları inceleyin; ardından geri yükleyin.</li>
      <li>Sınıfım ve Belgeler içinde taşınan kayıtları açın. <p role="status">{lastVerifiedRestoreAt ? <>Son doğrulanmış geri yükleme denetimi: <time dateTime={lastVerifiedRestoreAt}>{new Date(lastVerifiedRestoreAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</time>.</> : "Bu cihazda doğrulanmış geri yükleme denetimi henüz yok."}</p></li>
    </ol>}
  </details>;
}
