# MaarifOS 0.26.0 — yayın tamamlandı

7 Eylül 2026, 14:26:51 UTC. Kullanıcının “yayınla” talimatıyla mevcut herkese açık site, erişim politikası değiştirilmeden güncellendi.

Canlı adres: https://maarifos-emine-akis-pusulasi.fbsercannn.chatgpt.site

## Yayın izi

| Alan | Doğrulanmış değer |
|---|---|
| Sites sürümü | 34 |
| Kaynak commit | `24604d87b4a86dfb4837ac00aff3d750f3318f9e` |
| Kaydedilen sürüm | `appgprj_6a60733e774c8191bbeeb1cca335281d~appgver_0840f43a91d88191866c526e53785b79` |
| Dağıtım | `appgdep_6a9ec99b6ed8819182920cfff331dfe4` |
| Son durum | `succeeded` |
| Sıkıştırılmış yerel arşiv SHA-256 | `62df1c086aea8a9cf1d49f547d31dbf1e0bbe6378ebfe1d18a5252325ab34ffa` |
| Sites arşiv içerik özeti | `sha256:01b8e4255ecea422b794712699a9646fce39578632021486c24c03341e6e6850` |
| Paket | 177 dosya, Sites arşivi 27.729.920 bayt |

Kaynak, Sites deposunun önceki yayımlanmış başından oluşturulan ayrı çalışma ağacına kopyalandı. Kullanıcının ana çalışma ağacı commit/push edilmedi. Kaynak deposuna gönderim başarıyla bittikten sonra tam HEAD okunarak sürüm kaydına geçirildi. Mevcut kurucu yayın profiliyle derlendi; hashli uygulama kabuğu ve güvenlik Worker'ı proje paketleyicisiyle hazırlandı, ardından Sites'in kendi arşiv yardımcısı kullanıldı.

## Kabul

- Önceki uygulama kabulü: 1038/1038 özellik, 11/11 üretim çıktısında çevrim dışı adres akışı; `STUDENT_ADDRESS_V10.md`.
- Son kurucu yayın derlemesi, runtime 36 dosya, 79 JS parçası boyut kapısı geçti.
- Sites/PWA sözleşmeleri 38/38; son kurucu üretim PWA senaryoları 3/3 geçti.
- Bağımsız denetimde 168 precache varlığı ve arşivdeki 177 dosyanın boyut/hash eşitliği doğrulandı. Özel öğrenci/veli veri dosyası, kaynak/test/log/env dosyası yayımlanmadı. İzinli 35 sayfalık uyum rehberi eksiksiz.
- Canlı service worker ve manifest `0.26.0`; manifest 168 varlık içeriyor. Ana sayfa HTTP 200. Tarayıcı gezinmesinin `Accept: text/html` başlığıyla `/classroom?native=1` HTTP 200, uygulama kökü mevcut. HTML istemeyen derin rota isteğinin 404 dönmesi Worker sözleşmesindeki beklenen davranıştır.
- Canlı adres Codex tarayıcı paneline açılmak üzere iletildi; mevcut yerel form sekmeleri zorla yenilenmedi.

Makine tarafından okunabilir kanıt: `app/output/publish-0.26.0-receipt.json`. Derleme ve sözleşme günlükleri: `app/output/publish-founder-build.log`, `app/output/publish-contracts.log`. PWA çıktısı: `app/output/publish-founder-pwa/`.

Bayt özeti kilitli içeriklerin Windows satır sonu dönüşümüyle değişmemesi için uygulama `.gitattributes` dosyasında yayın girdileri ve önbellek kaynakları ham bayt olarak tanımlandı. Ana uygulama davranışında bu yayın turunda ek değişiklik yapılmadı.

Bu yayın, önceki master planındaki fiziksel cihaz/pilot ve diğer açık geliştirme maddelerini tamamlanmış saymaz.
