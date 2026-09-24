# MaarifOS 0.41.0 — yayın tamamlandı

10 Eylül 2026 14:35:05 UTC. Kullanıcının “yayınla” talimatıyla mevcut public site, erişim ve giriş ayarları korunarak güncellendi.

Canlı bağlantı: https://maarifos-emine-akis-pusulasi.fbsercannn.chatgpt.site

- Sites sürümü: 37.
- Sürüm kimliği: `appgprj_6a60733e774c8191bbeeb1cca335281d~appgver_c9bb9bf59eb48191a456b84dc1cd7861`.
- Dağıtım: `appgdep_6aa2c009b3d48191b5dde808fe9070a3`; durum `succeeded`.
- Kaynak commit: `5f2dd586c12590dda2d67975b5a39d55215d3d4b`.
- Kaynak kopyası: 963 dosya; kopyalama ve derleme sonrası kaynak byte eşitliği doğrulandı.
- Paket: 273 dosya; yerel gzip 24.185.405 bayt; SHA-256 `e86824a155957709ead9071288adccc9f39dad9dc7003fb1b8227e5591fee63e`.
- Sites açılmış tar SHA-256: `fa77e95ed4c716647a3a1f8d52beeecf022ce6949bcad1f8c48c9554c28ad21a`.

Kurucu yayın profiliyle yeniden derlendi. 28/28 Sites testi, korunan 36 runtime dosyası ve 155 JavaScript parçası için gzip ≤180 KiB kapısı geçti. Önceki geliştirme kabulü 1.349 özellik testi, 29 tarayıcı senaryosu ve çevrimdışı uygulama testidir.

Canlı `sw.js`, `maarifos-precache-manifest.json` ve `manifest.webmanifest`, mevcut sahip inceleme yetkisiyle HTTP 200 döndü ve hazırlanmış paketin dosyalarıyla birebir eşleşti. Ön bellek manifestosu 0.41.0 sürümünü taşıyor. Yeni anonim Python isteği 403 ile sınırlandı; giriş kapısı değiştirilmedi. Canlı kullanıcı/öğrenci kayıtları düzenlenmedi.

Yayın izole Sites kaynak checkout'undan üretildi; ana geliştirme deposuna commit/push yapılmadı. Windows staging dizini yeniden adlandırmasındaki geçici EPERM, yalnız paketleme sırasında sınırlı tekrar ile giderildi; kaynak değiştirilmedi. Paket, Sites'ın kendi arşiv yardımcısıyla Git Bash üzerinden üretildi; kaynak/test dosyaları dağıtım arşivine alınmadı.

Makbuz: `app/output/publish-0.41.0-receipt.json`. Ek yerel yayın kanıtları: `C:/Users/Asus/Desktop/Maarif/publish-0.41.0/` altındaki build/test günlükleri, archive-receipt.json ve live-verification.json.
