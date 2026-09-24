# MaarifOS Ürün Sıfırlama ve Pedagojik Sistem Tasarımı

**Durum:** Kanonik ürün kararı<br>
**Tarih:** 22 Temmuz 2026<br>
**Kapsam:** Türkiye Yüzyılı Maarif Modeli, EÇE/2024, öğretmen iş akışları,
küresel ürün örüntüleri, bilgi mimarisi, veri mimarisi ve teslim sırası

## 1. Yönetici kararı

Mevcut MaarifOS ekranı satılabilir bir okul öncesi öğretmen ürünü değildir.
Çalışan veri, yoklama geçmişi, çevrim dışı kullanım, yedekleme, geri yükleme ve
otomatik test altyapısı değerlidir; ancak görünen ürün statik etkinliklerle dolu
bir telefon demosu gibi davranmaktadır.

Bu nedenle:

- Veri, yedek, migration, çevrim dışı çalışma ve test omurgası korunacaktır.
- Statik günlük etkinlikler, çalışmayan menüler ve geliştirici dili görünür
  üründen kaldırılacaktır.
- Ürün yüzü profesyonel bir **Okul Öncesi Öğretmen Çalışma Alanı** olarak
  yeniden tasarlanacaktır.
- Ana ürün döngüsü şu olacaktır:

```text
Program
  → Plan
  → Uygulama
  → Öğrenme kanıtı
  → Çocuk / program / öğretmen değerlendirmesi
  → Portfolyo ve dönem belgesi
  → Sonraki plan
```

Yoklama bu sistemin gerekli fakat ikincil bir parçasıdır. Ürünün pedagojik
çekirdeği değildir.

## 2. Araştırma yöntemi ve güven düzeyi

Kararlar aşağıdaki kanıt sırasına göre alınmıştır:

1. Güncel MEB programları, genelgeleri, yönetmelikleri ve denetim rehberleri
2. MEB programlarını karşılaştıran hakemli araştırmalar
3. NAEYC, Head Start, İngiltere DfE ve Yeni Zelanda Eğitim Bakanlığı gibi
   kurumsal erken çocukluk kaynakları
4. Rakip ürünlerin resmî ürün ve yardım merkezi sayfaları
5. Güncel uygulama mağazası yorumları ve öğretmen tartışmaları

Kullanıcı yorumları ürün sorunu sinyali olarak değerlendirilmiş; sıklık veya
pazar payı kanıtı olarak kullanılmamıştır.

## 3. Mevcut ürünün sert teşhisi

### 3.1 Pedagojik boşluk

- Ekranda uygulanan program, yaş grubu veya katalog sürümü yoktur.
- EÇE kazanım–gösterge yapısı yoktur.
- TYMM alan becerisi–öğrenme çıktısı–alt öğrenme çıktısı yapısı yoktur.
- Plan ile etkinlik, gözlem, medya ve değerlendirme arasında bağ yoktur.
- Çocuk, program ve öğretmen yönünden değerlendirme yoktur.
- Gelişim ve Öğrenme İzleme Formu, Beceri Gözlem Formu, Anekdot Kayıt Formu,
  Gelişim Raporu ve Beceri Edinim Raporu yoktur.
- Aile/toplum katılımı, okul dışı öğrenme, farklılaştırma, portfolyo ve BEP
  süreçleri yoktur.

### 3.2 Ürün ve deneyim boşluğu

- “Renk Avı”, “Büyük hikâyeye yolculuk” gibi sabit içerikler gerçek plan
  verisi değildir.
- Çalışmayan “Arşiv” ve “Raporlar” sekmeleri güven kaybettirir.
- Küçük metinler, dekoratif rozetler ve büyük yuvarlak ikonlar bilgi yoğunluğunu
  düşürür; ürünün mesleki ciddiyetini zayıflatır.
- “Ham gözlem”, “yerel veri kasası”, “bütünlük özeti” ve “manifest” gibi
  terimler öğretmen dili değildir.
- Uygulamanın teknik güvenilirliği kullanıcıya zaman kazancı ve pedagojik kanıt
  olarak yansımamaktadır.

### 3.3 Net karar

Bugünkü arayüz iyileştirilmeyecek; gerçek veri motoru korunarak profesyonel bilgi
mimarisiyle yeniden kabuklandırılacaktır.

## 4. İki ayrı program profili

EÇE ve Türkiye Yüzyılı Maarif Modeli aynı etiket ağacının iki görünümü değildir.
İki ayrı resmî program ontolojisidir.

### 4.1 EÇE/2024 profili

Üründe gösterilecek ad:

> Okul Öncesi Eğitim Programı — EÇE/2024

Temel yapı:

```text
Gelişim alanı
  → kazanım
  → gösterge
  → gözlem / ürün / fotoğraf / çocuk sözü
  → gelişim ve öğrenme izleme
  → gelişim raporu
```

Gelişim alanları:

- Bilişsel gelişim
- Dil gelişimi
- Fiziksel gelişim ve sağlık
- Sosyal-duygusal gelişim ve değerler
- Öz bakım, ilgili resmî form ve gösterge bağlamında ele alınır

EÇE’ye özgü başlıca çıktılar:

- Gelişim ve Öğrenme İzleme Formu
- Gelişim Raporu
- Aylık Eğitim Planı
- Günlük Eğitim Planı
- Kavram ve değer listeleri
- Belirli gün ve haftalar
- Okul dışı öğrenme planı
- Aile/toplum katılımı

### 4.2 Türkiye Yüzyılı Maarif Modeli profili

Temel yapı:

```text
Yaş grubu
  → alan becerisi
  → öğrenme çıktısı
  → alt öğrenme çıktısı
  → programlar arası bileşenler
  → öğrenme kanıtı
  → beceri gözlemi / anekdot / portfolyo
  → beceri edinim raporu
```

Yaş matrisleri:

- 36–48 ay
- 48–60 ay
- 60–72 ay

Alanlar:

- Türkçe
- Matematik
- Fen
- Sosyal
- Hareket ve Sağlık
- Sanat
- Müzik

Programlar arası bileşenler:

- Kavramsal beceriler
- Sosyal-duygusal öğrenme becerileri
- Okuryazarlık becerileri
- Eğilimler
- Erdem–Değer–Eylem Çerçevesi
- Kavramlar
- Farklılaştırma: zenginleştirme ve destekleme
- Aile/toplum katılımı
- Öğrenme kanıtları
- Öğretmen yansıtmaları

TYMM’ye özgü başlıca çıktılar:

- Alan matrisleri
- Beceri Gözlem Formu
- Anekdot Kayıt Formu
- Beceri Edinim Raporu
- Aylık Plan Kontrol Çizelgesi
- Aylık ve günlük plan
- Okul dışı öğrenme planı
- Aile Eğitimi İhtiyaç Belirleme Formu
- Aile Katılımı Tercih Formu

### 4.3 Program seçimi kuralı

Uygulama okul türünden sessizce program tahmini yapmayacaktır.

Kurulumda öğretmene şu soru sorulacaktır:

> Kurumunuz bu sınıfta hangi programı uyguluyor?

Seçenekler:

- Türkiye Yüzyılı Maarif Modeli
- Okul Öncesi Eğitim Programı — EÇE/2024
- Henüz emin değilim — okul yönetiminden doğrulayacağım

Her seçimde resmî kaynak, sürüm ve uygulama dönemi gösterilecektir. Aynı plan
içinde iki programın kodları karıştırılmayacaktır. Program değişimi bir migration
değil, yeni dönem/program profili olarak açılacaktır.

## 5. Pedagojik kırmızı çizgiler

- Çocuklar birbirine göre sıralanmaz.
- Sistem tanı, teşhis, risk skoru veya gelişim tahmini üretmez.
- Kanıt azlığı “beceri eksikliği” olarak gösterilmez.
- Gözlenen davranış, öğretmen yorumu ve sonraki adım ayrı alanlardır.
- Çocuğun özgün sözü düzeltilmeden ayrı tutulur.
- Program eşlemesi öğretmen onayı olmadan kesinleşmez.
- Resmî katalog güncellemesi geçmiş kaydı sessizce değiştirmez.
- Rapor cümlesi tarihli kanıta geri gidemiyorsa rapora alınmaz.
- Öğretmen onayı olmadan aile belgesi oluşturulmaz veya gönderilmez.
- Başka çocuğun verisi bireysel belgeye sızamaz.
- Fotoğraf/video için kayıt, kurum içi kullanım, aile paylaşımı ve tanıtım izni
  aynı onay olarak kabul edilmez.
- Uygulama öğretmenin çocuklardan gözünü ayırdığı süreyi artırmamalıdır.

## 6. Gerçek öğretmen iş haritası

### 6.1 Kurulum

- Eğitim yılı ve dönem
- Kurum ve sınıf
- Program profili ve sürümü
- Yaş grubu
- Çalışma saatleri
- Sınıf listesi ve kayıt geçmişi
- Çocuk/aile tanıma bilgileri
- Acil durum, sağlık ve izin bilgileri için ayrı erişim sınırları
- Özel gereksinim ve BEP bağlantısı
- Yedekleme ve uygulama kilidi

### 6.2 Günlük

1. Sınıfı ve günü aç
2. Devam durumunu kaydet
3. Günlük planı gör
4. Etkinliği veya öğrenme merkezini yürüt
5. Olay anında kısa kanıt yakala
6. Kanıtı çocuk, etkinlik ve hedefle ilişkilendir
7. Çocuğun değerlendirmeye katılımını kaydet
8. Planın gerçekleşme durumunu kapat
9. Çocuk/program/öğretmen değerlendirmesini tamamla

### 6.3 Haftalık

- Çocuk başına kanıt görünürlüğünü kontrol et
- Bağlamsız ve etiketsiz kayıtları tamamla
- Gelecek haftanın etkinliklerini hazırla
- Aile/toplum katılımını planla
- Devam ve uzun süreli devamsızlıkları incele
- İzinli içerikten aile bülteni taslağı hazırla
- Öğretmen yansıtmasını gözden geçir

### 6.4 Aylık

- Program profilinden aylık hedefleri seç
- Alan ve gelişim dengesini kontrol et
- Günlük planları aylık planla ilişkilendir
- Planlanan–uygulanan karşılaştırmasını gör
- Çocuk, program ve öğretmen yönünden değerlendirme yap
- Destekleme ve zenginleştirme kararlarını kaydet
- Aylık plan kontrolünü tamamla
- Portfolyo adaylarını seç

### 6.5 Dönem ve eğitim yılı

- Çocuk bazlı kanıt dosyasını incele
- EÇE Gelişim Raporu veya TYMM Beceri Edinim Raporu hazırla
- Veli görüşmesi için tarihli kanıt özeti oluştur
- Çocukla birlikte portfolyo seçkisi yap
- Eğitim yılı arşivini oluştur
- Yedek ve temiz kurulum geri yükleme tatbikatı yap
- Yeni dönem/sınıf kayıtlarını geçmişi bozmadan aç

## 7. Yeni bilgi mimarisi

Alt menü yalnız gerçek çalışan beş hedef içerecektir:

1. **Bugün**
2. **Sınıfım**
3. **Kayıt Ekle**
4. **Planlar**
5. **Belgeler**

### 7.1 Bugün

- Tarih, sınıf, program profili
- Devam durumu
- Bugünün gerçek planı
- Sıradaki etkinlik
- Kısa kanıt yakalama
- Tamamlanmamış kayıtlar
- Gün sonu değerlendirmesi

Plan yoksa sahte etkinlik gösterilmez:

> Bugün için plan eklenmedi. Aylık plandan bir günlük plan oluşturabilirsiniz.

### 7.2 Sınıfım

- Eğitim yılı ve kayıtlar
- Sınıftaki çocuklar
- Çocuk profili
- Kanıt zaman çizelgesi
- Devam geçmişi
- Program hedefleri ve kanıt durumu
- Medya ve izinler
- Portfolyo
- Sınıftan ayrılanlar

### 7.3 Kayıt Ekle

- Kısa gözlem notu
- Anekdot kaydı
- Çocuğun sözü
- Fotoğraf, video, ses veya çocuk ürünü
- Beceri/gelişim gözlemi
- Etkinlik değerlendirmesi
- Öğretmen notu

Hızlı kayıt ilk anda yalnız gerekli alanları ister. Program eşlemesi daha sonra
tamamlanabilir; kayıt kaybolmaz.

### 7.4 Planlar

- Aylık plan
- Günlük plan
- Etkinlikler ve öğrenme merkezleri
- Aile/toplum katılımı
- Okul dışı öğrenme
- Farklılaştırma
- Planlanan–uygulanan durumu
- Çocuk/program/öğretmen değerlendirmesi

### 7.5 Belgeler

- EÇE Gelişim ve Öğrenme İzleme Formu
- EÇE Gelişim Raporu
- TYMM Beceri Gözlem Formu
- TYMM Anekdot Kayıt Formu
- TYMM Beceri Edinim Raporu
- Aylık Plan Kontrol Çizelgesi
- Portfolyo
- Veli görüşmesi hazırlığı
- Devam özeti
- Aile bülteni
- Eğitim yılı arşivi
- Güvenli analiz paketi

Arşiv günlük alt menüde olmayacaktır. Ayarlar, Google bağlantısı, yedek ve
kurulum da ana pedagojik gezinmeden ayrılacaktır.

## 8. Kanıt yakalama sistemi

“Ham gözlem” ürün dilinden çıkarılır. Kullanıcıya **Gözlem notu** gösterilir.
Teknik veri modelinde ilk metin değişmeden saklanmaya devam eder.

### 8.1 Kanıt türleri

- Kısa not
- Anekdot kaydı
- Sistematik gözlem
- Çocuğun sözü
- Fotoğraf
- Video
- Ses kaydı
- Çocuk ürünü
- Etkinlik değerlendirmesi
- Aileden gelen bilgi

### 8.2 Kanıt yapısı

Her kayıt şu katmanları ayırır:

1. **Ne oldu?** Nesnel gözlenen olay
2. **Bağlam neydi?** Oyun, rutin, etkinlik, öğrenme merkezi, okul dışı ortam
3. **Çocuk ne söyledi/yaptı?** Özgün söz veya davranış
4. **Öğretmenin yorumu nedir?** Mesleki yorum
5. **Hangi programa bağlanıyor?** EÇE veya TYMM referansı
6. **Sonraki adım nedir?** Destekleme, zenginleştirme veya yeni deneyim
7. **Nerede kullanılabilir?** Portfolyo, aile belgesi, dönem raporu

### 8.3 Hız hedefi

- Kısa kanıt: en fazla 15 saniye
- Çocuk + not: en fazla üç karar noktası
- Toplu etkinlik bağlamı bir kez seçilir, ilgili çocuklara yeniden yazılmaz
- Ayrıntılandırma olay anında zorunlu değildir

## 9. Veri ve domain mimarisi

### 9.1 Kimlik ve kayıt

- `ChildProfile`
- `AcademicYear`
- `Term`
- `Classroom`
- `Enrollment`
- `FamilyContact`
- `ConsentRecord`
- `HealthAndSafetyRecord`
- `IndividualEducationPlanLink`

Çocuğun sınıfı doğrudan profil alanı olmayacaktır. Yıllar ve sınıflar arası tarih
`Enrollment` ile korunacaktır.

### 9.2 Program kataloğu

- `CurriculumProgram`
- `CurriculumCatalogVersion`
- `CurriculumReference`
- `CurriculumReferenceRelation`
- `AgeBand`
- `OfficialSource`

Her referans:

- program kimliği
- resmî kod
- tür
- başlık
- üst referans
- yaş aralığı
- kaynak URL’si
- kaynak sürümü
- yürürlük tarihi
- bütünlük özeti
- aktif/pasif durumu

alanlarını taşıyacaktır.

### 9.3 Planlama

- `MonthlyPlan`
- `DailyPlan`
- `Activity`
- `LearningCenterSetup`
- `OutOfSchoolLearningPlan`
- `FamilyCommunityParticipation`
- `DifferentiationPlan`
- `PlanCurriculumLink`
- `PlanExecution`
- `TeacherReflection`

### 9.4 Kanıt ve değerlendirme

- `EvidenceItem`
- `ObservationRevision`
- `ChildQuote`
- `EvidenceChildLink`
- `EvidenceActivityLink`
- `EvidenceCurriculumLink`
- `AssessmentJudgment`
- `NextStep`
- `PortfolioSelection`

### 9.5 Belge ve izlenebilirlik

- `ReportDraft`
- `ReportSection`
- `EvidenceCitation`
- `ExportPackage`
- `ExportManifest`
- `AuditEvent`

Her belge bölümü, kullandığı kanıt kimliklerini taşır. Belge üretildiğinde katalog
sürümü de kilitlenir.

## 10. Küresel ürünlerden alınan dersler

### Brightwheel, Famly, Lillio ve Procare

Güçleri: idari işleri, aile iletişimini ve günlük kayıtları birleştirmek.<br>
Sorunları: özellik ağırlığı, bulut bağımlılığı, öğretmenin ekran süresi ve küçük
kurum için maliyet/karmaşıklık.

MaarifOS kararı: ilk sürümde kurum ERP’si veya ödeme sistemi olmayacak. Öğretmen
modu finans ve yönetim gürültüsünden ayrılacak.

### Teaching Strategies GOLD ve COR Advantage

Güçleri: gözleme dayalı değerlendirme disiplini, ilerleme yapıları ve raporlar.<br>
Sorunları: eğitim gerektiren karmaşık hedef ağları ve dönem sonunda yığılan
dokümantasyon.

MaarifOS kararı: program kodu hızlı kayıt sırasında zorunlu olmayacak. Kanıt önce
kaydedilecek, eşleme daha sonra öğretmen tarafından onaylanacak.

### Storypark, Seesaw ve Kaymbu

Güçleri: öğrenme hikâyesi, multimedya portfolyo ve aile katılımı.<br>
Sorunları: kısmi/olmayan çevrim dışı destek, ayrı portfolyo işi, medya gizliliği ve
bazı mobil–masaüstü yetenek farkları.

MaarifOS kararı: portfolyo ayrı içerik girişi olmayacak; mevcut kanıtların öğretmen
ve çocuk tarafından seçilen görünümüdür.

### Pazarın ortak acıları

- Ekran zamanı çocukla geçirilen zamanı azaltıyor.
- Aynı kanıt iki veya üç sisteme yeniden giriliyor.
- Plan yazılımın şablonuna tekrar yazılıyor.
- Toplu işlem yetersiz.
- İnternet kesintisi kâğıda ve sonra yeniden girişe dönüyor.
- Gelişim sistemi öğretmene eğitim ve zaman verilmeden yükleniyor.
- Aile mesajlaşması mesai sınırını siliyor.
- Veri çıkışı, geçişi ve medya izinleri güven vermiyor.

## 11. Satın alınabilir ürün tezi

MaarifOS’un ücretli değeri “çok özellik” değildir:

> Öğretmenin bir kez oluşturduğu kanıtı plan, değerlendirme, portfolyo, veli
> görüşmesi ve dönem raporunda tekrar yazmadan, kaynağı görünür biçimde kullanmak.

### Ücretsiz güvenlik çekirdeği

- Tek sınıf
- Devam durumu
- Temel kanıt kaydı
- JSON yedek ve geri yükleme
- Veri dışa aktarma
- Uygulama kilidi
- Eğitim yılı arşivleme

### İlk ücretli değerler

- Program profilinden plan stüdyosu
- Gelişmiş kanıt ve hedef haritası
- EÇE/TYMM resmî belge taslakları
- Düzenlenebilir PDF ve portfolyo
- Medya dâhil şifreli tam yedek
- Çoklu sınıf ve eğitim yılı
- Gelişmiş tarih aralığı raporları
- Denetim/uyum kontrol merkezi
- Zaman kazandıran toplu işlemler

Temel yedekleme, geri yükleme ve veri taşınabilirliği ücret duvarına
konulmayacaktır.

## 12. Türkçe ürün dili sözlüğü

| Kullanılmayacak | Kullanılacak |
|---|---|
| Ham gözlem | Gözlem notu |
| Yerel veri kasası | Veriler bu cihazda saklanıyor |
| Manifest | Kullanıcıya gösterilmez |
| Bütünlük özeti | Yedek kontrolü |
| Mevcut veriye ekle | Kayıtları birleştir |
| Tümünü değiştir | Bu cihazdaki verilerin yerine yükle |
| Geç | Geç geldi |
| Yok | Gelmedi |
| Katılım durumu | Devam durumu |
| Aktif öğrenciler | Sınıftaki çocuklar |
| Arşivle | Sınıftan ayır |
| İlk sürümde Günüm aktiftir | Çalışmayan hedefle birlikte kaldır |

Terminoloji kuralı:

- Pedagojik anlatımda **çocuk**
- Resmî kayıt ve belge adlarında **öğrenci**
- Ürün içinde CSS `text-transform: uppercase` kullanılmaz
- Program ve form adları resmî yazımıyla gösterilir
- Her sürüm Türkçe dil denetimi ve öğretmen okumasından geçer

## 13. Görsel ve etkileşim yönü

Ürün çocuklara yönelik oyun uygulaması gibi görünmeyecektir. Kullanıcı yetişkin
bir uzmandır.

### Görsel ilkeler

- Profesyonel, sakin ve güven veren
- Yüksek bilgi okunabilirliği
- 14–16 px altına düşmeyen temel metin
- En az 44×44 px kritik dokunma alanı
- Süsleme yerine durum, kaynak ve sonraki eylem
- Gerçek program/sınıf/plan verisi
- Açık boş durumlar; sahte demo içeriği yok
- Telefon ve Windows için aynı bilgi mimarisi, uygun yoğunlukta farklı yerleşim

### Masaüstü

- Telefon maketi yok
- Sol gezinme + geniş çalışma alanı
- Plan ve belge düzenlemede iki sütunlu görünüm
- Tablo, filtre ve karşılaştırma için masaüstü yoğunluğu

### Telefon

- Gerçek ekranı doldurur
- Tek elle hızlı kayıt
- Alt gezinme ve kısa işlem menüsü
- Uzun form yerine aşamalı ayrıntılandırma

## 14. İlk gerçek dikey ürün dilimi

İlk teslim yalnız öğrenci eklemek veya yoklama yapmak olmayacaktır.

### Dikey dilim: Programdan dönem belgesine izlenebilir kanıt

1. Eğitim yılı ve sınıf oluştur
2. Kurumun programını seç: EÇE/2024 veya TYMM
3. Yaş grubunu seç
4. Resmî katalogdan aylık hedef seç
5. Hedeften günlük etkinlik oluştur
6. Uygulama sırasında çocuk için yapılandırılmış kanıt kaydet
7. Çocuk profilinde hedefe bağlı kanıtı gör
8. EÇE Gelişim Raporu veya TYMM Beceri Edinim Raporu taslağında bu kanıtın
   kaynağını gör

Bu dilim çalıştığında ürünün pedagojik çekirdeği kanıtlanmış olur.

### Kabul ölçütleri

- EÇE ve TYMM kodları aynı kayıtta karışmaz
- Katalog sürümü her bağlantıda kayıtlıdır
- Gözlenen olay ve öğretmen yorumu ayrıdır
- Kanıt çevrim dışı kaydedilir
- Yeniden açılışta tüm ilişkiler korunur
- Rapor cümlesinden kaynak kanıta gidilir
- Başka çocuk verisi rapora sızmaz
- Yedek/geri yükleme yeni varlıkların tamamını korur
- Tüm domain, migration ve gerçek tarayıcı testleri geçer
- Kullanıcı ekranında geliştirici terimi bulunmaz

## 15. Teslim sırası

### Aşama 0 — Görünür çöplüğü kaldır

- Telefon maketi ve cihaz seçici görünmez
- Statik günlük etkinlikler kaldırılır
- Çalışmayan menüler gizlenir
- Türkçe ve terminoloji sözlüğü uygulanır
- Gerçek kurulum boş durumu gösterilir

### Aşama 1 — Program ve sınıf temeli

- Eğitim yılı, dönem, sınıf, kayıt ve yaş grubu
- EÇE/TYMM program seçimi
- Sürümlü resmî katalog altyapısı
- Mevcut öğrenci ve yoklama verisinin güvenli migration’ı

### Aşama 2 — Plan stüdyosu

- Aylık plan
- Günlük plan
- Etkinlik ve öğrenme merkezi
- Farklılaştırma
- Aile/toplum ve okul dışı öğrenme

### Aşama 3 — Kanıt motoru

- Kısa not, anekdot, çocuk sözü ve ürün
- Nesnel gözlem–yorum ayrımı
- Plan, etkinlik ve program hedefi bağlantısı
- Çocuk zaman çizelgesi

### Aşama 4 — Değerlendirme ve belgeler

- Çocuk/program/öğretmen değerlendirmesi
- EÇE ve TYMM’ye özgü formlar
- Kanıt kaynaklı dönem raporu
- Portfolyo ve PDF

### Aşama 5 — Medya, izin ve tam kurtarma

- Kamera/galeri ve medya indeksi
- Kullanım amacı bazlı izinler
- Başka çocuk görünürlüğü denetimi
- Şifreli ZIP yedek ve atomik geri yükleme

### Aşama 6 — Kontrollü pilot

- Önce kurgu veri
- Emine Öğretmen ile gözlemli kullanım
- Görev süresi, tekrar giriş, hata ve ekran yükü ölçümü
- Gerçek çocuk verisi ancak gizlilik ve kurum karar kapısından sonra

## 16. Kalite kapıları

### Pedagoji

- Program profili ve sürüm görünür
- Resmî terminoloji doğru
- Kanıt–yorum ayrımı tam
- Çocuk sıralaması, tanı ve otomatik hüküm yok
- Her rapor ifadesi kanıta bağlı

### Kullanılabilirlik

- 20 çocuk devam kaydı medyanı ≤30 saniye
- Kısa kanıt medyanı ≤15 saniye
- Fotoğrafı çocuk/etkinlik/hedefe bağlama ≤4 dokunuş
- Kritik günlük görevlerin ≥%95’i yardımsız tamamlanır
- Ana menüde çalışmayan hedef sayısı 0

### Veri ve güven

- Test edilen senaryolarda veri kaybı 0
- Çevrim dışı çekirdek tam
- Mükerrer kayıt silinmez, incelemeye alınır
- Bozuk yedek mevcut veriye dokunmaz
- Başka öğrenci verisi sızıntısı 0
- Temiz kurulum geri yükleme tatbikatı başarılı

### Dil ve erişilebilirlik

- Geliştirici terimi 0
- Türkçe karakter ve büyük harf hatası 0
- WCAG 2.2 AA
- Klavye ve ekran okuyucu kritik akışları tamamlar
- Hareket azaltma tercihi desteklenir

## 17. Kaynak haritası

### Türkiye

- [TYMM Okul Öncesi Eğitim Programı](https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf)
- [EÇE/2024 güncellenmiş Okul Öncesi Eğitim Programı](https://tegm.meb.gov.tr/dosya/okuloncesi/guncellenenokuloncesiegitimprogrami.pdf)
- [2024/54 TYMM uygulama genelgesi](https://mevzuat.meb.gov.tr/dosyalar/2230.pdf)
- [2025–2026 eğitim ve öğretim yılı genelgesi](https://www.meb.gov.tr/meb_iys_dosyalar/2025_08/19093544_2025-2026_EYitim_ve_OYretim_YYlY_Genelge.pdf)
- [2026 Okul Öncesi Eğitim Kurumları Denetim Rehberi](https://tkb.meb.gov.tr/meb_iys_dosyalar/2026_05/69f49a7c1084d271650496_16-Okul_%C3%96ncesi_E%C4%9Fitim_Kurumlar%C4%B1_Denetim_Rehberi.pdf)
- [Beceri Edinim ve Gelişim Raporu kılavuzları](https://tegm.meb.gov.tr/www/okul-oncesi-egitim-beceri-edinim-raporu-ve-gelisim-raporu-ogretmen-bilgilendirme-kilavuzlari-yayimlandi/icerik/1132)
- [EÇE–TYMM karşılaştırmalı hakemli analiz](https://doi.org/10.37669/milliegitim.1708434)
- [2025 TYMM Ortak Metin güncellemesi](https://ttkb.meb.gov.tr/www/turkiye-yuzyili-maarif-modeli-ortak-metni-yeni-alan-becerileri-ile-birlikte-guncellendi/icerik/767)

### Uluslararası pedagoji

- [NAEYC: gözlem, belgeleme ve değerlendirme](https://www.naeyc.org/resources/position-statements/dap/assessing-development)
- [Head Start: devam eden çocuk değerlendirmesi](https://headstart.gov/child-screening-assessment/article/ongoing-child-assessment)
- [Head Start: nesnel anekdot ve gözlem kayıtları](https://headstart.gov/child-screening-assessment/child-observation-heart-individualizing-responsive-care-infants-toddlers/written-observations-jottings-anecdotal-notes)
- [İngiltere DfE: gereksiz belge yükünü azaltma](https://help-for-early-years-providers.education.gov.uk/support-for-practitioners/reducing-paperwork)
- [Development Matters](https://www.gov.uk/government/publications/development-matters--2/development-matters)
- [Te Whāriki: değerlendirme, planlama ve değerlendirme döngüsü](https://tewhariki.tahurangi.education.govt.nz/te-whariki-online/assessment-planning-and-evaluation/5637165598.p)

### Ürün örnekleri

- [Teaching Strategies GOLD](https://teachingstrategies.com/product/gold/)
- [Storypark Educators App](https://storypark.ca/feature/educators-app)
- [Famly Early Child Development](https://www.famly.co/us/platform/early-child-development)
- [Brightwheel Curriculum and Assessment](https://mybrightwheel.com/preschools/experience-curriculum/)
- [Kaymbu](https://www.kaymbu.com/)
- [COR Advantage](https://highscope.org/product/cor-advantage/)

## 18. Son ürün ilkesi

MaarifOS’un başarısı ekrandaki kart sayısıyla ölçülmeyecektir.

Başarı şudur:

- Öğretmen aynı bilgiyi ikinci kez yazmıyor.
- Ekran çocukla geçirilen zamanı azaltmıyor.
- Her pedagojik yorumun kanıtı var.
- EÇE ve TYMM birbirine karışmıyor.
- İnternet yokken sınıf işi durmuyor.
- Dönem belgesi sıfırdan yazılmıyor.
- Veri kullanıcıya ait ve geri getirilebilir.

Bu koşullar sağlanmadan ürün “satılabilir”, “kusursuz” veya “hazır” olarak
tanımlanmayacaktır.
