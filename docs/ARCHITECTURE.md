# Teknik Mimari

## 1. Mimari yaklaşım

MaarifOS yerel öncelikli, çevrim dışı çalışabilen bir PWA olarak başlatılır. Sunucu veya hesap zorunluluğu yoktur. Bu yaklaşım pilot süresini kısaltır, düşük bağlantıda güvenilirliği artırır ve verilerin varsayılan olarak cihazda kalmasını sağlar.

## 2. Önerilen depo yapısı

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

## 3. Katmanlar

### Domain
Saf TypeScript modelleri, kurallar ve servis arayüzleri.

### Application
Kullanım senaryoları: gözlem ekle, yoklama kaydet, rapor paketi oluştur, yedek al.

### Infrastructure
IndexedDB, medya blob depolama, PDF, ZIP, şifreleme, service worker.

### Presentation
Mobil sayfalar, kartlar, formlar, zaman çizelgesi ve önizlemeler.

## 4. Veri akışı

```text
UI -> Use Case -> Domain Validation -> Repository -> IndexedDB
                                      -> Media Store
                                      -> Export Engine
```

## 5. Çevrim dışı çalışma

- App shell ön belleğe alınır.
- CRUD işlemleri internet gerektirmez.
- PDF ve yedek cihaz üzerinde üretilir.
- Güncelleme bulunduğunda kullanıcıya güvenli yenileme bildirimi gösterilir.
- Şema migration tamamlanmadan yeni sürüm açılmaz.

## 6. Medya yönetimi

- Orijinal dosya saklanır.
- Küçük önizleme üretilir.
- Dosya kimliği içerik özetiyle doğrulanabilir.
- Silme önce çöp kutusuna taşır.
- Raporlar orijinal dosya yerine uygun boyutlandırılmış kopya kullanır.

## 7. Gelecekte senkronizasyon

Yerel repository arayüzleri senkronizasyona uygun tasarlanır. Ancak MVP’de ağ eşitlemesi uygulanmaz. İleride Outbox/Inbox, sürüm numarası ve çatışma çözümü eklenebilir.

Google hesabı bu gelecek senkronizasyon katmanının isteğe bağlı kimlik sağlayıcısı
olabilir; yerel veritabanının açılması veya çevrim dışı kullanım için zorunlu
değildir. OAuth belirteçleri uygulama verileriyle, JSON yedekle veya Web Storage
içinde saklanmaz. Gerçek bağlantı aşamasında yetkilendirme kodu + PKCE ve sunucu
taraflı/BFF oturum modeli ayrıca uygulanıp tehdit modelinden geçirilir.

## 8. Yerel veri ve yedek işlem sınırı

- IndexedDB erişimi sunum bileşenlerinden bağımsız repository sözleşmeleriyle yapılır.
- Birden fazla koleksiyonu etkileyen geri yükleme tek `readwrite` işlemidir.
- Yedek doğrulama; JSON ayrıştırma, sürüm/şema, kayıt sayıları ve SHA-256 bütünlük
  kontrolü tamamlanmadan yazma işlemi başlatmaz.
- Kimlik doğrulama durumu çocuk verisi koleksiyonlarının parçası değildir ve veri
  yedeğine dahil edilmez.
