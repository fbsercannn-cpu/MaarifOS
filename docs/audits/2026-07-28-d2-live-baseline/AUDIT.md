# D2 seçili çocuklar gözlem akışı — canlı mobil denetim

Tarih: 2026-07-28  
Yüzey: MaarifOS yerel PWA, `native=1`  
Akış: Ana sayfadaki çocuktan hızlı gözlem → seçili çocuklar → tüm sınıf →
öğretmen doğrulaması → atomik kayıt

## 1. Mevcut tek çocuk gözlemi

Kanıt: `02-current-quick-observation.jpg`

Sağlık: Temel akış kullanılabilir; tek çocuk, nötr başlangıçlar, gözlem türü,
10 alan ve 30 kategori-bağlı bakış istemi mevcut. En önemli eksik, aynı olayda
birlikte gözlenen çocukları güvenle seçme ve topluca kaydetme yoluydu.

## 2. Seçili çocuk kapsamı

Kanıt: `03-selected-children-scope.jpg`

Sağlık: İyi. “Bir çocuk / Seçili çocuklar” ayrımı, tüm sınıf seçimi, görünür
seçim sayacı ve öğrenci kartlarındaki işaretler birlikte anlaşılır. Toplu
işlemin tek çok-öğrencili kanıt değil, ayrı çocuk kanıtları ürettiği görünür.

## 3. Kayda hazır durum

Kanıt: `04-selected-children-ready.jpg`

Sağlık: İyi. Kaydet düğmesi en az iki çocuk, ham metin ve “her birini
gözlemledim” öğretmen doğrulaması tamamlanmadan açılamıyor. Taslak durumu
görünür; sabit kayıt alanı metin girişinin üzerinde kalıyor. Erişilebilir adlar
ve `aria-pressed` durumları DOM incelemesinde doğrulandı.

## 4. Kayıt sonucu

Kanıt: `05-selected-children-saved.jpg`

Sağlık: İyi. Üç çocuk için ana sayfada ayrı “1 gözlem” sayacı ve toplam
“3 gözlem bekliyor” durumu oluştu. Canlı kayıt, yeniden açılış ve yedek/geri
yükleme otomasyonlarında korundu.

## En yüksek etkili karar

Toplu kullanıcı eylemi kanıt modelini çok-öğrencili hâle getirmedi. Sistem tek
transaction içinde öğrenci başına ayrı UUID'li gözlem üretiyor; ortak `batchId`
yalnız işlemsel ilişkiyi tutuyor. Bir çocuk kapsam dışıysa bütün işlem geri
alınıyor.

## Kanıt sınırı

Ekran görüntüleri görsel hiyerarşi ve görünür durumları kanıtlar; tam
erişilebilirlik uyumu iddiası değildir. Dar ekran, yeniden açılış, klavye alanı,
rollback ve çevrimdışı davranış otomatik testlerle ayrıca doğrulanır.
