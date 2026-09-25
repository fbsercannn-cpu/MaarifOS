import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAN_EDIT_BLOCK_FINDING_CODES,
  PLAN_INTEGRITY_FINDING_CODES,
  planRelationFinding,
} from "../../src/features/planning/plan-relation-policy.ts";

const EXPECTED_FINDINGS = [
  ["plan.integrity.activity-date", "error", "PLAN-INTEGRITY-101", "share-support-code"],
  ["plan.integrity.teacher-flow-shape", "error", "PLAN-INTEGRITY-102", "share-support-code"],
  ["plan.integrity.teacher-source-chain", "error", "PLAN-INTEGRITY-103", "share-support-code"],
  ["plan.integrity.teacher-activity-source", "error", "PLAN-INTEGRITY-104", "share-support-code"],
  ["plan.integrity.teacher-flow-block", "error", "PLAN-INTEGRITY-105", "share-support-code"],
  ["plan.integrity.premium-flow-shape", "error", "PLAN-INTEGRITY-106", "share-support-code"],
  ["plan.integrity.premium-source-missing", "error", "PLAN-INTEGRITY-107", "share-support-code"],
  ["plan.integrity.premium-source-chain", "error", "PLAN-INTEGRITY-108", "share-support-code"],
  ["plan.integrity.premium-activity-id", "error", "PLAN-INTEGRITY-109", "share-support-code"],
  ["plan.integrity.premium-activity-snapshot", "error", "PLAN-INTEGRITY-110", "share-support-code"],
  ["plan.integrity.premium-activity-source", "error", "PLAN-INTEGRITY-111", "share-support-code"],
  ["plan.edit.activity-count", "warning", "PLAN-EDIT-101", "review-linked-activities"],
  ["plan.edit.past-or-today", "warning", "PLAN-EDIT-102", "create-plan-revision"],
  ["plan.edit.status-locked", "warning", "PLAN-EDIT-103", "create-plan-revision"],
  ["plan.edit.evidence-locked", "warning", "PLAN-EDIT-104", "create-plan-revision"],
];

test("11 bütünlük ve 4 düzenleme bulgusunun her biri kararlı kod/sunum/onarım taşır", () => {
  assert.equal(PLAN_INTEGRITY_FINDING_CODES.length, 11);
  assert.equal(PLAN_EDIT_BLOCK_FINDING_CODES.length, 4);
  assert.deepEqual(
    [...PLAN_INTEGRITY_FINDING_CODES, ...PLAN_EDIT_BLOCK_FINDING_CODES],
    EXPECTED_FINDINGS.map(([code]) => code),
  );

  for (const [code, severity, supportCode, repairActionId] of EXPECTED_FINDINGS) {
    const finding = planRelationFinding(code);
    assert.equal(finding.code, code, code);
    assert.equal(finding.severity, severity, code);
    assert.equal(finding.supportCode, supportCode, code);
    assert.equal(finding.repairAction.id, repairActionId, code);
    assert.ok(finding.repairAction.label.trim().length > 0, code);
    assert.ok(finding.message.trim().endsWith("."), code);
  }
});
test("ilişki bulgusu ve onarım eylemi tüketici tarafından değiştirilemez", () => {
  const finding = planRelationFinding("plan.integrity.activity-date");
  assert.equal(Object.isFrozen(finding), true);
  assert.equal(Object.isFrozen(finding.repairAction), true);
  assert.throws(() => {
    finding.message = "Sessizce değiştirildi.";
  }, TypeError);
  assert.throws(() => {
    finding.repairAction.label = "Başka eylem";
  }, TypeError);
});
