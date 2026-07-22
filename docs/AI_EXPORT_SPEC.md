# Haricî Yapay Zekâ Analiz Paketi Standardı

## Amaç

Uygulama içine yapay zekâ entegre etmeden, seçilen verileri ChatGPT gibi bir sisteme güvenli ve anlaşılır biçimde aktarabilmek.

## Paket yapısı

```text
ai-analysis-package/
  manifest.json
  prompt.md
  observations.md
  data.json
  attendance-summary.md
  media-index.md
  media/               # isteğe bağlı
```

## manifest.json

- packageVersion
- createdAt
- appVersion
- period
- scope
- anonymizationMode
- includedSections
- observationCount
- mediaCount
- warnings[]

## Anonimleştirme seviyeleri

1. Gerçek ad
2. Baş harfler
3. Sistem takma adı: Öğrenci-01
4. Medyasız anonim paket

## observations.md biçimi

Her kayıt:
- Kanıt kimliği
- Tarih ve saat
- Bağlam
- Ham öğretmen gözlemi
- Öğretmen etiketleri
- İlişkili etkinlik
- İlişkili medya kimlikleri

## prompt.md varsayılan metni

Aşağıdaki kayıtları yalnızca verilen kanıtlara dayanarak değerlendir. Gözlem ile yorumu açık biçimde ayır. Çocuk hakkında tıbbi, psikolojik veya gelişimsel tanı koyma. Desteklenmeyen çıkarım yapma. Her önemli değerlendirmeyi ilgili tarihli gözlem kimlikleriyle ilişkilendir.

Raporu şu bölümlerde hazırla:
1. Kapsam ve veri yeterliliği
2. Bilişsel gelişim ve öğrenme süreçleri
3. Dil ve iletişim
4. Sosyal-duygusal gelişim
5. Fiziksel/psikomotor gelişim
6. Öz bakım ve günlük yaşam becerileri
7. İlgi, dikkat, merak ve öğrenme eğilimleri
8. Güçlü yönler
9. Desteklenebilecek alanlar
10. Öğretmenin sınıf içinde uygulayabileceği öneriler
11. Portfolyoya alınabilecek kanıtlar
12. Veri eksikleri ve daha fazla gözlem gerektiren alanlar

Maarif Modeli ile ilişki kurarken yalnızca açıkça desteklenebilen alanları kullan. Kesin eşleşme yoksa bunu belirt. Metni öğretmenin doğal, ölçülü ve mesleki diliyle yaz.

## Kanıt izlenebilirliği

Her gözleme `OBS-YYYYMMDD-XXXX` biçiminde görünür kimlik verilir. Yapay zekâ raporunda bu kimliklerin kullanılması istenir. Böylece öğretmen değerlendirmeyi kaynağına geri götürebilir.

## Eksik veri uyarıları

Paket oluşturulurken:
- Belirli bir alanda hiç kayıt yoksa
- Tarih aralığı çok kısaysa
- Yalnızca tek tür etkinlik varsa
- Devamsızlık nedeniyle veri azsa
- Fotoğraf var fakat açıklama yoksa

uyarı eklenmelidir.
