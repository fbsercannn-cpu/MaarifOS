/**
 * graduation-album-service.ts — MaarifOS 0.92.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * Kişiselleştirilmiş Akıllı Mezuniyet Gelişim Albümü (Hardcover Portfolio Engine)
 * 
 * Felsefe: Maria Montessori / John Dewey & Gelir Uzmanı Belge Mükemmeliyeti
 * 
 * Yıl sonunda veliye verilen klasik evrakların çöpe gitmesini önleyen;
 * çocuğun 1 yıllık sınıf içi görsel analizlerini, e-Okul gelişim alanlarını,
 * sosyometrik merkez profilini ve öğretmenin kişisel veda mektubunu
 * kuşe kağıt matbaa baskısına hazır çok sayfalı A4 kitaba dönüştüren motor.
 * 
 * %100 İstemci Taraflı (Stateless Client-Side) & Sıfır Bulut Bağımlılığı.
 */

export interface GraduationAlbumPageData {
  pageNumber: number;
  pageTitle: string;
  subtitle: string;
  contentSection: "cover" | "profile" | "artwork_vision" | "growth" | "eokul_summary" | "teacher_letter";
}

export interface StudentGraduationAlbum {
  studentId: string;
  fullName: string;
  birthDate: string;
  schoolName: string;
  classroomName: string;
  teacherName: string;
  academicYear: string;
  avatarIcon: string;
  dominantCenter: string;
  dominantValue: string;
  motorScorePercent: number;
  spatialScorePercent: number;
  heightGrowthCm: number;
  weightGrowthKg: number;
  teacherFarewellLetter: string;
  pages: GraduationAlbumPageData[];
}

export const SAMPLE_ALBUM_STUDENTS: StudentGraduationAlbum[] = [
  {
    studentId: "s1",
    fullName: "Ali Kaya",
    birthDate: "14.04.2021",
    schoolName: "Denizli Maarif Model Anaokulu",
    classroomName: "Papatyalar Sınıfı",
    teacherName: "Gülşen Öğretmen",
    academicYear: "2026 - 2027",
    avatarIcon: "👦",
    dominantCenter: "Blok & Mimari Merkezi",
    dominantValue: "D14 Adalet & Paylaşım Erdemi",
    motorScorePercent: 94,
    spatialScorePercent: 96,
    heightGrowthCm: 7.2,
    weightGrowthKg: 2.4,
    teacherFarewellLetter:
      "Sevgili Ali, sınıfa ilk adım attığın günden bu yana blok merkezinde inşa ettiğin yüksek kuleler gibi hayal gücünü ve cesaretini de her gün büyüttün. Arkadaşlarınla oyuncaklarını adaletle paylaşman ve çemberdeki derin soruların hepimizin kalbinde iz bıraktı. İlkokul yolculuğunda merakının ışığı hiç sönmesin. Seni daima sevgiyle hatırlayacağım.",
    pages: [
      { pageNumber: 1, pageTitle: "Kapak", subtitle: "2026-2027 Gelişim Serüvenim", contentSection: "cover" },
      { pageNumber: 2, pageTitle: "Benim Dünyam", subtitle: "Öğrenme Merkezlerim & Erdemlerim", contentSection: "profile" },
      { pageNumber: 3, pageTitle: "Görsel Sanat & Tasarımlarım", subtitle: "Edge Vision Pedagojik Analizlerim", contentSection: "artwork_vision" },
      { pageNumber: 4, pageTitle: "Büyüme Yolculuğum", subtitle: "Boy, Kilo ve Sağlık Eğrim", contentSection: "growth" },
      { pageNumber: 5, pageTitle: "e-Okul Başarı Karnem", subtitle: "5 Temel Gelişim Alanı", contentSection: "eokul_summary" },
      { pageNumber: 6, pageTitle: "Öğretmenimin Kaleminden", subtitle: "Geleceğe Veda ve Umut Mektubu", contentSection: "teacher_letter" },
    ],
  },
  {
    studentId: "s2",
    fullName: "Zeynep Baran",
    birthDate: "22.08.2021",
    schoolName: "Denizli Maarif Model Anaokulu",
    classroomName: "Papatyalar Sınıfı",
    teacherName: "Gülşen Öğretmen",
    academicYear: "2026 - 2027",
    avatarIcon: "👧",
    dominantCenter: "Sanat & Kitap Merkezi",
    dominantValue: "E3.1 Estetik Duyarlılık & Nezaket",
    motorScorePercent: 96,
    spatialScorePercent: 92,
    heightGrowthCm: 6.8,
    weightGrowthKg: 2.1,
    teacherFarewellLetter:
      "Güzel Zeynep, fırçanın ucundan kağıda dökülen rengarenk dünyan ve masal çemberinde gözlerinden okunan heyecan sınıfımıza daima neşe kattı. İnce düşüncen, arkadaşlarına gösterdiğin zarafet ve öğrenme aşkın seni hayatın boyunca en güzel yerlere taşıyacak. Yolun açık, başarıların sonsuz olsun.",
    pages: [
      { pageNumber: 1, pageTitle: "Kapak", subtitle: "2026-2027 Gelişim Serüvenim", contentSection: "cover" },
      { pageNumber: 2, pageTitle: "Benim Dünyam", subtitle: "Öğrenme Merkezlerim & Erdemlerim", contentSection: "profile" },
      { pageNumber: 3, pageTitle: "Görsel Sanat & Tasarımlarım", subtitle: "Edge Vision Pedagojik Analizlerim", contentSection: "artwork_vision" },
      { pageNumber: 4, pageTitle: "Büyüme Yolculuğum", subtitle: "Boy, Kilo ve Sağlık Eğrim", contentSection: "growth" },
      { pageNumber: 5, pageTitle: "e-Okul Başarı Karnem", subtitle: "5 Temel Gelişim Alanı", contentSection: "eokul_summary" },
      { pageNumber: 6, pageTitle: "Öğretmenimin Kaleminden", subtitle: "Geleceğe Veda ve Umut Mektubu", contentSection: "teacher_letter" },
    ],
  },
];

export function getStudentGraduationAlbum(studentId: string): StudentGraduationAlbum {
  return (
    SAMPLE_ALBUM_STUDENTS.find((s) => s.studentId === studentId) ||
    SAMPLE_ALBUM_STUDENTS[0]
  );
}
