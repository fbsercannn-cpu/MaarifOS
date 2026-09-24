# MaarifOS 0.22.0 yayın kaydı

Kullanıcı, canlı telefon/görsel kontrolün tamamlanmadığı bildirildikten sonra “Tamam yayınla” talimatını verdi. Mevcut herkese açık Sites hedefi, erişim politikası değiştirilmeden güncellendi.

- Adres: https://maarifos-emine-akis-pusulasi.fbsercannn.chatgpt.site
- Sonuç: `succeeded`, 31 Ağustos 2026 18:21:14 UTC.
- Sites sürümü: 32.
- Kaydedilmiş sürüm: `appgprj_6a60733e774c8191bbeeb1cca335281d~appgver_60289fc00d40819189a5f11a707453ca`.
- Yayın: `appgdep_6a95c60b9418819190345cc64abe0050`.
- Sites kaynak commit'i: `3e076765cc1fdf036edaca7d2e756c67fe169d1f`.
- Arşiv: 4.650.698 bayt; SHA-256 `2bf228662ea14b55d815cd7ffa2d9baef3b788f6ab510a21bcd36a87ae25cb13`.

## Doğrulama

Korunan runtime 36/36, uygulama strict TypeScript, founder-production yapılandırma ve paket doğrulaması, Sites sözleşmeleri 27/27 ve 66 JS parçasının gzip bütçesi geçti. 113 önbellek varlığı hash/boyut doğrulandı. Kanonik çalışma alanı founder build'i ile yayımlanan ayrı kaynak checkout'undan yapılan build'in istemci ağacı hash'i aynıdır: `82678517f6c93940dd5e867ab6f2bcb3122042ebe061215ead9eb26dff8125d9`.

İlk Sites sözleşme koşusu build sürerken `_headers` dosyasını okuyamadı; build tamamlandıktan sonraki sıralı koşuda 27/27 geçti. Dosya birleştirme veya kalıcı uygulama hatası değildi. Node özellik kümesinin önceki 922/922 sonucu korunur; bu yayın sırasında UI testi çalıştırılmadı.

Sites kaynak deposu app kökünde olduğu için Ekim referans JSON'u source checkout'unda byte eşit bir snapshot olarak importing modülün yanına alındı; yalnız o import yolu değiştirildi. Kanonik uygulama kaynağı ve asıl premium-content JSON'u değiştirilmedi. Hem kaynak SHA-256 hem son build ağacı eşitliği doğrulandı. Kaynak push'u yalnız Sites deposuna yapıldı; ana geliştirme deposuna commit/push yapılmadı. Tek yerel test dosyası biçim değişikliği, development-workspace-ui helper'ının sondaki fazla boş satırının kaldırılmasıdır.

## Açık kalan kabul sınırları

- Tarayıcı URL güvenlik engeli aşılmadı. Canlı UI, telefon, gerçek IndexedDB yeniden yükleme/restore ve gerçek PWA çevrim dışı kabulü bu sürümde doğrulanmadı.
- `design-qa.md` sonucu `blocked` kalır. Yayın başarılı olması görsel kabul anlamına gelmez.
- MR-056 nedeniyle gerçek çocuk verili pilot `NO-GO` kalır; bu yayın şifreleme kapsamını genişletmez ve pilot onayı üretmez.
- Sites bağlantısını uygulama panelinde gösterme isteği `queued` döndü; sayfanın açıldığı veya render edildiği iddia edilmez.

Makine okunur kanıt: `app/output/design-audit-2026-08-31/publish-0.22.0.json`.

Kalıcı ders: Yayının başarı durumu ile canlı kullanım ve veri güvenliği kabulü ayrı kaydedilmelidir.
