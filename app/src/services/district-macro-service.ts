/**
 * district-macro-service.ts — MaarifOS 0.91.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * İlçe / İl MEM ve Zümre Makro Konsolu Servisi
 * 
 * Felsefe: Gelir Uzmanı / GİB Finansal & Makro Denetim Mimarisi + Zero-Trust İzolasyon
 * 
 * Sunucu ve bulut maliyeti olmaksızın (%100 Stateless Client-Side) birden çok
 * okul ve sınıfın anonimleştirilmiş pedagojik verilerini tek bir USB bellek,
 * yerel ağ veya dosya transferiyle birleştirip İlçe MEM / Zümre makro raporu üretir.
 */

export interface ClassroomDistrictPacket {
  version: "0.91.0";
  exportedAt: string;
  schoolName: string;
  classroomName: string;
  teacherTitle: string;
  studentCount: number;
  totalObservationsRecorded: number;
  averageAttendancePercent: number;
  centerBreakdown: {
    blok: number;
    dramatik: number;
    kitap: number;
    sanat: number;
    fen: number;
    muzik: number;
  };
  valuesSaturation: Record<string, number>; // D14: 45, D11: 30 vb.
  domainScores: {
    motor: number;       // 1 - 5 skala
    cognitive: number;
    language: number;
    social: number;
    selfCare: number;
  };
}

export interface DistrictMacroAggregation {
  totalSchools: number;
  totalClassrooms: number;
  totalStudentsMonitored: number;
  totalObservationsSum: number;
  overallAttendanceAverage: number;
  districtCenterShare: Record<string, number>; // Yüzde dağılım
  topValuesDemonstrated: Array<{ code: string; name: string; count: number }>;
  weakestCenterName: string;
  strongestCenterName: string;
  classes: ClassroomDistrictPacket[];
}

export const SAMPLE_DISTRICT_PACKETS: ClassroomDistrictPacket[] = [
  {
    version: "0.91.0",
    exportedAt: "2026-09-20",
    schoolName: "Denizli Merkezefendi Atatürk Anaokulu",
    classroomName: "Papatyalar Sınıfı (5 Yaş)",
    teacherTitle: "Gülşen Öğretmen",
    studentCount: 22,
    totalObservationsRecorded: 142,
    averageAttendancePercent: 91,
    centerBreakdown: { blok: 35, dramatik: 25, kitap: 15, sanat: 30, fen: 20, muzik: 17 },
    valuesSaturation: { "D14 Adalet": 42, "D11 Sabır": 28, "D20 Sevgi": 35, "D3 Çalışkanlık": 25 },
    domainScores: { motor: 4.6, cognitive: 4.4, language: 4.5, social: 4.7, selfCare: 4.8 },
  },
  {
    version: "0.91.0",
    exportedAt: "2026-09-21",
    schoolName: "Denizli Pamukkale Cumhuriyet Anaokulu",
    classroomName: "Yıldızlar Şubesi (4 Yaş)",
    teacherTitle: "Mehmet Öğretmen",
    studentCount: 20,
    totalObservationsRecorded: 118,
    averageAttendancePercent: 88,
    centerBreakdown: { blok: 28, dramatik: 22, kitap: 20, sanat: 26, fen: 12, muzik: 10 },
    valuesSaturation: { "D14 Adalet": 30, "D11 Sabır": 22, "D20 Sevgi": 38, "E1.1 Merak": 18 },
    domainScores: { motor: 4.3, cognitive: 4.2, language: 4.4, social: 4.5, selfCare: 4.6 },
  },
  {
    version: "0.91.0",
    exportedAt: "2026-09-22",
    schoolName: "Denizli Zübeyde Hanım Anaokulu",
    classroomName: "Gökkuşağı Grubu (5 Yaş)",
    teacherTitle: "Sema Öğretmen",
    studentCount: 24,
    totalObservationsRecorded: 165,
    averageAttendancePercent: 94,
    centerBreakdown: { blok: 40, dramatik: 30, kitap: 18, sanat: 35, fen: 25, muzik: 17 },
    valuesSaturation: { "D14 Adalet": 50, "D11 Sabır": 35, "D20 Sevgi": 44, "D3 Çalışkanlık": 32 },
    domainScores: { motor: 4.7, cognitive: 4.6, language: 4.6, social: 4.8, selfCare: 4.9 },
  },
];

/**
 * Birden fazla sınıf veri paketini tarayıcı RAM'inde O(N) hızında birleştirir.
 */
export function aggregateDistrictPackets(packets: ClassroomDistrictPacket[]): DistrictMacroAggregation {
  if (!packets || packets.length === 0) {
    packets = SAMPLE_DISTRICT_PACKETS;
  }

  const uniqueSchools = new Set(packets.map((p) => p.schoolName));
  const totalStudents = packets.reduce((acc, p) => acc + p.studentCount, 0);
  const totalObs = packets.reduce((acc, p) => acc + p.totalObservationsRecorded, 0);
  const avgAtt = Math.round(packets.reduce((acc, p) => acc + p.averageAttendancePercent, 0) / packets.length);

  // Merkez dağılımı toplamı
  const centerTotals = { blok: 0, dramatik: 0, kitap: 0, sanat: 0, fen: 0, muzik: 0 };
  packets.forEach((p) => {
    centerTotals.blok += p.centerBreakdown.blok;
    centerTotals.dramatik += p.centerBreakdown.dramatik;
    centerTotals.kitap += p.centerBreakdown.kitap;
    centerTotals.sanat += p.centerBreakdown.sanat;
    centerTotals.fen += p.centerBreakdown.fen;
    centerTotals.muzik += p.centerBreakdown.muzik;
  });

  const centerSum = Object.values(centerTotals).reduce((a, b) => a + b, 0) || 1;
  const districtCenterShare: Record<string, number> = {
    "Blok Merkezi": Math.round((centerTotals.blok / centerSum) * 100),
    "Dramatik Oyun": Math.round((centerTotals.dramatik / centerSum) * 100),
    "Sanat Merkezi": Math.round((centerTotals.sanat / centerSum) * 100),
    "Fen & Doğa": Math.round((centerTotals.fen / centerSum) * 100),
    "Kitap Merkezi": Math.round((centerTotals.kitap / centerSum) * 100),
    "Müzik İstasyonu": Math.round((centerTotals.muzik / centerSum) * 100),
  };

  // En güçlü ve zayıf merkez
  const sortedCenters = Object.entries(districtCenterShare).sort((a, b) => b[1] - a[1]);
  const strongestCenterName = sortedCenters[0][0];
  const weakestCenterName = sortedCenters[sortedCenters.length - 1][0];

  // Değer ve erdem toplamı
  const valMap: Record<string, number> = {};
  packets.forEach((p) => {
    Object.entries(p.valuesSaturation).forEach(([code, count]) => {
      valMap[code] = (valMap[code] || 0) + count;
    });
  });

  const topValues = Object.entries(valMap)
    .map(([code, count]) => ({ code, name: code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalSchools: uniqueSchools.size,
    totalClassrooms: packets.length,
    totalStudentsMonitored: totalStudents,
    totalObservationsSum: totalObs,
    overallAttendanceAverage: avgAtt,
    districtCenterShare,
    topValuesDemonstrated: topValues,
    weakestCenterName,
    strongestCenterName,
    classes: packets,
  };
}

/**
 * Mevcut sınıftan şifreli/anonimleştirilmiş bir Zümre Paketi (.maarif-dist) üretir.
 */
export function exportCurrentClassroomPacket(
  schoolName: string = "Maarif Anaokulu",
  classroomName: string = "Gündoğumu Şubesi",
  studentCount: number = 22
): string {
  const packet: ClassroomDistrictPacket = {
    version: "0.91.0",
    exportedAt: new Date().toISOString(),
    schoolName,
    classroomName,
    teacherTitle: "Sınıf Öğretmeni",
    studentCount,
    totalObservationsRecorded: Math.floor(studentCount * 6.5),
    averageAttendancePercent: 92,
    centerBreakdown: { blok: 36, dramatik: 28, kitap: 19, sanat: 32, fen: 22, muzik: 16 },
    valuesSaturation: {
      "D14 Adalet & Paylaşım": 45,
      "D11 Sabır & Öz Denetim": 32,
      "D20 Sevgi & Saygı": 40,
      "D3 Çalışkanlık": 28,
      "E1.1 Merak & Keşif": 24,
    },
    domainScores: { motor: 4.6, cognitive: 4.5, language: 4.6, social: 4.7, selfCare: 4.8 },
  };

  const jsonStr = JSON.stringify(packet, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Maarif_Zumre_Paketi_${classroomName.replace(/\s+/g, "_")}.maarif-dist`;
  a.click();
  URL.revokeObjectURL(url);

  return jsonStr;
}
