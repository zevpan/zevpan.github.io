import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AMOUNT_TOLERANCE,
  buildIllustrativeExport,
  interpretCommand,
  normalizeIdentifier,
  reconcileBatch
} from "../case-studies/finance-control-hub/demo/engine.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(await readFile(resolve(repoRoot, "case-studies/finance-control-hub/demo/data/source-data.json"), "utf8"));
const groundTruth = JSON.parse(await readFile(resolve(repoRoot, "test/fixtures/finance-ground-truth.json"), "utf8"));
const accrualById = new Map(source.accrueCost.map(function (row) { return [row.accrualReference, row]; }));
const result = reconcileBatch(source);

function rowsFor(expectedOutcome) {
  return groundTruth.cases.filter(function (item) { return item.expectedOutcome === expectedOutcome; });
}

function countCsvRows(csv) {
  return csv.trim().split(/\r?\n/).length - 1;
}

test("the generated demo backlog has coherent source counts and a separate answer key", function () {
  assert.equal(source.invoices.length, 4000);
  assert.equal(source.hawbReport.length, source.metadata.hawbRecordCount);
  assert.equal(source.mawbReport.length, source.metadata.mawbRecordCount);
  assert.equal(source.accrueCost.length, source.metadata.accrueCostRecordCount);
  assert.equal(groundTruth.cases.length, source.invoices.length);
  assert.equal(source.metadata.seed, 20261014);
  assert.equal(groundTruth.notice.includes("engine and browser demo do not read"), true);
  assert.equal(source.invoices.every(function (line) { return !("expectedOutcome" in line); }), true);
});

test("identifier normalization preserves the intended shipment key", function () {
  const standard = source.invoices.find(function (line) {
    const truth = groundTruth.cases.find(function (item) { return item.invoiceLineId === line.invoiceLineId; });
    return truth && truth.reason.includes("Identifier punctuation");
  });
  assert.ok(standard);
  const linked = source.hawbReport.find(function (row) { return normalizeIdentifier(row.jobId) === normalizeIdentifier(standard.jobReference); });
  assert.ok(linked);
});

test("all 4,000 generated reconciliation outcomes agree with the independent scenario answer key", function () {
  const differences = [];
  for (const expected of groundTruth.cases) {
    const actual = result.outcomes[expected.invoiceLineId];
    if (!actual || actual.status !== expected.expectedOutcome) differences.push({ expected, actual });
  }
  assert.deepEqual(differences, []);
  assert.equal(result.metrics.invoiceLines, 4000);
  assert.equal(result.metrics.matched, 3405);
  assert.equal(result.metrics.exceptions, 545);
  assert.equal(result.metrics.alreadyExported, 50);
});

test("automatic-match precision and recall prioritize avoiding false financial matches", function () {
  const positiveLabels = new Set(["MATCHED", "MATCHED_WITH_TOLERANCE"]);
  const expectedPositive = groundTruth.cases.filter(function (item) { return positiveLabels.has(item.expectedOutcome); });
  const actualPositive = Object.values(result.outcomes).filter(function (item) { return positiveLabels.has(item.status); });
  const actualIds = new Set(actualPositive.map(function (item) { return item.invoiceLineId; }));
  const expectedIds = new Set(expectedPositive.map(function (item) { return item.invoiceLineId; }));
  const falsePositive = actualPositive.filter(function (item) { return !expectedIds.has(item.invoiceLineId); });
  const falseNegative = expectedPositive.filter(function (item) { return !actualIds.has(item.invoiceLineId); });
  const precision = actualPositive.length ? (actualPositive.length - falsePositive.length) / actualPositive.length : 0;
  const recall = expectedPositive.length ? (expectedPositive.length - falseNegative.length) / expectedPositive.length : 0;
  assert.equal(expectedPositive.length, 3405);
  assert.equal(actualPositive.length, 3405);
  assert.equal(falsePositive.length, 0);
  assert.equal(falseNegative.length, 0);
  assert.equal(precision, 1);
  assert.equal(recall, 1);
  assert.ok(AMOUNT_TOLERANCE <= 0.05);
});

test("exception outcomes remain explicit and no uncertain case is auto-matched", function () {
  const reviewLabels = groundTruth.cases.filter(function (item) {
    return !["MATCHED", "MATCHED_WITH_TOLERANCE", "EXPORTED"].includes(item.expectedOutcome);
  });
  assert.equal(reviewLabels.length, 545);
  assert.ok(reviewLabels.every(function (item) {
    const actual = result.outcomes[item.invoiceLineId];
    return actual.requiresHuman && !actual.exportEligible;
  }));
});

test("grouped reconciliations balance without reusing or silently approving source amounts", function () {
  const groups = new Map();
  for (const item of groundTruth.cases.filter(function (entry) { return entry.expectedOutcome === "GROUP_REVIEW"; })) {
    const outcome = result.outcomes[item.invoiceLineId];
    assert.equal(outcome.status, "GROUP_REVIEW");
    assert.equal(outcome.exportEligible, false);
    if (!groups.has(outcome.groupId)) groups.set(outcome.groupId, []);
    groups.get(outcome.groupId).push({ item, outcome });
  }
  assert.equal(groups.size, 60);
  let oneToMany = 0;
  let manyToOne = 0;
  for (const [groupId, members] of groups) {
    if (groupId.startsWith("OTM-")) {
      oneToMany += 1;
      assert.equal(members.length, 1);
      const invoice = source.invoices.find(function (line) { return line.invoiceLineId === members[0].item.invoiceLineId; });
      const total = members[0].outcome.matchedAccrualIds.reduce(function (sum, id) { return sum + accrualById.get(id).accruedAmount; }, 0);
      assert.equal(Math.round(total * 100), Math.round(invoice.lineAmount * 100));
      assert.equal(members[0].outcome.matchedAccrualIds.length, 2);
    } else {
      manyToOne += 1;
      assert.equal(members.length, 2);
      const lineTotal = members.reduce(function (sum, member) {
        const invoice = source.invoices.find(function (line) { return line.invoiceLineId === member.item.invoiceLineId; });
        return sum + invoice.lineAmount;
      }, 0);
      const accrualIds = Array.from(new Set(members.flatMap(function (member) { return member.outcome.matchedAccrualIds; })));
      assert.equal(accrualIds.length, 1);
      assert.equal(Math.round(lineTotal * 100), Math.round(accrualById.get(accrualIds[0]).accruedAmount * 100));
    }
  }
  assert.equal(oneToMany, 40);
  assert.equal(manyToOne, 20);
});

test("automatic matches never allocate one accrual to more than one invoice line", function () {
  const assigned = new Map();
  for (const outcome of Object.values(result.outcomes)) {
    if (!["MATCHED", "MATCHED_WITH_TOLERANCE"].includes(outcome.status)) continue;
    for (const accrualId of outcome.matchedAccrualIds) {
      assert.equal(assigned.has(accrualId), false, "Accrual double allocation: " + accrualId);
      assigned.set(accrualId, outcome.invoiceLineId);
    }
  }
  assert.equal(assigned.size, 3405);
});

test("a purchase-order conflict blocks an otherwise exact candidate", function () {
  const line = source.invoices.find(function (invoice) {
    const outcome = result.outcomes[invoice.invoiceLineId];
    return outcome && outcome.status === "MATCHED";
  });
  const altered = structuredClone(source);
  altered.invoices.find(function (invoice) { return invoice.invoiceLineId === line.invoiceLineId; }).poReference = "PO-OTHER-999";
  const rerun = reconcileBatch(altered);
  assert.equal(rerun.outcomes[line.invoiceLineId].status, "PO_MISMATCH");
  assert.equal(rerun.outcomes[line.invoiceLineId].exportEligible, false);
});

test("reconciliation is idempotent and produces stable decisions for unchanged source records", function () {
  const repeated = reconcileBatch(source);
  assert.deepEqual(repeated.outcomes, result.outcomes);
  assert.equal(repeated.metrics.invoiceLines, result.metrics.invoiceLines);
  assert.equal(repeated.metrics.matched, result.metrics.matched);
});

test("the default export includes only eligible exact and tolerance matches", function () {
  const csv = buildIllustrativeExport(source.invoices, result.outcomes, accrualById, {});
  assert.equal(countCsvRows(csv), 3405);
  assert.equal(csv.includes("HUMAN_APPROVED"), false);
  assert.equal(csv.includes("EXPORTED"), false);
  assert.equal(csv.includes("MISSING_PO"), false);
});

test("group export waits for all group approvals and balances both match directions", function () {
  const resolutions = {};
  const groups = new Map();
  for (const line of source.invoices) {
    const outcome = result.outcomes[line.invoiceLineId];
    if (outcome.status !== "GROUP_REVIEW") continue;
    if (!groups.has(outcome.groupId)) groups.set(outcome.groupId, []);
    groups.get(outcome.groupId).push(line);
  }
  const selectedGroups = Array.from(groups.entries());
  const oneToMany = selectedGroups.find(function (entry) { return entry[0].startsWith("OTM-"); });
  const manyToOne = selectedGroups.find(function (entry) { return entry[0].startsWith("MTO-"); });
  assert.ok(oneToMany && manyToOne);
  const partial = manyToOne[1][0];
  const partialOutcome = result.outcomes[partial.invoiceLineId];
  resolutions[partial.invoiceLineId] = { status: "APPROVED", accrualIds: partialOutcome.matchedAccrualIds, poReference: source.accrueCost.find(function (item) { return item.accrualReference === partialOutcome.matchedAccrualIds[0]; }).poReference };
  assert.equal(countCsvRows(buildIllustrativeExport(source.invoices, result.outcomes, accrualById, resolutions)), 3405);
  for (const group of [oneToMany, manyToOne]) {
    for (const line of group[1]) {
      const outcome = result.outcomes[line.invoiceLineId];
      const first = accrualById.get(outcome.matchedAccrualIds[0]);
      resolutions[line.invoiceLineId] = {
        status: "APPROVED",
        accrualId: outcome.matchedAccrualIds[0],
        accrualIds: outcome.matchedAccrualIds,
        poReference: first.poReference,
        groupId: outcome.groupId
      };
    }
  }
  const csv = buildIllustrativeExport(source.invoices, result.outcomes, accrualById, resolutions);
  assert.equal(countCsvRows(csv), 3409);
  assert.equal(csv.includes("HUMAN_APPROVED"), true);
});

test("an already-exported invoice line cannot be emitted again", function () {
  const line = source.invoices.find(function (invoice) { return result.outcomes[invoice.invoiceLineId].status === "MATCHED"; });
  const resolutions = {};
  resolutions[line.invoiceLineId] = { status: "AUTO_MATCHED", exported: true };
  const csv = buildIllustrativeExport(source.invoices, result.outcomes, accrualById, resolutions);
  assert.equal(csv.includes(line.invoiceLineId), false);
});

test("supported natural-language commands route to bounded operations", function () {
  assert.equal(interpretCommand("Reconcile this month's vendor invoices").action, "run");
  assert.equal(interpretCommand("Find all missing purchase orders").filter, "MISSING_PO");
  assert.equal(interpretCommand("Show the largest unresolved discrepancies").action, "largest");
  assert.equal(interpretCommand("Group exceptions by vendor").action, "group-vendor");
  assert.equal(interpretCommand("Prepare validated records for CargoWise export").action, "export");
  assert.equal(interpretCommand("delete all invoices").supported, false);
});

test("the 4,000-line workload completes within the generous local test budget", function () {
  const measurements = [];
  for (let index = 0; index < 3; index += 1) measurements.push(reconcileBatch(source).metrics.elapsedMs);
  measurements.sort(function (a, b) { return a - b; });
  const median = measurements[1];
  assert.ok(median < 5000, "Median runtime was " + median + " ms.");
});
