const FIELD_ALIASES = {
  invoiceLineId: ["invoicelineid", "lineid", "sourcelineid"],
  invoiceNumber: ["invoicenumber", "invoice", "billnumber"],
  invoiceDate: ["invoicedate", "date"],
  vendor: ["vendor", "supplier", "vendorname", "suppliername"],
  jobReference: ["jobreference", "jobid", "job", "jobnumber"],
  mawbReference: ["mawbreference", "mawb", "mawbnumber", "masterairwaybill"],
  hawbReference: ["hawbreference", "hawb", "hawbnumber", "houseairwaybill"],
  poReference: ["poreference", "po", "ponumber", "poreferencenumber", "purchaseorder"],
  chargeDescription: ["chargedescription", "description", "chargename"],
  vendorChargeCode: ["vendorchargecode", "vendorcode", "chargecode", "chargecodevendor"],
  vendorCode: ["vendorcode", "vendorchargecode"],
  chargeFamily: ["chargefamily", "internalchargefamily"],
  currency: ["currency", "currencycode"],
  unitPrice: ["unitprice", "priceperunit"],
  quantity: ["quantity", "qty"],
  tax: ["tax", "taxamount"],
  lineAmount: ["lineamount", "amount", "extendedamount", "invoiceamount"],
  invoiceTotal: ["invoicetotal", "totalamount", "total"],
  taxIncluded: ["taxincluded", "taxinclusive"],
  sourceStatus: ["sourcestatus", "invoicestatus"],
  hawb: ["hawb", "hawbreference", "hawbnumber", "housenumber", "houseairwaybill"],
  jobId: ["jobid", "jobnumber", "job"],
  mawb: ["mawb", "mawbreference", "mawbnumber", "masterairwaybill"],
  origin: ["origin", "originport"],
  destination: ["destination", "destinationport"],
  pieces: ["pieces", "piececount"],
  grossKg: ["grosskg", "grossweightkg", "weightkg"],
  carrier: ["carrier", "airline"],
  houseShipmentCount: ["houseshipmentcount", "hawbcount", "shipmentcount"],
  accrualReference: ["accrualreference", "accrualid", "costreference"],
  chargeCode: ["chargecode", "internalchargecode", "costcode"],
  accruedAmount: ["accruedamount", "accrualamount", "costamount"],
  status: ["status", "recordstatus"]
};

const NUMERIC_FIELDS = new Set(["unitPrice", "quantity", "tax", "lineAmount", "invoiceTotal", "pieces", "grossKg", "houseShipmentCount", "accruedAmount"]);

function normalizedHeader(value) {
  return String(value || "").replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseCsv(text) {
  const input = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some(function (cell) { return String(cell).trim() !== ""; })) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some(function (cell) { return String(cell).trim() !== ""; })) rows.push(row);
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  if (!rows.length) throw new Error("The file is empty.");
  const headers = rows.shift().map(function (header) { return String(header).trim(); });
  if (!headers.some(Boolean)) throw new Error("The CSV needs a header row.");
  return rows.map(function (cells) {
    const record = {};
    headers.forEach(function (header, index) { record[header] = String(cells[index] || "").trim(); });
    return record;
  });
}

function sourceType(name, records) {
  const normalizedName = String(name || "").toLowerCase();
  const keys = new Set(Object.keys(records[0] || {}).map(normalizedHeader));
  if (keys.has("chargefamily") && keys.has("vendorcode")) return "mappingRules";
  if (keys.has("accrualreference") || keys.has("accrualid") || normalizedName.includes("accru")) return "accrueCost";
  if (keys.has("invoicelineid") || keys.has("lineid") || normalizedName.includes("invoice")) return "invoices";
  if ((keys.has("hawb") || keys.has("hawbnumber")) && (keys.has("jobid") || keys.has("jobnumber"))) return "hawbReport";
  if ((keys.has("mawb") || keys.has("mawbnumber")) && (keys.has("carrier") || normalizedName.includes("mawb"))) return "mawbReport";
  if (normalizedName.includes("hawb")) return "hawbReport";
  if (normalizedName.includes("mawb")) return "mawbReport";
  return null;
}

function canonicalize(records, type) {
  return records.map(function (record, index) {
    const rawByHeader = new Map(Object.entries(record).map(function (entry) { return [normalizedHeader(entry[0]), entry[1]]; }));
    const result = {};
    Object.entries(FIELD_ALIASES).forEach(function (entry) {
      const target = entry[0];
      const aliases = entry[1];
      const alias = aliases.find(function (key) { return rawByHeader.has(key); });
      if (!alias) return;
      const value = rawByHeader.get(alias);
      if (NUMERIC_FIELDS.has(target) && value !== "") {
        const raw = String(value).trim();
        const negative = /^\(.*\)$/.test(raw);
        const parsed = Number(raw.replace(/[(),\s$€£]/g, ""));
        result[target] = negative ? -parsed : parsed;
      }
      else if (target === "taxIncluded" && value !== "") result[target] = /^(true|yes|1|included)$/i.test(String(value));
      else result[target] = value;
    });
    if (type === "mappingRules") delete result.vendorChargeCode;
    result._sourceRow = index + 2;
    return result;
  });
}

function validateRows(type, rows, filename) {
  if (!rows.length) throw new Error(filename + " has no data rows.");
  const required = {
    invoices: ["invoiceLineId", "invoiceNumber", "vendor", "currency", "lineAmount", "vendorChargeCode"],
    hawbReport: ["hawb", "jobId", "mawb"],
    mawbReport: ["mawb"],
    accrueCost: ["accrualReference", "vendor", "currency", "accruedAmount", "chargeCode"],
    mappingRules: ["vendor", "vendorCode", "chargeFamily"]
  }[type];
  const missing = required.filter(function (key) { return rows.some(function (row) { return row[key] == null || row[key] === "" || (typeof row[key] === "number" && !Number.isFinite(row[key])); }); });
  if (missing.length) throw new Error(filename + " is missing usable values for: " + missing.join(", ") + ".");
  const numericRequired = type === "invoices" ? "lineAmount" : type === "accrueCost" ? "accruedAmount" : null;
  if (numericRequired && rows.some(function (row) { return !Number.isFinite(Number(row[numericRequired])); })) throw new Error(filename + " contains a non-numeric " + numericRequired + " value.");
}

function sourceMetadata(bundle, name) {
  const metadata = Object.assign({}, bundle.metadata || {});
  metadata.datasetName = name || metadata.datasetName || "Local finance import";
  metadata.sourceKind = "local-import";
  metadata.invoiceLineCount = bundle.invoices.length;
  metadata.hawbRecordCount = bundle.hawbReport.length;
  metadata.mawbRecordCount = bundle.mawbReport.length;
  metadata.accrueCostRecordCount = bundle.accrueCost.length;
  metadata.mappingRuleCount = (bundle.mappingRules || []).length;
  return metadata;
}

export async function prepareFinanceImport(files) {
  const inputFiles = Array.from(files || []);
  const jsonFiles = inputFiles.filter(function (file) { return String(file.name || "").toLowerCase().endsWith(".json"); });
  if (jsonFiles.length && inputFiles.length !== 1) throw new Error("Choose one complete JSON batch or the source CSV files, not both.");
  const staged = [];
  for (const file of inputFiles) {
    const filename = file.name || "Source file";
    const extension = filename.split(".").pop().toLowerCase();
    if (extension !== "csv" && extension !== "json") throw new Error(filename + " is not supported. Use a CSV source file or a canonical JSON batch.");
    const text = typeof file.text === "function" ? await file.text() : String(file.textContent || "");
    if (extension === "json") {
      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { throw new Error(filename + " contains invalid JSON."); }
      if (parsed && parsed.invoices && parsed.hawbReport && parsed.mawbReport && parsed.accrueCost) {
        ["invoices", "hawbReport", "mawbReport", "accrueCost"].forEach(function (type) {
          if (!Array.isArray(parsed[type])) throw new Error("The JSON batch has an invalid " + type + " source.");
          validateRows(type, parsed[type], filename);
        });
        parsed.metadata = sourceMetadata(parsed, filename.replace(/\.[^.]+$/, ""));
        parsed.mappingRules = Array.isArray(parsed.mappingRules) ? parsed.mappingRules : [];
        parsed.vendorChargeDescriptions = Array.isArray(parsed.vendorChargeDescriptions) ? parsed.vendorChargeDescriptions : [];
        return { complete: true, source: parsed, staged: [{ name: filename, type: "Full JSON batch", count: parsed.invoices.length }] };
      }
      throw new Error(filename + " must contain invoices, hawbReport, mawbReport and accrueCost arrays.");
    }
    const parsedRows = parseCsv(text);
    const type = sourceType(filename, parsedRows);
    if (!type) throw new Error("Could not identify the source type for " + filename + ". Name it with invoice, HAWB, MAWB or accrue-cost, or use the canonical column headings.");
    const rows = canonicalize(parsedRows, type);
    validateRows(type, rows, filename);
    staged.push({ name: filename, type, rows, count: rows.length });
  }

  const byType = new Map();
  staged.forEach(function (item) {
    if (byType.has(item.type)) throw new Error("More than one file was identified as " + item.type + ". Combine them into one CSV first.");
    byType.set(item.type, item);
  });
  const types = ["invoices", "hawbReport", "mawbReport", "accrueCost"];
  const missing = types.filter(function (type) { return !byType.has(type); });
  if (missing.length) return { complete: false, staged: staged.map(function (item) { return { name: item.name, type: item.type, count: item.count }; }), missing };
  const bundle = {
    metadata: {},
    mappingRules: byType.has("mappingRules") ? byType.get("mappingRules").rows : [],
    vendorChargeDescriptions: [],
    invoices: byType.get("invoices").rows,
    hawbReport: byType.get("hawbReport").rows,
    mawbReport: byType.get("mawbReport").rows,
    accrueCost: byType.get("accrueCost").rows
  };
  bundle.metadata = sourceMetadata(bundle, "Local CSV import");
  bundle.metadata.mappingNote = "No vendor charge-code mappings were supplied. Unknown codes remain exceptions.";
  return { complete: true, source: bundle, staged: staged.map(function (item) { return { name: item.name, type: item.type, count: item.count }; }) };
}

