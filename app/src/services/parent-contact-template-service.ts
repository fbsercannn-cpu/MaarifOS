/**
 * parent-contact-template-service.ts — MaarifOS 0.85.0
 * 
 * "Veli İletişim Bilgileri - ŞABLON.xls" Birebir MEB Standardı
 * Excel (.xlsx) ve Yatay A4 PDF Üretim Motoru
 * 
 * 13 Sütunlu MEB Resmî Hiyerarşisi:
 * 1. Satır: [Sınıf Adı] SINIFI VELİ İLETİŞİM BİLGİLERİ ([Öğretmen Adı]) — 13 Sütun Birleşik
 * 2. Satır: ÖĞRENCİNİN (4 Sütun) | ANNENİN (3 Sütun) | BABANIN (3 Sütun) | ARANACAK 3. KİŞİ (3 Sütun)
 * 3. Satır: No | Adı Soyadı | TC No | D. Tarihi | Adı | Telefonu | Mesleği | Adı | Telefonu | Mesleği | Adı | Telefonu | Yakınlığı
 */

import * as XLSX from "xlsx";

export interface ParentContactStudentRow {
  no: string | number;
  fullName: string;
  nationalId: string;
  birthDate: string;
  motherName: string;
  motherPhone: string;
  motherOccupation: string;
  fatherName: string;
  fatherPhone: string;
  fatherOccupation: string;
  thirdPersonName: string;
  thirdPersonPhone: string;
  thirdPersonRelation: string;
}

export interface ClassroomHeaderInfo {
  classroomName?: string;
  teacherName?: string;
  schoolName?: string;
  academicYear?: string;
}

/** Ham öğrenci listesinden 13 sütunlu veli iletişim satırlarını ayıkla */
export function mapStudentsToParentContactRows(students: readonly any[] | any[]): ParentContactStudentRow[] {
  if (!students || students.length === 0) {
    // Eğer sınıf henüz boşsa örnek kılavuz verisi göster
    return [
      {
        no: 1,
        fullName: "Örnek Öğrenci",
        nationalId: "10000000000",
        birthDate: "15.04.2020",
        motherName: "Örnek Anne",
        motherPhone: "0555 111 22 33",
        motherOccupation: "Öğretmen",
        fatherName: "Örnek Baba",
        fatherPhone: "0555 444 55 66",
        fatherOccupation: "Mühendis",
        thirdPersonName: "Örnek Büyükanne",
        thirdPersonPhone: "0555 777 88 99",
        thirdPersonRelation: "Anneanne",
      },
    ];
  }

  return students.map((s, idx) => {
    const contacts: any[] = Array.isArray(s.contacts) ? s.contacts : [];
    const mother = contacts.find((c) => c.kind === "mother" || c.role === "mother") || {};
    const father = contacts.find((c) => c.kind === "father" || c.role === "father") || {};
    const other = contacts.find((c) => c.kind === "other" || c.role === "other") || {};

    const rawBirthDate = s.birthDate || "";
    let formattedBirthDate = rawBirthDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawBirthDate)) {
      const [y, m, d] = rawBirthDate.split("-");
      formattedBirthDate = `${d}.${m}.${y}`;
    }

    return {
      no: s.studentNumber || s.optionalCode || s.sequenceNumber || idx + 1,
      fullName: s.name || s.fullName || `${s.firstName || ""} ${s.lastName || ""}`.trim() || "İsimsiz Çocuk",
      nationalId: s.nationalIdentityNumber || s.tcKimlikNo || "—",
      birthDate: formattedBirthDate || "—",
      motherName: mother.name || mother.fullName || s.motherName || "—",
      motherPhone: mother.phone || s.motherPhone || "—",
      motherOccupation: mother.occupation || s.motherOccupation || "—",
      fatherName: father.name || father.fullName || s.fatherName || "—",
      fatherPhone: father.phone || s.fatherPhone || "—",
      fatherOccupation: father.occupation || s.fatherOccupation || "—",
      thirdPersonName: other.name || other.fullName || "—",
      thirdPersonPhone: other.phone || "—",
      thirdPersonRelation: other.relationship || other.relation || "—",
    };
  });
}

/** 13 Sütunlu Veli İletişim Şablonuna Uygun Excel (.xlsx) Üret ve İndir */
export function exportParentContactExcel(
  students: readonly any[] | any[],
  info?: ClassroomHeaderInfo
): void {
  const rows = mapStudentsToParentContactRows(students);
  const className = (info?.classroomName || "ANAOKULU").toLocaleUpperCase("tr-TR");
  const teacherName = info?.teacherName || "Öğretmenin Adı Soyadı";

  const titleRow = [`${className} SINIFI VELİ İLETİŞİM BİLGİLERİ (${teacherName})`];
  const groupRow = [
    "Ö Ğ R E N C İ N İ N", "", "", "",
    "A N N E N İ N", "", "",
    "B A B A N I N", "", "",
    "Aranacak 3. kişi", "", ""
  ];
  const headerRow = [
    "No", "Adı Soyadı", "TC No", "D. Tarihi ( Ay gün yıl olarak)",
    "Adı", "Telefonu", "Mesleği",
    "Adı", "Telefonu", "Mesleği",
    "Adı", "Telefonu", "Yakınlığı"
  ];

  const dataRows = rows.map((r) => [
    r.no,
    r.fullName,
    r.nationalId,
    r.birthDate,
    r.motherName,
    r.motherPhone,
    r.motherOccupation,
    r.fatherName,
    r.fatherPhone,
    r.fatherOccupation,
    r.thirdPersonName,
    r.thirdPersonPhone,
    r.thirdPersonRelation,
  ]);

  const startRow = 4;
  const endRow = dataRows.length + 3;
  const summaryRow = [
    "TOPLAM",
    { t: "s", f: `COUNTA(B${startRow}:B${endRow}) & " Öğrenci"` },
    "", "", "", "", "", "", "", "", "", "", ""
  ];

  const aoa = [titleRow, groupRow, headerRow, ...dataRows, summaryRow];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Hücre Birleştirmeleri (Merge Cells)
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }, // Başlık
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },  // Öğrencinin
    { s: { r: 1, c: 4 }, e: { r: 1, c: 6 } },  // Annenin
    { s: { r: 1, c: 7 }, e: { r: 1, c: 9 } },  // Babanın
    { s: { r: 1, c: 10 }, e: { r: 1, c: 12 } }, // 3. Kişi
    { s: { r: aoa.length - 1, c: 1 }, e: { r: aoa.length - 1, c: 12 } }, // Özet toplam
  ];

  // Sütun Genişlikleri
  ws["!cols"] = [
    { wch: 6 },   // No
    { wch: 24 },  // Adı Soyadı
    { wch: 14 },  // TC No
    { wch: 15 },  // D. Tarihi
    { wch: 16 },  // Anne Adı
    { wch: 15 },  // Anne Tel
    { wch: 14 },  // Anne Meslek
    { wch: 16 },  // Baba Adı
    { wch: 15 },  // Baba Tel
    { wch: 14 },  // Baba Meslek
    { wch: 16 },  // 3. Kişi Adı
    { wch: 15 },  // 3. Kişi Tel
    { wch: 12 },  // Yakınlığı
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Veli İletişim Bilgileri");

  const fileName = `veli_iletisim_bilgileri_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/** Popup-Blocker Bağışıklı Sessiz iFrame ve Güvenli Yazdırma Motoru */
export function printDocumentSecurely(htmlContent: string): void {
  try {
    let frame = document.getElementById("__maarif_print_frame__") as HTMLIFrameElement;
    if (!frame) {
      frame = document.createElement("iframe");
      frame.id = "__maarif_print_frame__";
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "none";
      frame.setAttribute("aria-hidden", "true");
      document.body.appendChild(frame);
    }
    const doc = frame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      frame.contentWindow?.focus();
      setTimeout(() => {
        try {
          frame.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 350);
      return;
    }
  } catch (err) {
    console.warn("[printDocumentSecurely] iframe başarısız, pencere açılıyor:", err);
  }

  // Fallback
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 350);
  }
}

/** 13 Sütunlu Yatay A4 (Landscape) Resmî Baskı / PDF Penceresi */
export function printParentContactA4(
  students: readonly any[] | any[],
  info?: ClassroomHeaderInfo
): void {
  const rows = mapStudentsToParentContactRows(students);
  const className = (info?.classroomName || "ANAOKULU").toLocaleUpperCase("tr-TR");
  const teacherName = info?.teacherName || "Okul Öncesi Öğretmeni";
  const schoolName = info?.schoolName || "T.C. MİLLÎ EĞİTİM BAKANLIĞI";

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>Veli İletişim Bilgileri - ${className}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #000000;
      background: #ffffff;
      font-size: 8.5pt;
    }
    .print-header {
      text-align: center;
      margin-bottom: 6px;
    }
    .print-header h1 {
      margin: 0;
      font-size: 11pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .print-header h2 {
      margin: 2px 0 0 0;
      font-size: 9.5pt;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #000000;
      padding: 4px 3px;
      text-align: left;
      vertical-align: middle;
      word-wrap: break-word;
      font-size: 8pt;
    }
    th {
      background-color: #f2f2f2 !important;
      font-weight: bold;
      text-align: center;
    }
    .group-header {
      background-color: #e5e5e5 !important;
      font-size: 8.5pt;
      letter-spacing: 1px;
    }
    .text-center {
      text-align: center;
    }
    .footer-stamp {
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
      font-size: 8.5pt;
    }
    .stamp-box {
      text-align: center;
      width: 200px;
    }
    @media print {
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background:#0f172a; color:#ffffff; padding:10px 16px; display:flex; justify-content:space-between; align-items:center;">
    <span><strong>MaarifOS Resmî Yatay A4 Baskı Masası:</strong> Veli İletişim Bilgileri Çizelgesi</span>
    <div>
      <button onclick="window.print()" style="background:#0284c7; color:#fff; border:none; padding:6px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">🖨️ Yazdır / PDF Kaydet</button>
      <button onclick="window.close()" style="background:#475569; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; margin-left:8px;">Kapat</button>
    </div>
  </div>

  <div style="padding: 10px;">
    <div class="print-header">
      <h1>${schoolName}</h1>
      <h2>${className} SINIFI VELİ İLETİŞİM BİLGİLERİ ÇİZELGESİ</h2>
      <div style="font-size: 8pt; color: #333; margin-top: 2px;">Öğretmen: ${teacherName} · Çıktı Tarihi: ${new Date().toLocaleDateString("tr-TR")}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th colspan="4" class="group-header">Ö Ğ R E N C İ N İ N</th>
          <th colspan="3" class="group-header">A N N E N İ N</th>
          <th colspan="3" class="group-header">B A B A N I N</th>
          <th colspan="3" class="group-header">ARANACAK 3. KİŞİ</th>
        </tr>
        <tr>
          <th style="width: 4%;">No</th>
          <th style="width: 14%;">Adı Soyadı</th>
          <th style="width: 9%;">TC Kimlik No</th>
          <th style="width: 8%;">Doğum Tarihi</th>
          <th style="width: 10%;">Adı Soyadı</th>
          <th style="width: 9%;">Telefonu</th>
          <th style="width: 8%;">Mesleği</th>
          <th style="width: 10%;">Adı Soyadı</th>
          <th style="width: 9%;">Telefonu</th>
          <th style="width: 8%;">Mesleği</th>
          <th style="width: 9%;">Adı Soyadı</th>
          <th style="width: 9%;">Telefonu</th>
          <th style="width: 7%;">Yakınlığı</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) => `
          <tr>
            <td class="text-center">${r.no}</td>
            <td><strong>${r.fullName}</strong></td>
            <td class="text-center">${r.nationalId}</td>
            <td class="text-center">${r.birthDate}</td>
            <td>${r.motherName}</td>
            <td class="text-center">${r.motherPhone}</td>
            <td>${r.motherOccupation}</td>
            <td>${r.fatherName}</td>
            <td class="text-center">${r.fatherPhone}</td>
            <td>${r.fatherOccupation}</td>
            <td>${r.thirdPersonName}</td>
            <td class="text-center">${r.thirdPersonPhone}</td>
            <td class="text-center">${r.thirdPersonRelation}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <div class="footer-stamp">
      <div class="stamp-box">
        <div><strong>Hazırlayan</strong></div>
        <div style="margin-top: 25px;">${teacherName}</div>
        <div style="font-size: 7.5pt; color: #555;">Okul Öncesi Öğretmeni</div>
      </div>
      <div class="stamp-box">
        <div><strong>Tasdik Eden</strong></div>
        <div style="margin-top: 25px;">..........................................</div>
        <div style="font-size: 7.5pt; color: #555;">Okul Müdürü</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  printDocumentSecurely(html);
}
