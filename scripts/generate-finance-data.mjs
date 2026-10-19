import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const demoDir = resolve(repoRoot, "case-studies/finance-control-hub/demo");
const dataDir = resolve(demoDir, "data");
const testDir = resolve(repoRoot, "test/fixtures");
const SEED = 20261014;

function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(SEED);
const vendors = [
  { name: "Meridian Air Logistics", short: "MAL", aliases: { AIRFREIGHT: ["AFRT", "AIR-FRT"], HANDLING: ["HDL", "HAND-01"], FUEL: ["FSC", "FUEL-A"], DOCUMENTATION: ["DOC", "DOC-02"] } },
  { name: "Northstar Cargo Services", short: "NCS", aliases: { AIRFREIGHT: ["AIR", "AIR-CHG"], HANDLING: ["HAND", "HANDLING"], FUEL: ["FUEL", "FUEL-S"], DOCUMENTATION: ["DOCFEE", "DOC-1"] } },
  { name: "Bluegate Freight Partners", short: "BFP", aliases: { AIRFREIGHT: ["AIRF", "AIRFREIGHT"], HANDLING: ["HND", "HND-01"], FUEL: ["FUEL-X", "FSC"], DOCUMENTATION: ["DOCS", "DOC-02"] } },
  { name: "Atlas Gateway Logistics", short: "AGL", aliases: { AIRFREIGHT: ["AF", "AIR-FRT"], HANDLING: ["HNDL", "HAND-01"], FUEL: ["FSC-A", "FUEL-A"], DOCUMENTATION: ["DOC", "DOCFEE"] } },
  { name: "Harborlight Cargo", short: "HLC", aliases: { AIRFREIGHT: ["AIR-C", "AIRF"], HANDLING: ["HAND-C", "HDL"], FUEL: ["FSC-2", "FUEL"], DOCUMENTATION: ["DOC-3", "DOCS"] } }
];
const families = ["AIRFREIGHT", "HANDLING", "FUEL", "DOCUMENTATION"];
const descriptions = {
  AIRFREIGHT: ["Air freight charge", "International air cargo", "Air transport service"],
  HANDLING: ["Origin handling", "Terminal handling charge", "Cargo handling service"],
  FUEL: ["Fuel surcharge", "Fuel adjustment", "Carrier fuel levy"],
  DOCUMENTATION: ["Export documentation", "Air waybill fee", "Document processing"]
};
const currencies = ["USD", "EUR", "GBP", "SGD", "MYR"];
const invoices = [];
const hawbReport = [];
const mawbReport = [];
const accrueCost = [];
const truth = [];
const vendorRuleRows = [];
let invoiceSeq = 0;
let accrualSeq = 0;
let shipmentSeq = 0;
const invoiceTotals = new Map();
const mawbRows = new Map();

for (const vendor of vendors) {
  for (const family of Object.keys(vendor.aliases)) {
    for (const code of vendor.aliases[family]) vendorRuleRows.push({ vendor: vendor.name, vendorCode: code, chargeFamily: family });
  }
}

function pad(value, size) {
  return String(value).padStart(size, "0");
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function pick(list) {
  return list[Math.floor(random() * list.length)];
}

function makeShipment() {
  shipmentSeq += 1;
  const jobId = "CW-J-26-" + pad(shipmentSeq, 6);
  const hawb = "HWB-26-" + pad(shipmentSeq, 7);
  const mawbNumber = Math.ceil(shipmentSeq / 8);
  const mawb = "MAWB-618-" + pad(mawbNumber, 8);
  const ship = { jobId, hawb, mawb };
  const origin = pick(["KUL", "SIN", "BKK", "HKG", "LHR", "FRA"]);
  const destination = pick(["LAX", "JFK", "AMS", "DXB", "SYD", "NRT"]);
  hawbReport.push({
    hawb,
    jobId,
    mawb,
    origin,
    destination,
    pieces: 1 + Math.floor(random() * 18),
    grossKg: money(18 + random() * 280),
    status: "Completed"
  });
  if (!mawbRows.has(mawb)) {
    const row = { mawb, carrier: pick(["Pacific Meridian Air", "Northstar Airways", "Atlas Cargo", "Bluegate Air"]), origin, destination, houseShipmentCount: 0, status: "Departed" };
    mawbRows.set(mawb, row);
    mawbReport.push(row);
  }
  mawbRows.get(mawb).houseShipmentCount += 1;
  return ship;
}

function vendorCode(vendor, family, alternate) {
  const codes = vendor.aliases[family];
  return codes[alternate ? 1 : 0];
}

function invoiceNumber(vendor) {
  invoiceSeq += 1;
  const group = Math.ceil(invoiceSeq / 10);
  return vendor.short + "-INV-2026-" + pad(group, 5);
}

function addInvoice(ship, vendor, family, amount, options) {
  const opts = options || {};
  const lineId = "VIL-" + pad(invoices.length + 1, 5);
  const invNo = opts.invoiceNumber || invoiceNumber(vendor);
  const currency = opts.currency || pick(currencies);
  const unitPrice = amount == null ? null : money(amount);
  const quantity = 1;
  const tax = money(opts.tax || 0);
  let lineAmount = amount == null ? null : money(amount);
  if (opts.taxIncluded) lineAmount = money((amount || 0) + tax);
  if (opts.amountOverride != null) lineAmount = money(opts.amountOverride);
  const row = {
    vendor: opts.vendorName || vendor.name,
    invoiceNumber: opts.invoiceNumberOverride === "" ? "" : invNo,
    invoiceDate: opts.invoiceDate === "" ? "" : opts.invoiceDate || "2026-" + pad(9 + Math.floor(random() * 2), 2) + "-" + pad(1 + Math.floor(random() * 28), 2),
    invoiceLineId: lineId,
    jobReference: opts.jobReference === undefined ? ship.jobId : opts.jobReference,
    mawbReference: opts.mawbReference === undefined ? ship.mawb : opts.mawbReference,
    hawbReference: opts.hawbReference === undefined ? ship.hawb : opts.hawbReference,
    poReference: opts.poReference === undefined ? "PO-26-" + pad(shipmentSeq, 6) : opts.poReference,
    chargeDescription: opts.description || pick(descriptions[family]),
    vendorChargeCode: opts.chargeCode || vendorCode(vendor, family, opts.alternateCode),
    currency,
    unitPrice,
    quantity,
    tax,
    lineAmount,
    invoiceTotal: null,
    taxIncluded: Boolean(opts.taxIncluded),
    sourceStatus: opts.sourceStatus || "Open"
  };
  invoices.push(row);
  const current = invoiceTotals.get(invNo) || 0;
  invoiceTotals.set(invNo, current + (lineAmount == null ? 0 : lineAmount));
  return row;
}

function addAccrual(ship, vendor, family, amount, options) {
  const opts = options || {};
  accrualSeq += 1;
  const row = {
    jobId: ship.jobId,
    hawb: ship.hawb,
    mawb: ship.mawb,
    poReference: opts.poReference === undefined ? "PO-26-" + pad(shipmentSeq, 6) : opts.poReference,
    accrualReference: "ACR-26-" + pad(accrualSeq, 6),
    vendor: opts.vendorName || vendor.name,
    chargeCode: opts.chargeCode || vendorCode(vendor, family, opts.alternateCode),
    currency: opts.currency || "USD",
    accruedAmount: money(amount),
    taxIncluded: Boolean(opts.taxIncluded),
    status: opts.status || "Open"
  };
  accrueCost.push(row);
  return row;
}

function recordTruth(line, expectedOutcome, reason, groupId) {
  const row = { invoiceLineId: line.invoiceLineId, expectedOutcome, reason };
  if (groupId) row.groupId = groupId;
  truth.push(row);
}

function simple(expected, count, builder) {
  for (let index = 0; index < count; index += 1) builder(index, expected);
}

function newBase(vendor, family, amount) {
  const ship = makeShipment();
  const po = "PO-26-" + pad(shipmentSeq, 6);
  return { ship, po, vendor: vendor || pick(vendors), family: family || pick(families), amount: amount == null ? money(80 + random() * 420) : amount };
}

simple("MATCHED", 2950, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "MATCHED", "Unique normalized identifiers, vendor, charge family, currency and exact amount.");
});

simple("MATCHED", 200, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, {
    poReference: base.po,
    jobReference: "cw j " + base.ship.jobId.slice(5),
    hawbReference: base.ship.hawb.toLowerCase().replaceAll("-", " ")
  });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "MATCHED", "Identifier punctuation and letter case differ; canonical normalization resolves the same shipment.");
});

simple("MATCHED", 150, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, alternateCode: true });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "MATCHED", "Vendor-specific charge-code mapping resolves to the same canonical charge family.");
});

simple("MATCHED_WITH_TOLERANCE", 80, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po });
  addAccrual(base.ship, base.vendor, base.family, base.amount + (random() < 0.5 ? 0.03 : -0.03), { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "MATCHED_WITH_TOLERANCE", "Unique candidate with a 0.03 rounding difference inside the configured 0.05 tolerance.");
});

simple("GROUP_REVIEW", 40, function (index) {
  const base = newBase();
  const groupId = "OTM-" + pad(index + 1, 3);
  const invoice = addInvoice(base.ship, base.vendor, base.family, 100, { poReference: base.po });
  addAccrual(base.ship, base.vendor, base.family, 60, { poReference: base.po, currency: invoice.currency });
  addAccrual(base.ship, base.vendor, base.family, 40, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "GROUP_REVIEW", "One invoice line is supported by two accrual records that sum to the billed amount.", groupId);
});

const manyToOneCount = 20;
for (let index = 0; index < manyToOneCount; index += 1) {
  const base = newBase();
  const groupId = "MTO-" + pad(index + 1, 3);
  const currency = pick(currencies);
  const first = addInvoice(base.ship, base.vendor, base.family, 40, { poReference: base.po, currency });
  const second = addInvoice(base.ship, base.vendor, base.family, 60, { poReference: base.po, currency });
  addAccrual(base.ship, base.vendor, base.family, 100, { poReference: base.po, currency: first.currency });
  recordTruth(first, "GROUP_REVIEW", "Two invoice lines share one shipment and reconcile as a reviewed consolidated charge.", groupId);
  recordTruth(second, "GROUP_REVIEW", "Two invoice lines share one shipment and reconcile as a reviewed consolidated charge.", groupId);
}

simple("MISSING_PO", 90, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: "" });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "MISSING_PO", "A defensible amount candidate exists, but the invoice line has no purchase-order reference.");
});

simple("AMOUNT_VARIANCE_OVER", 70, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount + 18.25, { poReference: base.po });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "AMOUNT_VARIANCE_OVER", "Invoice exceeds the unique accrual by more than the configured tolerance.");
});

simple("AMOUNT_VARIANCE_UNDER", 70, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, Math.max(1, base.amount - 12.4), { poReference: base.po });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "AMOUNT_VARIANCE_UNDER", "Invoice is below the unique accrual by more than the configured tolerance.");
});

for (let index = 0; index < 25; index += 1) {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "MATCHED", "Original invoice line has a unique exact accrual.");
  const duplicate = { ...invoice, invoiceLineId: "VIL-" + pad(invoices.length + 1, 5) };
  invoices.push(duplicate);
  invoiceTotals.set(invoice.invoiceNumber, (invoiceTotals.get(invoice.invoiceNumber) || 0) + invoice.lineAmount);
  recordTruth(duplicate, "DUPLICATE", "Same vendor, invoice, shipment, charge and amount appears on a second line.");
}

simple("DUPLICATE_CW", 30, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "DUPLICATE_CW", "Two CargoWise accrual records share an indistinguishable financial key.");
});

simple("INVALID_REFERENCE", 20, function (index) {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, {
    jobReference: index % 2 === 0 ? "" : "CW-J-26-999999",
    hawbReference: index % 2 === 0 ? "???" : "",
    mawbReference: "",
    poReference: base.po
  });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "INVALID_REFERENCE", "No valid source-report identifier resolves to a shipment.");
});

simple("IDENTIFIER_CONFLICT", 20, function () {
  const base = newBase();
  let other = makeShipment();
  while (other.mawb === base.ship.mawb) other = makeShipment();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, {
    poReference: base.po,
    mawbReference: other.mawb
  });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "IDENTIFIER_CONFLICT", "Invoice HAWB/job resolve to one shipment while MAWB resolves to another.");
});

simple("AMBIGUOUS_MATCH", 30, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po });
  addAccrual(base.ship, base.vendor, base.family, base.amount - 0.01, { poReference: base.po, currency: invoice.currency });
  addAccrual(base.ship, base.vendor, base.family, base.amount + 0.01, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "AMBIGUOUS_MATCH", "More than one plausible candidate falls within tolerance; no automatic choice is safe.");
});

simple("CURRENCY_MISMATCH", 25, function () {
  const base = newBase();
  const invoiceCurrency = "EUR";
  const accrualCurrency = "USD";
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoiceCurrency });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: accrualCurrency });
  recordTruth(invoice, "CURRENCY_MISMATCH", "Shipment and charge align, but source currencies differ; no implicit FX conversion is applied.");
});

simple("TAX_VARIANCE", 25, function () {
  const base = newBase();
  const tax = money(base.amount * 0.075);
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, tax, taxIncluded: true });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency, taxIncluded: false });
  recordTruth(invoice, "TAX_VARIANCE", "Invoice amount includes tax while the accrual amount is tax-exclusive.");
});

simple("UNMATCHED_CHARGE", 20, function () {
  const base = newBase();
  const otherFamily = families.filter(function (family) { return family !== base.family; })[0];
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po });
  addAccrual(base.ship, base.vendor, otherFamily, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "UNMATCHED_CHARGE", "Shipment exists in Accrue Cost, but no accrual exists for the mapped charge family.");
});

simple("UNRECOGNIZED_CODE", 10, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, chargeCode: "X-CHG-99" });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "UNRECOGNIZED_CODE", "Vendor is known but its invoice charge code has no configured mapping.");
});

simple("UNRECOGNIZED_VENDOR", 10, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, vendorName: "Unmapped Freight Co", chargeCode: "FRT-9" });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "UNRECOGNIZED_VENDOR", "Invoice vendor is outside the configured vendor mapping.");
});

simple("MISSING_INFORMATION", 20, function (index) {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, index % 2 === 0 ? null : base.amount, {
    poReference: base.po,
    invoiceDate: index % 2 === 0 ? "2026-10-03" : "",
    invoiceNumberOverride: index % 2 === 0 ? undefined : ""
  });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency });
  recordTruth(invoice, "MISSING_INFORMATION", "Invoice number, date or line amount is missing and blocks reconciliation.");
});

simple("EXPORTED", 50, function () {
  const base = newBase();
  const invoice = addInvoice(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, sourceStatus: "Exported" });
  addAccrual(base.ship, base.vendor, base.family, base.amount, { poReference: base.po, currency: invoice.currency, status: "Exported" });
  recordTruth(invoice, "EXPORTED", "The source accrual is already marked exported and cannot be exported a second time.");
});

if (invoices.length !== 4000) throw new Error("Expected 4,000 invoice lines; generated " + invoices.length + ".");
for (const invoice of invoices) {
  const total = invoiceTotals.get(invoice.invoiceNumber) || 0;
  invoice.invoiceTotal = money(total);
}

const sourceData = {
  metadata: {
    datasetName: "Finance Control Hub synthetic freight reconciliation backlog",
    seed: SEED,
    generatedOn: "2026-10-14",
    notice: "All vendors, shipment identifiers, invoices, values and records are synthetic. Source schemas are illustrative and are not official CargoWise export specifications.",
    invoiceLineCount: invoices.length,
    hawbRecordCount: hawbReport.length,
    mawbRecordCount: mawbReport.length,
    accrueCostRecordCount: accrueCost.length,
    mappingRuleCount: vendorRuleRows.length
  },
  mappingRules: vendorRuleRows,
  vendorChargeDescriptions: descriptions,
  invoices,
  hawbReport,
  mawbReport,
  accrueCost
};
const truthCounts = {};
for (const item of truth) truthCounts[item.expectedOutcome] = (truthCounts[item.expectedOutcome] || 0) + 1;
const groundTruth = {
  title: "Synthetic reconciliation ground truth",
  seed: SEED,
  notice: "Test-only answer key. The reconciliation engine and browser demo do not read this file.",
  expectedLineCount: truth.length,
  counts: truthCounts,
  cases: truth
};

await mkdir(dataDir, { recursive: true });
await mkdir(testDir, { recursive: true });
await writeFile(resolve(dataDir, "source-data.json"), JSON.stringify(sourceData));
await writeFile(resolve(testDir, "finance-ground-truth.json"), JSON.stringify(groundTruth, null, 2));
console.log(JSON.stringify({
  seed: SEED,
  invoiceLines: invoices.length,
  hawbRecords: hawbReport.length,
  mawbRecords: mawbReport.length,
  accrueCostRecords: accrueCost.length,
  mappingRules: vendorRuleRows.length,
  expectedOutcomes: truthCounts,
  generatedFiles: ["case-studies/finance-control-hub/demo/data/source-data.json", "test/fixtures/finance-ground-truth.json"]
}, null, 2));
