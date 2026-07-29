# MaarifOS marka varlıkları

## Kanonik kaynaklar

- `originals/maarifos-logo-2026-07-27-original.png`: Kullanıcının 27 Temmuz 2026 tarihinde verdiği, değiştirilmemiş kaynak dosya.
  - SHA-256: `7B1F0BC7634EE0C72F71B38929C749AC5250FFBEBA78D73EE14E12F765CFD50F`
- `maarifos-logo-master.png`: Uygulama mağazası ve PWA kullanımı için düzenlenen ana logo.
  - SHA-256: `D307460FF8B717FBF4574B946696EDBA9677DE43A3CF4E815E42895E5715A6F7`

Orijinal dosya hiçbir türev üretiminde üzerine yazılmaz. Dağıtım dosyaları
`public/assets/brand/` altında ana logodan üretilir.

## Düzenleme kararı

Merkezdeki kitap, büyüyen insan/ağaç, yapraklar, hilaller ve yıldız korunmuştur.
Kaynak görseldeki siyah köşeler kaldırılmış, lacivert zemin tam kareye
genişletilmiş ve simge Android maskable güvenli alanına alınmıştır. Metin,
filigran veya yeni sembol eklenmemiştir.

## Dağıtım türevleri

- `maarifos-icon-192.png`: PWA standart ikon
- `maarifos-icon-512.png`: Yüksek çözünürlüklü PWA standart ikon
- `maarifos-icon-maskable-512.png`: Android maskable ikon
- `apple-touch-icon-180.png`: iOS ana ekran ikonu
- `favicon-16.png`, `favicon-32.png`, `favicon-48.png`: Tarayıcı ikonları

Bu türevler değiştirildiğinde `manifest.webmanifest`, `index.html`, `sw.js` ve
PWA sözleşme testleri birlikte güncellenmelidir.
