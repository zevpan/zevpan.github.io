import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, prepareFinanceImport } from "../case-studies/finance-control-hub/demo/file-import.js";

function file(name, content) {
  return { name, size: content.length, text: async function () { return content; } };
}

const sourceFiles = [
  file("vendor-invoices.csv", 'Invoice Line ID,Invoice Number,Vendor,Currency,Line Amount,Vendor Charge Code,Charge Description,Job Reference\nL-1,INV-1,Meridian Air Logistics,USD,"1,205.50",AFRT,Air freight charge,CW-J-1\n'),
  file("HAWB-report.csv", "HAWB,Job ID,MAWB\nH-1,CW-J-1,M-1\n"),
  file("MAWB-report.csv", "MAWB,Carrier\nM-1,Pacific Meridian Air\n"),
  file("accrue-cost.csv", "Accrual Reference,Vendor,Currency,Accrued Amount,Charge Code,Job ID,HAWB,MAWB\nA-1,Meridian Air Logistics,USD,1205.50,AIRFREIGHT,CW-J-1,H-1,M-1\n")
];

test("CSV parser handles quoted commas and escaped quotes", function () {
  assert.deepEqual(parseCsv('name,description\nA,"Charge, with ""detail"""'), [{ name: "A", description: 'Charge, with "detail"' }]);
});

test("four source CSV files are canonicalized into an importable batch", async function () {
  const result = await prepareFinanceImport(sourceFiles);
  assert.equal(result.complete, true);
  assert.equal(result.source.invoices.length, 1);
  assert.equal(result.source.invoices[0].lineAmount, 1205.5);
  assert.equal(result.source.hawbReport[0].hawb, "H-1");
  assert.equal(result.source.accrueCost[0].accruedAmount, 1205.5);
  assert.equal(result.source.mappingRules.length, 0);
  assert.equal(result.source.metadata.sourceKind, "local-import");
});

test("an optional vendor map is imported explicitly rather than inferred", async function () {
  const result = await prepareFinanceImport(sourceFiles.concat(file("vendor-charge-map.csv", "Vendor,Vendor Code,Charge Family\nMeridian Air Logistics,AFRT,AIRFREIGHT\n")));
  assert.equal(result.complete, true);
  assert.deepEqual(result.source.mappingRules, [{ vendor: "Meridian Air Logistics", vendorCode: "AFRT", chargeFamily: "AIRFREIGHT", _sourceRow: 2 }]);
});

test("partial uploads name the source CSV types still required", async function () {
  const result = await prepareFinanceImport(sourceFiles.slice(0, 2));
  assert.equal(result.complete, false);
  assert.deepEqual(result.missing, ["mawbReport", "accrueCost"]);
});

test("import validation rejects missing financial fields and malformed CSV", async function () {
  await assert.rejects(prepareFinanceImport([file("vendor-invoices.csv", "Invoice Line ID,Invoice Number,Vendor,Currency,Vendor Charge Code\nL-1,INV-1,Vendor,USD,AFRT\n")]), /missing usable values for: lineAmount/);
  assert.throws(function () { parseCsv('a,b\n1,"never closed'); }, /unclosed quoted field/);
  await assert.rejects(prepareFinanceImport(sourceFiles.concat(file("batch.json", "{}"))), /Choose one complete JSON batch/);
});
