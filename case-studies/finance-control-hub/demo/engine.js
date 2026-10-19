export const AMOUNT_TOLERANCE = 0.05;

export const COMMANDS = [
  { id: "reconcile", label: "Reconcile this month's vendor invoices", action: "run" },
  { id: "missing-po", label: "Find all missing purchase orders", action: "filter", filter: "MISSING_PO" },
  { id: "largest", label: "Show the largest unresolved discrepancies", action: "largest" },
  { id: "explain", label: "Explain why this invoice was not matched", action: "explain" },
  { id: "vendor", label: "Group exceptions by vendor", action: "group-vendor" },
  { id: "duplicates", label: "Find duplicate invoice charges", action: "filter", filter: "DUPLICATE" },
  { id: "bulk-safe", label: "Show cases safe for bulk approval", action: "filter", filter: "MATCHED" },
  { id: "export", label: "Prepare validated records for CargoWise export", action: "export" },
  { id: "priority", label: "What should Finance work on first?", action: "priority" }
];

export function normalizeIdentifier(value) {
  return String(value == null ? "" : value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeVendor(value) {
  return String(value == null ? "" : value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mappingIndex(mappingRules) {
  const map = new Map();
  const vendors = new Set();
  for (const rule of mappingRules || []) {
    const vendor = normalizeVendor(rule.vendor);
    vendors.add(vendor);
    map.set(vendor + "|" + normalizeIdentifier(rule.vendorCode), rule.chargeFamily);
  }
  return { map, vendors };
}

function chargeFamily(index, vendor, code) {
  return index.map.get(normalizeVendor(vendor) + "|" + normalizeIdentifier(code)) || null;
}

function addIndex(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function intersectSets(sets) {
  if (!sets.length) return new Set();
  const result = new Set(sets[0]);
  for (const set of sets.slice(1)) {
    for (const value of result) if (!set.has(value)) result.delete(value);
  }
  return result;
}

function buildReferenceIndexes(source) {
  const jobToJobs = new Map();
  const hawbToJobs = new Map();
  const mawbToJobs = new Map();
  const hawbById = new Map();
  const mawbById = new Map();
  for (const row of source.hawbReport || []) {
    const job = normalizeIdentifier(row.jobId);
    const hawb = normalizeIdentifier(row.hawb);
    const mawb = normalizeIdentifier(row.mawb);
    addIndex(jobToJobs, job, row.jobId);
    addIndex(hawbToJobs, hawb, row.jobId);
    addIndex(mawbToJobs, mawb, row.jobId);
    hawbById.set(hawb, row);
  }
  for (const row of source.mawbReport || []) mawbById.set(normalizeIdentifier(row.mawb), row);
  return { jobToJobs, hawbToJobs, mawbToJobs, hawbById, mawbById };
}

function resolveInvoiceJobs(line, refs) {
  const provided = [
    { type: "job", raw: line.jobReference, index: refs.jobToJobs },
    { type: "hawb", raw: line.hawbReference, index: refs.hawbToJobs },
    { type: "mawb", raw: line.mawbReference, index: refs.mawbToJobs }
  ].filter(function (item) { return normalizeIdentifier(item.raw); });
  const sets = [];
  const evidence = [];
  for (const item of provided) {
    const normalized = normalizeIdentifier(item.raw);
    const found = item.index.get(normalized);
    if (!found || found.size === 0) {
      return { status: "INVALID_REFERENCE", jobs: new Set(), evidence: ["Reference " + item.type.toUpperCase() + " " + item.raw + " does not resolve in the source reports."] };
    }
    sets.push(found);
    evidence.push(item.type.toUpperCase() + " " + item.raw + " normalized to " + normalized + " (" + found.size + " job candidate" + (found.size === 1 ? "" : "s") + ").");
  }
  if (!sets.length) return { status: "INVALID_REFERENCE", jobs: new Set(), evidence: ["No usable Job ID, HAWB or MAWB reference was supplied."] };
  const jobs = intersectSets(sets);
  if (jobs.size === 0) return { status: "IDENTIFIER_CONFLICT", jobs, evidence: evidence.concat(["The supplied identifiers point to different shipments."]) };
  return { status: null, jobs, evidence };
}

function indexAccruals(source, rules) {
  const byJob = new Map();
  const byFingerprint = new Map();
  const normalizedRows = new Map();
  for (const row of source.accrueCost || []) {
    const family = chargeFamily(rules, row.vendor, row.chargeCode);
    const jobKey = normalizeIdentifier(row.jobId);
    const enriched = { row, family, vendorKey: normalizeVendor(row.vendor), jobKey, currency: String(row.currency || "").toUpperCase() };
    normalizedRows.set(row.accrualReference, enriched);
    if (!byJob.has(jobKey)) byJob.set(jobKey, []);
    byJob.get(jobKey).push(enriched);
    const fingerprint = [
      enriched.vendorKey,
      jobKey,
      normalizeIdentifier(row.hawb),
      normalizeIdentifier(row.mawb),
      family || normalizeIdentifier(row.chargeCode),
      enriched.currency,
      normalizeIdentifier(row.poReference),
      Number(row.accruedAmount).toFixed(2)
    ].join("|");
    if (!byFingerprint.has(fingerprint)) byFingerprint.set(fingerprint, []);
    byFingerprint.get(fingerprint).push(enriched);
  }
  return { byJob, byFingerprint, normalizedRows };
}

function invoiceFingerprint(line, family) {
  return [
    normalizeVendor(line.vendor),
    normalizeIdentifier(line.invoiceNumber),
    normalizeIdentifier(line.jobReference),
    normalizeIdentifier(line.hawbReference),
    normalizeIdentifier(line.mawbReference),
    family || normalizeIdentifier(line.vendorChargeCode),
    String(line.currency || "").toUpperCase(),
    line.lineAmount == null ? "" : Number(line.lineAmount).toFixed(2)
  ].join("|");
}

function duplicateInvoiceIds(lines, rules) {
  const seen = new Set();
  const duplicates = new Set();
  for (const line of lines) {
    const family = chargeFamily(rules, line.vendor, line.vendorChargeCode);
    const fingerprint = invoiceFingerprint(line, family);
    if (normalizeIdentifier(line.invoiceNumber) && line.lineAmount != null && seen.has(fingerprint)) duplicates.add(line.invoiceLineId);
    else if (normalizeIdentifier(line.invoiceNumber) && line.lineAmount != null) seen.add(fingerprint);
  }
  return duplicates;
}

function cents(value) {
  return Math.round(Number(value) * 100);
}

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function subsetByAmount(items, amount, amountOf, tolerance, maxItems) {
  const found = [];
  function walk(start, picked, sum) {
    if (picked.length >= 2 && Math.abs(sum - amount) <= tolerance) {
      found.push(picked.slice());
      return;
    }
    if (picked.length >= maxItems) return;
    for (let index = start; index < items.length; index += 1) {
      const nextSum = sum + amountOf(items[index]);
      if (nextSum <= amount + tolerance) {
        picked.push(items[index]);
        walk(index + 1, picked, nextSum);
        picked.pop();
      }
    }
  }
  walk(0, [], 0);
  return found;
}

function resultFor(line, status, reason, extra) {
  return Object.assign({
    invoiceLineId: line.invoiceLineId,
    status,
    reason,
    method: "deterministic-rule",
    candidateAccrualIds: [],
    matchedAccrualIds: [],
    evidence: [],
    variance: null,
    exportEligible: false,
    requiresHuman: status !== "MATCHED" && status !== "MATCHED_WITH_TOLERANCE" && status !== "EXPORTED",
    groupId: null
  }, extra || {});
}

function makeGroupId(prefix, lineIds) {
  return prefix + "-" + lineIds.slice().sort().join("-");
}

export function reconcileBatch(source, options) {
  const started = Date.now();
  const tolerance = options && Number.isFinite(options.tolerance) ? options.tolerance : AMOUNT_TOLERANCE;
  const lines = source.invoices || [];
  const rules = mappingIndex(source.mappingRules || []);
  const refs = buildReferenceIndexes(source);
  const accrualIndex = indexAccruals(source, rules);
  const duplicateLines = duplicateInvoiceIds(lines, rules);
  const outcomes = new Map();
  const context = new Map();
  const usedAccrualIds = new Set();
  const reservedInvoiceIds = new Set();
  const reservedAccrualIds = new Set();

  for (const line of lines) {
    const family = chargeFamily(rules, line.vendor, line.vendorChargeCode);
    const baseEvidence = [];
    if (!line.vendor || !line.invoiceNumber || !line.invoiceDate || line.lineAmount == null || !line.currency) {
      outcomes.set(line.invoiceLineId, resultFor(line, "MISSING_INFORMATION", "Invoice is missing a vendor, invoice number, date, currency or line amount.", { evidence: ["Required source fields are blank or unavailable."] }));
      continue;
    }
    if (!rules.vendors.has(normalizeVendor(line.vendor))) {
      outcomes.set(line.invoiceLineId, resultFor(line, "UNRECOGNIZED_VENDOR", "No vendor policy or charge-code mapping is configured for this supplier.", { evidence: ["Vendor: " + line.vendor + ".", "No candidate is accepted without an explicit vendor mapping."] }));
      continue;
    }
    if (!family) {
      outcomes.set(line.invoiceLineId, resultFor(line, "UNRECOGNIZED_CODE", "The vendor is known, but this charge code has no explicit mapping.", { evidence: ["Vendor code: " + line.vendorChargeCode + ".", "Charge-code mapping is a controlled configuration; no inferred mapping was applied."] }));
      continue;
    }
    const resolved = resolveInvoiceJobs(line, refs);
    baseEvidence.push.apply(baseEvidence, resolved.evidence);
    if (resolved.status) {
      outcomes.set(line.invoiceLineId, resultFor(line, resolved.status, resolved.status === "IDENTIFIER_CONFLICT" ? "The supplied shipment references disagree." : "No valid shipment reference resolves to a source-report record.", { evidence: baseEvidence }));
      continue;
    }
    const jobs = resolved.jobs;
    const allForJobs = [];
    for (const job of jobs) {
      const rows = accrualIndex.byJob.get(normalizeIdentifier(job)) || [];
      for (const item of rows) allForJobs.push(item);
    }
    const vendorRows = allForJobs.filter(function (item) { return item.vendorKey === normalizeVendor(line.vendor); });
    const familyRows = vendorRows.filter(function (item) { return item.family === family; });
    const currency = String(line.currency).toUpperCase();
    let sameCurrency = familyRows.filter(function (item) { return item.currency === currency; });
    let poMismatch = false;
    if (line.poReference) {
      const byPo = sameCurrency.filter(function (item) { return normalizeIdentifier(item.row.poReference) === normalizeIdentifier(line.poReference); });
      if (byPo.length) sameCurrency = byPo;
      else if (sameCurrency.length) poMismatch = true;
    }
    const duplicateCw = [];
    for (const item of sameCurrency) {
      const key = [
        item.vendorKey, item.jobKey, normalizeIdentifier(item.row.hawb), normalizeIdentifier(item.row.mawb),
        item.family, item.currency, normalizeIdentifier(item.row.poReference), Number(item.row.accruedAmount).toFixed(2)
      ].join("|");
      const identical = accrualIndex.byFingerprint.get(key) || [];
      if (identical.length > 1) duplicateCw.push.apply(duplicateCw, identical);
    }
    const allCandidates = sameCurrency.filter(function (item) { return !usedAccrualIds.has(item.row.accrualReference) && !reservedAccrualIds.has(item.row.accrualReference); });
    const mappedEvidence = ["Vendor charge " + line.vendorChargeCode + " maps to " + family + " under an explicit vendor rule."];
    const candidateIds = allCandidates.map(function (item) { return item.row.accrualReference; });
    const contextItem = {
      line,
      family,
      jobs,
      allForJobs,
      vendorRows,
      familyRows,
      sameCurrency,
      candidates: allCandidates,
      currency,
      evidence: baseEvidence.concat(mappedEvidence)
    };
    context.set(line.invoiceLineId, contextItem);

    if (line.sourceStatus === "Exported" || allCandidates.some(function (item) { return item.row.status === "Exported" && Number(item.row.accruedAmount) === Number(line.lineAmount); })) {
      outcomes.set(line.invoiceLineId, resultFor(line, "EXPORTED", "This line or its matching accrual is already marked exported.", { candidateAccrualIds: candidateIds, evidence: contextItem.evidence.concat(["Exported source records are excluded from a new release."]) }));
      continue;
    }
    if (duplicateLines.has(line.invoiceLineId)) {
      outcomes.set(line.invoiceLineId, resultFor(line, "DUPLICATE", "This invoice line repeats an earlier line with the same vendor, invoice, shipment, charge and amount.", { evidence: contextItem.evidence.concat(["The first occurrence is retained for reconciliation; this copy is blocked from export."]) }));
      continue;
    }
    if (duplicateCw.length) {
      outcomes.set(line.invoiceLineId, resultFor(line, "DUPLICATE_CW", "More than one CargoWise accrual has the same vendor, shipment, charge, PO, currency and amount.", {
        candidateAccrualIds: Array.from(new Set(duplicateCw.map(function (item) { return item.row.accrualReference; }))),
        evidence: contextItem.evidence.concat(["Duplicate accrual fingerprints detected: " + Array.from(new Set(duplicateCw.map(function (item) { return item.row.accrualReference; }))).join(", ") + "."])
      }));
      continue;
    }
    if (!line.poReference && allCandidates.length) {
      const exactOrPlausible = allCandidates.filter(function (item) { return item.currency === currency; });
      outcomes.set(line.invoiceLineId, resultFor(line, "MISSING_PO", "A possible accrual exists, but the invoice has no PO reference.", {
        candidateAccrualIds: exactOrPlausible.map(function (item) { return item.row.accrualReference; }),
        evidence: contextItem.evidence.concat(["Purchase order is blank on the invoice line; the source value is not inferred."])
      }));
      continue;
    }
    if (!sameCurrency.length && familyRows.length) {
      outcomes.set(line.invoiceLineId, resultFor(line, "CURRENCY_MISMATCH", "Shipment and charge align, but the invoice and accrual currencies differ.", {
        candidateAccrualIds: familyRows.map(function (item) { return item.row.accrualReference; }),
        evidence: contextItem.evidence.concat(["Invoice currency: " + currency + ".", "Accrual currency: " + Array.from(new Set(familyRows.map(function (item) { return item.currency; }))).join(", ") + ".", "No implicit foreign-exchange conversion was applied."])
      }));
      continue;
    }
    if (poMismatch) {
      outcomes.set(line.invoiceLineId, resultFor(line, "PO_MISMATCH", "Shipment, vendor, charge and currency align, but the invoice PO conflicts with the accrual PO.", {
        candidateAccrualIds: sameCurrency.map(function (item) { return item.row.accrualReference; }),
        evidence: contextItem.evidence.concat(["Invoice PO: " + line.poReference + ".", "Accrual PO: " + Array.from(new Set(sameCurrency.map(function (item) { return item.row.poReference || "(blank)"; }))).join(", ") + ".", "PO disagreement blocks automatic reconciliation."])
      }));
      continue;
    }
    if (!allCandidates.length) {
      if (familyRows.length) {
        outcomes.set(line.invoiceLineId, resultFor(line, "AMBIGUOUS_MATCH", "A plausible source accrual has already been reserved by another line or review group.", { candidateAccrualIds: familyRows.map(function (item) { return item.row.accrualReference; }), evidence: contextItem.evidence.concat(["An accrual cannot be allocated to more than one invoice line."]) }));
      } else if (vendorRows.length) {
        outcomes.set(line.invoiceLineId, resultFor(line, "UNMATCHED_CHARGE", "Shipment and vendor exist in Accrue Cost, but no accrual uses this mapped charge family.", { evidence: contextItem.evidence.concat(["Other charge families exist on this shipment; none is substituted."]) }));
      } else {
        outcomes.set(line.invoiceLineId, resultFor(line, "UNMATCHED_CHARGE", "No same-vendor accrual record exists for the resolved shipment.", { evidence: contextItem.evidence.concat(["No candidate source charge was found."]) }));
      }
      continue;
    }
    const amount = Number(line.lineAmount);
    const exact = allCandidates.filter(function (item) { return cents(item.row.accruedAmount) === cents(amount); });
    const toleranceMatches = allCandidates.filter(function (item) { return Math.abs(cents(item.row.accruedAmount) - cents(amount)) <= Math.round(tolerance * 100); });
    if (exact.length === 1) {
      const item = exact[0];
      const taxDifference = Math.abs(Number(line.tax || 0) - Math.abs(amount - Number(item.row.accruedAmount)));
      if (taxDifference <= 0.02 && line.taxIncluded !== Boolean(item.row.taxIncluded) && Number(line.tax || 0) > 0) {
        outcomes.set(line.invoiceLineId, resultFor(line, "TAX_VARIANCE", "Invoice and accrual use different tax-inclusion treatment.", {
          candidateAccrualIds: [item.row.accrualReference],
          variance: money(amount - Number(item.row.accruedAmount)),
          evidence: contextItem.evidence.concat(["Invoice: " + amount.toFixed(2) + " " + currency + " including tax.", "Accrual: " + Number(item.row.accruedAmount).toFixed(2) + " " + currency + " with taxIncluded=" + Boolean(item.row.taxIncluded) + "."])
        }));
        continue;
      }
      usedAccrualIds.add(item.row.accrualReference);
      outcomes.set(line.invoiceLineId, resultFor(line, "MATCHED", "One unique accrual matches the invoice line exactly.", {
        candidateAccrualIds: [item.row.accrualReference],
        matchedAccrualIds: [item.row.accrualReference],
        evidence: contextItem.evidence.concat(["Invoice amount equals accrual amount: " + amount.toFixed(2) + " " + currency + ".", "PO reference matches: " + item.row.poReference + "."]),
        exportEligible: true,
        requiresHuman: false
      }));
      continue;
    }
    if (toleranceMatches.length === 1) {
      const item = toleranceMatches[0];
      const variance = money(amount - Number(item.row.accruedAmount));
      if (line.taxIncluded !== Boolean(item.row.taxIncluded) && Number(line.tax || 0) > 0 && Math.abs(Math.abs(variance) - Number(line.tax)) <= 0.02) {
        outcomes.set(line.invoiceLineId, resultFor(line, "TAX_VARIANCE", "Invoice and accrual amounts differ by the declared tax amount.", {
          candidateAccrualIds: [item.row.accrualReference], variance,
          evidence: contextItem.evidence.concat(["Variance equals the invoice tax amount, but tax treatment differs."])
        }));
        continue;
      }
      usedAccrualIds.add(item.row.accrualReference);
      outcomes.set(line.invoiceLineId, resultFor(line, "MATCHED_WITH_TOLERANCE", "One unique accrual is within the configured rounding tolerance.", {
        candidateAccrualIds: [item.row.accrualReference],
        matchedAccrualIds: [item.row.accrualReference],
        variance,
        evidence: contextItem.evidence.concat(["Invoice " + amount.toFixed(2) + " " + currency + " versus accrual " + Number(item.row.accruedAmount).toFixed(2) + " " + currency + ".", "Variance " + variance.toFixed(2) + " is within ±" + tolerance.toFixed(2) + "."]),
        exportEligible: true,
        requiresHuman: false
      }));
      continue;
    }
    if (toleranceMatches.length > 1) {
      outcomes.set(line.invoiceLineId, resultFor(line, "AMBIGUOUS_MATCH", "Several accruals are within the configured tolerance; no automatic candidate is selected.", {
        candidateAccrualIds: toleranceMatches.map(function (item) { return item.row.accrualReference; }),
        evidence: contextItem.evidence.concat(["Plausible accruals: " + toleranceMatches.map(function (item) { return item.row.accrualReference; }).join(", ") + "."])
      }));
      continue;
    }
    const groupMatches = subsetByAmount(allCandidates.filter(function (item) {
      return !usedAccrualIds.has(item.row.accrualReference) && !reservedAccrualIds.has(item.row.accrualReference) && item.row.status !== "Exported";
    }), cents(amount), function (item) { return cents(item.row.accruedAmount); }, Math.round(tolerance * 100), 3);
    if (groupMatches.length === 1) {
      const group = groupMatches[0];
      const groupId = makeGroupId("OTM", [line.invoiceLineId]);
      for (const item of group) reservedAccrualIds.add(item.row.accrualReference);
      reservedInvoiceIds.add(line.invoiceLineId);
      outcomes.set(line.invoiceLineId, resultFor(line, "GROUP_REVIEW", "One invoice line sums to multiple accruals; grouped settlement is held for Finance approval.", {
        candidateAccrualIds: group.map(function (item) { return item.row.accrualReference; }),
        matchedAccrualIds: group.map(function (item) { return item.row.accrualReference; }),
        variance: money(amount - group.reduce(function (sum, item) { return sum + Number(item.row.accruedAmount); }, 0)),
        groupId,
        evidence: contextItem.evidence.concat(["Grouped accruals total " + group.reduce(function (sum, item) { return sum + Number(item.row.accruedAmount); }, 0).toFixed(2) + " " + currency + ".", "Grouped matches always require human approval."])
      }));
      continue;
    }
    if (allCandidates.length === 1) {
      const item = allCandidates[0];
      const variance = money(amount - Number(item.row.accruedAmount));
      const taxDiff = Math.abs(Math.abs(variance) - Number(line.tax || 0));
      if (line.taxIncluded !== Boolean(item.row.taxIncluded) && Number(line.tax || 0) > 0 && taxDiff <= 0.02) {
        outcomes.set(line.invoiceLineId, resultFor(line, "TAX_VARIANCE", "Invoice and accrual amounts differ by the declared tax amount.", { candidateAccrualIds: [item.row.accrualReference], variance, evidence: contextItem.evidence.concat(["Variance is consistent with tax-inclusion differences; Finance review is required."]) }));
      } else {
        const status = variance > 0 ? "AMOUNT_VARIANCE_OVER" : "AMOUNT_VARIANCE_UNDER";
        outcomes.set(line.invoiceLineId, resultFor(line, status, variance > 0 ? "Invoice amount exceeds the accrual beyond tolerance." : "Invoice amount is below the accrual beyond tolerance.", {
          candidateAccrualIds: [item.row.accrualReference], variance,
          evidence: contextItem.evidence.concat(["Invoice " + amount.toFixed(2) + " " + currency + " versus accrual " + Number(item.row.accruedAmount).toFixed(2) + " " + currency + ".", "Variance exceeds the configured ±" + tolerance.toFixed(2) + " tolerance."])
        }));
      }
      continue;
    }
    const status = familyRows.length > 0 ? "AMBIGUOUS_MATCH" : "UNMATCHED_CHARGE";
    outcomes.set(line.invoiceLineId, resultFor(line, status, status === "AMBIGUOUS_MATCH" ? "Several candidate accruals remain; an exact allocation cannot be justified." : "No accrual can be matched to this charge.", {
      candidateAccrualIds: allCandidates.map(function (item) { return item.row.accrualReference; }),
      evidence: contextItem.evidence
    }));
  }

  const pending = lines.filter(function (line) {
    const result = outcomes.get(line.invoiceLineId);
    return result && (result.status === "AMOUNT_VARIANCE_OVER" || result.status === "AMOUNT_VARIANCE_UNDER") && !reservedInvoiceIds.has(line.invoiceLineId);
  });
  const pendingByCost = new Map();
  for (const line of pending) {
    const contextItem = context.get(line.invoiceLineId);
    if (!contextItem || contextItem.candidates.length !== 1) continue;
    const item = contextItem.candidates[0];
    const groupKey = [
      item.row.accrualReference,
      normalizeVendor(line.vendor),
      contextItem.family,
      contextItem.currency,
      normalizeIdentifier(line.poReference)
    ].join("|");
    if (!pendingByCost.has(groupKey)) pendingByCost.set(groupKey, { item, lines: [] });
    pendingByCost.get(groupKey).lines.push(line);
  }
  for (const entry of pendingByCost.values()) {
    if (usedAccrualIds.has(entry.item.row.accrualReference) || reservedAccrualIds.has(entry.item.row.accrualReference)) continue;
    const available = entry.lines.filter(function (line) { return !reservedInvoiceIds.has(line.invoiceLineId); });
    const combos = subsetByAmount(available, cents(entry.item.row.accruedAmount), function (line) { return cents(line.lineAmount); }, Math.round(tolerance * 100), 3);
    if (combos.length === 1) {
      const members = combos[0];
      const groupId = makeGroupId("MTO", members.map(function (line) { return line.invoiceLineId; }));
      reservedAccrualIds.add(entry.item.row.accrualReference);
      for (const line of members) {
        reservedInvoiceIds.add(line.invoiceLineId);
        const previous = outcomes.get(line.invoiceLineId);
        outcomes.set(line.invoiceLineId, Object.assign({}, previous, {
          status: "GROUP_REVIEW",
          reason: "Several invoice lines sum to one accrual; grouped settlement is held for Finance approval.",
          candidateAccrualIds: [entry.item.row.accrualReference],
          matchedAccrualIds: [entry.item.row.accrualReference],
          groupId,
          evidence: previous.evidence.concat(["Invoice lines in group: " + members.map(function (member) { return member.invoiceLineId; }).join(", ") + ".", "Combined invoice amount " + members.reduce(function (sum, member) { return sum + Number(member.lineAmount); }, 0).toFixed(2) + " " + entry.item.currency + " aligns with the accrual.", "Grouped matches always require human approval."]),
          exportEligible: false,
          requiresHuman: true
        }));
      }
    } else if (combos.length > 1) {
      for (const line of available) {
        const previous = outcomes.get(line.invoiceLineId);
        outcomes.set(line.invoiceLineId, Object.assign({}, previous, { status: "AMBIGUOUS_MATCH", reason: "Several invoice-line groupings could consume the same accrual.", matchedAccrualIds: [], exportEligible: false, requiresHuman: true }));
      }
    }
  }

  const counts = {};
  for (const result of outcomes.values()) counts[result.status] = (counts[result.status] || 0) + 1;
  const matched = (counts.MATCHED || 0) + (counts.MATCHED_WITH_TOLERANCE || 0);
  const exceptions = Array.from(outcomes.values()).filter(function (result) { return result.requiresHuman; }).length;
  return {
    outcomes: Object.fromEntries(outcomes),
    metrics: {
      invoiceLines: lines.length,
      matched,
      matchedExact: counts.MATCHED || 0,
      matchedWithTolerance: counts.MATCHED_WITH_TOLERANCE || 0,
      exceptions,
      alreadyExported: counts.EXPORTED || 0,
      accrualRecords: (source.accrueCost || []).length,
      elapsedMs: Date.now() - started,
      counts
    },
    audit: [
      { step: "Input validation", detail: "Checked " + lines.length.toLocaleString() + " invoice lines and " + (source.accrueCost || []).length.toLocaleString() + " accrual rows." },
      { step: "Reference normalization", detail: "Built HAWB, MAWB and Job ID indexes from the supplied source reports." },
      { step: "Deterministic matching", detail: matched.toLocaleString() + " unique exact or tolerance matches; grouped matches remain reviewable." },
      { step: "Exception routing", detail: exceptions.toLocaleString() + " lines need a Finance decision; exported rows were excluded." }
    ]
  };
}

export function interpretCommand(command) {
  const text = String(command || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return { supported: false, message: "Enter a supported instruction or choose a suggested command." };
  if (text.includes("reconcile") && (text.includes("invoice") || text.includes("backlog") || text.includes("batch"))) return { supported: true, action: "run", explanation: "Run deterministic reconciliation against the loaded source batch." };
  if ((text.includes("missing") || text.includes("without")) && (text.includes("po") || text.includes("purchase order"))) return { supported: true, action: "filter", filter: "MISSING_PO", explanation: "Filter the review queue to invoice lines with no PO reference." };
  if (text.includes("largest") && (text.includes("discrepanc") || text.includes("variance"))) return { supported: true, action: "largest", explanation: "Sort unresolved amount and tax variances by absolute value." };
  if (text.includes("explain") && (text.includes("match") || text.includes("invoice"))) return { supported: true, action: "explain", explanation: "Open the highest-priority unresolved invoice with its source evidence." };
  if (text.includes("group") && text.includes("vendor")) return { supported: true, action: "group-vendor", explanation: "Group the current exception queue by vendor." };
  if (text.includes("duplicate") && (text.includes("invoice") || text.includes("charge") || text.includes("cargowise"))) return { supported: true, action: "filter", filter: "DUPLICATE", explanation: "Show duplicate invoice lines and duplicate CargoWise accrual candidates." };
  if ((text.includes("bulk") || text.includes("safe")) && (text.includes("approval") || text.includes("approve"))) return { supported: true, action: "filter", filter: "MATCHED", explanation: "Show deterministic matches that passed validation and are safe to stage for batch review." };
  if (text.includes("export") || text.includes("release") || text.includes("validated records")) return { supported: true, action: "export", explanation: "Open the export review; release still requires an explicit human approval." };
  if (text.includes("what should") || text.includes("first") || text.includes("priority")) return { supported: true, action: "priority", explanation: "Open the highest-risk unresolved items first." };
  return { supported: false, message: "I could not map that to a supported operation. No records changed; choose a suggested command or use the structured queue." };
}

export function getSimulatedAssist(line, result, mappingRules) {
  const lower = String(line && line.chargeDescription || "").toLowerCase();
  const family = chargeFamily(mappingIndex(mappingRules), line && line.vendor, line && line.vendorChargeCode);
  if (family) return null;
  const terms = [
    { words: ["freight", "air cargo", "air transport"], family: "AIRFREIGHT" },
    { words: ["handling", "terminal"], family: "HANDLING" },
    { words: ["fuel", "surcharge"], family: "FUEL" },
    { words: ["document", "waybill"], family: "DOCUMENTATION" }
  ];
  const suggestion = terms.find(function (item) { return item.words.some(function (word) { return lower.includes(word); }); });
  if (!suggestion) return { type: "insufficient", label: "Simulated AI assist", suggestion: "No grounded charge-family suggestion is available from the description.", applied: false };
  return {
    type: "suggestion",
    label: "Simulated AI assist",
    suggestion: "Description language may fit " + suggestion.family + ".",
    evidence: "Invoice description: “" + line.chargeDescription + "”.",
    boundary: "Suggestion only. A Finance reviewer must confirm the mapping; no match or rule was changed.",
    applied: false
  };
}

export function buildIllustrativeExport(lines, outcomes, accrualById, resolutions) {
  const headers = ["JobID", "HAWB", "MAWB", "POReference", "Vendor", "ChargeCode", "Currency", "Amount", "AccrualReference", "SourceInvoice", "SourceInvoiceLine", "MatchStatus", "HumanApproval"];
  const csvCell = function (value) {
    const text = String(value == null ? "" : value);
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [headers];
  for (const line of lines) {
    const result = outcomes[line.invoiceLineId];
    const resolution = resolutions[line.invoiceLineId];
    const allowed = result && (result.exportEligible || (resolution && resolution.status === "APPROVED"));
    if (!allowed || result.status === "EXPORTED" || resolution && resolution.exported) continue;
    if (result.groupId) {
      const members = lines.filter(function (candidate) { return outcomes[candidate.invoiceLineId] && outcomes[candidate.invoiceLineId].groupId === result.groupId; });
      if (members.some(function (member) { return !resolutions[member.invoiceLineId] || resolutions[member.invoiceLineId].status !== "APPROVED"; })) continue;
    }
    const accrualIds = resolution && resolution.accrualIds && resolution.accrualIds.length
      ? resolution.accrualIds
      : [resolution && resolution.accrualId || result.matchedAccrualIds[0]];
    const expandedGroup = result.groupId && accrualIds.length > 1;
    for (const accrualId of accrualIds) {
      const accrual = accrualById.get(accrualId);
      if (!accrual) continue;
      const po = resolution && resolution.poReference || line.poReference || accrual.poReference;
      if (!po) continue;
      rows.push([
        accrual.jobId,
        accrual.hawb,
        accrual.mawb,
        po,
        accrual.vendor,
        accrual.chargeCode,
        accrual.currency,
        expandedGroup ? Number(accrual.accruedAmount).toFixed(2) : Number(line.lineAmount).toFixed(2),
        accrual.accrualReference,
        line.invoiceNumber,
        line.invoiceLineId,
        resolution && resolution.status === "APPROVED" ? "HUMAN_APPROVED" : result.status,
        resolution && resolution.status === "APPROVED" ? "YES" : "NO"
      ]);
    }
  }
  return rows.map(function (row) { return row.map(csvCell).join(","); }).join("\r\n") + "\r\n";
}
