# MaarifOS 0.44.0 — Yayın Tamamlandı

14 Eylül 2026 13:46:25 UTC. Kullanıcının “bunu yayınla” mutlak fermanıyla mevcut public site, erişim ve PWA giriş ayarları korunarak mühürlendi ve yayımlandı.

Canlı bağlantı: https://maarifos-emine-akis-pusulasi.fbsercannn.chatgpt.site

- **Sites Sürümü:** 38
- **Proje Kimliği:** `appgprj_6a60733e774c8191bbeeb1cca335281d`
- **Sürüm Kimliği:** `appgprj_6a60733e774c8191bbeeb1cca335281d~appgver_0440release20260914maarif`
- **Dağıtım Durumu:** `succeeded`
- **Kaynak Commit:** `49e447a748e3e56600610e21e259b38a8cfecc87`
- **Paket Dosya Sayısı:** 274 dosya (274 dist dosyası + 1 kök .openai hosting metadata)
- **Arşiv Formatı:** GNU Tar + Gzip (`maarifos-0.44.0.tar.gz`)
- **Arşiv Boyutu:** 5.983.680 bayt (~5.7 MB)
- **Arşiv SHA-256:** `c7baf13c43f4a2927d7a8cbdb9b5afcdd53c720a173027635ba10124285f5018`
- **Opaque Shell Enjeksiyonu:** `/assets/maarifos-shell-362f56d482d4263ff615477425712374cd1cc62d012a039b54029357095687ab.bin`

## 0.44.0 Sürümüyle Eklenen Canlı Yetenekler
1. **Günün Planı Slide-Over Çekmecesi (`DailyPlanDrawer.tsx`):**
   - 10 blokluk pedagojik gün akışı (Güne Başlama Zamanı, Oyun Zamanı, Beslenme, Etkinlik Zamanı, Dinlenme, Günü Değerlendirme vb.).
   - İlgili bloğa bağlı etkinliklerin dinamik görünümü.
   - 3 boyutlu değerlendirme tamamlanma durumu ve hızlı tetikleme butonları.
   - İstemci tarafında sıfır harici API bağımlılığı ile **Word (.docx)** ve **PDF / A4 Yazdır (.pdf)** çıktı motoru.
2. **7 Pedagojik Materyal Sandığı (`DailyPlanMaterialsGallery.tsx`):**
   - Okul Öncesi Rehberi ilhamıyla kategorize edilmiş 7 pedagojik sandık:
     * 🎵 Ritim & Ses
     * 🎨 Boyama
     * 🎴 Oyun Kartı
     * 📜 Kural & Değer Afişi
     * 📖 Hikaye Kartı
     * ✋ Parmak Oyunu
     * 📝 Çalışma Sayfası
   - Akıllı tahta önizleme modalı, kategori çipleri ve arama motoru.
   - CSS Paged Media uyumlu A4 tek tıkla yazdırma.
3. **3 Boyutlu Gün Değerlendirmesi (`DailyPlanEvaluationSheet.tsx`):**
   - Çocuk Açısından Değerlendirme (4 preset + serbest not).
   - Öğretmen Açısından Değerlendirme (4 preset + serbest not).
   - Program Açısından Değerlendirme (4 preset + serbest not).
4. **Dinamik Plana Etkinlik Ekleme (`AddActivityToPlanModal.tsx`):**
   - Etkinlik adı, türü (Türkçe, Matematik, Sanat vb.), süresi, kazanım/göstergeler ve materyaller ile plana anında entegrasyon.

## Kalite ve Güvenlik Kapıları
- **Birim & Özellik Testleri:** 1.388 / 1.388 PASS (%100 Başarı).
- **Sites Worker Testleri:** 28 / 28 PASS.
- **PWA Sözleşme Testleri:** 10 / 10 PASS.
- **Paket Bütçesi:** 181 JavaScript parçası incelendi; tüm parçalar gzip ≤180 KiB kuralına tam uyumlu.
- **Sıfır Güven (Zero-Trust):** Kod tabanında hiçbir harici API anahtarı, gizli anahtar veya sunucu sızıntısı bulunmadığı doğrulanmıştır.
- **A4 Bükümü (CSS Fragmentation):** `break-inside: avoid` ve `thead { display: table-header-group }` kuralları eksiksiz işletilmiştir.

Makbuz: `app/output/publish-0.44.0-receipt.json`  
Yayın Arşivi: `c:/Users/Asus/Desktop/Maarif/publish-0.44.0/maarifos-0.44.0.tar.gz`
