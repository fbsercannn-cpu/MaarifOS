import assert from "node:assert/strict";
import test from "node:test";

import {
  academicYearOperationalNotice,
  academicYearOperationalStatus,
} from "../../src/features/today/today-data.ts";

test("eğitim yılı bugünle ilişkisine göre hazırlık, etkin ve sona ermiş ayrılır", () => {
  assert.equal(
    academicYearOperationalStatus("2026-09-01", "2027-08-31", "2026-08-03"),
    "preparation",
  );
  assert.equal(
    academicYearOperationalStatus("2025-09-01", "2026-08-31", "2026-08-03"),
    "active",
  );
  assert.equal(
    academicYearOperationalStatus("2024-09-01", "2025-08-31", "2026-08-03"),
    "ended",
  );
});
test("hazırlık ve sona ermiş durumlar öğretmene eylem söyler", () => {
  assert.match(
    academicYearOperationalNotice({
      status: "preparation",
      startDate: "2026-09-01",
      endDate: "2027-08-31",
    }),
    /Hazırlık modu.*gelecek planları şimdi hazırlayabilirsiniz.*Yoklama, uygulama ve gözlem 2026-09-01 tarihinde açılır/,
  );
  assert.match(
    academicYearOperationalNotice({
      status: "ended",
      startDate: "2024-09-01",
      endDate: "2025-08-31",
    }),
    /sona erdi.*yeni veya bugün etkin olan eğitim yılını seçin/,
  );
  assert.equal(
    academicYearOperationalNotice({
      status: "active",
      startDate: "2025-09-01",
      endDate: "2026-08-31",
    }),
    null,
  );
});
