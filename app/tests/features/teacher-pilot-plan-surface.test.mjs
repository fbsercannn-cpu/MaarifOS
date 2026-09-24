import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const planSource = readFileSync(
  new URL("../../src/features/simple-experience/SimplePlanWorkspaceScreen.tsx", import.meta.url),
  "utf8",
);
const summarySource = readFileSync(
  new URL("../../src/features/teacher-pilot/TeacherPilotProtocolSummary.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../src/features/teacher-pilot/teacher-pilot-protocol-summary.css", import.meta.url),
  "utf8",
);

test("Planlar rotası salt okunur gerçek öğretmen pilotu sözleşmesini varsayılan kapalı gösterir", () => {
  assert.match(
    planSource,
    /import \{ TeacherPilotProtocolSummary \} from "\.\.\/teacher-pilot\/TeacherPilotProtocolSummary\.tsx";/u,
  );
  assert.match(planSource, /<TeacherPilotProtocolSummary \/>/u);
  assert.match(
    summarySource,
    /<details\s+className="simple-teacher-pilot"\s+data-pilot-status="not-run"/u,
  );
  assert.doesNotMatch(summarySource, /<details[^>]*\sopen(?:=|\s|>)/u);
  assert.match(summarySource, /Gerçek öğretmen pilotu/u);
  assert.match(summarySource, /Gerçek ölçüm yok/u);
  assert.match(summarySource, /TEACHER_PILOT_TARGET_CONTRACT/u);
  assert.match(summarySource, /contract\.tasks\.map/u);
  assert.match(summarySource, /minimumCorrectObservations/u);
  assert.match(summarySource, /maximumMedianDurationMs/u);
  assert.match(summarySource, /maximumSuccessfulObservationDurationMs/u);
  assert.match(summarySource, /maximumWrongChildOrScopeIncidents/u);
  assert.match(summarySource, /maximumFalseOfficialCompletionClaims/u);
  assert.match(summarySource, /maximumMedianRetryEntryCount/u);
  assert.match(summarySource, /secondaryDesignTarget\.explanation/u);
  assert.doesNotMatch(summarySource, /TeacherPilotWorkspace|createTeacherPilotTimer/u);
  assert.doesNotMatch(summarySource, /pilot (?:başarılı|geçti|onaylandı)/iu);
});

test("pilot protokol özeti dar ekranda taşmadan en az 44px dokunma hedefi taşır", () => {
  assert.match(styles, /\.simple-teacher-pilot > summary \{[^}]*min-height: 72px;/su);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) 18px/u);
  assert.match(styles, /overflow-wrap: anywhere/u);
  assert.match(styles, /@media \(max-width: 360px\)/u);
});
