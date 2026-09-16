# MaarifOS erişilebilir PDF yazı tipi

`MaarifOSSans-Regular.ttf`, uygulamanın kilitli `@fontsource/roboto@5.2.10`
paketindeki aşağıdaki iki SIL Open Font License 1.1 kaynağından üretilmiştir:

- `roboto-latin-400-normal.woff2` — SHA-256
  `425C0713A8176F92273D378599C7EAC57DE7FAFABD4BD0ED457B70EB8F80D371`
- `roboto-latin-ext-400-normal.woff2` — SHA-256
  `5725EACCA97303D8BCE26F76CFCAEE4393295BBF93C1EB6C3E5E4F260B2DA189`

Kaynak WOFF2 dosyaları fontTools `4.62.1` ile TrueType'a açılmış ve `pyftmerge`
ile Latin + Latin Extended kapsamı tek fontta birleştirilmiştir. Üretilen dosyanın
SHA-256 özeti:

`FACE805FDEA05B1B45A7DB08F4422B1794B0940E4C7126C25EE28D766E073C61`

Telif bildirimi ve tam lisans metni aynı klasördeki `Roboto-OFL-1.1.txt`
dosyasındadır. PDF motoru kapsam dışı bir Unicode karakteri sessizce bozmaz;
belge üretimini açık bir hata ile durdurur.

## Sınıf listesi 6.0 gerçek kalın fontu

`MaarifOSSans-Bold.ttf`, aynı kilitli `@fontsource/roboto@5.2.10` paketinin
700 ağırlıklı normal Latin ve Latin Extended kaynaklarından fontTools 4.62.1
`TTFont` açılımı ve `Merger` ile üretildi. Çift çizim veya çizgi kalınlaştırmayla
taklit kalınlık kullanılmaz; TTF OS/2 `usWeightClass` değeri 700'dür.

- `roboto-latin-700-normal.woff2` SHA-256:
  `b9d66d1708156f765ada51939bc24ed259dafa69eb631b36e443680fe9e15879`
- `roboto-latin-ext-700-normal.woff2` SHA-256:
  `7673803a2d402018b1f726dded5bf2dbf2be4307039e8718f4bea654d6eca249`
- Dağıtılan `MaarifOSSans-Bold.ttf` SHA-256:
  `dd4aa64a09bfcb5723dadae87b2376547558a7578134deae545c772f559cef3d`

Aynı `Roboto-OFL-1.1.txt` telif/lisans bildirimi bu dosya için de geçerlidir.
Font yalnız kalın başlık isteyen açık belge teması kullanıldığında yüklenir.
PDF içinde ayrı FontFile2, CIDFontType2, Unicode eşlemesi ve gerçek font ölçüleri
bulunur. Kaynak mevcut değilse, bozuksa veya kalınlık ağırlığı doğrulanmazsa
üretim Türkçe hata verir; sessiz regular fonta dönüşmez. Temasız eski belge yolu
bu fontu yüklemez ve önceki PDF baytlarını korur.
