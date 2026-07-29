# Mobil PWA Kullanıcı Deneyimi

## Ana hedef

Öğretmen sınıf içindeyken uygulamaya uzun süre bakamaz. En sık işlemler tek elle, az metinle ve birkaç dokunuşla tamamlanmalıdır.

## Alt menü

- Günüm
- Çocuklar
- Kayıt Ekle
- Arşiv
- Raporlar

## Hızlı kayıt düğmesi

Ekranın erişilebilir bölümünde sabit `+` düğmesi:
- Gözlem
- Fotoğraf
- Yoklama olayı
- Etkinlik
- Hatırlatma

## Günüm ekranı

Sıralama:
1. Tarih ve sınıf
2. Yoklama kartı
3. Bugünün planı
4. Hızlı gözlem
5. Etiketsiz fotoğraflar
6. Hatırlatmalar
7. Gün sonu tamamla

`Öğrenci ara` eylemi ana ekrandan sınıf aramasını açar. Arama ad veya soyadı
Türkçe büyük/küçük harf ve diakritik farklarından bağımsız eşleştirir.

## Yoklama etkileşimi

- Tüm öğrenciler varsayılan geldi.
- Gelmeyene dokununca kırmızı yerine sakin ve erişilebilir bir durum göstergesi.
- Uzun basma ile geç gelme/erken ayrılma seçenekleri.
- Toplu kaydet zorunluluğu olmadan anında yerel kayıt.
- Yanlış işlem için geri al bildirimi.

## Gözlem etkileşimi

Akış:
1. Öğrenci seç
2. Metni yaz/dikte et
3. Kaydet

Etiketler kayıt sonrası isteğe bağlı tamamlanabilir. Böylece olay anı kaçırılmaz.

## Görsel dil

- Yuvarlatılmış fakat aşırı oyuncak görünmeyen kartlar
- Sıcak ve sakin renk ailesi
- Az sayıda ana renk
- Gerçek fotoğrafların önüne geçmeyen arka plan
- Öğrenci profilinde büyük fotoğraf yerine gizliliği koruyan küçük avatar seçeneği
- Öğrenci profilinde ad ve soyad için ayrı girişler
- Gözlem ve portfolyo akışında yalnız kanıt bulunan aylar; aylar aktif eğitim
  yılına bağlı `YYYY-MM` anahtarı ve “Eylül 2026” gibi açık etiketle gösterilir
- Başarı veya hata mesajlarında korkutucu dil yok

## Öğrenci portfolyosu

- Portfolyo, çocuk profilinde Akış ile Bilgiler arasında birincil sekmedir.
- Öğretmen mevcut gözlemi yeniden yazmadan seçkiye ekler.
- Seçim “Öğretmen seçti” veya “Çocukla birlikte” olarak kaydedilir.
- Öğretmen notu, çocuğun seçim sözü ve aile katkısı ayrı girişlerdir.
- Kaynak gözlem kartı seçki notlarının üstünde görünür ve düzenlenemez.
- Boş ay için klasör veya sıfır sayılı dekoratif kart üretilmez.
- Seçkiden kaldırma kaynak kanıtı silmez; seçim geçmişi geri alınabilir biçimde
  korunur.
- Arayüz puan, yıldızlı başarı, çocuk sıralaması veya otomatik gelişim hükmü
  göstermez.

## Tam ekran ve kurulum

- Web app manifest
- Standalone display
- Uygulama ikonu
- Açılış ekranı
- Kurulum yardım ekranı
- Güncelleme sonrası veri migration kontrolü

## Güvenli güncelleme deneyimi

- Yeni service worker hazır olduğunda açık plan veya gözlem formu zorla
  yenilenmez. Ana ekranda `Yeni sürüm hazır` kartı gösterilir ve öğretmen
  güvenli anda `Şimdi güncelle` eylemini seçer.
- Güncel kod ilk açıldığında sürüm numarası, İstanbul sivil yayın tarihi ve
  somut sürüm notları `MaarifOS güncellendi` penceresinde bir kez gösterilir.
- Aynı sürüm notları daha sonra Ayarlar içindeki `Sürüm ve yenilikler`
  kartından yeniden okunabilir.
- Sürüm onayı yalnız cihaz-özel `localStorage` alanında teknik metadata olarak
  tutulur; öğretmen ve çocuk verisi içermez, yedeğe taşınmaz.
- Tamamen boş yeni kurulumda yanıltıcı bir güncelleme bildirimi gösterilmez.
  Sürüm kaydı bulunmayan fakat yapılandırılmış sınıfı olan eski kurulum ilk
  yükseltme bildirimini bir kez görür.

Yeni yayın hazırlanırken `app/src/release.ts` içindeki `CURRENT_RELEASE`,
`app/package.json` ve `app/package-lock.json` sürümleri birlikte yükseltilir.
Kalite kapısı bu üç kaynağın, yedek manifestinin ve sürümlü service worker
URL'sinin aynı uygulama sürümünü kullanmasını doğrular.

## Performans bütçesi

- İlk ekran hızlı açılmalı.
- Uzun öğrenci listelerinde sanallaştırma gerekebilir.
- Galeri küçük önizlemeleri kullanmalı.
- PDF üretimi sırasında ilerleme göstergesi bulunmalı.
