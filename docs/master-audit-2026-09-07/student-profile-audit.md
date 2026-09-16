# Öğrenci profili, soyadı önerileri ve adres — 7 Eylül 2026

Bu denetim yeni öğrenci ekleme, profil düzenleme ve Excel önizlemesini birlikte izler. Kapsam, kullanıcının çocuğun soyadından anne/baba soyadı önerisi ve görünür adres girişi talebidir. Gerçek öğrenci verisi test ve ekran görüntülerine alınmadı; tüm kabul örnekleri kurgusaldır. Kalıcı şema değiştirilmedi: adres `careDetails.homeAddress`, yakınlar mevcut `contacts` içindedir.

## Bulgular ve bu teslimdeki davranış

| Kimlik | Sınıf / öncelik | Önceki somut sorun | Uygulanan davranış | Kod kanıtı | Kabul ölçütü / yaklaşık efor |
|---|---|---|---|---|---|
| SP-01 | EKSİK / P1 | Anne/baba yalnız adıyla girildiğinde çocuğun soyadını kullanmak için her akışta tekrar yazmak gerekiyordu. Otomatik birleştirme ise farklı soyadını bozabilirdi. | Yeni kayıt, Yakınlar ve Excel önizlemesinde ayrı ve düzenlenebilir **Soyadını ekle** eylemi var. Eyleme basılmadan kayıt değişmez. Çocuğun soyadı sonradan değişse de yakınların mevcut adları değişmez. Üçüncü kişiye öneri üretilmez. | `app/src/core/domain/parent-surname-suggestion.ts:11`; `app/src/features/students/ParentSurnameSuggestion.tsx:6`; `app/src/features/classroom/ClassroomToolsSheets.tsx:268`; `app/src/features/students/StudentProfileSafetyPanels.tsx:423`; `app/src/features/students/StudentImportSheet.tsx:88` | Selin → Selin Yılmaz açık seçimle; Selin Öztürk korunur; üçüncü kişi Zeynep değişmez. Saf yardımcı + üç yüzey + mobil kabul: 0,5–1 gün. |
| SP-02 | KOPUK / P1 | Adres veride bulunmasına rağmen yeni öğrenci formunda yoktu; profilin güvenlik ayrıntısında aranması gerekiyordu. | Çocuk adının ardından doğrudan **Ev adresi** çok satırlı alanı; profilde Bilgiler ve Yakınlar içinde aynı adres görünür. Mevcut güvenlik alanıyla aynı form state'ine bağlıdır. Ayrı adres kopyası veya yeni veri alanı yoktur. | `app/src/features/students/StudentAddressField.tsx:5`; `app/src/features/classroom/ClassroomToolsSheets.tsx:173`; `app/src/Prototype.tsx:5820`; `app/src/Prototype.tsx:12892`; `app/src/features/students/StudentProfileSafetyPanels.tsx:363` | Ekle → Bilgiler → Yakınlar → kaydet → yeniden yükle adresi aynı kalır; alerji/özel not gibi diğer bakım alanları korunur. 0,5 gün. |
| SP-03 | YANLIŞ / P1 | Hızlı kayıt, anne adı bilinse bile telefon olmadan bu bilgiyi kaydetmeyi engelliyordu; “Annesi/Babası” serbest metni üçüncü kişi sayılabiliyordu. | Ad ve telefon bağımsızdır. Telefon varsa doğrulanır; yoksa öncelikli/acil iletişim bayrakları açılmaz. Anne/Annesi ve Baba/Babası Türkçe locale ile aynı türe bağlanır. | `app/src/Prototype.tsx:5821`; `app/src/Prototype.tsx:5843`; `app/src/core/domain/parent-surname-suggestion.ts:3`; `app/src/features/classroom/ClassroomToolsSheets.tsx:134` | “Annesi”, Selin Öztürk ve boş telefon anne alanına kaydolur. Geçersiz dolu telefon yine reddedilir. 0,25 gün. |
| SP-04 | EKSİK / P1 | Excel adresi ve özel notlar tek satırlı girişte düzenleniyordu; uzun/çok satırlı metinlerin gözden geçirilmesi güçtü. | Adres ve iki özel not alanı çok satırlı, alan sınırlarıyla uyumlu ve açık `label/id` bağıyla erişilebilir. Soyadı önerisi dahil her düzenleme satır seçimini kaldırır; kayıttan önce yeniden seçim gerekir. | `app/src/features/students/StudentImportSheet.tsx:46`; `app/src/features/students/StudentImportSheet.tsx:79`; `app/src/features/students/student-import.css` | BIFF8 `.xls` içindeki iki satırlı adres korunur; düzenlenen satır yeniden seçilene kadar ekleme kapsamından çıkar; seçilmeyen soyadı önerisi kayda girmez. 0,5 gün. |
| SP-05 | YANLIŞ / P2 | 320 piksel profilde beş sekmenin tek satıra sıkışması “Güvenlik” sözcüğünü ortadan bölüyordu. | 360 piksel ve altında sekmeler üç sütuna, gerektiğinde iki satıra yerleşir; sözcükler okunur kalır. Yeni öneri eylemleri en az 44 piksel yüksekliğindedir. | `app/src/prototype.css:4948`; `app/src/features/students/student-profile-entry.css:2` | 320/390 pikselde yatay belge taşması yok; adres, eylemler ve sekmeler okunabilir. 0,25 gün. |
| SP-06 | YANLIŞ / P1 | Aynı adlı profil değişikliksiz kaydedilince kayıt başarılı olsa da `data-state=closed` boş dialog başlığı DOM ve erişilebilirlik ağacında kalıyordu. Yalnız isim değişimiyle kapanışı ölçen test bu kusuru gizliyordu. | Profil kapanışında tamamlanmış modal örneği açık/kapalı key ile kaldırılır. Korunan BottomSheet çalışma zamanı değiştirilmedi; yeniden açılış temiz yüzey oluşturur. | `app/src/Prototype.tsx:12094`; `app/tests/student-parent-address-ui.spec.ts` | Kaydetten sonra dialog sayısı sıfır; aynı öğrenci ve sonraki öğrenci tekrar açılır. Sabit ve ilerleyen saatle eski kusur tekrarlandı; veri kaybı olmadı. 0,25 gün. |

## Sözleşme ve kararlar

- Öneri bir veri çıkarımıdır; açık düğme eylemi olmadan saklanmaz. Mevcut çok sözcüklü yakın adı zaten farklı bir soyadı içerebileceğinden öneri gösterilmez. Bu, çift isim ile soyadını tahminle ayırmayı önler. Yakın adı her zaman elle düzenlenebilir.
- Çocuğun tek satırlı adında uygulamanın mevcut `splitStudentDisplayName` sözleşmesi kullanılır; profilde ayrı `lastName` alanı doğrudan kaynak olur. Yeni bir isim ayrıştırma algoritması veya alan geçişi eklenmez.
- Adres en fazla 500 karakterdir; birden çok satır korunur. Aynı `careDetails` nesnesi kısmi spread ile güncellenir; diğer bakım, aile ve özel not alanları temizlenmez.
- Excel öneri uygulaması, mevcut mükerrer inceleme onayını da geçersiz kılan ortak düzenleme yolundan geçer. Önceki satır/UUID inceleme kökeni sözleşmesi değişmez.
- Adresin dolu olması, anne/baba adının bilinmesi veya aynı soyadını taşıması teslim alma yetkisi, velayet veya acil kişi statüsü üretmez.

## Kabul kanıtı

- `tests/features/parent-surname-suggestion.test.mjs`: girdiyi değiştirmeme, Türkçe harfler, ilişki eşdeğerleri, farklı/çok sözcüklü soyadı, üçüncü kişi ve sınırlar.
- Aynı koşumdaki öğrenci domain + hızlı giriş + güvenlik UI sözleşmeleri: **26/26 geçti**.
- `tests/student-parent-address-ui.spec.ts`: 320/390 pikselde yeni kayıt, açık öneri, farklı soyadı, üçüncü kişi, adres güncelleme, diğer notları koruma, `.xls` önizleme, satır onayını yenileme, yeniden yükleme ve modal kapanış/yeniden açılış: **4/4 geçti**.
- `tests/student-quick-entry.spec.ts`: 320×568 ve 390×844 hızlı kayıt, Enter ile kaydet ve isteğe bağlı bilgi saklama: **3/3 geçti**. Birleşik son koşum **7/7, 2,3 dakika**; port 4182 ve ayrı sonuç klasörü kullanıldı.
- Son görsel denetimde Excel adres/not alanları tam genişliğe alındı. Bu mizanpaj değişikliğinden sonra 320/390 Excel kabulü **2/2, 35,4 saniye** tekrar geçti; 0.25.0 TypeScript kontrolü de temiz. Son ekran görüntülerinde çok satırlı adres ve notlar okunarak denetlendi.
- TypeScript ve **36 korunan çalışma zamanı dosyasının** bütünlük denetimi geçti. Korunan runtime dosyaları değiştirilmedi.
- Görsel kanıtlar: `app/output/playwright/master-audit-2026-09-07/student-profile-320.png`, `student-profile-390.png`, `student-import-address-320.png`, `student-import-address-390.png`.

## Sonraki tasarım işleri — bu teslimde uygulanmayan öneriler

| Öneri | Gerekçe | Öncelik / kabul / efor |
|---|---|---|
| İsteğe bağlı ayrı yakın adı/soyadı düzenleyicisi | Çok sözcüklü isim ile farklı soyadını güvenle ayırmak mümkün değil. Gelecekte kullanıcı açık ayrı alanlar seçerse iki isimli annelere de öneri verilebilir; mevcut birleşik adların körlemesine göçü yapılmamalı. | P2; eski adlar kayıpsız kalmalı, yedek migration gerekli; 1–2 gün. |
| Hızlı girişte ikinci yakın için aşamalı ek bölüm | Mevcut hızlı giriş bir yakın alıyor; anne/baba/üçüncü kişinin tamamı profil içinde mevcut. Toplu girişte ikinci pencere açma sayısı azaltılabilir. | P2; ilk kayıt eylemi 320×568 ekranda erişilebilir kalmalı; 0,5–1 gün. |
| Eksik iletişim bilgisini doğrulanabilir durum olarak gösterme | Telefonun bilinmemesi artık adı kaybetmiyor. Öğretmen isterse daha sonra tamamlamak üzere bir takip durumu kullanılabilir; bilinmeyen aile bilgisi olumsuz etiketlenmemeli. | P2; açık öğretmen eylemi, notlardan hassas otomatik etiket çıkarmama; 0,5–1 gün. |

Sistem matematiği ve üyelik tarihçesi bulguları ayrı `system-math-audit.md` dosyasındadır. Üyelikte gerçek yeniden kayıt ile yanlışlıkla silmeyi geri alma ayrımı alt görevde düzeltildi; 27 Node testi ve şifreli IndexedDB karşı-depo yedek/restore testi geçti.
