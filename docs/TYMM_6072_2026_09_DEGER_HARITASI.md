# TYMM 60–72 Ay · Eylül 2026 Değer Haritası

**Durum:** `content.v3.json` makine doğrulamalı iç pilot paketine işlendi; altı rollü insan incelemesi bekliyor, yayımlanmış içerik değildir.
**Üst norm:** `DEGERLER_PEDAGOJISI_ANAYASASI.md`
**Korunan eski sürüm:** `premium-content/releases/tymm-6072/2026-09/content.v2.json` değiştirilmeyecektir.

## Kaynak otoritesi

- Resmî kaynak: [MEB TYMM 2024 Okul Öncesi Eğitim Programı](https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf)
- Kaynak SHA-256: `77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09`
- Ek-14 kanonik sayfa numarası: PDF `PageLabel` / görüntüleyici 1-based / basılı footer `324–332`
- Fiziksel 0-based indeks gerekirse `sourcePage - 1` olarak türetilir.
- İçindekiler tablosundaki “Ek-14 … 325” kaydı bir sayfa kaymıştır; provenance için kullanılmaz.

## On iki etkinliğin eşleme özeti

| Etkinlik | Tasarım yönü | Ana değer | Çatı | Destek değerleri | Doğrulanmış Ek-14 göstergeleri | Kültürel köprüler |
|---|---|---|---|---|---|---|
| Arkadaşlık Hikâyesini Birlikte Kuruyoruz | `value_led` | D4 Dostluk | D14 | D8, D15 | D4.1.1, D4.2.1, D4.4.3 · s.325 | aile/sıla-i rahim/komşuluk; edep-nezaket |
| Sınıfımızın Güvenli Yerler Haritası | `learning_outcome_led` | D13 Sağlıklı Yaşam | D16 | D5 | D13.3.5 · s.329; D16.1.3 · s.330; D5.1.3 · s.326 | emanet |
| Sessizce Katılmanın Yolları | `value_led` | D8 Mahremiyet | D1 | D11, D14 | D8.1.1, D8.1.3 · s.327; D11.1.5 · s.328 | kul hakkı; edep-nezaket |
| Günün Ritmini Birlikte Kuruyoruz | `learning_outcome_led` | D12 Sabır | D16 | D3 | D12.1.3 · s.328; D3.2.1 · s.325; D16.1.1 · s.330 | helal emek/çalışkanlık |
| Malzemelerin Evi Neresi? | `value_led` | D16 Sorumluluk | D16 | D6, D17 | D16.2.2 · s.330; D6.2.2 · s.326; D17.3.4 · s.331 | emanet; şükür-kanaat-israf etmeme |
| Geçiş Sesleri Atölyesi | `learning_outcome_led` | D14 Saygı | D14 | D5, D11 | D14.1.1 · s.329; D5.1.3 · s.326; D11.1.5 · s.328 | edep-nezaket |
| Benim İçin Erişilebilir Sınıf | `value_led` | D1 Adalet | D1 | D5, D16 | D1.2.4 · s.324; D5.1.3 · s.326; D16.3.3 · s.330 | kul hakkı; imece-yardımlaşma |
| Herkes İçin Bir Seçim Yolu | `value_led` | D11 Özgürlük | D1 | D8, D14 | D11.1.1, D11.1.2 · s.328; D8.1.1 · s.327 | kul hakkı; edep-nezaket |
| Kapıdan Merkeze Erişilebilir Rota | `learning_outcome_led` | D5 Duyarlılık | D1 | D13, D16 | D5.1.3 · s.326; D13.3.5 · s.329; D16.1.3 · s.330 | kul hakkı; imece-yardımlaşma |
| Eylül Kanıtları Müzesi | `learning_outcome_led` | D6 Dürüstlük | D14 | D8, D10 | D6.2.1 · s.326; D8.1.1 · s.327; D10.1.6 · s.328 | emanet; edep-nezaket |
| Ekim’e Taşıdığımız Sorular | `learning_outcome_led` | D3 Çalışkanlık | D16 | D10 | D3.3.2 · s.325; D10.1.6 · s.328; D16.1.1 · s.330 | helal emek/çalışkanlık |
| Sınıf Anlaşmamızın Birçok Dili | `value_led` | D14 Saygı | D14 | D1, D16 | D14.1.10 · s.329; D1.2.1 · s.324; D16.3.3 · s.330 | kul hakkı; imece-yardımlaşma |

## Denge sonucu

- Birincil değerlerde 11 benzersiz değer vardır: `D1, D3, D4, D5, D6, D8, D11, D12, D13, D14, D16`.
- Ana ve destekleyici değerlerin toplamında 14 benzersiz değer vardır; `D10, D15, D17` de kapsama katılır.
- Çatı dağılımı tam dengelidir: `D1 = 4`, `D14 = 4`, `D16 = 4` etkinlik.
- Tasarım yönü dengelidir: `6 value_led`, `6 learning_outcome_led`.
- Her etkinlik tam bir ana değer, bir çatı ankrajı ve en fazla iki destek değeri taşır.
- Bu aylık dağılım resmî “ayda en az dört değer” eşiğini aşar; dönemlik D1–D20 kapsamı ayrıca yıllık/dönemlik plan kapısında doğrulanacaktır.

## Runtime'a geçiş kapısı

Bu harita doğrudan `content.v2.json` içine yazılmadı. `content.v3.json` için aşağıdaki teknik kapılar karşılandı:

1. Ek-14'ün bütün okul öncesi eylemleri kod–üst eylem–metin–sayfa eşleşmesiyle tam katalog hâline getirildiğinde,
2. etkinlik mapping codec'i bu tam kataloğa karşı byte-for-byte doğrulama yaptığında,
3. mapping kimliği, sürümü ve değer anayasası snapshot'ı tanımlandığında,
4. alternatif etkinliğin değer snapshot'ı günlük uygulanan etkinlikle atomik taşındığında,
5. aylık ve dönemlik kapsam testleri geçtiğinde,
6. eski v2 planları `legacy-unmapped` olarak değiştirmeden okunabildiğinde

Paket `machine_validated_pending_human_review` durumundadır. Manifest, kanonik
payload, v2 öncül dosyası, anayasa ve Ek-14 katalog byte özetlerini birbirine
bağlar. Bu teknik kabul; erken çocukluk, uygulayıcı okul öncesi öğretmen, çocuk
hakları, TYMM, içerik/Türkçe dili ve Türk-İslam kültürü/ilahiyat insan
incelemelerinin yerine geçmez.
