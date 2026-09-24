# TYMM insan inceleme paketi

Bu komut, bekleyen TYMM eşleme adaylarını iki bağımsız gerçek okul öncesi uzmanına verilebilen yerel bir inceleme paketine dönüştürür. Paket üretimi, uygulama içeriğini onaylamaz ve hiçbir adayı yayımlanabilir yapmaz. Gerçek uzman kararı ile kimlik kanıtı yoksa durum `blocked` kalır.

## Üretim ve doğrulama

Uygulama dizininde açık bir UTC zamanı ve yeni, boş bir hedef dizin verin:

```powershell
npm run tymm:review-package -- generate --output <dizin> --generated-at 2026-09-09T18:40:00.000Z
npm run tymm:review-package -- --verify <dizin>
```

Mevcut gerçek karar defteri ve kimlik kanıtı ayrıca değerlendirilecekse:

```powershell
npm run tymm:review-package -- generate --output <dizin> --generated-at <UTC> --ledger <ledger.json> --identity-evidence <identity.json> --as-of <UTC>
```

Komut var olan hedef dizinin üzerine yazmaz. Üretim, geçici dizinde tamamlandıktan sonra atomik olarak yayımlanır. Doğrulama hatalı manifest, değiştirilmiş aday, bozuk karar defteri, tek uzman, aynı uzman, bağımsız olmayan uzman, insan olmayan aktör veya çelişkili karar için sıfır dışı kodla durur.

## Paket içeriği

- `UZMAN_YONERGESI.md`: Türkçe değerlendirme adımları ve yayın sınırı.
- `human-review-template.csv`: 387 aday; iki uzmanın kimlik, karar ve gerekçe alanları başlangıçta boştur.
- `candidates.json`: adayların kanonik konusu, kaynak/kriter alanları ve yük SHA-256 değeri.
- `evaluation.json`: yayımlanabilir, engelli ve bekleyen sayıları.
- `receipt.json`: girdi, zaman, sıra ve değerlendirme makbuzu.
- `manifest.json`: paketteki dosyaların SHA-256 bütünlük kaydı.

Her aday aynı dört ölçütle değerlendirilir. İki ayrı uzman aynı aday için açık, gerekçeli ve uyumlu karar vermedikçe aday yayımlanabilir olmaz. Ajan, kurgu kişi, test girdisi veya paket koordinatörü gerçek uzman yerine geçmez.

## 0.34 yerel başlangıç durumu

Kurgu verili kabul paketi 357 etkinlik×yaş ve 30 yaş×ay eşlemesini, toplam 387 adayı içerir. Gerçek uzman kararı olmadığı için `publishable=0`, `blocked=387` ve `pending=387` beklenir. Bu sayı uygulama kabuğunun yayımlanmasını engellemez; yalnız bu adayların insan onaylı veya pedagojik olarak doğrulanmış içerik diye sunulmasını engeller.
