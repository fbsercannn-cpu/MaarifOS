# MaarifOS 0.69.0

Yayın tarihi: 24/09/2026

## Sonuç

- Gözlem taslağı yazımında kök uygulama yeniden çizimi kaldırıldı.
- Yavaş depolamada biriken ara taslaklar tek son taslakta birleştirildi.
- Gözlem otomatik kayıt aralığı 1 saniyeye çıkarıldı; ekran kapanışı ve kesin kayıt bekleyen son taslağı yine güvenle tamamlıyor.
- İzole mobil ölçümde 87 karakterlik gözlem Chromium'da 1,13 sn yazım / 123 ms kesin kayıt; WebKit'te 672 ms yazım / 3,94 sn kesin kayıt sürdü.
- Veli iletişim Excel'i ekli resmî şablonun üç sayfasını, hücre birleşimlerini, çerçevelerini, sütun genişliklerini ve yatay A4 ayarlarını koruyor.
- 22 çocukluk doğrulamada 19+3 satır iki sayfaya eksiksiz dağıtıldı; üçüncü şablon sayfası boş ve yeniden kullanılabilir kaldı.
- T.C. kimlik, doğum tarihi, anne/baba ad-soyad, telefon, meslek ve üçüncü kişi verileri çıktı yoluna eklendi.
- Tarihler arayüz ve Excel'de `gg/aa/yyyy`; Excel hücresi gerçek tarih değeri olarak saklanıyor.
- DeepSeek yeni kurulumların varsayılan sağlayıcısı; anahtar yalnız sunucu secret katmanında.

## Güvenlik ve veri

- Tarayıcıya API anahtarı yazılmaz veya loglanmaz.
- Yapay zekâya gönderilen istemlerde T.C. kimlik, telefon ve e-posta istemci tarafında da ayıklanır.
- Google hesabı olmadan bulut çağrısı fail-closed çalışır; yerel motor ayrıca seçilebilir.
- Dört yayın alan adından gelen Google giriş istekleri, Google'da kayıtlı kanonik
  `https://www.maarifos.com` OAuth kaynağına sunucu tarafında eşlenir. Böylece
  çıplak `.com`, `.net` ve `www.net` üzerinden başlayan girişler 403 ile kesilmez.
- DeepSeek sohbet modeli güncel resmî `deepseek-flash` kimliğine bağlandı; eski
  ve sağlayıcı tarafından reddedilen `deepseek-v4-flash` adı kaldırıldı.
- Aynı-origin tarayıcı `GET /api/ai/status` denetimi `Origin` başlığı olmadan da
  çalışır; yabancı origin başlığı ve bütün yazma istekleri fail-closed kalır.
- DeepSeek sağlayıcısı bakiye veya başka bir HTTP hatasıyla isteği reddederse
  uygulama artık bunu gizlemez; yalnız güvenli durum kodunu gösterir ve yerel
  pedagojik motora geçtiğini öğretmene açıkça bildirir.
- Veli Excel çıktısı kullanıcının açık talebi gereği kayıtlı veriyi maskelemeden taşır.

## Kabul kanıtı

- TypeScript, politika lint, sürüm sözleşmesi, Sites Worker güvenliği ve paket bütçesi geçti.
- Excel dosyası Microsoft Excel ile açılarak yazı tipi, çerçeve, metin biçimi, tarih biçimi, sayfa yönü ve baskı alanı denetlendi.
- 390×844 mobil gözlem akışı gerçek Chromium ve WebKit motorlarında yazım ve kesin kayıt süresiyle test edildi.
