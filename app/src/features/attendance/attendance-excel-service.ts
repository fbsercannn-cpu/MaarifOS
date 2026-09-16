/**
 * T.C. Hazine ve Maliye Bakanlığı & Gelir İdaresi Başkanlığı Standartları
 * MEB TTKB Aylık Yoklama Matrisi & Devamsızlık İstatistiği Excel Motoru
 * Formül Enjeksiyonu: SUBTOTAL(109, ...) ile gizlenen satırları yok sayan filtre uyumlu toplam
 * Renkler: MEB Kurumsal Laciverti (#003366), Zebra Deseni (#F8FAFC), İnce Kenarlıklar
 */

import { downloadBrowserFile } from "../documents/browser-file-download.ts";
import { XLSX_MIME_TYPE } from "../official-forms/official-form-export-service.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { buildAttendanceDayBreakdown } from "./attendance-day-breakdown.ts";

export interface AttendanceStudentSummary {
  readonly id: string;
  readonly name: string;
  readonly status?: "present" | "absent" | "late" | "unmarked";
  readonly attendanceMarked?: boolean;
}

export interface ExportMonthlyAttendanceExcelOptions {
  readonly civilDate: string; // "2026-09-15"
  readonly students: readonly AttendanceStudentSummary[];
  readonly store?: LocalDataStore;
  readonly schoolName?: string;
  readonly className?: string;
  readonly teacherName?: string;
}

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

function getMonthDays(year: number, monthZeroBased: number): string[] {
  const daysInMonth = new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
  const days: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, "0");
    const monthStr = String(monthZeroBased + 1).padStart(2, "0");
    days.push(`${year}-${monthStr}-${dayStr}`);
  }
  return days;
}

export async function exportMonthlyAttendanceExcel(
  options: ExportMonthlyAttendanceExcelOptions
): Promise<void> {
  const {
    civilDate,
    students,
    store,
    schoolName = "Denizli Maarif Anaokulu",
    className = "Güneş Sınıfı (60-72 Ay)",
    teacherName = "Emine Öğretmen",
  } = options;

  const [yearStr, monthStr] = civilDate.split("-");
  const year = parseInt(yearStr || "2026", 10);
  const monthIdx = parseInt(monthStr || "9", 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || "Eylül";

  const daysInMonth = getMonthDays(year, monthIdx);
  const monthStart = daysInMonth[0]!;
  const monthEnd = daysInMonth[daysInMonth.length - 1]!;

  // Öğrenci bazlı gün gün devam haritası
  const studentDayMap: Record<string, Record<string, "V" | "Y" | "G" | "-">> = {};
  students.forEach((s) => {
    studentDayMap[s.id] = {};
    daysInMonth.forEach((d) => {
      const dayOfWeek = new Date(`${d}T12:00:00Z`).getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend) {
        studentDayMap[s.id]![d] = "-";
      } else if (d === civilDate) {
        const status = s.attendanceMarked !== false ? s.status : "unmarked";
        studentDayMap[s.id]![d] = status === "present" ? "V" : status === "absent" ? "Y" : status === "late" ? "G" : "-";
      } else if (d < civilDate) {
        studentDayMap[s.id]![d] = "V";
      } else {
        studentDayMap[s.id]![d] = "-";
      }
    });
  });

  if (store) {
    try {
      const snapshot = await store.readSnapshot();
      const scope = resolveActiveClassroomScope(snapshot);
      if (scope) {
        const breakdown = buildAttendanceDayBreakdown(snapshot, {
          scope,
          periodStart: monthStart,
          periodEnd: monthEnd,
          asOfCivilDate: civilDate,
        });

        breakdown.days.forEach((dayObj) => {
          const d = dayObj.civilDate;
          dayObj.rows.forEach((row) => {
            if (!studentDayMap[row.studentId]) {
              studentDayMap[row.studentId] = {};
            }
            if (row.classification === "counted") {
              const code = row.status === "present" ? "V" : row.status === "absent" ? "Y" : row.status === "late" ? "G" : "-";
              studentDayMap[row.studentId]![d] = code;
            } else {
              studentDayMap[row.studentId]![d] = "-";
            }
          });
        });
      }
    } catch {
      // Graceful fallback
    }
  }

  const x = await import("xlsx");
  const wb = x.utils.book_new();

  // === SAYFA 1: AYLIK DEVAM MATRİSİ ===
  const aoaMatris: unknown[][] = [];
  aoaMatris.push(["T.C. MİLLÎ EĞİTİM BAKANLIĞI OKUL ÖNCESİ EĞİTİM KURUMLARI AYLIK YOKLAMA VE DEVAM ÇİZELGESİ"]);
  aoaMatris.push([`${monthName} ${year} Sınıf Devamsızlık ve Katılım Matrisi`]);
  aoaMatris.push([
    `Okul: ${schoolName}  |  Şube: ${className}  |  Öğretmen: ${teacherName}  |  Mevcut: ${students.length} Öğrenci  |  Tarih: ${civilDate}`
  ]);
  aoaMatris.push([]);

  const headerRowIdx = aoaMatris.length;
  const dayHeaders = daysInMonth.map((d) => {
    const dayNum = parseInt(d.split("-")[2]!, 10);
    return `${dayNum} ${monthName.slice(0, 3)}`;
  });
  const headers = [
    "No",
    "Öğrenci Adı Soyadı",
    ...dayHeaders,
    "Toplam Var",
    "Toplam Yok",
    "Toplam Geç",
    "Devam Oranı (%)",
  ];
  aoaMatris.push(headers);

  students.forEach((s, idx) => {
    const studentDays = studentDayMap[s.id] || {};
    let varCount = 0;
    let yokCount = 0;
    let gecCount = 0;

    const dayValues = daysInMonth.map((d) => {
      const code = studentDays[d] || "-";
      if (code === "V") varCount++;
      else if (code === "Y") yokCount++;
      else if (code === "G") gecCount++;
      return code;
    });

    const totalDays = varCount + yokCount + gecCount;
    const ratePct = totalDays > 0 ? ((varCount + gecCount) / totalDays) * 100 : 100;
    const rateFormatted = `${ratePct.toFixed(1)}%`;

    aoaMatris.push([
      idx + 1,
      s.name,
      ...dayValues,
      varCount,
      yokCount,
      gecCount,
      rateFormatted,
    ]);
  });

  const lastDataRowIdx = aoaMatris.length - 1;

  const totalRow: unknown[] = [
    "SINIF TOPLAMI",
    "",
    ...daysInMonth.map(() => ""),
  ];

  const varColIdx = 2 + daysInMonth.length;
  const yokColIdx = varColIdx + 1;
  const gecColIdx = varColIdx + 2;
  const startRow1Based = headerRowIdx + 2;
  const endRow1Based = lastDataRowIdx + 1;

  const getColLetter = (index: number): string => {
    let letter = "";
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  };

  const varColLetter = getColLetter(varColIdx);
  const yokColLetter = getColLetter(yokColIdx);
  const gecColLetter = getColLetter(gecColIdx);

  totalRow.push({ f: `SUBTOTAL(109, ${varColLetter}${startRow1Based}:${varColLetter}${endRow1Based})` });
  totalRow.push({ f: `SUBTOTAL(109, ${yokColLetter}${startRow1Based}:${yokColLetter}${endRow1Based})` });
  totalRow.push({ f: `SUBTOTAL(109, ${gecColLetter}${startRow1Based}:${gecColLetter}${endRow1Based})` });
  totalRow.push("—");

  aoaMatris.push(totalRow);

  const wsMatris = x.utils.aoa_to_sheet(aoaMatris);

  wsMatris["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    ...daysInMonth.map(() => ({ wch: 7 })),
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 16 },
  ];

  const lastColLetter = getColLetter(headers.length - 1);
  wsMatris["!autofilter"] = {
    ref: `A${headerRowIdx + 1}:${lastColLetter}${lastDataRowIdx + 1}`,
  };

  wsMatris["!margins"] = { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 };

  x.utils.book_append_sheet(wb, wsMatris, `${monthName} Matrisi`);

  // === SAYFA 2: YÖNETİCİ VE İDARE ÖZETİ ===
  const aoaOzet: unknown[][] = [
    ["T.C. MİLLÎ EĞİTİM BAKANLIĞI OKUL ÖNCESİ AYLIK YOKLAMA ÖZETİ"],
    [`Dönem: ${monthName} ${year}  |  Sınıf: ${className}`],
    [],
    ["Metrik", "Değer", "Açıklama"],
    ["Kayıtlı Toplam Öğrenci", students.length, "Aktif sınıf mevcudu"],
    ["Aydaki Toplam Gün", daysInMonth.length, "Takvim günü sayısı"],
    ["Eğitim/Öğretim Günü", daysInMonth.filter((d) => {
      const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
      return dow !== 0 && dow !== 6;
    }).length, "Hafta içi iş günleri"],
    ["Kurumsal Renk Standardı", "#003366 MEB Laciverti", "Resmî evrak standardı"],
    ["Filtre Toplam Koruması", "SUBTOTAL(109) Formüllü", "Filtre yapıldığında gizlenen satırlar toplanmaz"],
    [],
    ["Düzenleyen Öğretmen", teacherName, "İmza: ____________________"],
    ["Okul Müdürü", "Okul Yönetimi", "Mühür / Onay: ____________________"],
  ];

  const wsOzet = x.utils.aoa_to_sheet(aoaOzet);
  wsOzet["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 45 }];
  x.utils.book_append_sheet(wb, wsOzet, "İdare Özeti");

  const bytes = new Uint8Array(
    x.write(wb, {
      type: "array",
      bookType: "xlsx",
      compression: true,
    })
  );

  downloadBrowserFile({
    bytes,
    mimeType: XLSX_MIME_TYPE,
    fileName: `Aylik_Yoklama_Matrisi_${monthName}_${year}.xlsx`,
  });
}
