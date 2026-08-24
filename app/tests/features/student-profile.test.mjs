import assert from "node:assert/strict";
import test from "node:test";

import {
  STUDENT_PROFILE_SCHEMA_VERSION,
  ageInMonthsOn,
  composeStudentDisplayName,
  formatStudentPhone,
  isStudentProfilePhotoDataUrl,
  isValidStudentNationalIdentityNumber,
  normalizeStudentContacts,
  normalizeStudentCareDetails,
  normalizeStudentPhone,
  normalizeStudentProfile,
  normalizeTurkishSearchText,
  splitStudentDisplayName,
  studentProfileFromRecord,
} from "../../src/core/domain/student.ts";

test("sağlık ve güvenlik bilgilerini veri-minimum ve sınırlı biçimde normalleştirir", () => {
  assert.deepEqual(
    normalizeStudentCareDetails({
      homeAddress: "  Merkezefendi / Denizli  ",
      allergies: " Fındık ",
      dietaryNeeds: " Laktozsuz ",
      medicationNotes: " Veli yazılı talimatı dosyada ",
      emergencyNotes: " Önce anne aranır ",
      physicianName: " Dr. Kurgu ",
      physicianPhone: " (0258) 123 45 67 ",
      medicalDevices: " Gözlük ",
      guardianEmail: " veli@example.com ",
      familyEducationNeeds: " Oyunla öğrenme ",
      familyParticipationPreferences: " Cuma çevrim içi ",
      photoVideoPermissionOnFile: true,
      fieldTripPermissionOnFile: true,
      digitalCommunicationPermissionOnFile: true,
      permissionFormDate: "2026-08-24",
    }),
    {
      homeAddress: "Merkezefendi / Denizli",
      allergies: "Fındık",
      dietaryNeeds: "Laktozsuz",
      medicationNotes: "Veli yazılı talimatı dosyada",
      emergencyNotes: "Önce anne aranır",
      physicianName: "Dr. Kurgu",
      physicianPhone: "(0258) 123 45 67",
      medicalDevices: "Gözlük",
      guardianEmail: "veli@example.com",
      familyEducationNeeds: "Oyunla öğrenme",
      familyParticipationPreferences: "Cuma çevrim içi",
      photoVideoPermissionOnFile: true,
      fieldTripPermissionOnFile: true,
      digitalCommunicationPermissionOnFile: true,
      permissionFormDate: "2026-08-24",
    },
  );
  assert.equal(normalizeStudentCareDetails({ allergies: " " }), undefined);
  assert.throws(
    () => normalizeStudentCareDetails({ emergencyNotes: "x".repeat(1_001) }),
    /1_?000|1000/,
  );
  assert.throws(
    () => normalizeStudentCareDetails({ guardianEmail: "gecersiz" }),
    /e-posta/,
  );
});
import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { persistStudentRosterChange } from "../../src/features/dashboard/dashboard-data.ts";

class MemoryStore {
  snapshot;

  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
        for (const record of records) {
          byId.set(record.id, structuredClone(record));
        }
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      for (const collection of collections) {
        this.snapshot[collection] = working[collection];
      }
    }
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

test("öğrenci profilini Türkçe öğretmen kullanımına uygun ve veri-minimum biçimde normalleştirir", () => {
  const profile = normalizeStudentProfile(
    {
      displayName: "  Deniz Yılmaz  ",
      preferredName: "  Deniz  ",
      birthDate: "2021-04-18",
      optionalCode: "  KELEBEK-07  ",
      nationalIdentityNumber: "  10000000146  ",
      enrollmentYear: "  2025  ",
      homeLanguages: "  Türkçe, İngilizce  ",
      interests: "  Su deneyleri ve ritim oyunları  ",
      strengths: "  Akranlarını oyuna davet ediyor  ",
      supportPreferences: "  Geçişlerden önce kısa bir görsel hatırlatma sunulması yardımcı oluyor.  ",
    },
    "2026-07-28",
  );

  assert.deepEqual(profile, {
    displayName: "Deniz Yılmaz",
    firstName: "Deniz",
    lastName: "Yılmaz",
    preferredName: "Deniz",
    birthDate: "2021-04-18",
    optionalCode: "KELEBEK-07",
    nationalIdentityNumber: "10000000146",
    enrollmentYear: "2025",
    homeLanguages: "Türkçe, İngilizce",
    interests: "Su deneyleri ve ritim oyunları",
    strengths: "Akranlarını oyuna davet ediyor",
    supportPreferences:
      "Geçişlerden önce kısa bir görsel hatırlatma sunulması yardımcı oluyor.",
    profileSchemaVersion: STUDENT_PROFILE_SCHEMA_VERSION,
  });
});

test("gelecek tarihleri, geçersiz kayıt yılını ve T.C. kimlik numarasını reddeder", () => {
  assert.throws(
    () =>
      normalizeStudentProfile(
        { displayName: "Deniz Yılmaz", birthDate: "2027-01-01" },
        "2026-07-28",
      ),
    /gelecekte olamaz/i,
  );
  assert.throws(
    () =>
      normalizeStudentProfile(
        { displayName: "Deniz Yılmaz", optionalCode: "12345678901" },
        "2026-07-28",
      ),
    /kimlik numarası/i,
  );
  assert.throws(
    () =>
      normalizeStudentProfile(
        {
          displayName: "Deniz Yılmaz",
          birthDate: "2021-04-18",
          enrollmentYear: "2020",
        },
        "2026-07-28",
      ),
    /doğum yılından önce/i,
  );
  assert.throws(
    () =>
      normalizeStudentProfile(
        {
          displayName: "Deniz Yılmaz",
          enrollmentYear: "2027",
        },
        "2026-07-28",
      ),
    /kayıt yılı gelecekte olamaz/i,
  );
  assert.throws(
    () =>
      normalizeStudentProfile(
        {
          displayName: "Deniz Yılmaz",
          nationalIdentityNumber: "10000000145",
        },
        "2026-07-28",
      ),
    /11 haneli ve geçerli/i,
  );
  assert.equal(isValidStudentNationalIdentityNumber("10000000146"), true);
  assert.equal(isValidStudentNationalIdentityNumber("00000000146"), false);
});

test("boş isteğe bağlı alanları saklamaz ve veri-minimum metin sınırlarını uygular", () => {
  const profile = normalizeStudentProfile(
    {
      displayName: "Deniz Yılmaz",
      nationalIdentityNumber: " ",
      enrollmentYear: " ",
      homeLanguages: "  ",
      interests: "",
      strengths: "\n",
      supportPreferences: "\t",
    },
    "2026-07-28",
  );
  assert.deepEqual(profile, {
    displayName: "Deniz Yılmaz",
    firstName: "Deniz",
    lastName: "Yılmaz",
    profileSchemaVersion: STUDENT_PROFILE_SCHEMA_VERSION,
  });

  for (const [field, value, message] of [
    ["homeLanguages", "d".repeat(201), /evde kullanılan diller/i],
    ["interests", "i".repeat(501), /alanları/i],
    ["strengths", "g".repeat(501), /yönler/i],
    ["supportPreferences", "d".repeat(1001), /desteği notu/i],
  ]) {
    assert.throws(
      () =>
        normalizeStudentProfile(
          { displayName: "Deniz Yılmaz", [field]: value },
          "2026-07-28",
        ),
      message,
    );
  }
});

test("yaşı saklamak yerine doğum tarihinden ay olarak üretir", () => {
  assert.equal(ageInMonthsOn("2021-04-18", "2026-07-28"), 63);
  assert.equal(ageInMonthsOn("2021-07-29", "2026-07-28"), 59);
});

test("aile ve yakın telefonlarını 05 standardında doğrular ve tek öncelikli kişiyi korur", () => {
  assert.equal(normalizeStudentPhone("0555 123 45 67"), "+905551234567");
  assert.equal(normalizeStudentPhone("5 551 234 567"), "+905551234567");
  assert.equal(normalizeStudentPhone("+90 532 532 32 32"), "+905325323232");
  assert.equal(formatStudentPhone("+905325323232"), "0532 532 32 32");
  assert.deepEqual(
    ["0", "05", "053", "0532", "05325", "0532532", "05325323", "053253232", "0532532323", "05325323232"]
      .map(formatStudentPhone),
    [
      "0",
      "05",
      "053",
      "0532",
      "0532 5",
      "0532 532",
      "0532 532 3",
      "0532 532 32",
      "0532 532 32 3",
      "0532 532 32 32",
    ],
  );
  assert.equal(formatStudentPhone("0532532323299"), "0532 532 32 32");
  assert.throws(() => normalizeStudentPhone("+49 170 1234567"), /05 ile başlayan/i);
  assert.throws(() => normalizeStudentPhone("123"), /05 ile başlayan/i);
  assert.throws(() => normalizeStudentPhone("javascript:alert(1)"), /yalnız rakam/i);

  const contacts = normalizeStudentContacts([
    {
      id: "00000000-0000-4000-8000-000000000971",
      kind: "mother",
      relationship: " Anne ",
      name: " Ayşe Kurgu ",
      phone: "0555 123 45 67",
      isPrimary: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000972",
      kind: "other",
      relationship: " Bakıcı ",
      phone: "+90 532 000 00 00",
    },
  ]);

  assert.deepEqual(contacts, [
    {
      id: "00000000-0000-4000-8000-000000000971",
      kind: "mother",
      relationship: "Anne",
      name: "Ayşe Kurgu",
      phone: "+905551234567",
      isPrimary: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000972",
      kind: "other",
      relationship: "Bakıcı",
      phone: "+905320000000",
      isPrimary: false,
    },
  ]);

  assert.throws(
    () =>
      normalizeStudentContacts(
        contacts.map((contact) => ({ ...contact, isPrimary: true })),
      ),
    /Yalnız bir kişi/i,
  );
});

test("profil fotoğrafı yalnız küçük yerel JPEG, PNG veya WebP veri URL'sidir", () => {
  assert.equal(
    isStudentProfilePhotoDataUrl("data:image/jpeg;base64,AA=="),
    true,
  );
  assert.equal(
    isStudentProfilePhotoDataUrl("data:image/svg+xml;base64,PHN2Zz4="),
    false,
  );
  assert.equal(
    isStudentProfilePhotoDataUrl("https://example.test/student.jpg"),
    false,
  );
  assert.equal(
    isStudentProfilePhotoDataUrl(
      `data:image/jpeg;base64,${"A".repeat(400_001)}`,
    ),
    false,
  );
});

test("eski öğrenci kaydını bozmadan güncel profil görünümüne taşır", () => {
  const result = studentProfileFromRecord({
    id: "00000000-0000-4000-8000-000000000901",
    displayName: "Sude Ünal",
    preferredName: "Sude",
    birthDate: "2021-09-03",
    optionalCode: "SINIF-4",
    active: true,
    createdAt: "2026-07-28T06:00:00.000Z",
    updatedAt: "2026-07-28T06:00:00.000Z",
    civilDate: "2026-07-28",
    deletedAt: null,
    schemaVersion: 1,
  });

  assert.deepEqual(result, {
    displayName: "Sude Ünal",
    firstName: "Sude",
    lastName: "Ünal",
    preferredName: "Sude",
    birthDate: "2021-09-03",
    optionalCode: "SINIF-4",
    profileSchemaVersion: STUDENT_PROFILE_SCHEMA_VERSION,
  });
});

test("zengin profil alanlarını eski kayıt biçiminden güvenle okur", () => {
  const result = studentProfileFromRecord({
    id: "00000000-0000-4000-8000-000000000902",
    displayName: "  Kurgu Öğrenci  ",
    enrollmentDate: "2025-09-01",
    homeLanguages: " Türkçe ",
    interests: " Blok oyunları ",
    strengths: " Grup oyununa katılım ",
    supportPreferences: " Seçenekleri iki adımda sunmak yardımcı oluyor. ",
    active: true,
    createdAt: "2026-07-28T06:00:00.000Z",
    updatedAt: "2026-07-28T06:00:00.000Z",
    civilDate: "2026-07-28",
    deletedAt: null,
    schemaVersion: 1,
  });

  assert.deepEqual(result, {
    displayName: "Kurgu Öğrenci",
    firstName: "Kurgu",
    lastName: "Öğrenci",
    enrollmentYear: "2025",
    homeLanguages: "Türkçe",
    interests: "Blok oyunları",
    strengths: "Grup oyununa katılım",
    supportPreferences: "Seçenekleri iki adımda sunmak yardımcı oluyor.",
    profileSchemaVersion: STUDENT_PROFILE_SCHEMA_VERSION,
  });
});

test("ad ve soyadı ayrı alanlarda birleştirir; Türkçe aramayı harf işaretlerinden bağımsızlaştırır", () => {
  assert.deepEqual(splitStudentDisplayName("  Nil Su Şimşek  "), {
    firstName: "Nil Su",
    lastName: "Şimşek",
  });
  assert.equal(composeStudentDisplayName(" Nil Su ", " Şimşek "), "Nil Su Şimşek");
  assert.equal(normalizeTurkishSearchText("Şule IŞIK"), "sule isik");
  assert.equal(
    normalizeTurkishSearchText("Çağrı Öztürk").includes(
      normalizeTurkishSearchText("cagri"),
    ),
    true,
  );
});

test("eski yabancı telefonlu yakını sessizce silmeden inceleme için korur", () => {
  const result = studentProfileFromRecord({
    id: "00000000-0000-4000-8000-000000000903",
    displayName: "Kurgu Öğrenci",
    contacts: [
      {
        id: "00000000-0000-4000-8000-000000000904",
        kind: "other",
        relationship: "Yakın",
        name: "Kurgu Yakın",
        phone: "+491701234567",
        isPrimary: false,
      },
    ],
    active: true,
    createdAt: "2026-07-28T06:00:00.000Z",
    updatedAt: "2026-07-28T06:00:00.000Z",
    civilDate: "2026-07-28",
    deletedAt: null,
    schemaVersion: 4,
    profileSchemaVersion: 4,
  });

  assert.equal(result?.contacts?.[0]?.phone, "+491701234567");
});

test("profil güncellemesinde boşaltılan bütün isteğe bağlı alanları kalıcı kayıttan temizler", async () => {
  const snapshot = createEmptySnapshot();
  const academicYearId = "00000000-0000-4000-8000-000000000911";
  const classroomId = "00000000-0000-4000-8000-000000000912";
  const studentId = "00000000-0000-4000-8000-000000000913";
  const base = {
    createdAt: "2026-07-28T06:00:00.000Z",
    updatedAt: "2026-07-28T06:00:00.000Z",
    civilDate: "2026-07-28",
    deletedAt: null,
    schemaVersion: 2,
  };
  snapshot.academicYears.push({
    ...base,
    id: academicYearId,
    name: "Kurgu Eğitim Yılı",
    startDate: "2025-09-01",
    endDate: "2026-06-30",
  });
  snapshot.classrooms.push({
    ...base,
    id: classroomId,
    academicYearId,
    name: "Kurgu Sınıfı",
  });
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId,
    classroomId,
  });
  snapshot.students.push({
    ...base,
    id: studentId,
    academicYearId,
    classroomId,
    displayName: "Kurgu Öğrenci",
    preferredName: "Kurgu",
    birthDate: "2021-04-18",
    optionalCode: "K-7",
    nationalIdentityNumber: "10000000146",
    enrollmentYear: "2025",
    enrollmentDate: "2025-09-01",
    homeLanguages: "Türkçe",
    interests: "Su oyunları",
    strengths: "İş birliği",
    supportPreferences: "Geçişleri önceden haber vermek yardımcı oluyor.",
    profileSchemaVersion: 2,
  });
  const store = new MemoryStore(snapshot);

  await persistStudentRosterChange(store, {
    student: {
      id: studentId,
      name: "Kurgu Öğrenci",
      status: "present",
      preferredName: " ",
      birthDate: "",
      optionalCode: " ",
      nationalIdentityNumber: "",
      enrollmentYear: "",
      homeLanguages: " ",
      interests: "",
      strengths: "\n",
      supportPreferences: "\t",
    },
    archived: false,
  });

  const record = (await store.readSnapshot()).students[0];
  for (const field of [
    "preferredName",
    "birthDate",
    "optionalCode",
    "nationalIdentityNumber",
    "enrollmentYear",
    "enrollmentDate",
    "homeLanguages",
    "interests",
    "strengths",
    "supportPreferences",
  ]) {
    assert.equal(Object.hasOwn(record, field), false, `${field} temizlenmedi`);
  }
  assert.equal(record.profileSchemaVersion, STUDENT_PROFILE_SCHEMA_VERSION);
});
