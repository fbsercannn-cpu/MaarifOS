/**
 * generate-license.cjs — MaarifOS 0.74.1
 * CLI Üzerinden Müşteri İçin Geçerli Lisans Anahtarı Üretim Aracı.
 * 
 * Kullanım:
 * node scripts/generate-license.cjs "Öğretmen Adı Soyadı" "Okul Adı" [pro|school]
 */

const LICENSE_SALT = "MAARIFOS_2026_APEX_SECURE_SALT";

function computeChecksum(input) {
  let hash = 0x811c9dc5;
  const str = `${LICENSE_SALT}:${input}`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

function generateLicense(tier = "pro", ownerName = "OGRETMEN", schoolName = "MEB") {
  const normOwner = ownerName.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "OGRT";
  const token = `${normOwner}${Math.floor(1000 + Math.random() * 9000)}`;
  const tierPrefix = tier === "school" ? "OKUL" : "PRO";
  const base = `MOS-${tierPrefix}-2026-${token}`;
  const checksum = computeChecksum(base);
  return `${base}-${checksum}`;
}

const args = process.argv.slice(2);
const owner = args[0] || "Değerli Öğretmenimiz";
const school = args[1] || "Okul Öncesi";
const tier = (args[2] || "pro").toLowerCase();

const key = generateLicense(tier, owner, school);

console.log("\n=======================================================");
console.log("💎 MAARİF OS · MÜŞTERİ LİSANS ANAHTARI ÜRETİLDİ");
console.log("=======================================================");
console.log(`👤 Müşteri (Öğretmen): ${owner}`);
console.log(`🏫 Okul / Kurum       : ${school}`);
console.log(`📦 Lisans Paketi      : ${tier === "school" ? "Okul & Zümre Lisansı (1.490 ₺)" : "Öğretmen PRO Lisansı (499 ₺)"}`);
console.log(`🔑 LİSANS ANAHTARI    : ${key}`);
console.log("=======================================================\n");

console.log("📱 MÜŞTERİYE GÖNDERİLECEK WHATSAPP / SMS ŞABLONU:");
console.log("-------------------------------------------------------");
console.log(`Sayın ${owner},

MaarifOS 2026-2027 ${tier === "school" ? "Okul & Zümre" : "Öğretmen PRO"} lisans satın alımınız onaylanmıştır!

Lisans Anahtarınız:
👉 ${key}

Aktivasyon Adımları:
1. https://www.maarifos.com adresine giriniz.
2. Üst menüdeki "💎 Lisans Etkinleştir" butonuna basınız.
3. Adınızı ve yukarıdaki lisans anahtarınızı girip "Etkinleştir"e dokununuz.

Tüm 528 MEB ders kitabı etkinliği, sınırsız günlük/aylık planlama ve filigransız resmî A4/Word çıktılarınız anında açılacaktır.

Hayırlı ve başarılı bir eğitim-öğretim yılı dileriz!
MaarifOS Destek Ekibi — www.maarifos.com`);
console.log("-------------------------------------------------------\n");
