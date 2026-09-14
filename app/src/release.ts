export interface ReleaseMetadata {
  readonly version: string;
  readonly releasedOn: string;
  readonly title: string;
  readonly notes: readonly string[];
}

export interface ReleaseStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type ReleaseLaunchKind =
  | "first_install"
  | "update"
  | "current"
  | "storage_unavailable";

export interface ReleaseLaunchState {
  readonly kind: ReleaseLaunchKind;
  readonly release: ReleaseMetadata;
  readonly previousVersion: string | null;
  readonly shouldPresent: boolean;
  readonly storageAvailable: boolean;
}

export interface InspectCurrentReleaseOptions {
  /**
   * Testler veya gömülü çalışma ortamları için storage bağımlılığı.
   * `undefined` tarayıcı localStorage alanını güvenli biçimde çözmeye çalışır;
   * `null` ise depolamanın bilerek kullanılamadığını belirtir.
   */
  readonly storage?: ReleaseStorage | null;
}

export interface AcknowledgeCurrentReleaseOptions
  extends InspectCurrentReleaseOptions {
  readonly acknowledgedAt?: Date;
}

interface ReleaseAcknowledgementRecord {
  readonly schemaVersion: typeof RELEASE_ACKNOWLEDGEMENT_SCHEMA_VERSION;
  readonly firstSeenVersion: string;
  readonly acknowledgedVersion: string;
  readonly acknowledgedAt: string;
}

type StoredAcknowledgement =
  | { readonly kind: "missing" }
  | {
      readonly kind: "valid";
      readonly record: ReleaseAcknowledgementRecord;
    }
  | { readonly kind: "invalid" }
  | { readonly kind: "unavailable" };

export const RELEASE_ACKNOWLEDGEMENT_SCHEMA_VERSION = 1 as const;
export const RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY =
  "maarifos.release.acknowledgement.v1";
export const PWA_UPDATE_READY_EVENT = "maarifos:update-ready";

const MAX_ACKNOWLEDGEMENT_LENGTH = 2_048;
const VERSION_PATTERN = /^[0-9A-Za-z](?:[0-9A-Za-z._+-]{0,63})$/;

export const CURRENT_RELEASE: ReleaseMetadata = Object.freeze({
  version: "0.44.0",
  releasedOn: "2026-09-12",
  title: "Öğretmenin günü, çizelgeler ve idare dosyası",
  notes: Object.freeze([
    "Ana sayfa hızlı gözlem, ders modu ve yarının hazırlığını birleştirir; çocuk ekleme ve Excel aktarma Sınıfım içindedir.",
    "Meyve ve haftanın çocuğu çizelgelerinde yeni ay, sabitleme, değişim, erteleme ve Excel değişikliklerini seçerek uygulama hazırdır.",
    "İdare ve öğretmen dosyası gerçek kayıtlardan günlük, haftalık, aylık, dönemlik ve yıllık PDF, Word, Excel ve ZIP üretir.",
    "Şifreli dosya yedeği kullanılabilir. Google girişi ve ayrı Drive yedeği sunucu yapılandırıldığında etkinleşir.",
    "Günün çıkış paketi yoklama, gerçek teslim ve sonraki öğretim gününün hazırlıklarını birleştirir; aynı kayıtlardan yatay A4 kontrol sayfası hazırlar.",
    "Malzeme kutusu etiketleri kayıtlı öğrenme merkezlerinden hazırlanır; seçtiğiniz eksikler haftalık hazırlığa eklenir ve kutu hazır olarak işaretlenir.",
    "Aile dönüş panosu gerçek yanıttan takip etkinliği veya veli görüşmesi gündemi oluşturur; kaydı yeniden açarak sonucu görebilirsiniz.",
    "Günlük teslim çizelgesi yetkili kişi ve gerçek teslim bilgisini yatay A4'e yerleştirir; klasör seti seçilen belgelerden kapak, içindekiler, ayraç ve sırt etiketi hazırlar.",
    "Küçük grup kartları seçtiğiniz çocukları gerçek günlük plana bağlar; kayıtlı gruplar A4 üzerinde altı kesilebilir karta dönüşür.",
    "Aile oyun kartları seçilen çocuk ve etkinliğe bağlı hazırlanır; gerçek aile yanıtı aynı kartta saklanır.",
    "Gözlemde uygun kaynak seçimi kelime eşleşmese de sunulur; kendi yazdığınız değerlendirme kaydettiğinizde bağlantılarıyla tamamlanır.",
    "Uyum rehberinin ağır PDF ve sayfa görselleri uygulama paketinden çıkarıldı. Önceki uyum kayıtları ve kaynak metinleri korunur; yeni belge araçları seçildiğinde yüklenir.",
    "Haftalık masa planı, kayıtlı etkinlikleri, gözlem odağını ve materyalleri beş günlük yatay A4 düzeninde toplar.",
    "Aylık takvimde boş öğretim gününü seçip hazır etkinliği yerleştirdiğinizde gerekli plan bağlantıları birlikte kaydedilir.",
    "Öğrencinin özeti iletişim bilgilerini, son bireysel gözlemleri ve devam eden destekleri PDF ve Word olarak hazırlar.",
    "Veli görüşme formu kayıtlı gündemi getirir; sonucu, seçilen aile ve öğretmen görevlerini ve takip tarihini birlikte kaydeder.",
    "Tek sayfa sınıf listesi yatay A4 üzerinde öğrenci kimliği, anne–baba ve üçüncü kişi iletişimini okul anteti ve öğretmen imzasıyla bir araya getirir.",
    "Hazır öğretmen adımları destek takibini sürdürür veya kapatır, gerçek günlük plana gözlem odağı bağlar ve kaynaklı veli görüşmesi hazırlığı oluşturur.",
    "Sınıf listesini aynı öğrenci, alan ve dönem seçimiyle güncelleyebilir; saklanan önceki PDF sürümlerini Belgeler'den açabilirsiniz.",
    "Ay sonu dosyasında seçilen plan, değerlendirme ve saklanan belgeler içindekiler listesiyle tek ZIP paketinde toplanır.",
    "Sınıfta kullan, İletişim için hazırla ve Ayrıntılı döküm al seçenekleri uygun alanlarla gerçek PDF önizlemesini tek dokunuşla açar.",
    "Günlük sınıf çizelgesinde geniş ad alanı ve boş işaret sütunları; iletişim ve ayrıntı listelerinde öğrenciye bağlı okunaklı bilgi blokları bulunur.",
    "Önizlemede sayfa düzenini değiştirirken öğrenci ve alan seçiminiz korunur; PDF ile Excel aynı seçilmiş kaynak üzerinden üretilir.",
    "PDF önizlemesindeki hazır çıktı düzenleri seçiminizi koruyarak belgeyi yeniden hazırlar; renkli ve az mürekkepli PDF seçenekleri kullanılabilir.",
    "Öğretmen belgelerinde ortak başlık düzeni, okul ve dönem bağlamı, tekrar eden tablo başlıkları ve sayfa numaraları okunabilirliği artırır.",
    "Word planları, anekdot ve aylık değerlendirme belgeleri düzenlenebilir başlık ve tablolarla hazırlanır; uzun belgelerin sayfa geçişleri iyileştirildi.",
    "Boy-kilo Excel baskısı veri sayfasına kayıt kimliğiyle bağlıdır; ad, tarih ve ölçüm değişiklikleri yeniden hesaplamayla baskıya yansır.",
    "Hazırlanan iş paketleri seçildiğinde kategori, plan ve takip adımları birlikte kaydedilir; sonuç ve geri alma aynı yerde görünür.",
    "Biriken gözlemleri hazırlanmış seçenekleriyle topluca yerleştirebilir; uygun mevcut planları yeniden kullanabilirsiniz.",
    "Kaydedilmiş gözlemin olay tarihini Bugün, Dün veya tarih seçerek düzeltebilirsiniz; ham metin ve ilk kayıt zamanı korunur.",
    "Gözleme dokunarak uygun gerçek etkinlik ve program bağlantılarını seçip kaydedebilirsiniz.",
    "Planlar'da eksik yıl, ay, hafta ve gün adımları hazır seçeneklerle tamamlanır; her seçimden sonra sıradaki işlem açılır.",
    "Yanlış eklenmiş aktif veya arşiv öğrenci için Tamamen sil eylemi görünür; etki özeti ve seçilebilir açık onayla bağlı kayıtlar temizlenir.",
    "Gözlemden sonraki adım alanında kategori ve eğitim desteği seçilir; MaarifOS kaynak gözlemi koruyarak planı ve bağlantıları kaydeder.",
    "Bugün, Sınıfım, öğrenci profili ve Planlar aynı yapılabilir işleri gösterir. Öğretmenin seçtiği hazırlık maddeleri gerçek tamamlanma kaydına dönüşür.",
    "Hazırlanan işlemler güncel kayıtla doğrulanır; tekrar tıklama aynı işi çoğaltmaz. Yerel veri ve yedek sözleşmesi korunur.",
    "Belge merkezinde ders öncesi hazırlık, basılı sınıf kullanımı ve ders sonrası kayıt ayrılır; telefon sınıf içinde zorunlu tutulmaz ve yalnız kurumun güncel yetkili kanalı belirtilir.",
    "Pedagojik eşlemeler iki bağımsız ve dış sicil kanıtlı gerçek okul öncesi uzmanı onaylamadan yayımlanabilir görünmez; bu sürümde gerçek uzman sonucu henüz yoktur.",
    "Yerel veli görüşmesi hazırlığı resmî randevudan ayrılır. Resmî işlem yalnız öğretmenin doğruladığı referansla kaydedilir; MaarifOS randevu oluşturduğunu veya sisteme gönderdiğini iddia etmez.",
    "Ek 4 ve e-Okul hazırlık görünümü öğretmenin seçtiği kaynak gözlemleri, dönem ve program alanlarıyla geri izler; otomatik aktarım, beceri veya puan üretmez.",
    "Planlandı, uygulandı, gözlendi ve öğretmen yargısı ayrı kaynak durumları olarak gösterilir. Oyun uygulaması, uyarlama, yansıtma, aile önerisi ve geri bildirim aynı kayıt zincirinde izlenir.",
    "Beş gerçek öğretmenle yirmi ham görevin nasıl ölçüleceği uygulamada görünür; sonuç uydurulmaz ve bu sürümde gerçek pilot ölçümü bulunmadığı açıkça yazılır.",
    "Resmî TYMM kaynaklarında kaynak tarihi veya sürümü, doğrulanmış SHA-256, sayfa sayısı, erişim denetimi ve çevrimdışı paket durumu birbirinden ayrı gösterilir.",
    "Belge dışa aktarımından önce çocuk, alıcı, amaç ve alan kapsamı özetlenir. Kaynak veya seçim değişirse eski dışa aktarım durdurulur; seçilmemiş alan geri eklenmez.",
    "Büyük PDF önizlemesinde metin dizini ilerlemeli ve iptal edilebilirdir; iptal kaynak baytlarını değiştirmez, arama yeniden başlatılabilir ve belge yeniden açılabilir.",
    "Sınıf Excel notları içeriklerini korurken baskıda gizli kalır. Ek 18 tablosundaki Haziran ve uzun grup etiketleri Microsoft Word ile LibreOffice'te kırpılmadan görünür.",
    "Ürün kapsamı plan, gözlem, değerlendirme, belge, yedekleme ve sınıf kayıtlarıyla sınırlıdır; aidat, servis, zorunlu bulut, canlı aile mesajlaşması veya gömülü üretken yapay zekâ eklenmedi.",
    "PDF yazıcısıyla kaydettiğiniz belgelerde HTTP ve HTTPS bağlantıları hedefleri, sayfaları ve konumlarıyla korunur.",
    "Kısa iletişim Excel baskısı seçilmiş tam veri sayfasına canlı bağlıdır; Excel'de değiştirilen iletişim bilgileri yeniden hesaplamayla baskıya yansır.",
    "Dar telefonlarda belge araması isteğe bağlı açılır, ikincil işlemler tek menüde toplanır ve belge okuma alanı büyür.",
    "Windows kabul makbuzları geçici dosya kilidinde yalnız sınırlı atomik yeniden deneme yapar; kalıcı kilit aynı hatayla görünür kalır.",
    "PDF önizlemesinde Türkçe sözcük arayabilir, eşleşmeler arasında ilerleyebilir ve metni seçip kopyalayabilirsiniz.",
    "Yazdırarak PDF'ye kaydettiğiniz belgelerde Türkçe metin korunur; farklı kâğıt ölçüleri ve sayfa düzeni aynı kalır.",
    "Sınıf Excel'inde tam veriyi koruyan kompakt iletişim baskısı seçebilirsiniz. Boy–kilo belgelerini bütün yıl veya seçtiğiniz dönem için hazırlayabilirsiniz.",
    "Boy–kilo çizelgesinin boş ölçüm alanlarında da çizgiler bulunur; boş değerler ölçüm olarak doldurulmaz.",
    "Boy–kilo Excel baskısı öğrenci bağlamını korur; uzun adlar satır içinde açılır. Tarih ve ölçüm hücreleri Excel'in gerçek veri türleriyle hazırlanır.",
    "Word planlarında başlıklar açıklamalarıyla birlikte tutulur; uzun tablolarda başlıklar yinelenir ve bölüm sınırları korunur.",
    "Bireysel PDF'lerde kayıt yılı ve her çocuk için ayrı imza bulunur. Devam sayfaları belge bağlamını ve toplam sayfa sayısını gösterir.",
    "Ad listesi, kısa iletişim ve tam kayıt seçimleri PDF ve Excel'de aynı alanları kullanır. Kısa ad listesi gereksiz ikinci sayfa oluşturmaz.",
    "Etkinlik ve boy–kilo görselleri Türkçe aranabilir metin taşır. Gözlem raporunun doğrulanmış kaynak adresleri tıklanabilir; teknik kanıtlar ayrı ekte korunur.",
    "Sınıf listesi canlı turkuaz, mavi, mercan ve sarı iletişim gruplarıyla yenilendi. Koyu metin, gerçek kalın başlıklar ve düzenli imza alanı belgeyi daha okunaklı kılar.",
    "PDF ve Excel aynı renk dilini kullanır. Tüm alanları seçebilir veya yalnız ihtiyaç duyduğunuz bilgilerle yazdırabilir ve dışa aktarabilirsiniz.",
    "Sınıf listesinde okul numarası ayrı sütundur. Yirmi iletişim ve kayıt alanı başlangıçta seçilidir; sıra, kimlik, doğum, anne-baba meslekleri, yakınlar, iletişim rolleri ve adres tek tek seçilebilir.",
    "Yazdır, Excel'e çıkar ve PDF düğmeleri aynı öğrenci, dönem ve alan kapsamını kullanır. Kapatılan alanlar çıktıya eklenmez; kaynak değişirse eski çıktı durdurulur.",
    "Okul adı, belge başlığı ve sınıf bilgileri daha düzenli yerleştirilir. Türkçe başlıklar, yaş birimi, sütun etiketleri ve öğretmen imzası tutarlı biçimde hazırlanır.",
    "Sınıf listesi öğrenci, anne, baba ve üçüncü kişi iletişim gruplarıyla düzenlenir. Türkçe ad/soyad gösterimi, tam adres ve çok sayfalı PDF yerleşimi korunur.",
    "Veli randevuları açık uygun saatlere bağlanır; farklı sınıflarda çakışan saatler engellenir. İptal ve değişiklik geçmişi tutulur, gerçekleşen randevu gerçek veli görüşmesine bağlanır.",
    "Anne, baba ve diğer yakınların iletişim kanalı, uygun saati, dili ve erişim tercihleri açık bildirim kaynağıyla ayrı kaydedilir.",
    "Öğrenme merkezlerine ayrılan malzemeler stokla birlikte kaydedilir. Merkez gözlemi, sonraki düzenleme kararı ve kalan miktarın iadesi geçmişiyle korunur.",
    "Görsel günlük rutin kartları öğretmenin gün akışından hazırlanır; metin, sıra ve simgeler düzenlenerek A4 veya A5 çıktısı alınır.",
    "Okul logosu, üst başlıklar, imza düzeni ve kâğıt yönü okul belge şablonunda saklanır; sınıf, ölçüm ve devir belgelerinde kullanılır.",
    "Eylül, aralık, mart ve haziran boy–kilo ölçümleri ayrı tarih ve kaynaklarıyla kaydedilir. Çocuk grafikleri, sınıf istatistikleri, eşleşmiş değişimler, PDF ve Excel çizelgeleri hazırlanır.",
    "Veli izinleri belge sürümüne, amaca ve geçerlilik tarihlerine bağlanır. Geri çekme geçmişi korunur; gezi ve portfolyo kullanımı güncel izin kaydını denetler.",
    "Gezi çıkış, ara kontrol ve dönüş sayımları çocuğa bağlanır. Dönüşü kontrol edilmemiş gezi tamamlanamaz; düzeltmeler gerekçeleriyle saklanır.",
    "Malzeme ve emanet defterinde kullanılabilir, emanette ve hasarlı stok ayrı izlenir. Kısmi iadeler, haftalık hazırlık bağlantıları ve gerekçeli hareket düzeltmeleri kaydedilir.",
    "Dönem sonu devir listesi açık takipleri, emanetleri ve öğretmenin eklediği maddeleri toplar. Kontrol, tamamlanma, yeniden açma geçmişi ve devir tutanağı korunur.",
    "Bütün yerel kayıtlar ve kurtarma kopyaları şifrelenir. Fotoğraflı yedekler parça bütünlüğü, kayıt sayıları ve içerik özetleriyle doğrulanır; geri yükleme tatbikatı mevcut sınıfı değiştirmeden yapılabilir.",
    "Devam hesabında her günün neden sayıldığı veya dışlandığı açılır. Tatil, okul kapanışı ve öğrencinin kayıt–ayrılış–dönüş tarihleri ortak takvimle değerlendirilir; işaretlenmemiş günler devamsız sayılmaz.",
    "Belgelerin gerçek PDF'si cihazda önizlenir. Aynı belge indirilir veya paylaşılır; iletişim listesi, bireysel dosya ve acil durum şablonlarında alan ve çocuk kapsamı seçilebilir.",
    "Telefon, adres ve teslim kişileri ayrı ayrı doğrulanır. Veli tarafından güncellenme kaynağı ve tarih korunur; sonraki değişiklikler yeniden doğrulama gerektirir.",
    "Günlük teslim alan yetkili kişi ve gerçek saat kaydedilir. Gerekçeli düzeltmeler ve profil yetki değişiklikleri geçmiş kayıtlarla birlikte korunur.",
    "Veli görüşmeleri, kararlar ve takip sonuçları çocuğa bağlanır. Takibi gelen işler Bugün ekranından açılır.",
    "Haftalık plan ve etkinlik malzemeleri kaynaklarıyla birleştirilir. Ön hazırlık işleri, son tarihler ve tamamlanma durumu saklanır.",
    "Uyum rehberindeki özgün sayfalara bağlı öğretmen adımları, tarihli gözlemler ve takipler oluşturulabilir.",
    "Gerçek gözlemlerden öğretmenin seçtiği destek kararı sonraki hafta taslağına alınır, açık seçimle plan revizyonuna eklenir ve uygulama sonrasında değerlendirilir.",
    "Ev adresi ilçe, il, mahalle ve cadde / sokak–numara olarak dört satırda girilir. Acıpayam ve Denizli başlangıç değerleri değiştirilebilir; tam adres yazılırken önizlenir.",
    "Adres alanları öğrenci profili, Excel önizlemesi, şifreli kayıt ve yedeklerde korunur. Sınıf listesi ve öğrenci dosyası aynı tam adresi kullanır; eski tek metin adresler düzenlenebilir.",
    "Anne ve baba adlarına çocuğun soyadı tıklanarak eklenebilir; girilmiş farklı soyadları korunur. Adres çocuk ekleme, profil ve Excel önizlemesinde düzenlenebilir.",
    "Sınıf listesinde üçüncü kişinin adı, yakınlığı ve telefonu anne-babayla aynı ana tabloda yer alır. Çok sayıda yakın ve uzun adres kayıpsız sayfalanır; öğretmen ünvanı Okul Öncesi Öğretmeni olarak yazılır.",
    "Öğrenci dosyası mükerrer yoklamayı bir kez sayar. Gün kapanışı öğrencinin gerçek üyelik tarihini ve gözlem katılımcılarını kullanır; yıl adını değiştirmek resmî ara tatil hesabını bozmaz.",
    "Gerçek yeniden kayıt önceki ayrılık dönemini korur; yanlışlıkla silmeyi geri alma aynı öğrenci geçmişini geri getirir. Hedef eğitim yılı dışındaki yeniden kayıt reddedilir.",
    "Öğrenci dosyasında anne-baba meslekleri, çocuğa özel bilgi notu, aile durumu açıklaması ve isteğe bağlı ayrı yaşama, vefat, şehit/gazi çocuğu bilgileri saklanabilir.",
    "Öğrenciyi sil işlemi açık onayla geri alınabilir arşive taşır; öğrenci dosyası, gözlem ve yoklama geçmişi korunur.",
    "Eski XLS, XLSX, CSV ve TSV veli iletişim listeleri cihazda okunur. Sütun eşleştirmesi, düzenlenebilir önizleme, mükerrer incelemesi ve tek işlemde toplu kayıt sunulur.",
    "Doğum günleri Bugün ekranında üç gün öncesinden görünür; öğrencinin dosyası hatırlatmadan açılabilir.",
    "2026–2027 Okula Uyum Rehberi özgün 35 sayfalık PDF, bütün sayfa görselleri ve sayfa bazında aranabilir metniyle Belgeler alanına eklendi. Kurulu güncel uygulamada çevrim dışı okunabilir.",
  ]),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidVersion(value: unknown): value is string {
  return typeof value === "string" && VERSION_PATTERN.test(value);
}

function isCanonicalUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isAcknowledgementRecord(
  value: unknown,
): value is ReleaseAcknowledgementRecord {
  if (!isRecord(value)) return false;

  const keys = Object.keys(value).sort();
  const expectedKeys = [
    "acknowledgedAt",
    "acknowledgedVersion",
    "firstSeenVersion",
    "schemaVersion",
  ];

  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]) &&
    value.schemaVersion === RELEASE_ACKNOWLEDGEMENT_SCHEMA_VERSION &&
    isValidVersion(value.firstSeenVersion) &&
    isValidVersion(value.acknowledgedVersion) &&
    isCanonicalUtcIso(value.acknowledgedAt)
  );
}

function resolveBrowserStorage(
  provided: ReleaseStorage | null | undefined,
): ReleaseStorage | null {
  if (provided !== undefined) return provided;

  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readAcknowledgement(storage: ReleaseStorage): StoredAcknowledgement {
  let raw: string | null;

  try {
    raw = storage.getItem(RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY);
  } catch {
    return { kind: "unavailable" };
  }

  if (raw === null) return { kind: "missing" };
  if (raw.length > MAX_ACKNOWLEDGEMENT_LENGTH) return { kind: "invalid" };

  try {
    const parsed: unknown = JSON.parse(raw);
    return isAcknowledgementRecord(parsed)
      ? { kind: "valid", record: parsed }
      : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}

/**
 * Geçerli sürümün bu cihazda daha önce onaylanıp onaylanmadığını okur.
 *
 * İlk kurulum bir güncelleme değildir ve bildirim üretmez. Daha eski bir
 * sürüm onaylanmışsa `update`, aynı sürüm onaylanmışsa `current` döner.
 * Tarayıcı depolaması engellendiğinde istisna fırlatmaz.
 */
export function inspectCurrentRelease(
  options: InspectCurrentReleaseOptions = {},
): ReleaseLaunchState {
  const storage = resolveBrowserStorage(options.storage);
  if (!storage) {
    return {
      kind: "storage_unavailable",
      release: CURRENT_RELEASE,
      previousVersion: null,
      shouldPresent: false,
      storageAvailable: false,
    };
  }

  const stored = readAcknowledgement(storage);
  if (stored.kind === "unavailable") {
    return {
      kind: "storage_unavailable",
      release: CURRENT_RELEASE,
      previousVersion: null,
      shouldPresent: false,
      storageAvailable: false,
    };
  }

  if (stored.kind === "missing" || stored.kind === "invalid") {
    return {
      kind: "first_install",
      release: CURRENT_RELEASE,
      previousVersion: null,
      shouldPresent: false,
      storageAvailable: true,
    };
  }

  if (stored.record.acknowledgedVersion === CURRENT_RELEASE.version) {
    return {
      kind: "current",
      release: CURRENT_RELEASE,
      previousVersion: stored.record.acknowledgedVersion,
      shouldPresent: false,
      storageAvailable: true,
    };
  }

  return {
    kind: "update",
    release: CURRENT_RELEASE,
    previousVersion: stored.record.acknowledgedVersion,
    shouldPresent: true,
    storageAvailable: true,
  };
}

/**
 * Geçerli sürümü bu cihaz için görüldü/onaylandı olarak işaretler.
 *
 * Yalnız teknik sürüm bilgisi saklanır; öğretmen veya çocuk verisi yazılmaz.
 * Depolama engeli, kota ya da bozuk eski kayıt halinde `false` döner ve
 * uygulamanın açılışını kesmez.
 */
export function acknowledgeCurrentRelease(
  options: AcknowledgeCurrentReleaseOptions = {},
): boolean {
  const storage = resolveBrowserStorage(options.storage);
  if (!storage) return false;

  const acknowledgedAt = options.acknowledgedAt ?? new Date();
  if (Number.isNaN(acknowledgedAt.getTime())) return false;

  const stored = readAcknowledgement(storage);
  if (stored.kind === "unavailable") return false;

  const record: ReleaseAcknowledgementRecord = {
    schemaVersion: RELEASE_ACKNOWLEDGEMENT_SCHEMA_VERSION,
    firstSeenVersion:
      stored.kind === "valid"
        ? stored.record.firstSeenVersion
        : CURRENT_RELEASE.version,
    acknowledgedVersion: CURRENT_RELEASE.version,
    acknowledgedAt: acknowledgedAt.toISOString(),
  };

  try {
    storage.setItem(
      RELEASE_ACKNOWLEDGEMENT_STORAGE_KEY,
      JSON.stringify(record),
    );
    return true;
  } catch {
    return false;
  }
}
