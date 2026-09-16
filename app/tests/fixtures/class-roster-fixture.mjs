import { createEmptySnapshot } from "../../src/core/domain/model.ts";

/** Entirely fictional local data for layout and data-preservation checks. */
export function classRosterFixture(count = 15) {
  const academicYearId = "00000000-0000-4000-8100-000000000001";
  const classroomId = "00000000-0000-4000-8100-000000000002";
  const record = (id, values) => ({ id, createdAt: "2026-09-07T08:00:00.000Z", updatedAt: "2026-09-07T08:00:00.000Z", civilDate: "2026-09-07", schemaVersion: 1, ...values });
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push(record(academicYearId, { name: "2026–2027 Eğitim Öğretim Yılı", status: "active" }));
  snapshot.classrooms.push(record(classroomId, { academicYearId, name: "Çiçekler Sınıfı · 60–72 Ay" }));
  for (let index = 0; index < count; index += 1) {
    const suffix = String(index + 1).padStart(12, "0");
    snapshot.students.push(record(`00000000-0000-4000-8200-${suffix}`, {
      academicYearId, classroomId, active: true, enrollmentStatus: "active", profileSchemaVersion: 9,
      displayName: index === 0 ? "Kurgu İpek Deniz Uzunoğulları Çınaroğlu" : `Kurgu Öğrenci ${String(index + 1).padStart(2, "0")} Çınaroğlu`,
      optionalCode: String(101 + index), nationalIdentityNumber: "10000000146", birthDate: "2020-09-10", enrollmentYear: "2025",
      contacts: [
        { id: `00000000-0000-4000-8300-${suffix}`, kind: "mother", name: `Kurgu Anne ${index + 1} Çınaroğlu`, relationship: "Anne", phone: "0532 000 00 01", occupation: index === 0 ? "Üniversite öğretim görevlisi" : "Mimar", isPrimary: true, isEmergencyContact: true },
        { id: `00000000-0000-4000-8400-${suffix}`, kind: "father", name: `Kurgu Baba ${index + 1} Çınaroğlu`, relationship: "Baba", phone: "0532 000 00 02", occupation: "Elektrik mühendisi", isAuthorizedPickup: true },
        { id: `00000000-0000-4000-8500-${suffix}`, kind: "other", name: `Kurgu Yakın ${index + 1} Çınaroğlu`, relationship: "Teyze", phone: "0532 000 00 03", occupation: "Eczacı", isAuthorizedPickup: true },
        ...(index === 0 ? [{ id: `00000000-0000-4000-8600-${suffix}`, kind: "other", name: "Kurgu İkinci Yakın", relationship: "Dede", phone: "0532 000 00 04", occupation: "Emekli" }] : []),
      ],
      careDetails: {
        homeAddress: index === 0 ? "Kurgu Cumhuriyet Mahallesi, Öğretmenler Caddesi, Çınar Sitesi B Blok No: 12 Daire: 7, Merkezefendi / Denizli" : "Kurgu Mahallesi, Çiçek Sokak No: 3 Daire: 2, Merkezefendi / Denizli",
        parentsSeparated: true, motherDeceased: true, fatherDeceased: true, martyrChild: true, veteranChild: true,
        childPrivateNotes: "ÖZEL_ÇOCUK_NOTU_PAYLAŞILMAZ", familySituationNotes: "ÖZEL_AİLE_NOTU_PAYLAŞILMAZ",
      },
    }));
  }
  return { scope: { academicYearId, classroomId }, snapshot, schoolName: "Kurgu Cumhuriyet Anaokulu", teacherName: "Kurgu Emine Öğretmen", generatedAt: "2026-09-07T08:00:00.000Z" };
}

export function classRosterExtremeFixture() {
  const input = classRosterFixture(15);
  const first = input.snapshot.students[0];
  first.contacts.push(
    { id: "00000000-0000-4000-8700-000000000001", kind: "other", name: "Kurgu Üçüncü Yakın", relationship: "Aile yakını", phone: "0532 000 00 05", occupation: "Hemşire" },
    { id: "00000000-0000-4000-8800-000000000001", kind: "other", name: "Kurgu Dördüncü Yakın", relationship: "Komşu", phone: "0532 000 00 06", occupation: "Öğretmen" },
  );
  const long = input.snapshot.students[6];
  long.displayName = "Kurgu " + "ŞahinoğluÇınaroğlu".repeat(7);
  long.contacts[0].name = "Kurgu " + "UzunoğullarıKahramanoğlu".repeat(4);
  long.contacts[0].occupation = "Kurgu çok uzun meslek ve görev açıklaması; kurum içindeki birim ve uzmanlık görevini eksiksiz belirten örnek kayıt";
  long.contacts[0].phone = "+90 (532) 000 00 01 / iş: 0258 000 00 02 / dahili: 125";
  long.contacts[2].name = "Kurgu " + "İncedenizUzunoğulları".repeat(4);
  long.contacts[2].relationship = "Aile yakını; okul çıkışında teslim için aile tarafından bildirilen kişi";
  long.contacts[2].phone = "+90 (532) 000 00 03 / alternatif: 0532 000 00 07";
  long.careDetails.homeAddress = "Kurgu Mahallesi, Uzun Öğretmenler Caddesi, Çınar Sitesi No: 125 Daire: 27; okul kapısının karşısında bulunan binanın arka giriş kapısı, Merkezefendi / Denizli. ".repeat(4).slice(0, 500);
  return input;
}
