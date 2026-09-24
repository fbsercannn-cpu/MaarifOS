# Tamamlanabilir işler

`ActionCenter`, etkin sınıf/yıl ve isteğe bağlı çocuk/gözlem kapsamında gerçek kayıtlardan bir iş kuyruğu çıkarır. Önerileri üretmek hiçbir kayıt yazmaz. Metindeki sözcükler yalnız nötr kategori seçeneklerini sıralar; program hedefi, gelişim değerlendirmesi veya tanı atamaz.

Öğretmen bir başlığa dokunduğunda gözlemin kanonik `observationCategories` ve `observationTaxonomyVersion` alanları güncellenir. Ham metin, çocuk sözü, bağlam ve kaynak zamanları korunur. Kayıtlı başlık, sonraki adımın yanında gösterilir.

Hazır destek seçeneklerinde kaynak gözlem, hedef haftanın gerçek başlığı/tarihleri, uygulanacak metin, değer izi ve değerlendirme tarihi görünür. Açık seçim; `learning-decision`, eksik yıllık/aylık/haftalık omurga, haftalık plan revizyonu ve `learning-plan-link` kayıtlarını tek işlemde yazar. Aynı kaynak için tamamlanmış plan bağı tekrar kullanılınca yeni karar veya plan oluşturulmaz. Mevcut plan metni korunur; eksik çocuk haftası mevcut ebeveynine eklenir. Kanonik plan ve takip ilişki kontrolleri commit öncesi çalışır.

Hazırlık alanında öğretmen gerçek plan/etkinlik kaynaklarını kutucuklarla seçer. Kayıtlı materyal ve hazırlık metinlerinden liste oluşturulur. Her maddenin `Hazırladım, tamamla` eylemi gerçek `preparation-check` olayıdır. Kaynağı değişmiş işler yeni kaynak üzerinden yeniden hazırlanır; eski tamamlanmamış maddeler bu kuyruğa dökülmez.

Yazılar çevrimdışı IndexedDB üzerinden yürür ve mevcut sürümlü yedek sözleşmelerini kullanır; yeni koleksiyon veya saklı öneri motoru yoktur. Aktif kapsam/kaynak/tarih/plan revizyonu değişince eski seçim reddedilir. Çift tıklama, silinmiş öğrenci ve yarım yazım senaryoları testlidir. Commit sonrası yalnız ekran yenilemesi başarısız olursa kayıt başarıyla tamamlanmış olarak bildirilir.

Doğrulama: `tests/features/action-center.test.mjs`, `tests/action-center-component.spec.ts`, `tests/core/action-center-backup.spec.ts`. Telefon testi 320 px'de gerçek kategori → hazır seçim → kayıt zincirini, seçilebilir hazırlık kaynaklarını ve yazma kilidini çalıştırır. Yedek testi ağ kesildikten sonra kayıtları üretir, şifreli yedeği ikinci IndexedDB'ye yükler ve tam içerik eşitliğini doğrular.
