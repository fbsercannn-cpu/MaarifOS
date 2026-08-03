# MaarifOS
## Okul Öncesi Öğretmen Dijital Hafıza ve Çalışma Ekosistemi

> **Belge türü: hedef vizyon ve gereksinim.** Bu metindeki modül ve başarı ölçütleri mevcut uygulama iddiası değildir. Güncel uygulanmış/eksik/ertelenmiş kabiliyetler için kanonik kaynak [`STATUS.md`](STATUS.md) dosyasıdır.

**Proje sahibi:** Sercan Topaloğlu  
**İlk kullanıcı ve ürün danışmanı:** Emine Topaloğlu  
**Hedef ortam:** Android/iOS telefonlarda tam ekran çalışan, kurulabilir, çevrim dışı kullanılabilir mobil öncelikli PWA
**Temel ilke:** **Bir bilgi yalnızca bir kez girilir; planlama, portfolyo, rapor, veli bilgilendirmesi ve dönem değerlendirmelerinde tekrar tekrar kullanılır.**

---

## 1. Projenin amacı

MaarifOS; okul öncesi öğretmeninin günlük planlama, yoklama, öğrenci gözlemi, fotoğraf ve belge arşivleme, portfolyo hazırlama, veli bilgilendirme, dönemsel değerlendirme ve dış yapay zekâ analiz paketi hazırlama işlerini tek bir mobil uygulamada birleştiren bir **öğretmen işletim sistemi** olacaktır.

Uygulamanın amacı öğretmenin yerine pedagojik karar vermek değildir. Amaç; öğretmenin kendi gözlemlerini kaybetmeden toplamasını, kanıta dayalı biçimde düzenlemesini ve ihtiyaç duyduğu belgeye dönüştürmesini sağlamaktır.

MaarifOS kendi içinde ChatGPT veya başka bir üretken yapay zekâ çalıştırmayacaktır. Bunun yerine öğretmenin seçtiği öğrenci, tarih aralığı ve amaç için güvenli, temiz ve yapılandırılmış bir **Yapay Zekâ Analiz Paketi** oluşturacaktır. Öğretmen bu paketi daha sonra ChatGPT’ye yükleyip değerlendirme isteyebilecektir.

---

## 2. Ürün vizyonu

MaarifOS sıradan bir not uygulaması değildir. Her öğrenci için eğitim yılı boyunca oluşan aşağıdaki izleri ilişkilendiren bir **Dijital Öğrenci Hafızası**dır:

- Tarihli öğretmen gözlemleri
- Olumlu veya destek gerektiren davranış kayıtları
- Çocuğun kullandığı özgün cümleler
- Katıldığı etkinlikler
- Fotoğraf, video ve belge kanıtları
- Devam-devamsızlık, geç gelme ve erken ayrılma kayıtları
- Planlarla ve öğrenme çıktılarıyla ilişkiler
- Portfolyoya seçilen ürünler
- Veli görüşmelerinde kullanılan notlar
- Haftalık, aylık, ara dönem ve yıl sonu raporları
- Haricî yapay zekâya sunulan analiz paketleri

Sistem, girilen her kaydı tarih, öğrenci, etkinlik, gelişim alanı, öğrenme kanıtı ve kullanım amacı üzerinden birbirine bağlamalıdır.

---

## 3. Başarı ölçütleri

İlk pilot sürüm aşağıdaki işleri güvenilir biçimde yapabiliyorsa başarılı sayılır:

1. Öğretmen yoklamayı yalnızca gelmeyen çocukları işaretleyerek 30 saniye içinde tamamlayabilir.
2. Bir öğrenciye ilişkin anlık gözlem 15 saniye içinde yazı veya telefon klavyesinin dikte özelliğiyle kaydedilebilir.
3. Çekilen fotoğraf en fazla dört dokunuşla öğrenciye, tarihe ve etkinliğe bağlanabilir.
4. Uygulama internet olmadan temel işlevlerini sürdürür.
5. Öğretmen tüm verileri tek dosyada dışa aktarabilir ve yeni kurulumda eksiksiz geri yükleyebilir.
6. Seçilen öğrenci ve tarih aralığı için ham gözlemleri, fotoğraf listesini ve kanıt bağlantılarını içeren analiz paketi üretilebilir.
7. Haftalık sınıf bülteni ve bireysel öğrenci özeti fotoğraflı PDF olarak oluşturulabilir.
8. Toplu veli belgesine başka bir çocuğun kişisel bilgisi yanlışlıkla eklenmez.
9. “Uzun süredir gözlem girilmeyen öğrenci” ve “uzun süreli devamsızlık” uyarıları çalışır.
10. Öğretmen, üretilen her rapordaki ifadenin hangi tarihli kayıtlara dayandığını görebilir.

---

## 4. Kullanıcılar ve roller

### 4.1 İlk sürüm
- Tek öğretmen
- Tek cihaz öncelikli kullanım
- Birden fazla sınıf ve eğitim yılı desteği
- Yerel veri saklama
- Manuel yedekleme ve geri yükleme

### 4.2 Sonraki sürümler
- Öğretmen
- Okul yöneticisi
- Yardımcı öğretmen
- Salt okunur veli paylaşımı
- Birden fazla cihaz arasında şifreli senkronizasyon

Rol sistemi ilk veri modelinde bulunmalı ancak ilk arayüz tek öğretmen kullanımını sade tutmalıdır.

---

## 5. Ana modüller

## 5.1 Günüm

Uygulama açıldığında öğretmenin karşısına bugüne ilişkin sade bir kontrol merkezi çıkar.

Kartlar:
- Bugünün planı
- Yoklama
- Hızlı gözlem
- Fotoğraf ekle
- Erken ayrılan/geç gelen çocuklar
- Eksik kayıtlar
- Gün sonu kontrolü
- Yaklaşan rapor veya etkinlikler

“Günüm” ekranı uygulamanın en hızlı ve en sık kullanılan ekranıdır. Alt menüden tek dokunuşla erişilmelidir.

## 5.2 Akıllı yoklama

Varsayılan durum bütün çocukların **geldi** kabul edilmesidir. Öğretmen yalnızca gelmeyenleri işaretler.

Desteklenen kayıt türleri:
- Tam gün geldi
- Gelmedi
- Geç geldi
- Erken ayrıldı
- Gün içinde giriş ve çıkış saati
- Mazeret notu
- Sağlık/izin gibi öğretmenin belirlediği özel etiket

Özellikler:
- Tek dokunuşla devamsız işaretleme
- Saat seçmeden “şimdi” kaydı
- Günlük, haftalık, aylık devam özeti
- Art arda devamsızlık uyarısı
- Sık erken ayrılma veya geç gelme görünümü
- Seçilen tarih aralığında öğrenci özelinde dışa aktarım

## 5.3 Dijital öğrenci hafızası

Her öğrenci için tek merkezî profil:
- Temel bilgiler
- Fotoğraf
- Eğitim yılı ve sınıf
- Zaman çizelgesi
- Gözlemler
- Medya
- Yoklama geçmişi
- Etkinlikler
- Portfolyo seçkileri
- Raporlar
- Dışa aktarımlar

Öğrenci profili kesinlikle “not verme ekranı” gibi görünmemelidir. Bir gelişim zaman çizelgesi ve kanıt arşivi olarak tasarlanmalıdır.

## 5.4 Hızlı gözlem motoru

Öğretmen bir öğrencinin farklı bir cümlesini, davranışını veya gelişim göstergesini olay anında kaydedebilmelidir.

Zorunlu alanlar:
- Öğrenci
- Tarih ve saat
- Ham gözlem metni

İsteğe bağlı alanlar:
- Etkinlik/bağlam
- Olumlu gelişim
- Destek gerektiren durum
- Gelişim alanı
- Maarif Modeli ile ilişki
- Fotoğraf/video/belge
- Gizlilik düzeyi
- Portfolyo adayı
- Veli görüşmesinde kullanılabilir
- Dönem raporunda kullanılabilir

Temel kural: Sistem öğretmenin yazdığı ham gözlemi değiştirmeden saklamalıdır. Düzenlenmiş açıklama ve yorumlar ayrı alanlarda bulunmalıdır.

## 5.5 Gözlem sınıflandırması

İlk sürümde öğretmen tarafından seçilebilecek genel alanlar:
- Bilişsel gelişim ve öğrenme süreçleri
- Dil ve iletişim
- Sosyal-duygusal gelişim
- Fiziksel/psikomotor gelişim
- Öz bakım ve günlük yaşam becerileri
- Sanat ve yaratıcılık
- Değerler, eğilimler ve sosyal katılım
- Öğrenmeye ilişkin ilgi, dikkat ve merak
- Diğer

Maarif Modeli’nin resmî alan, beceri, eğilim, değer ve öğrenme çıktıları ayrı bir referans tablosunda tutulmalıdır. Bu eşleştirmeler sürüm kontrollü olmalı; kod içine dağınık biçimde gömülmemelidir.

## 5.6 Fotoğraf ve medya hafızası

Öğretmen telefon kamerasından fotoğraf çekebilir veya galeriden seçebilir.

Her medya kaydı için:
- Tarih ve saat
- Bir veya birden fazla öğrenci etiketi
- Etkinlik
- Açıklama
- Dönem
- Portfolyo kategorisi
- Haftanın/ayın çocuğu etiketi
- Veli bülteninde kullanılabilir mi?
- Bireysel raporda kullanılabilir mi?
- Toplu paylaşım için uygun mu?
- Dosya boyutu ve küçük önizleme

Gizlilik nedeniyle ilk sürümde otomatik yüz tanıma kullanılmayacaktır. Öğrenci etiketleme öğretmen onayıyla yapılacaktır. İleride yalnızca açık hukuki ve kurumsal onay sonrası cihaz üzerinde çalışan öneri sistemi değerlendirilebilir.

Arama örnekleri:
- “Ayşe, Ocak-Mart, portfolyo”
- “Haftanın çocuğu fotoğrafları”
- “Fen etkinliği, tüm sınıf”
- “Veli bülteninde kullanılabilecek fotoğraflar”

## 5.7 Plan merkezi

Planlar:
- Günlük plan
- Haftalık görünüm
- Aylık plan bağlantısı
- Özel gün ve etkinlikler
- Aile katılımı
- Okul dışı öğrenme
- Etkinlik değerlendirmesi

Plan; etkinlik, öğrenci gözlemi, fotoğraf ve öğrenme kanıtlarıyla ilişkilendirilebilmelidir. Böylece bir planın gerçekten uygulanıp uygulanmadığı ve hangi kanıtların oluştuğu görülebilir.

## 5.8 Portfolyo oluşturucu

Portfolyo ayrı bir içerik girişi değil; öğretmenin daha önce kaydettiği değişmez
kanıtların çocukla birlikte oluşturulan görünümüdür. Öğrenci profilinde yalnız
kanıt bulunan akademik aylar `YYYY-MM` anahtarıyla gösterilir; boş ay klasörü
oluşturulmaz.

Her seçki öğesinde katmanlar ayrıdır:

- Kaynak gözlem, çocuk ürünü veya medya
- Öğretmenin kanıta bağlı açıklaması
- Çocuğun bu ürünü neden seçtiğine ilişkin sözü
- Ailenin ayrı katkısı
- Seçimin öğretmen tarafından mı çocukla birlikte mi yapıldığı

Sistem kanıtı “güçlü”, “zayıf” veya “en iyi” diye puanlamaz; çocukları
sıralamaz, tanı ve kesin gelişim hükmü üretmez. Öğretmen seçer, kaldırır, sıralar
ve açıklama ekler. Seçkiden kaldırma kaynak kanıtı silmez; seçim geçmişi
tombstone ile korunur. Sonuç:
- Fotoğraflı PDF
- Yazdırılabilir portfolyo sayfası
- Medya klasörü + indeks
- Haricî yapay zekâ analiz paketi

## 5.9 Akıllı rapor merkezi

Rapor sihirbazı dört temel seçimle çalışır:

1. Kapsam
   - Sınıf geneli
   - Tek öğrenci
   - Seçili öğrenciler
2. Tarih
   - Bugün
   - Bu hafta
   - Bu ay
   - Birinci dönem
   - İkinci dönem
   - Eğitim yılı
   - Özel tarih aralığı
3. Amaç
   - Haftalık veli bülteni
   - Aylık sınıf özeti
   - Bireysel gelişim özeti
   - Portfolyo günü belgesi
   - Veli görüşmesi hazırlığı
   - Öğretmen öz değerlendirmesi
   - Denetim/kurum dosyası
   - Yapay zekâ analiz paketi
4. İçerik
   - Gözlemler
   - Fotoğraflar
   - Devam durumu
   - Etkinlikler
   - Öğrenme kanıtları
   - Öğretmen açıklaması

Her belge üretim öncesinde önizlenmeli ve öğretmen tarafından düzenlenebilmelidir.

## 5.10 Haftalık veli bülteni

Sınıf genelinde hazırlanır. İçerik:
- Bu hafta neler yaptık?
- Hangi alanları destekledik?
- Öne çıkan etkinlikler
- Seçili ve paylaşım izni uygun fotoğraflar
- Evde aile katılımı önerisi
- Öğretmenin kısa notu

Kesin kural: Bireysel öğrenci değerlendirmeleri toplu sınıf bültenine otomatik olarak konulmaz.

## 5.11 Bireysel veli bilgilendirme PDF’i

Öğretmen öğrenci ve tarih aralığı seçer. İçerik:
- Dönemin kısa özeti
- Tarihli gözlem örnekleri
- Güçlü yönler
- Desteklenebilecek alanlar
- Katıldığı etkinlikler
- Seçili fotoğraflar
- Devam bilgisi, öğretmenin seçmesi hâlinde
- Evde destek önerileri için boş veya öğretmen tarafından doldurulan alan

Uygulama tıbbi, psikolojik veya gelişimsel tanı üretmez. Gözlem ile yorum birbirinden açık biçimde ayrılır.

## 5.12 Yapay Zekâ Analiz Paketi

Bu modül projenin en kritik bileşenlerinden biridir. Uygulama içinde yapay zekâ çalıştırılmaz.

Öğretmen:
- Öğrenciyi seçer
- Tarih aralığını seçer
- Rapor amacını seçer
- Dahil edilecek veri türlerini belirler
- Kişisel bilgileri gizleme seviyesini seçer
- “Analiz paketi oluştur” der

Çıktılar:
- `analiz-paketi.md`
- `analiz-verisi.json`
- İsteğe bağlı fotoğraf klasörü
- Fotoğraf indeks dosyası
- Kullanıma hazır ChatGPT talimatı

Paket içeriği:
- Öğrenci için takma ad veya gerçek ad seçeneği
- Yaş grubu ve eğitim dönemi
- Tarih aralığı
- Ham gözlemler
- Öğretmen sınıflandırmaları
- İlişkili etkinlikler
- Devam özeti
- Fotoğraf açıklamaları
- Veri kapsamı ve eksik alan uyarıları
- Raporlama talimatı

Standart talimat ilkeleri:
- Yalnızca verilen kanıtlara dayan.
- Gözlem ile yorumu ayır.
- Desteklenmeyen çıkarım yapma.
- Tanı koyma.
- Her önemli değerlendirmeyi tarihli kanıtlarla ilişkilendir.
- Bilişsel, sosyal-duygusal, dil-iletişim, fiziksel/psikomotor ve öz bakım yönlerini ayrı değerlendir.
- Maarif Modeli alanlarıyla ilişki kurulabiliyorsa açıkla; veri yetersizse bunu belirt.
- Güçlü yönler, gelişim alanları ve uygulanabilir öğretmen önerileri üret.
- Öğretmenin doğal ve mesleki dilini koru.

## 5.13 Hatırlatıcı ve bildirim motoru

Bildirimler rahatsız edici değil, anlamlı olmalıdır.

Örnek kurallar:
- Bir öğrenci için son 14 gündür hiç gözlem girilmedi.
- Bir öğrenci art arda 3 gün gelmedi.
- Bu hafta çekilen 18 fotoğraf henüz etiketlenmedi.
- Günlük planın değerlendirme bölümü tamamlanmadı.
- Ay sonu sınıf bülteni hazırlanmadı.
- Portfolyo dönemine 10 gün kaldı ve bazı öğrencilerde yeterli medya yok.
- Belirli bir gelişim alanında uzun süredir kanıt bulunmuyor.

Öğretmen her kuralı açıp kapatabilmeli ve eşik değerini değiştirebilmelidir.

## 5.14 Arama ve filtreleme

Global arama:
- Öğrenci adı
- Gözlem metni
- Etkinlik
- Tarih
- Etiket
- Gelişim alanı
- Rapor
- Fotoğraf açıklaması

Doğal dil benzeri hızlı filtre örnekleri ayrı kısayol olarak sunulabilir:
- “Ali’nin Kasım gözlemleri”
- “Bu hafta gözlem girilmeyen çocuklar”
- “Portfolyoya uygun fotoğraflar”

İlk sürümde gerçek yapay zekâ yerine kural tabanlı arama ve hazır filtreler kullanılmalıdır.

## 5.15 Yedekleme ve geri yükleme

İlk sürümde uygulamanın yaşaması için en önemli güvenlik özelliklerinden biridir.

Yedek türleri:
- Tam yedek: Veriler + medya
- Hızlı yedek: Yalnızca metin ve ayarlar
- Seçili eğitim yılı yedeği
- Seçili öğrenci arşivi

Tam yedek biçimi:
- Parolayla şifrelenebilen `.zip`
- İçinde sürümlü `manifest.json`
- Veriler için JSON dosyaları
- Medya klasörü
- Bütünlük kontrol özeti

Geri yükleme akışı:
1. Dosyayı seç
2. Parolayı gir, varsa
3. Yedek sürümünü ve kapsamını göster
4. Mevcut veriye ekle veya tümünü değiştir seçeneği
5. Çakışmaları önizle
6. Geri yükle
7. Sonuç ve hata raporu

Kritik kabul testi: Uygulama silinip yeniden kurulduktan sonra tam yedekten bütün öğrenciler, gözlemler, yoklamalar, raporlar ve fotoğraflar geri gelebilmelidir.

## 5.16 Eğitim yılı arşivi

Her eğitim yılı kapatılabilir ve salt okunur arşive dönüştürülebilir. Yeni eğitim yılı açıldığında:
- Öğrenciler seçilerek yeni sınıfa taşınabilir
- Önceki yıl verileri değişmeden kalır
- Öğrencinin yıllar arası gelişim geçmişi ayrı izinle görüntülenebilir

---

## 6. Mobil tasarım ilkeleri

- Mobil öncelikli tasarım
- Tam ekran PWA
- Tek elle kullanım
- Alt menüde en fazla beş ana bölüm
- En az 44×44 piksel dokunma alanları
- Büyük ve okunaklı yazılar
- Karmaşık tablolar yerine kartlar ve zaman çizelgeleri
- Okul öncesi ruhuna uygun sıcak, yumuşak ve sade görsel dil
- Çocuksu fakat profesyonellikten uzaklaşmayan tasarım
- Fazla renk ve animasyondan kaçınma
- Kritik işlemlerde geri alma
- Otomatik taslak kaydı
- Kaydedilmemiş veri bırakmama
- Düşük internet ve eski telefon koşullarında çalışma
- Karanlık mod zorunlu değil; erişilebilir yüksek kontrast modu bulunmalı

Ana alt menü önerisi:
1. Günüm
2. Çocuklar
3. Kayıt Ekle
4. Arşiv
5. Raporlar

---

## 7. Teknik mimari

## 7.1 Aşama 1: Yerel öncelikli PWA

Önerilen teknoloji:
- React
- TypeScript
- Vite
- PWA/service worker
- IndexedDB
- Dexie benzeri veri erişim katmanı
- Zod benzeri şema doğrulama
- PDF üretim kütüphanesi
- ZIP oluşturma ve geri yükleme
- Web Crypto API ile isteğe bağlı yedek şifreleme

Aşama 1’de sunucu zorunlu değildir. Uygulama statik olarak yayımlanır, telefona kurulur ve veriler cihazda tutulur.

Avantajlar:
- İnternetsiz çalışma
- Düşük maliyet
- Hızlı pilot
- Çocuk verilerinin varsayılan olarak cihazdan çıkmaması
- Sunucu kesintilerinden bağımsızlık

## 7.2 Aşama 2: İsteğe bağlı şifreli senkronizasyon

Pilot başarıya ulaştıktan sonra:
- Kullanıcı hesabı
- PostgreSQL
- Nesne depolama
- Cihazlar arası senkronizasyon
- Çakışma yönetimi
- Uçtan uca şifreleme seçenekleri
- Okul bazlı çok kullanıcılı yapı

Senkronizasyon ilk sürümün ön koşulu değildir. Önce yerel sürüm kusursuz çalışmalıdır.

## 7.3 Katmanlar

1. Sunum katmanı
2. Uygulama servisleri
3. Alan modeli
4. Yerel veri deposu
5. Medya deposu
6. Dışa aktarma motoru
7. Bildirim motoru
8. Yedekleme/geri yükleme motoru
9. İleride senkronizasyon bağdaştırıcısı

Uygulama mantığı arayüz bileşenlerinin içine gömülmemelidir.

---

## 8. Veri güvenliği ve etik sınırlar

- Gereksiz kişisel veri toplanmaz.
- Veli bilgileri MVP’de zorunlu değildir.
- Fotoğrafların paylaşım izinleri kayıt düzeyinde yönetilir.
- Toplu bültende bireysel hassas gözlem bulunmaz.
- Uygulama tanı, teşhis veya kesin gelişim hükmü üretmez.
- Ham öğretmen gözlemi değiştirilemez tarihçeyle korunur.
- Düzenlenen kayıtların önceki sürümü denetim günlüğünde tutulur.
- Dışa aktarımdan önce kişisel bilgi gizleme ekranı gösterilir.
- Gerçek çocuk verileri geliştirici testlerinde kullanılmaz.
- Demo verileri tamamen kurgu olmalıdır.
- Otomatik yüz tanıma MVP kapsamı dışındadır.
- Bulut senkronu eklenmeden önce ayrıca gizlilik ve hukuk incelemesi yapılmalıdır.

---

## 9. MVP kapsamı

MVP’ye dahil:
- PWA kurulumu ve tam ekran çalışma
- Sınıf ve öğrenci yönetimi
- Günüm ekranı
- Yoklama
- Hızlı gözlem
- Fotoğraf ekleme ve manuel etiketleme
- Öğrenci zaman çizelgesi
- Tarih aralığı filtreleri
- Basit portfolyo seçkisi
- Haftalık sınıf PDF’i
- Bireysel öğrenci PDF’i
- Yapay zekâ analiz paketi
- Tam yedek ve geri yükleme
- Temel bildirimler
- Eğitim yılı arşivi

MVP’ye dahil değil:
- Uygulama içine gömülü yapay zekâ
- Otomatik yüz tanıma
- Velilerin uygulamaya girişi
- Çok okul/çok kurum yönetimi
- Ücretli abonelik sistemi
- Gerçek zamanlı cihazlar arası senkronizasyon
- Otomatik MEB sistem entegrasyonu

---

## 10. Kod kalitesi kuralları

- TypeScript strict açık olmalı.
- Her özellik için birim veya entegrasyon testi bulunmalı.
- Kritik akışlar için uçtan uca test yazılmalı.
- Veri şemaları sürümlü olmalı.
- Veritabanı geçişleri geri alınabilir olmalı.
- Yedek formatı sürümlü olmalı.
- Hata mesajları öğretmenin anlayacağı Türkçe ile yazılmalı.
- Arayüz metinleri tek merkezden yönetilmeli.
- Tarihler `Europe/Istanbul` kullanıcı deneyimine göre gösterilmeli, depolamada standart zaman formatı kullanılmalı.
- Büyük medya dosyaları için küçük önizleme üretilmeli.
- Uygulama kapanması sırasında veri kaybı olmamalı.
- Her modül çevrim dışı koşulda test edilmeli.
- Testlerde gerçek çocuk adı veya fotoğrafı kullanılmamalı.

---

## 11. Fazlar

### Faz 0 — Ürün temeli
- Kaynak belgeleri belirle
- Terim sözlüğü oluştur
- Kullanıcı akışlarını kesinleştir
- Demo veri seti hazırla
- Tasarım sistemini oluştur

### Faz 1 — PWA çekirdeği
- Proje iskeleti
- Tam ekran kurulum
- Çevrim dışı app shell
- Yerel veritabanı
- Tema ve gezinme
- Otomatik taslak kaydı

### Faz 2 — Sınıf, öğrenci ve yoklama
- Eğitim yılı
- Sınıf
- Öğrenci CRUD
- Hızlı yoklama
- Geç gelme/erken ayrılma
- Devam raporu

### Faz 3 — Gözlem ve medya
- Hızlı gözlem
- Etiketler
- Zaman çizelgesi
- Fotoğraf çekme/seçme
- Manuel öğrenci etiketleme
- Medya arama

### Faz 4 — Raporlama
- Rapor sihirbazı
- Haftalık sınıf PDF’i
- Bireysel öğrenci PDF’i
- Portfolyo seçkisi
- Önizleme ve düzenleme

### Faz 5 — Yapay zekâ analiz paketi
- Markdown paket
- JSON veri paketi
- Kişisel bilgi gizleme
- Kanıt indeksleri
- Hazır ChatGPT talimatı
- Eksik veri uyarıları

### Faz 6 — Yedekleme ve güvenilirlik
- Tam yedek
- Parolalı yedek
- Geri yükleme
- Çakışma yönetimi
- Bütünlük testleri
- Eğitim yılı arşivi

### Faz 7 — Hatırlatıcılar ve kalite
- Gözlem eksikliği uyarısı
- Devamsızlık uyarısı
- Etiketsiz medya uyarısı
- Erişilebilirlik
- Performans
- Pilot hata düzeltmeleri

### Faz 8 — Opsiyonel bulut
- Kullanıcı hesabı
- Senkronizasyon
- Çoklu cihaz
- Okul rolleri
- Yönetim paneli

---

## 12. Pilot senaryosu

İlk gerçek pilot yalnızca Emine Öğretmen’in bir sınıfında yürütülmelidir.

Pilot başlangıcı:
- Kurgu verilerle teknik test
- Sonra 3 deneme öğrencisi
- Sonra sınıfın tamamı
- İlk iki hafta yalnızca yoklama ve gözlem
- Üçüncü hafta medya
- Dördüncü hafta haftalık PDF
- Altıncı hafta ilk analiz paketi
- Ay sonunda yedek alıp temiz kurulumda geri yükleme testi

Pilot geri bildirimleri:
- Kayıt süresi
- Kaç dokunuş gerektiği
- Öğretmenin kullanmadığı alanlar
- Yanlışlıkla yapılan işlemler
- PDF düzenleme ihtiyacı
- Bildirimlerin yararı
- Telefon depolama kullanımı
- Uygulamanın okul akışını kesip kesmediği

---

## 13. Nihai ürün ilkesi

MaarifOS’un değeri “çok özellikli” olmasından değil, öğretmenin günlük hayatına görünmeden yerleşmesinden gelir. Her yeni özellik şu sorulardan geçmelidir:

1. Öğretmenin zamanını azaltıyor mu?
2. Aynı bilginin yeniden girilmesini önlüyor mu?
3. Bir gözlemin kaybolmasını engelliyor mu?
4. Öğrenciye ilişkin değerlendirmeyi kanıta dayalı hâle getiriyor mu?
5. Telefonda birkaç saniyede kullanılabiliyor mu?
6. Gizlilik riskini artırmadan değer üretiyor mu?

Bu sorulardan en az dördüne “evet” cevabı vermeyen özellik MVP’ye alınmamalıdır.
