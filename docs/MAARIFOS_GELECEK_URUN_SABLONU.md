# MaarifOS Gelecek Ürün Karar Şablonu

Durum: Stratejik kayıt — mevcut P0 okul öncesi yayın akışını değiştirmez.

## 1. Kimlik ve unvan sözleşmesi

- Temel rol: **Okul Öncesi Öğretmeni**.
- Seçmeli kariyer unvanı: **Uzman Öğretmen** veya **Başöğretmen**.
- Kullanıcının seçmediği unvan otomatik atanmaz.
- Maliye, GİB, Gelir Uzmanı ve vergi kimlikleri ürün metninde kullanılmaz.
- MEB/TYMM adları yalnız doğrulanmış program, mevzuat veya kaynak atfı olarak korunur; MaarifOS resmî MEB ürünü gibi gösterilmez.

## 2. Web sitesi sınırı

`.com`: marka hikâyesi, güven, özellik tanıtımı, bekleme listesi ve mağaza yönlendirmesi.

`.net`: tanıtımlı etkileşim örnekleri, destek ve ileride üyelik portalı; gerçek sınıf kaydı oluşturmaz.

Her iki sitede de:

- örnek veriler `Demo / tanıtım verisi` olarak görünür;
- tam uygulama işlevleri ve gerçek çocuk verisi bulunmaz;
- ziyaretçiye webden indirip sınıfta doğrudan kullanabileceği izlenimi verilmez;
- birincil eylem mağaza uygulamasına veya bekleme listesine gider.

## 3. Kendi DeepSeek anahtarını kullanma

Gelecek kabul başlıkları:

- kullanıcıya ait anahtarın güvenli eklenmesi, doğrulanması, değiştirilmesi ve silinmesi;
- anahtarın paket, telemetri, hata raporu ve loglara girmemesi;
- kullanım/kota/maliyet sorumluluğunun açık anlatımı;
- çocuk PII'sini varsayılan olarak istekten çıkaran yerel redaksiyon;
- bağlantı kesintisinde temel öğretmen işlerinin AI olmadan sürmesi;
- AI çıktısının öğretmen onayı olmadan resmî kayda dönüşmemesi.

## 4. Mağaza ve üyelik modeli

- Google Play ve Apple App Store dağıtımı.
- Telefon numarası ve Google hesabıyla giriş; platform gerektirirse Apple ile giriş.
- Bir haftalık açık tarihli deneme.
- Yıllık ana üyelik; indirimli üç ve beş yıllık seçenekler mevzuat ve mağaza kuralları doğrulandıktan sonra.
- Satın alma geri yükleme, hesap/cihaz değişimi, iptal, iade, süre sonu ve çevrimdışı hak doğrulama akışları.
- Mağaza dışı ödeme ile mağaza içi ödemenin hakları tek kanonik abonelik kaydında uzlaştırılır.

## 5. Çoklu branş ekosistemi

Öncelik sırası:

1. Okul öncesi ürününü yayın kalitesinde tamamla.
2. Ortak hesap, güvenlik, abonelik, AI ve offline çekirdeğini ayır.
3. Sınıf öğretmenliği ve özel eğitim pilotları.
4. Ortaokul/lise branş paketleri.
5. Okul yöneticisi çalışma alanı.

Kullanıcı bir veya birden fazla rol/branş paketi seçebilir. Her paket; ayrı müfredat sözleşmesi, iş akışı, belge seti, AI istem şeması ve kabul testine sahip olur.

## 6. Gelecek öneri cevabı formatı

Kullanıcı `Nerede kaldık?` dediğinde:

1. Kanıtlı tamamlananlar.
2. Açık yayın engelleri.
3. Şimdi yapılacak tek en yüksek öncelikli iş.
4. Bu vizyondan sıradaki üç öneri.
5. Henüz yalnız fikir/kayıt olan ve uygulanmamış maddeler.

Kullanıcı `Neler yapalım?` dediğinde her öneri için amaç, öğretmen faydası, teknik tasarım, veri/gizlilik riski, mağaza etkisi, kabul testi ve bağımlılık sunulur.
