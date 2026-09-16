# Gerçek çocuk verisi güvenlik kapısı · 1 Eylül 2026

## Karar: NO-GO

MaarifOS `0.22.1` sentetik veriyle ürün ve öğretmen akışı testi için
kullanılabilir. Gerçek çocuk adı, sözü, gözlemi, sağlık/yoklama notu, medya veya
veli bilgisiyle pilot henüz güvenli kabul edilmez.

## Neden

- Öğrenci kayıt gövdesi şifreli kasa kapsamındadır; diğer kanonik koleksiyonların
  tamamı aynı at-rest korumaya taşınmamıştır.
- Gözlem `rawText` ve `childQuote`, yoklama notları, plan/değerlendirme,
  portfolyo, medya ve rapor dilimleri cihaz veritabanında açık kalabilir.
- Uygulama PIN'i erişim kilididir; tek başına depolama şifrelemesi değildir.
- Ortak erişim kodu kullanıcı kimliği, MEB personel hesabı veya tenant sınırı
  değildir.
- Aynı-origin çalışan yayımlanmış JavaScript istemci verisinin güven köküdür;
  XSS, fiziksel cihaz ve OS keystore kabulü ayrıca gerekir.

## GO için zorunlu kanıt

1. Bütün hassas koleksiyonların AES-256-GCM, benzersiz IV ve kapsamlı AAD ile
   şifrelenmesi.
2. Kesinti, migration yarışı, rollback, replay, anahtar kaybı ve kriptografik
   silme testleri.
3. Şifreli yedeğin temiz ikinci cihazda tam veri mutabakatıyla geri yüklenmesi.
4. Bağımsız güvenlik/kriptografi incelemesi ve fiziksel iOS/Android kabulü.
5. KVKK sorumlulukları, saklama süresi, veri silme ve olay müdahalesi için
   yazılı kurum kararı.

Bu kapılar kapanmadan canlı sitenin yayımlanması, gerçek çocuk verisi kullanım
onayı anlamına gelmez.

