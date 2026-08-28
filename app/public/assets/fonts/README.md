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
