import type { Tymm2024AgeBand } from "./tymm-2024-catalog.ts";
import {
  TYMM_OFFICIAL_PROGRAM_PDF_URL,
  TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON,
} from "./tymm-official-resource-catalog.ts";

const TYMM_ORIGIN = "https://tymm.meb.gov.tr" as const;

export const TYMM_OFFICIAL_LIBRARY_SCHEMA_VERSION = 1 as const;

export type TymmOfficialLibraryMaterialKind =
  | "program"
  | "teacher-guide"
  | "activity-book"
  | "program-literacy-guide"
  | "parent-guide"
  | "brochure"
  | "report"
  | "common-text";

export type TymmOfficialLibraryArea =
  | "general"
  | "turkish"
  | "social"
  | "social-emotional"
  | "art"
  | "music"
  | "mathematics"
  | "movement-health"
  | "science"
  | "values"
  | "literacy"
  | "family"
  | "research";

export type TymmOfficialLibraryAccessStatus =
  | "verified-available"
  | "official-pdf-unavailable";

export interface TymmOfficialLibraryResource {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly materialKind: TymmOfficialLibraryMaterialKind;
  readonly ageBands: readonly Tymm2024AgeBand[];
  readonly areas: readonly TymmOfficialLibraryArea[];
  readonly officialPageUrl: string;
  readonly pdfUrl: string;
  readonly accessStatus: TymmOfficialLibraryAccessStatus;
  readonly verifiedByteSize?: number;
  readonly sourceCheckedOn: typeof TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON;
  readonly contentOrigin: "MEB-official";
  readonly accessMode: "external-link";
  readonly republishMode: "link-only";
  readonly importable: false;
  readonly readerMode: "official-remote-iframe-with-fallback";
  readonly scope:
    | "preschool-direct"
    | "shared-tymm-framework"
    | "basic-education-unverified-for-preschool";
  readonly scopeLabel:
    | "Okul öncesi doğrudan resmî kaynak"
    | "TYMM geneli · okul öncesi bağlantısı MaarifOS sınıflandırması"
    | "Temel eğitim geneli · okul öncesi uygulanırlığı belgelenmedi";
  readonly publisherAgeLabel?: string;
  readonly contentVerifiedAgeBands?: readonly Tymm2024AgeBand[];
  readonly metadataOrigin: {
    readonly title: "MEB-official";
    readonly description: "MaarifOS-editorial-summary";
    readonly ageBands:
      | "MEB-official-title-or-document-text"
      | "MaarifOS-editorial-applicability"
      | "unverified";
    readonly areas: "MaarifOS-editorial-classification";
    readonly scope: "MaarifOS-editorial-classification";
  };
}

export interface TymmOfficialCommonFrameworkPage {
  readonly id: string;
  readonly officialRecord: {
    readonly title: string;
    readonly url: string;
    readonly contentOrigin: "MEB-official";
    readonly accessMode: "external-link";
    readonly republishMode: "link-only";
    readonly importable: false;
  };
  readonly presentation: {
    readonly summary: string;
    readonly summaryOrigin: "MaarifOS-editorial-summary";
  };
  readonly ageBands: readonly Tymm2024AgeBand[];
  readonly scope: "shared-tymm-framework";
  readonly scopeLabel: "TYMM ortak çerçevesi · okul öncesi bağlantısı MaarifOS sınıflandırması";
  readonly classificationOrigin: "MaarifOS-editorial-applicability";
  readonly sourceCheckedOn: typeof TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON;
}

export interface TymmOfficialVideoPage {
  readonly id: string;
  readonly officialRecord: {
    readonly title: string;
    readonly url: string;
    readonly contentOrigin: "MEB-official";
    readonly accessMode: "external-link";
    readonly republishMode: "link-only";
    readonly importable: false;
  };
  readonly videoKind: "introduction" | "training" | "book-introduction" | "classroom-example";
  readonly ageBands: readonly Tymm2024AgeBand[];
  readonly scope: "preschool-direct" | "shared-tymm-framework";
  readonly presentationAgeLabel: string;
  readonly presentationOrigin: "MaarifOS-editorial-classification";
  readonly sourceCheckedOn: typeof TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON;
}

export interface TymmOfficialLibraryFilter {
  readonly query?: string;
  readonly ageBand?: Tymm2024AgeBand | "all";
  readonly materialKind?: TymmOfficialLibraryMaterialKind | "all";
  readonly area?: TymmOfficialLibraryArea | "all";
  readonly availableOnly?: boolean;
}

const ALL_AGES = ["36-48", "48-60", "60-72"] as const;

function officialUrl(path: string): string {
  return new URL(path, `${TYMM_ORIGIN}/`).toString();
}

function officialPdfResource(
  input: Omit<
    TymmOfficialLibraryResource,
    | "sourceCheckedOn"
    | "contentOrigin"
    | "accessMode"
    | "republishMode"
    | "importable"
    | "readerMode"
    | "scope"
    | "scopeLabel"
    | "metadataOrigin"
  >,
): TymmOfficialLibraryResource {
  const preschoolApplicabilityUnverified = input.materialKind === "parent-guide";
  const directPreschoolSource =
    input.materialKind === "program" ||
    input.materialKind === "teacher-guide" ||
    input.materialKind === "activity-book";
  return {
    ...input,
    sourceCheckedOn: TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON,
    contentOrigin: "MEB-official",
    accessMode: "external-link",
    republishMode: "link-only",
    importable: false,
    readerMode: "official-remote-iframe-with-fallback",
    scope: preschoolApplicabilityUnverified
      ? "basic-education-unverified-for-preschool"
      : directPreschoolSource
        ? "preschool-direct"
        : "shared-tymm-framework",
    scopeLabel: preschoolApplicabilityUnverified
      ? "Temel eğitim geneli · okul öncesi uygulanırlığı belgelenmedi"
      : directPreschoolSource
        ? "Okul öncesi doğrudan resmî kaynak"
        : "TYMM geneli · okul öncesi bağlantısı MaarifOS sınıflandırması",
    metadataOrigin: {
      title: "MEB-official",
      description: "MaarifOS-editorial-summary",
      ageBands: preschoolApplicabilityUnverified
        ? "unverified"
        : directPreschoolSource
          ? "MEB-official-title-or-document-text"
          : "MaarifOS-editorial-applicability",
      areas: "MaarifOS-editorial-classification",
      scope: "MaarifOS-editorial-classification",
    },
  };
}

const BOOKS: readonly TymmOfficialLibraryResource[] = [
  officialPdfResource({
    id: "teacher-guide-turkish",
    title: "Türkçe Alanı Öğretmen Kılavuz Kitabı",
    description: "Okul öncesi Türkçe alanı için resmî öğretmen kılavuzu.",
    materialKind: "teacher-guide",
    ageBands: ALL_AGES,
    publisherAgeLabel: "36–48 ay",
    contentVerifiedAgeBands: ALL_AGES,
    areas: ["turkish", "literacy"],
    officialPageUrl: officialUrl("/kitap/1/turkce-alani-ogretmen-kilavuz-kitabi"),
    pdfUrl: officialUrl("/assets/pdf/turkce-alani.pdf"),
    accessStatus: "verified-available",
    verifiedByteSize: 8_969_468,
  }),
  officialPdfResource({
    id: "teacher-guide-social",
    title: "Sosyal Alan Öğretmen Kılavuz Kitabı",
    description: "Okul öncesi sosyal alanı için resmî öğretmen kılavuzu.",
    materialKind: "teacher-guide",
    ageBands: ["36-48"],
    publisherAgeLabel: "36–48 ay",
    contentVerifiedAgeBands: [],
    areas: ["social"],
    officialPageUrl: officialUrl("/kitap/2/sosyal-alan-ogretmen-kilavuz-kitabi"),
    pdfUrl: officialUrl("/assets/pdf/sosyal-alan.pdf"),
    accessStatus: "official-pdf-unavailable",
  }),
  officialPdfResource({
    id: "teacher-guide-social-emotional-values",
    title: "Sosyal Duygusal Öğrenme Becerileri Ve Değerler Öğretmen Kılavuz Kitabı",
    description: "Sosyal duygusal öğrenme becerileri ve değerler için resmî öğretmen kılavuzu.",
    materialKind: "teacher-guide",
    ageBands: ["36-48"],
    publisherAgeLabel: "36–48 ay",
    contentVerifiedAgeBands: [],
    areas: ["social-emotional", "values"],
    officialPageUrl: officialUrl(
      "/kitap/3/sosyal-duygusal-ogrenme-becerileri-ve-degerler-ogretmen-kilavuz-kitabi",
    ),
    pdfUrl: officialUrl("/assets/pdf/sosyal-duygusal-ogrenme-becerileri.pdf"),
    accessStatus: "official-pdf-unavailable",
  }),
  officialPdfResource({
    id: "teacher-guide-art",
    title: "Sanat Alanı Öğretmen Kılavuz Kitabı",
    description: "Okul öncesi sanat alanı için resmî öğretmen kılavuzu.",
    materialKind: "teacher-guide",
    ageBands: ["36-48"],
    publisherAgeLabel: "36–48 ay",
    contentVerifiedAgeBands: [],
    areas: ["art"],
    officialPageUrl: officialUrl("/kitap/4/sanat-alani-ogretmen-kilavuz-kitabi"),
    pdfUrl: officialUrl("/assets/pdf/sanat-alani.pdf"),
    accessStatus: "official-pdf-unavailable",
  }),
  officialPdfResource({
    id: "teacher-guide-music",
    title: "Müzik Alanı Öğretmen Kılavuz Kitabı",
    description: "Okul öncesi müzik alanı için resmî öğretmen kılavuzu.",
    materialKind: "teacher-guide",
    ageBands: ALL_AGES,
    publisherAgeLabel: "36–48 ay",
    contentVerifiedAgeBands: ALL_AGES,
    areas: ["music"],
    officialPageUrl: officialUrl("/kitap/5/muzik-alani-ogretmen-kilavuz-kitabi"),
    pdfUrl: officialUrl("/assets/pdf/muzik-alani.pdf"),
    accessStatus: "verified-available",
    verifiedByteSize: 9_078_079,
  }),
  officialPdfResource({
    id: "teacher-guide-mathematics",
    title: "Matematik Alanı Kılavuz Kitabı",
    description: "Okul öncesi matematik alanı için resmî kılavuz.",
    materialKind: "teacher-guide",
    ageBands: ALL_AGES,
    publisherAgeLabel: "36–48 ay",
    contentVerifiedAgeBands: ALL_AGES,
    areas: ["mathematics"],
    officialPageUrl: officialUrl("/kitap/6/matematik-alani-kilavuz-kitabi"),
    pdfUrl: officialUrl("/assets/pdf/matematik-alani.pdf"),
    accessStatus: "verified-available",
    verifiedByteSize: 9_382_295,
  }),
  officialPdfResource({
    id: "teacher-guide-movement-health",
    title: "Hareket Ve Sağlık Alanı Öğretmen Kılavuz Kitabı",
    description: "Okul öncesi hareket ve sağlık alanı için resmî öğretmen kılavuzu.",
    materialKind: "teacher-guide",
    ageBands: ALL_AGES,
    publisherAgeLabel: "36–48 ay",
    contentVerifiedAgeBands: ALL_AGES,
    areas: ["movement-health"],
    officialPageUrl: officialUrl("/kitap/7/hareket-ve-saglik-alani-ogretmen-kilavuz-kitabi"),
    pdfUrl: officialUrl("/assets/pdf/hareket-ve-saglik-alani.pdf"),
    accessStatus: "verified-available",
    verifiedByteSize: 7_598_319,
  }),
  officialPdfResource({
    id: "teacher-guide-science",
    title: "Fen Alanı Öğretmen Kılavuz Kitabı",
    description: "Okul öncesi fen alanı için resmî öğretmen kılavuzu.",
    materialKind: "teacher-guide",
    ageBands: ALL_AGES,
    publisherAgeLabel: "36–48 ay",
    contentVerifiedAgeBands: ALL_AGES,
    areas: ["science"],
    officialPageUrl: officialUrl("/kitap/8/fen-alani-ogretmen-kilavuz-kitabi"),
    pdfUrl: officialUrl("/assets/pdf/fen-alani.pdf"),
    accessStatus: "verified-available",
    verifiedByteSize: 9_658_337,
  }),
  ...[
    [9, "3 Yaş Çekirdek 1 Etkinlik Kitabı", "36-48", "etkinlik_3_1.pdf", 68_836_381],
    [10, "3 Yaş Çekirdek 2 Etkinlik Kitabı", "36-48", "etkinlik_3_2.pdf", 79_004_215],
    [11, "4 Yaş Çekirdek 1 Etkinlik Kitabı", "48-60", "etkinlik_4_1.pdf", 50_188_044],
    [12, "4 Yaş Çekirdek 2 Etkinlik Kitabı", "48-60", "etkinlik_4_2.pdf", 57_917_710],
    [13, "4 Yaş Çekirdek 3 Etkinlik Kitabı", "48-60", "etkinlik_4_3.pdf", 67_901_843],
    [14, "5 Yaş Çekirdek 1 Etkinlik Kitabı", "60-72", "etkinlik_5_1.pdf", 61_224_909],
    [15, "5 Yaş Çekirdek 2 Etkinlik Kitabı", "60-72", "etkinlik_5_2.pdf", 61_786_951],
    [16, "5 Yaş Çekirdek 3 Etkinlik Kitabı", "60-72", "etkinlik_5_3.pdf", 59_573_898],
    [17, "5 Yaş Çekirdek 4 Etkinlik Kitabı", "60-72", "etkinlik_5_4.pdf", 55_980_963],
  ].map(([id, title, ageBand, fileName, verifiedByteSize]) =>
    officialPdfResource({
      id: `activity-book-${id}`,
      title: String(title),
      description: `${String(ageBand).replace("-", "–")} ay için resmî çocuk etkinlik kitabı.`,
      materialKind: "activity-book",
      ageBands: [ageBand as Tymm2024AgeBand],
      areas: ["general"],
      officialPageUrl: officialUrl(
        `/kitap/${id}/${String(title)
          .toLocaleLowerCase("tr-TR")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/gu, "")
          .replace(/ı/gu, "i")
          .replace(/[^a-z0-9]+/gu, "-")
          .replace(/^-|-$/gu, "")}`,
      ),
      pdfUrl: officialUrl(`/assets/pdf/${fileName}`),
      accessStatus: "verified-available",
      verifiedByteSize: Number(verifiedByteSize),
    }),
  ),
];

const PROGRAM_LITERACY_GUIDES: readonly TymmOfficialLibraryResource[] = [
  [1, "Öğretim Programlarının Temel Yaklaşımı", "modul-1.pdf", 14_313_491],
  [2, "Sosyal-Duygusal Öğrenme Becerileri", "modul-2.pdf", 3_960_582],
  [3, "Erdem Değer Eylem Çerçevesi", "modul-3.pdf", 3_831_326],
  [4, "Sistem Düşüncesi ve Okuryazarlık Becerileri", "modul-4.pdf", 4_094_035],
  [5, "Öğrenme Kanıtları (Ölçme ve Değerlendirme) - 1", "modul-5.pdf", 5_178_985],
  [6, "Ölçme ve Değerlendirme Uygulamaları - 2", "modul-5-yayin-2.pdf", 26_949_327],
  [7, "Farklılaştırma", "modul-6.pdf", 13_478_060],
].map(([documentId, title, fileName, verifiedByteSize]) =>
  officialPdfResource({
    id: `program-literacy-${documentId}`,
    title: String(title),
    description: "TYMM programını okuma, planlama ve uygulama için resmî öğretmen kılavuzu.",
    materialKind: "program-literacy-guide",
    ageBands: ALL_AGES,
    areas: ["general", "literacy"],
    officialPageUrl: officialUrl(
      `/dokuman/${documentId}/${documentId === 6 ? "5" : documentId === 7 ? "6" : documentId}-modul`,
    ),
    pdfUrl: officialUrl(`/assets/pdf/${fileName}`),
    accessStatus: "verified-available",
    verifiedByteSize: Number(verifiedByteSize),
  }),
);

const BROCHURES: readonly TymmOfficialLibraryResource[] = [
  [16, "Temel Yaklaşım", "Meb Broşür 1 - Temel Yaklaşım.pdf", 4_201_130, ["general"]],
  [17, "Erdem-Değer-Eylem Çerçevesi", "Meb Broşür 2 - Erdem-Değer-Eylem Çerçevesi.pdf", 1_119_664, ["values"]],
  [18, "Öğrenci Profili", "Meb Broşür 3 - Öğrenci Profili.pdf", 340_591, ["general"]],
  [19, "Bütüncül Eğitim", "Meb Broşür 5 - Bütüncül Eğitim.pdf", 700_306, ["general"]],
  [20, "Sistem Düşüncesi ve Okuryazarlık Becerileri", "Meb Broşür 6 - Sistem Düşüncesi ve Okuryazarlık Becerileri.pdf", 333_823, ["literacy"]],
  [21, "Sosyal Duygusal Öğrenme Becerileri", "Meb Broşür 7 - Sosyal Duygusal Öğrenme Becerileri.pdf", 408_450, ["social-emotional"]],
].map(([documentId, title, fileName, verifiedByteSize, areas]) =>
  officialPdfResource({
    id: `brochure-${documentId}`,
    title: String(title),
    description: "TYMM’nin ortak çerçevesini kısa ve görsel biçimde açıklayan resmî broşür.",
    materialKind: "brochure",
    ageBands: ALL_AGES,
    areas: areas as readonly TymmOfficialLibraryArea[],
    officialPageUrl: officialUrl(
      `/dokuman/${documentId}/${String(title)
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/gu, "")
        .replace(/ı/gu, "i")
        .replace(/[^a-z0-9]+/gu, "-")
        .replace(/^-|-$/gu, "")}`,
    ),
    pdfUrl: officialUrl(`/assets/pdf/${encodeURIComponent(String(fileName)).replace(/%2F/gu, "/")}`),
    accessStatus: "verified-available",
    verifiedByteSize: Number(verifiedByteSize),
  }),
);

const REPORTS: readonly TymmOfficialLibraryResource[] = [
  [25, "Türkiye’nin Geleceği İçin Özgün Bir Tasarım: Türkiye Yüzyılı Maarif Modeli Rapor-1", "rapor-1.pdf", 71_042_380, "turkiyenin-gelecegi-icin-ozgun-bir-tasarim-turkiye-yuzyili-maarif-modeli-rapor-1"],
  [38, "Türkiye’nin Geleceği İçin Özgün Bir Tasarım: Türkiye Yüzyılı Maarif Modeli Rapor-2", "rapor-2.pdf", 52_355_706, "turkiyenin-gelecegi-icin-ozgun-bir-tasarim-turkiye-yuzyili-maarif-modeli-rapor-2"],
  [39, "Türkiye’nin Geleceği İçin Özgün Bir Tasarım: Türkiye Yüzyılı Maarif Modeli Rapor-3", "rapor-3.pdf", 17_656_500, "turkiyenin-gelecegi-icin-ozgun-bir-tasarim-turkiye-yuzyili-maarif-modeli-rapor-3"],
  [41, "Türkiye Yüzyılı Maarif Modeli Millî Zihin, Evrensel Vizyon Rapor-4", "rapor-4.pdf", 14_233_400, "turkiye-yuzyili-maarif-modeli-milli-zihin-evrensel-vizyon-rapor-4"],
  [42, "TÜRKİYE YÜZYILI MAARİF MODELİ BECERİLERİN ÖLÇÜLMESİNE İLİŞKİN ARAŞTIRMA RAPORU", "becerilerin-olculmesine-iliskin-arastirma-raporu.pdf", 21_692_877, "turkiye-yuzyili-maarif-modeli-becerilerin-olculmesine-iliskin-arastirma-raporu"],
].map(([documentId, title, fileName, verifiedByteSize, slug]) =>
  officialPdfResource({
    id: `report-${documentId}`,
    title: String(title),
    description: "Türkiye Yüzyılı Maarif Modeli hakkında resmî araştırma ve değerlendirme raporu.",
    materialKind: "report",
    ageBands: ALL_AGES,
    areas: ["research"],
    officialPageUrl: officialUrl(`/dokuman/${documentId}/${slug}`),
    pdfUrl: officialUrl(`/assets/pdf/${fileName}`),
    accessStatus: "verified-available",
    verifiedByteSize: Number(verifiedByteSize),
  }),
);

const RAW_TYMM_OFFICIAL_LIBRARY: readonly TymmOfficialLibraryResource[] = [
  officialPdfResource({
    id: "preschool-program-2024",
    title: "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı",
    description: "36–48, 48–60 ve 60–72 ay öğrenme çıktıları ile programın resmî ana belgesi.",
    materialKind: "program",
    ageBands: ALL_AGES,
    areas: ["general"],
    officialPageUrl: officialUrl("/ogretim-programlari/ders/okul-oncesi"),
    pdfUrl: TYMM_OFFICIAL_PROGRAM_PDF_URL,
    accessStatus: "verified-available",
    verifiedByteSize: 8_333_712,
  }),
  ...BOOKS,
  ...PROGRAM_LITERACY_GUIDES,
  officialPdfResource({
    id: "parent-guide-basic-education",
    title: "Veli Bilgilendirme Kılavuzu",
    description: "Temel eğitim velileri için TYMM’yi açıklayan resmî bilgilendirme kılavuzu.",
    materialKind: "parent-guide",
    ageBands: [],
    areas: ["family"],
    officialPageUrl: officialUrl("/dokuman/8/veli-bilgilendirme-kilavuzu"),
    pdfUrl: officialUrl("/assets/pdf/veli-bilgilendirme-kilavuzu-tegm.pdf"),
    accessStatus: "verified-available",
    verifiedByteSize: 47_643_211,
  }),
  ...BROCHURES,
  ...REPORTS,
  officialPdfResource({
    id: "common-text",
    title: "Türkiye Yüzyılı Maarif Modeli Ortak Metni",
    description: "Modelin bütüncül yapısını ve ortak kavramlarını açıklayan resmî metin.",
    materialKind: "common-text",
    ageBands: ALL_AGES,
    areas: ["general", "values", "literacy", "social-emotional"],
    officialPageUrl: officialUrl("/ortak-metin"),
    pdfUrl: officialUrl("/upload/brosur/ortak_metin.pdf"),
    accessStatus: "verified-available",
    verifiedByteSize: 4_902_774,
  }),
];

function commonFrameworkPage(
  id: string,
  title: string,
  path: string,
  summary: string,
): TymmOfficialCommonFrameworkPage {
  return {
    id,
    officialRecord: {
      title,
      url: officialUrl(path),
      contentOrigin: "MEB-official",
      accessMode: "external-link",
      republishMode: "link-only",
      importable: false,
    },
    presentation: {
      summary,
      summaryOrigin: "MaarifOS-editorial-summary",
    },
    ageBands: ALL_AGES,
    scope: "shared-tymm-framework",
    scopeLabel: "TYMM ortak çerçevesi · okul öncesi bağlantısı MaarifOS sınıflandırması",
    classificationOrigin: "MaarifOS-editorial-applicability",
    sourceCheckedOn: TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON,
  };
}

const RAW_TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES = [
  commonFrameworkPage(
    "content-framework",
    "İçerik Çerçevesi",
    "/icerik-cercevesi",
    "Bilgi kümelerinin becerilerle birlikte öğrenme çıktılarını nasıl oluşturduğunu açıklar.",
  ),
  commonFrameworkPage(
    "conceptual-skills",
    "Kavramsal Beceriler",
    "/beceriler/kavramsal-beceriler",
    "Temel, bütünleşik ve üst düzey düşünme becerilerinin resmî çerçevesidir.",
  ),
  commonFrameworkPage(
    "physical-skills",
    "Fiziksel Beceriler",
    "/beceriler/fiziksel-beceriler",
    "Fiziksel gelişim ve eylem süreçlerine ilişkin ayrı resmî beceri çerçevesidir.",
  ),
  commonFrameworkPage(
    "dispositions",
    "Eğilimler",
    "/beceriler/egilimler",
    "Öğrenme sürecindeki tutum ve yönelimleri açıklayan resmî çerçevedir.",
  ),
  commonFrameworkPage(
    "domain-skills",
    "Alan Becerileri",
    "/alan-becerileri",
    "Disiplin alanlarına özgü becerileri açıklayan resmî çerçevedir.",
  ),
  commonFrameworkPage(
    "social-emotional-skills",
    "Sosyal-Duygusal Öğrenme Becerileri",
    "/beceriler/sosyal-duygusal-ogrenme-becerileri",
    "Benlik, sosyal yaşam ve ortak yaşam becerilerini kapsayan resmî çerçevedir.",
  ),
  commonFrameworkPage(
    "virtue-value-action",
    "Erdem-Değer-Eylem Çerçevesi",
    "/beceriler/erdem-deger-eylem-cercevesi",
    "Değerlerin gözlenebilir eylemlerle ilişkisini kuran resmî çerçevedir.",
  ),
  commonFrameworkPage(
    "literacy-skills",
    "Okuryazarlık Becerileri",
    "/beceriler/okuryazarlik-becerileri",
    "Farklı okuryazarlık türlerini ayrı bir beceri bileşeni olarak açıklar.",
  ),
  commonFrameworkPage(
    "common-text-page",
    "Ortak Metin",
    "/ortak-metin",
    "TYMM’nin ortak dilini, yaklaşımını ve bileşen ilişkilerini bir arada sunar.",
  ),
  commonFrameworkPage(
    "learning-outcomes-framework",
    "Öğrenme Çıktıları Çerçevesi",
    "/ogrenme-ciktilari-cercevesi",
    "Bilgi, beceri ve program bileşenlerinin öğrenme çıktılarında nasıl birleştiğini açıklar.",
  ),
  commonFrameworkPage(
    "cross-program-components",
    "Programlar Arası Bileşenler",
    "/programlar-arasi-bilesenler",
    "Sosyal duygusal öğrenme, değerler ve okuryazarlık bileşenlerinin ortak yapısını sunar.",
  ),
  commonFrameworkPage(
    "learning-teaching-experiences",
    "Öğrenme-Öğretme Yaşantıları",
    "/ogrenme-ogretme-yasantilari",
    "Öğrenme ortamı, öğretmen rolü ve yaşantı tasarımının resmî yaklaşımını açıklar.",
  ),
  commonFrameworkPage(
    "basic-approach",
    "Temel Yaklaşım",
    "/temel-yaklasim",
    "Modelin insan, bilgi, değer ve eğitim anlayışına ilişkin temel yaklaşımını sunar.",
  ),
  commonFrameworkPage(
    "student-profile",
    "Öğrenci Profili",
    "/ogrenci-profili",
    "Modelin hedeflediği yetkin ve erdemli insan özelliklerini resmî olarak açıklar.",
  ),
  commonFrameworkPage(
    "overview",
    "Genel Bakış",
    "/genel-bakis",
    "Türkiye Yüzyılı Maarif Modeli’nin genel yapısını ve ana bileşenlerini sunar.",
  ),
  commonFrameworkPage(
    "extracurricular-activities",
    "Program Dışı Etkinlikler",
    "/program-disi-etkinlikler",
    "Program dışı etkinliklerin eğitim sürecindeki yerini ve ilkelerini açıklar.",
  ),
  commonFrameworkPage(
    "school-based-planning",
    "Okul Temelli Planlama",
    "/okul-temelli-planlama",
    "Okulun koşullarına göre planlamanın resmî kapsamını ve sorumluluklarını açıklar.",
  ),
  commonFrameworkPage(
    "process",
    "Süreç",
    "/surec",
    "Modelin geliştirilme ve uygulama sürecine ilişkin resmî sayfadır.",
  ),
  commonFrameworkPage(
    "assessment",
    "Öğrenme Kanıtları",
    "/olcme-degerlendirme",
    "Öğrenme kanıtlarının toplanması ve değerlendirilmesine ilişkin resmî yaklaşımı açıklar.",
  ),
  commonFrameworkPage(
    "differentiated-education",
    "Farklılaştırma",
    "/farklilastirilmis-egitim",
    "Farklı öğrenme ihtiyaçlarına göre zenginleştirme ve destekleme yaklaşımını açıklar.",
  ),
  commonFrameworkPage(
    "teacher-reflections",
    "Öğretmen Yansıtmaları",
    "/ogretmen-yansitmalari",
    "Öğretmenin uygulamayı değerlendirmesi ve sonraki planı geliştirmesine ilişkin çerçeveyi sunar.",
  ),
] as const;

function officialVideoPage(
  id: string,
  title: string,
  path: string,
  videoKind: TymmOfficialVideoPage["videoKind"],
  options: {
    readonly ageBands?: readonly Tymm2024AgeBand[];
    readonly scope?: TymmOfficialVideoPage["scope"];
    readonly presentationAgeLabel?: string;
  } = {},
): TymmOfficialVideoPage {
  return {
    id,
    officialRecord: {
      title,
      url: officialUrl(path),
      contentOrigin: "MEB-official",
      accessMode: "external-link",
      republishMode: "link-only",
      importable: false,
    },
    videoKind,
    ageBands: options.ageBands ?? ALL_AGES,
    scope: options.scope ?? "preschool-direct",
    presentationAgeLabel:
      options.presentationAgeLabel ?? "Okul öncesi · tüm program",
    presentationOrigin: "MaarifOS-editorial-classification",
    sourceCheckedOn: TYMM_OFFICIAL_RESOURCE_SOURCE_CHECKED_ON,
  };
}

const RAW_TYMM_OFFICIAL_PRESCHOOL_VIDEOS: readonly TymmOfficialVideoPage[] = [
  officialVideoPage(
    "preschool-program-introduction-video",
    "Okul Öncesi Öğretim Programı",
    "/videolar/okul-oncesi-ogretim-programi/134",
    "introduction",
    { presentationAgeLabel: "Okul öncesi · tüm program · tanıtım videosu" },
  ),
  officialVideoPage(
    "preschool-program-training-video",
    "Okul Öncesi Eğitim Programı",
    "/videolar/okul-oncesi-egitim-programi/153",
    "training",
    { presentationAgeLabel: "Okul öncesi · tüm program · eğitim videosu" },
  ),
  officialVideoPage(
    "preschool-books-introduction-video",
    "Okul Öncesi Öğretmen Kılavuz ve Çocuk Etkinlik Kitapları Tanıtımı",
    "/videolar/okul-oncesi-ogretmen-kilavuz-ve-cocuk-etkinlik-kitaplari-tanitimi/208",
    "book-introduction",
  ),
  ...Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    return officialVideoPage(
      `preschool-classroom-example-video-${number}`,
      `Okul Öncesi Örnek Uygulama Videosu-${number}`,
      `/videolar/okul-oncesi-ornek-uygulama-videosu-${number}/${279 + number}`,
      "classroom-example",
      {
        ageBands: [],
        presentationAgeLabel: "Okul öncesi · yaş bandı belirtilmemiş · örnek uygulama",
      },
    );
  }),
];

const RAW_TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS: readonly TymmOfficialVideoPage[] = [
  [197, "Erdem-Değer-Eylem Çerçevesi", "erdem-deger-eylem-cercevesi"],
  [198, "Farklılaştırılmış Öğretim", "farklilastirilmis-ogretim"],
  [199, "Farklılaştırılmış Öğretim", "farklilastirilmis-ogretim"],
  [200, "Öğrenme Kanıtları (Ölçme-Değerlendirme)", "ogrenme-kanitlari-olcme-degerlendirme"],
  [201, "Öğrenme Kanıtları (Ölçme-Değerlendirme)", "ogrenme-kanitlari-olcme-degerlendirme"],
  [202, "Okuryazarlik Becerileri Çercevesi", "okuryazarlik-becerileri-cercevesi"],
  [203, "Sınıf Yönetimi", "sinif-yonetimi"],
  [204, "Modül-1", "modul-1"],
  [205, "Modül-2", "modul-2"],
  [206, "Modül-3", "modul-3"],
  [207, "Modül-4", "modul-4"],
].map(([videoId, title, slug]) =>
  officialVideoPage(
    `general-education-video-${videoId}`,
    String(title),
    `/videolar/${slug}/${videoId}`,
    "training",
    {
      scope: "shared-tymm-framework",
      presentationAgeLabel: "TYMM geneli · yaşa özel değil · MaarifOS ortak kaynak sınıflandırması",
    },
  ),
);

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function validateOfficialLibrary(resources: readonly TymmOfficialLibraryResource[]): void {
  const ids = new Set<string>();
  const pdfUrls = new Set<string>();
  for (const resource of resources) {
    if (ids.has(resource.id) || pdfUrls.has(resource.pdfUrl)) {
      throw new Error("TYMM resmî kütüphane kimlikleri ve PDF adresleri benzersiz olmalı.");
    }
    ids.add(resource.id);
    pdfUrls.add(resource.pdfUrl);
    for (const url of [resource.officialPageUrl, resource.pdfUrl]) {
      const parsed = new URL(url);
      if (
        parsed.protocol !== "https:" ||
        parsed.hostname !== "tymm.meb.gov.tr" ||
        parsed.port !== "" ||
        parsed.username !== "" ||
        parsed.password !== ""
      ) {
        throw new Error(`Geçersiz TYMM resmî kaynak URL'si: ${url}`);
      }
    }
    if (
      resource.accessStatus === "verified-available" &&
      (!Number.isSafeInteger(resource.verifiedByteSize) || (resource.verifiedByteSize ?? 0) <= 0)
    ) {
      throw new Error(`Doğrulanmış PDF boyutu eksik: ${resource.id}`);
    }
    if (
      resource.accessStatus === "official-pdf-unavailable" &&
      resource.verifiedByteSize !== undefined
    ) {
      throw new Error(`Erişilemeyen PDF kullanılabilir boyut taşıyamaz: ${resource.id}`);
    }
  }
}

validateOfficialLibrary(RAW_TYMM_OFFICIAL_LIBRARY);

export const TYMM_OFFICIAL_LIBRARY = deepFreeze(RAW_TYMM_OFFICIAL_LIBRARY);
export const TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES = deepFreeze(
  RAW_TYMM_OFFICIAL_COMMON_FRAMEWORK_PAGES,
);
export const TYMM_OFFICIAL_PRESCHOOL_VIDEOS = deepFreeze(
  RAW_TYMM_OFFICIAL_PRESCHOOL_VIDEOS,
);
export const TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS = deepFreeze(
  RAW_TYMM_OFFICIAL_GENERAL_EDUCATION_VIDEOS,
);

export const TYMM_OFFICIAL_LIBRARY_MATERIAL_LABELS: Readonly<
  Record<TymmOfficialLibraryMaterialKind, string>
> = deepFreeze({
  program: "Öğretim programı",
  "teacher-guide": "Öğretmen kılavuzu",
  "activity-book": "Etkinlik kitabı",
  "program-literacy-guide": "Program okuryazarlığı",
  "parent-guide": "Veli kılavuzu",
  brochure: "Broşür",
  report: "Rapor",
  "common-text": "Ortak metin",
});

export const TYMM_OFFICIAL_LIBRARY_AREA_LABELS: Readonly<
  Record<TymmOfficialLibraryArea, string>
> = deepFreeze({
  general: "Genel çerçeve",
  turkish: "Türkçe",
  social: "Sosyal",
  "social-emotional": "Sosyal duygusal öğrenme",
  art: "Sanat",
  music: "Müzik",
  mathematics: "Matematik",
  "movement-health": "Hareket ve sağlık",
  science: "Fen",
  values: "Değerler",
  literacy: "Okuryazarlık",
  family: "Aile",
  research: "Araştırma",
});

const TYMM_DOMAIN_TO_LIBRARY_AREA: Readonly<
  Record<string, TymmOfficialLibraryArea>
> = deepFreeze({
  "Türkçe": "turkish",
  "Sosyal": "social",
  "Sanat": "art",
  "Müzik": "music",
  "Matematik": "mathematics",
  "Hareket ve Sağlık": "movement-health",
  "Fen": "science",
});

/** Exact TYMM domain labels only; unknown or editorial labels stay unassigned. */
export function tymmDomainToOfficialLibraryArea(
  domain: unknown,
): TymmOfficialLibraryArea | undefined {
  if (typeof domain !== "string") return undefined;
  return TYMM_DOMAIN_TO_LIBRARY_AREA[domain];
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/ı/gu, "i")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

export function listTymmOfficialLibraryResources(
  filter: TymmOfficialLibraryFilter = {},
): readonly TymmOfficialLibraryResource[] {
  const query = normalizeSearchText(filter.query ?? "");
  return TYMM_OFFICIAL_LIBRARY.filter((resource) => {
    if (
      filter.ageBand &&
      filter.ageBand !== "all" &&
      !resource.ageBands.includes(filter.ageBand)
    ) {
      return false;
    }
    if (
      filter.materialKind &&
      filter.materialKind !== "all" &&
      resource.materialKind !== filter.materialKind
    ) {
      return false;
    }
    if (
      filter.area &&
      filter.area !== "all" &&
      !resource.areas.includes(filter.area)
    ) {
      return false;
    }
    if (filter.availableOnly && resource.accessStatus !== "verified-available") {
      return false;
    }
    if (!query) return true;
    const searchable = normalizeSearchText(
      [
        resource.title,
        resource.description,
        TYMM_OFFICIAL_LIBRARY_MATERIAL_LABELS[resource.materialKind],
        ...resource.areas.map((area) => TYMM_OFFICIAL_LIBRARY_AREA_LABELS[area]),
      ].join(" "),
    );
    return query.split(/\s+/u).every((term) => searchable.includes(term));
  });
}

export function recommendTymmOfficialLibraryResources(input: {
  readonly ageBand: Tymm2024AgeBand | null;
  readonly area?: TymmOfficialLibraryArea;
  readonly limit?: number;
}): readonly TymmOfficialLibraryResource[] {
  const limit = Math.max(0, Math.min(12, input.limit ?? 4));
  return TYMM_OFFICIAL_LIBRARY
    .filter((resource) =>
      resource.accessStatus === "verified-available" &&
      resource.scope !== "basic-education-unverified-for-preschool" &&
       (input.ageBand
         ? resource.ageBands.includes(input.ageBand)
         : resource.materialKind !== "activity-book" &&
           resource.materialKind !== "teacher-guide"),
    )
    .map((resource, index) => {
      let score = -index / 1_000;
      if (input.ageBand && resource.ageBands.length === 1) score += 100;
      if (input.area && resource.areas.includes(input.area)) score += 200;
      if (resource.materialKind === "program") score += 70;
      if (resource.materialKind === "activity-book") score += 60;
      if (resource.materialKind === "teacher-guide") score += 40;
      if (resource.materialKind === "brochure") score += 20;
      return { resource, score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ resource }) => resource);
}

export function canEmbedTymmOfficialLibraryResource(
  resource: TymmOfficialLibraryResource,
): boolean {
  return resource.accessStatus === "verified-available";
}
