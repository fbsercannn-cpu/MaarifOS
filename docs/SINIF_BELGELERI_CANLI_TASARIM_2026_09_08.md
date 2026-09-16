# Canlı sınıf belgeleri — tasarım ve derin kabul

8 Eylül 2026 · 0.30.0 — Sites 36 yayımlandı · MR-112–113. Bu aşama, 0.29 işlevsel kabul makbuzu ve 914 dosyalık kaynak/derleme manifestosu kapandıktan sonra başladı. Kullanıcının sırası korunur: işlevsel tamamlama → görsel yenileme → son testler → mevcut siteye yayın.

## Görsel bulgu ve karar

Önceki PDF motoru yalnız regular font kullanıyor ve tablo gövdesini gri metadata rengiyle çiziyordu. Sadece başlığın büyütülmesi bu zayıf hiyerarşiyi düzeltmiyordu. Kullanıcının ilk örneği belirgin yazı ağırlıkları, koyu metin ve kontrollü bilgi alanları açısından referans alındı; logosu, kurum kimliği ve vergi belgesi içeriği kullanılmaz.

Yeni düzen öğretmen belgesi olarak kalır: güçlü kurum/belge başlığı, kısa sınıf bilgileri, renklerle ayrılan öğrenci/anne/baba/diğer yakın grupları, koyu veri yazıları ve açık imza alanı. Renk tek başına anlam taşımaz; bütün gruplar ayrıca adlandırılır. Öğretmenin kendi okul şablonuna kaydettiği logo ve imza tercihi korunur.

| Rol | Canlı grup rengi | Hafif destek tonu | Metin |
|---|---|---|---|
| Öğrenci | #42C7BD | #CFEFEB | #17324D |
| Anne | #72B7F2 | #D7E8FF | #17324D |
| Baba | #F28C74 | #FFE0D8 | #17324D |
| Diğer yakınlar | #F4C95D | #FFF0C2 | #17324D |

PDF ve Excel aynı rol/renk eşlemesini kullanır. Gerçek kalın font başlık ve alan adlarına uygulanır; dar veri hücreleri okunaklı normal ağırlığı korur. Küçük yazı/arka plan çiftlerinde en az 4,5:1 kontrast hedeflenir; hesaplanan değerler nihai kabulde somut font ve render sonuçlarıyla birleştirilir.

## Mantık ve karşılaştırmalı değerlendirme

“Quantum zekâ ve mantık” vurgusunun karşılığı, tek bir estetik beğeniye dayanmak yerine birbirinden bağımsız kanıt katmanlarıdır:

1. **Kaynak ve seçim:** Yirmi alan, öğrenci ve dönem kapsamı korunur; görünüm değişikliği veri üretmez, kaynak kaydı dönüştürmez veya kapatılmış alanı geri getirmez.
2. **Alternatifler:** Yalnız renk doygunluğunu artırmak, sadece fontu büyütmek ve gerçek ağırlık+hiyerarşi+rol rengi birlikte ele alınır. Son seçenek başlık/gövde ayrımını ve yakın gruplarının bulunabilirliğini birlikte iyileştirir.
3. **Geometri:** Gerçek font genişlikleri, satır sarma, hücre sınırları, devam başlıkları ve uzun ad/adresler birlikte sınanır. Başarılı metin çıkarımı tek başına okunabilirlik kanıtı değildir.
4. **Geriye uyumluluk:** Yeni tema motoru kullanmayan belgelerin önce/sonra PDF baytları karşılaştırılır. Görsel yenileme, ilgisiz raporların biçimini sessizce değiştirmez.
5. **Bağımsız doğrulama:** Uygulayan ajan dışında font/kontrast/legacy kontrolü; root tarafından gerçek sayfa resimlerinin incelenmesi; Excel'in ayrı uygulamada açılıp baskıya çevrilmesi.
6. **Üretim ve yayın:** Son sürümde ağ kapalı PDF/XLSX/yazdırma, kaynak değişiminde iptal ve PWA güncellemesi; yayımdan sonra canlı dosyaların doğrulanmış paketle eşliği.

## Korunan işlevsel kabul

0.29: 1.210 özellik, 48 sözleşme, 12 ortak PDF arayüzü, 2 yeni mobil seçim, 1 gerçek üretim/çevrim dışı ve 3 PWA kabulü geçti. PDF'de 7 belge/33 sayfa/2.428 alan; Excel'de gerçek 12 sayfalık baskı incelendi. Ayrı test dilimleri genel bir benzersiz toplam gibi toplanmaz. Ayrıntı: [işlevsel kabul](SINIF_LISTESI_V5_KABUL_2026_09_08.md).

## Son görsel kabul ve yayın

PDF 7 belge/33 sayfa/2.428 değerde kayıp, taşma ve örtüşme olmadan doğrulandı. Excel iki dosyada toplam 16 gerçek A4 yatay sayfayla incelendi. PDF gerçek gömülü 400/700 font ve en az 5,49:1 kontrast kullanır; Excel b=true stilini kendi render motoruyla işler ve bu bilgisayarda gerçek PDF font adı Roboto-Regular olarak görülür. 1.214 özellik, 48 sözleşme, 10 ortak PDF arayüzü, 3 PWA ve gerçek 0.27→0.30 yükseltme testleri geçti.

Sites 36 başarıyla yayımlandı; 229 canlı varlık ve worker/manifest test edilen paketle aynı. Üç HTML rotası 200 yanıtı ve güvenlik başlıkları verdi. Ayrıntılar ve test ortamı düzeltmesi [yayın kabul raporunda](YAYIN_0.30.0_2026_09_08.md). Fiziksel yazıcı/telefon pilotu yapılmadı. Önceki 0.29 kanıtları tarihsel olarak korunur; yeni kanıt kökü app/output/class-roster-vibrant-2026-09-08 dizinidir.
