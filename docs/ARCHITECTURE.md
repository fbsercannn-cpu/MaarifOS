# Teknik Mimari

## 1. Mimari yaklaşım

MaarifOS yerel öncelikli, çevrim dışı çalışabilen bir PWA olarak başlatılır. Sunucu veya hesap zorunluluğu yoktur. Bu yaklaşım pilot süresini kısaltır, düşük bağlantıda güvenilirliği artırır ve verilerin varsayılan olarak cihazda kalmasını sağlar.

## 2. Uygulanan kaynak sınırları

```text
src/
  shell/                    # capability kaynaklı rota sözleşmesi ve history
  core/
    capabilities/          # Hediye Alpha görünür kapsamının tek kaynağı
    domain/                # saf iş kuralları ve sürümlü modeller
    errors/                # hata taksonomisi ve global kilit kararı
    repository/            # EntityMap, guard registry ve IndexedDB
    storage/               # kalıcılık/kota/yedek hatırlatıcısı
  features/
    today/                 # doğrudan yüklenen Bugün rotası
    classroom/             # lazy yüklenen Sınıfım rotası
    attendance/            # Yoklama 2.0 panel/model/geçmiş
    planning/              # plan oluşturma dikey akışı
    curriculum/            # katalog ve provenance snapshot'ı
  Prototype.tsx            # kalan uygulama orkestrasyonu; kademeli ayrıştırılıyor
```

`/` ve `/classroom` rotaları görünür Alpha navigasyonuyla aynı capability kaydından
türetilir. Rota geçişi `history.pushState`, geri/ileri `popstate` ve doğrudan URL
yenilemesiyle çalışır. Tam Sınıfım yüzeyi BottomSheet değildir; ayrı lazy JS/CSS
parçasıdır. Kısa, bağlamsal eylemler BottomSheet olarak kalabilir.

Repository sözleşmesi koleksiyon anahtarını `EntityMap` içindeki kayıt tipiyle
eşler. Bilinen altı domain koleksiyonu kesin guard ile fail-closed doğrulanır;
henüz ayrı domain modeli olmayan koleksiyonların `StoredRecord` olarak kalması
bilinçli ve görünür teknik borçtur.

## 3. Hedef depo yapısı

```text
src/
  app/
    router/
    providers/
    layout/
  domains/
    academic-year/
    classroom/
    student/
    attendance/
    observation/
    media/
    plan/
    portfolio/
    report/
    export-package/
    backup/
    notification/
  infrastructure/
    db/
    migrations/
    storage/
    pdf/
    zip/
    crypto/
    service-worker/
  shared/
    ui/
    forms/
    validation/
    dates/
    errors/
    i18n/
  pages/
  tests/
```

## 4. Katmanlar

### Domain
Saf TypeScript modelleri, kurallar ve servis arayüzleri.

### Application
Kullanım senaryoları: gözlem ekle, yoklama kaydet, rapor paketi oluştur, yedek al.

### Infrastructure
IndexedDB, medya blob depolama, PDF, ZIP, şifreleme, service worker.

### Presentation
Mobil sayfalar, kartlar, formlar, zaman çizelgesi ve önizlemeler.

## 5. Veri akışı

```text
UI -> Use Case -> Domain Validation -> Repository -> IndexedDB
                                      -> Media Store
                                      -> Export Engine
```

## 6. Çevrim dışı çalışma

- App shell ön belleğe alınır.
- CRUD işlemleri internet gerektirmez.
- PDF ve yedek cihaz üzerinde üretilir.
- Güncelleme bulunduğunda kullanıcıya güvenli yenileme bildirimi gösterilir.
- Şema migration tamamlanmadan yeni sürüm açılmaz.

## 7. Medya yönetimi (henüz planlı)

Bu bölüm çalışan Alpha kabiliyeti değil, genel medya açılmadan önce kapanması gereken
mimari kapıdır.

- Orijinal dosya saklanır.
- Küçük önizleme üretilir.
- Dosya kimliği içerik özetiyle doğrulanabilir.
- Silme önce çöp kutusuna taşır.
- Raporlar orijinal dosya yerine uygun boyutlandırılmış kopya kullanır.

## 8. Gelecekte senkronizasyon

Yerel repository arayüzleri senkronizasyona uygun tasarlanır. Ancak MVP’de ağ eşitlemesi uygulanmaz. İleride Outbox/Inbox, sürüm numarası ve çatışma çözümü eklenebilir.

Google hesabı bu gelecek senkronizasyon katmanının isteğe bağlı kimlik sağlayıcısı
olabilir; yerel veritabanının açılması veya çevrim dışı kullanım için zorunlu
değildir. OAuth belirteçleri uygulama verileriyle, JSON yedekle veya Web Storage
içinde saklanmaz. Gerçek bağlantı aşamasında yetkilendirme kodu + PKCE ve sunucu
taraflı/BFF oturum modeli ayrıca uygulanıp tehdit modelinden geçirilir.

## 9. Yerel veri ve yedek işlem sınırı

- IndexedDB erişimi sunum bileşenlerinden bağımsız repository sözleşmeleriyle yapılır.
- Birden fazla koleksiyonu etkileyen geri yükleme tek `readwrite` işlemidir.
- Yedek doğrulama; JSON ayrıştırma, sürüm/şema, kayıt sayıları ve SHA-256 bütünlük
  kontrolü tamamlanmadan yazma işlemi başlatmaz.
- Kimlik doğrulama durumu çocuk verisi koleksiyonlarının parçası değildir ve veri
  yedeğine dahil edilmez.
