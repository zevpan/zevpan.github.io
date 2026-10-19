import {
  COMMANDS,
  buildIllustrativeExport,
  getSimulatedAssist,
  interpretCommand,
  normalizeIdentifier,
  reconcileBatch
} from "./engine.js";
import { prepareFinanceImport } from "./file-import.js";

const $ = function (selector, parent) { return (parent || document).querySelector(selector); };
const $$ = function (selector, parent) { return Array.from((parent || document).querySelectorAll(selector)); };
const STORE_KEY = "fch-demo-state-v1";
const currencyFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let source = null;
let sourceMode = "synthetic";
let stagedImport = null;
let stagedFileMap = new Map();
let speechRecognition = null;
let reconciliationWorker = null;
let activeRunResolve = null;
let lineById = new Map();
let accrualById = new Map();
let state = {
  view: "work",
  filter: "REVIEW",
  query: "",
  page: 1,
  pageSize: 50,
  groupByVendor: false,
  sort: "priority",
  sourceTab: "invoices",
  sourceQuery: "",
  sourcePage: 1,
  selectedId: null,
  running: false,
  preferences: { model: "automatic", effort: "default" },
  run: null,
  runAt: null,
  decisions: {},
  exportedIds: [],
  audit: []
};
let toastTimer = null;

const filterDefinitions = [
  { id: "REVIEW", label: "Needs review" },
  { id: "ALL", label: "All lines" },
  { id: "MATCHED", label: "Matched" },
  { id: "GROUP_REVIEW", label: "Grouped" },
  { id: "MISSING_PO", label: "Missing PO" },
  { id: "VARIANCE", label: "Variances" },
  { id: "DUPLICATE", label: "Duplicates" }
];

const statusNames = {
  MATCHED: "Matched",
  MATCHED_WITH_TOLERANCE: "Matched · tolerance",
  GROUP_REVIEW: "Grouped · review",
  MISSING_PO: "Missing PO",
  PO_MISMATCH: "PO mismatch",
  AMOUNT_VARIANCE_OVER: "Invoice over",
  AMOUNT_VARIANCE_UNDER: "Invoice under",
  DUPLICATE: "Duplicate invoice",
  DUPLICATE_CW: "Duplicate accrual",
  INVALID_REFERENCE: "Invalid reference",
  IDENTIFIER_CONFLICT: "Reference conflict",
  AMBIGUOUS_MATCH: "Ambiguous",
  CURRENCY_MISMATCH: "Currency mismatch",
  TAX_VARIANCE: "Tax treatment",
  UNMATCHED_CHARGE: "Unmatched charge",
  UNRECOGNIZED_CODE: "Unmapped charge code",
  UNRECOGNIZED_VENDOR: "Unmapped vendor",
  MISSING_INFORMATION: "Missing information",
  EXPORTED: "Already exported",
  APPROVED: "Human approved",
  HELD: "On hold",
  REJECTED: "Rejected · follow up",
  ESCALATED: "Escalated",
  ANNOTATED: "Annotated",
  EXPORTED_LOCAL: "Exported locally"
};

const recommendedActions = {
  GROUP_REVIEW: "Review the supporting accrual group, then approve the full group together.",
  MISSING_PO: "Confirm the purchase order from an authoritative source before approval.",
  PO_MISMATCH: "Resolve the PO conflict; do not substitute a different purchase order automatically.",
  AMOUNT_VARIANCE_OVER: "Compare the invoice and accrued value; document the accepted variance or hold it.",
  AMOUNT_VARIANCE_UNDER: "Check for split billing, missing charges or an accrual error.",
  DUPLICATE: "Confirm whether the later invoice line is a duplicate before marking it.",
  DUPLICATE_CW: "Choose the valid accrual only after checking the duplicated source entries.",
  INVALID_REFERENCE: "Correct the source reference or request a better invoice reference.",
  IDENTIFIER_CONFLICT: "Resolve which shipment identifier is authoritative before matching.",
  AMBIGUOUS_MATCH: "Compare candidates and select only the source record supported by evidence.",
  CURRENCY_MISMATCH: "Confirm currency and exchange-rate policy; no conversion was applied.",
  TAX_VARIANCE: "Confirm whether tax is included in the invoice and accrual values.",
  UNMATCHED_CHARGE: "Check whether the charge is absent from Accrue Cost or needs an approved mapping.",
  UNRECOGNIZED_CODE: "Review the vendor charge-code mapping; the system did not infer one.",
  UNRECOGNIZED_VENDOR: "Review supplier identity and set up an explicit vendor rule.",
  MISSING_INFORMATION: "Request or correct the required invoice data before reconciliation."
};

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value, currency) {
  if (value == null || value === "") return "Not available";
  return currencyFormat.format(Number(value)) + " " + String(currency || "");
}

function parseStored() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!saved || typeof saved !== "object") return null;
    return saved;
  } catch (_) {
    return null;
  }
}

const restored = parseStored();
if (restored) {
  state.decisions = restored.decisions || {};
  state.exportedIds = restored.exportedIds || [];
  state.audit = Array.isArray(restored.audit) ? restored.audit.slice(0, 150) : [];
  state.runAt = restored.runAt || null;
  state.groupByVendor = Boolean(restored.groupByVendor);
  state.preferences = Object.assign({ model: "automatic", effort: "default" }, restored.preferences || {});
  if (restored.completed) state.run = { restored: true };
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      completed: Boolean(state.run),
      runAt: state.runAt,
      decisions: state.decisions,
      exportedIds: state.exportedIds,
      audit: state.audit.slice(0, 150),
      groupByVendor: state.groupByVendor,
      preferences: state.preferences
    }));
  } catch (_) {
    toast("This browser could not save local demo decisions. Keep the tab open to retain them.");
  }
}

function toast(message) {
  const node = $("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { node.classList.remove("visible"); }, 3200);
}

function audit(type, title, detail, entity) {
  state.audit.unshift({
    at: new Date().toISOString(),
    type,
    title,
    detail,
    entity: entity || ""
  });
  state.audit = state.audit.slice(0, 150);
}

function decisionFor(id) {
  return state.decisions[id] || null;
}

function resultFor(id) {
  return state.run && state.run.outcomes ? state.run.outcomes[id] : null;
}

function displayStatus(id) {
  if (state.exportedIds.includes(id)) return "EXPORTED_LOCAL";
  const decision = decisionFor(id);
  if (decision && decision.status) return decision.status;
  const result = resultFor(id);
  return result ? result.status : "READY";
}

function isTerminalDecision(decision) {
  return Boolean(decision && (decision.status === "APPROVED" || decision.status === "DUPLICATE"));
}

function needsReview(id) {
  const result = resultFor(id);
  if (!result || !result.requiresHuman) return false;
  if (state.exportedIds.includes(id)) return false;
  return !isTerminalDecision(decisionFor(id));
}

function groupMembers(groupId) {
  if (!state.run || !groupId) return [];
  return source.invoices.filter(function (line) {
    const result = resultFor(line.invoiceLineId);
    return result && result.groupId === groupId;
  });
}

function isExportEligible(line) {
  const id = line.invoiceLineId;
  if (state.exportedIds.includes(id)) return false;
  const result = resultFor(id);
  const decision = decisionFor(id);
  if (!result || result.status === "EXPORTED") return false;
  if (result.exportEligible) return true;
  if (!decision || decision.status !== "APPROVED") return false;
  if (result.groupId) {
    const members = groupMembers(result.groupId);
    if (members.some(function (member) {
      const groupDecision = decisionFor(member.invoiceLineId);
      return !groupDecision || groupDecision.status !== "APPROVED";
    })) return false;
  }
  const selectedIds = decision.accrualIds && decision.accrualIds.length
    ? decision.accrualIds
    : [decision.accrualId];
  return selectedIds.every(function (id) {
    const accrual = accrualById.get(id);
    return Boolean(accrual && String(accrual.currency).toUpperCase() === String(line.currency).toUpperCase()
      && (decision.poReference || line.poReference || accrual.poReference));
  });
}

function getEligibleLines() {
  if (!state.run) return [];
  return source.invoices.filter(isExportEligible);
}

function unresolvedCount() {
  if (!state.run) return 0;
  return source.invoices.reduce(function (total, line) { return total + (needsReview(line.invoiceLineId) ? 1 : 0); }, 0);
}

function setView(view) {
  state.view = view;
  if (view === "exceptions") state.filter = "REVIEW";
  if (view === "work" && !state.run) state.filter = "REVIEW";
  if (view !== "sources") state.page = 1;
  renderApp();
}

function displayTime(iso) {
  if (!iso) return "Not available";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch (_) {
    return iso;
  }
}

function updateSourceFiles() {
  const meta = source.metadata;
  const fileData = [
    ["Vendor invoices", meta.invoiceLineCount],
    ["HAWB report", meta.hawbRecordCount],
    ["MAWB report", meta.mawbRecordCount],
    ["Accrue Cost", meta.accrueCostRecordCount]
  ];
  $("#source-files").innerHTML = fileData.map(function (item) {
    return '<div class="source-file"><strong>' + escapeHtml(item[0]) + '</strong><small>' + Number(item[1]).toLocaleString() + ' records</small></div>';
  }).join("");
  const mode = $("#data-mode-pill");
  if (mode) mode.innerHTML = '<span></span>' + (sourceMode === "imported" ? "Local import · browser only" : "Simulation · synthetic data");
  const batchLabel = $("#batch-label");
  if (batchLabel) batchLabel.textContent = sourceMode === "imported" ? "LOCAL IMPORT · REVIEW" : "BATCH FCH-2026-10 · IMPORT REVIEW";
  const batchDate = $("#batch-date");
  if (batchDate) batchDate.textContent = sourceMode === "imported" ? "Files stay in this browser" : "Data through 14 Oct 2026";
  const provenance = $("#source-provenance");
  if (provenance) provenance.textContent = sourceMode === "imported" ? "Local source files. Not uploaded or connected to CargoWise." : "Source schemas are illustrative; all records are synthetic.";
  $("#batch-state").textContent = state.run ? "Reconciliation complete" : "Source batch ready";
}

function renderComposerSettings() {
  const model = $("#model-select");
  const effort = $("#effort-select");
  if (model && model.value !== state.preferences.model) model.value = state.preferences.model;
  if (effort && effort.value !== state.preferences.effort) effort.value = state.preferences.effort;
  const submitLabel = $("#command-submit-label");
  if (submitLabel) submitLabel.textContent = state.running ? "Stop" : "Start";
  const submit = $("#command-submit");
  if (submit) {
    submit.classList.toggle("button-primary", !state.running);
    submit.classList.toggle("button-danger", state.running);
    submit.setAttribute("aria-label", state.running ? "Stop the current reconciliation" : "Start the requested finance task");
  }
}

function renderStagedImport(result) {
  const panel = $("#staged-import");
  const feedback = $("#import-feedback");
  if (!panel || !feedback) return;
  if (!result) {
    panel.hidden = true;
    panel.innerHTML = "";
    feedback.textContent = "";
    return;
  }
  panel.hidden = false;
  const files = result.staged.map(function (item) {
    return '<div class="staged-file"><span class="staged-file-icon">✓</span><span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.type) + ' · ' + Number(item.count).toLocaleString() + ' records</small></span></div>';
  }).join("");
  const missing = result.missing && result.missing.length
    ? '<p class="import-hint">Add the remaining source files: ' + result.missing.map(function (type) { return escapeHtml(type); }).join(", ") + '.</p>'
    : '<p class="import-hint">Files are parsed in this browser. Nothing is uploaded to an external service.</p>';
  panel.innerHTML = '<div class="staged-files">' + files + '</div>' + missing + (result.complete
    ? '<button type="button" class="button button-primary" data-action="load-import">Use this local batch</button>'
    : '<button type="button" class="button" data-action="clear-import">Clear staged files</button>');
  feedback.textContent = result.complete ? "Batch is ready to load after confirmation." : "Source files recognized. Add the missing CSV sources or choose a complete JSON batch.";
}

function renderBackupControl() {
  const panel = $("#local-backup-control");
  if (!panel) return;
  const backupId = localStorage.getItem("fch-latest-backup-id");
  panel.hidden = !backupId;
  panel.innerHTML = backupId
    ? '<span>Previous batch and review decisions are backed up in this browser.</span><button type="button" class="text-button" data-action="restore-backup">Restore previous batch</button>'
    : "";
}

function renderSuggestions() {
  const suggested = [COMMANDS[0], COMMANDS[1], COMMANDS[2], COMMANDS[8]];
  $("#command-suggestions").innerHTML = suggested.map(function (command) {
    return '<button type="button" class="suggestion" data-command="' + escapeHtml(command.label) + '">' + escapeHtml(command.label) + '</button>';
  }).join("");
}

function renderRunBanner() {
  const banner = $("#run-banner");
  if (!source) {
    banner.innerHTML = '<div class="loading-state"><span class="loader"></span><div><strong>Loading source data</strong><small>Waiting for the synthetic finance batch.</small></div></div>';
    return;
  }
  if (state.running) {
    banner.innerHTML = '<div class="loading-state"><span class="loader"></span><div><strong>Reconciliation is running locally</strong><small>Validating source fields, normalizing references and comparing invoice lines in a cancellable background worker.</small></div></div>';
    return;
  }
  if (!state.run) {
    banner.innerHTML =
      '<div class="ready-state"><div class="ready-copy"><span class="ready-icon">✓</span><div><strong>Four source files loaded · batch is ready to reconcile</strong><small>' +
      Number(source.metadata.invoiceLineCount).toLocaleString() + ' invoice lines · no external systems or model APIs are connected.</small></div></div>' +
      '<button class="button button-primary" data-action="run">Reconcile full backlog <span>→</span></button></div>';
    return;
  }
  const metrics = state.run.metrics;
  const auditSteps = state.run.audit || [
    { step: "Input validation", detail: "Source records checked locally." },
    { step: "Reference normalization", detail: "Shipment identifiers indexed." },
    { step: "Deterministic matching", detail: "Reconciliation rules applied." },
    { step: "Exception routing", detail: "Finance decisions isolated." }
  ];
  banner.innerHTML =
    '<div class="run-complete"><div class="run-complete-head"><strong>Reconciliation completed · ' +
    Number(metrics.invoiceLines).toLocaleString() + ' invoice lines evaluated</strong><small>Rule-engine duration ' +
    Number(metrics.elapsedMs).toLocaleString() + ' ms · ' + escapeHtml(displayTime(state.runAt)) + '</small></div><div class="run-steps">' +
    auditSteps.map(function (step) {
      return '<div class="run-step"><span class="step-check">✓</span><div><strong>' + escapeHtml(step.step) + '</strong><small>' + escapeHtml(step.detail) + '</small></div></div>';
    }).join("") + '</div></div>';
}

function renderSummary() {
  if (!state.run) return "";
  const metrics = state.run.metrics;
  const eligible = getEligibleLines().length;
  return '<div class="summary-strip" aria-label="Reconciliation summary">' +
    '<span class="summary-label">Batch result</span>' +
    '<span class="summary-item ok"><strong>' + Number(metrics.matched).toLocaleString() + '</strong> auto-matched</span>' +
    '<span class="summary-item attention"><strong>' + unresolvedCount().toLocaleString() + '</strong> need attention</span>' +
    '<span class="summary-item"><strong>' + Number((metrics.counts.GROUP_REVIEW || 0)).toLocaleString() + '</strong> grouped · approval required</span>' +
    '<span class="summary-item"><strong>' + eligible.toLocaleString() + '</strong> eligible for export</span>' +
    '<span class="summary-item done"><strong>' + Number(metrics.alreadyExported).toLocaleString() + '</strong> already exported</span>' +
  '</div>';
}

function filterCount(filter) {
  if (!state.run) return 0;
  if (filter === "ALL") return source.invoices.length;
  if (filter === "REVIEW") return unresolvedCount();
  if (filter === "MATCHED") return source.invoices.filter(function (line) {
    const result = resultFor(line.invoiceLineId);
    return result && (result.status === "MATCHED" || result.status === "MATCHED_WITH_TOLERANCE");
  }).length;
  if (filter === "VARIANCE") return source.invoices.filter(function (line) {
    return ["AMOUNT_VARIANCE_OVER", "AMOUNT_VARIANCE_UNDER", "TAX_VARIANCE"].includes((resultFor(line.invoiceLineId) || {}).status);
  }).length;
  if (filter === "DUPLICATE") return source.invoices.filter(function (line) {
    return ["DUPLICATE", "DUPLICATE_CW"].includes((resultFor(line.invoiceLineId) || {}).status);
  }).length;
  return source.invoices.filter(function (line) { return (resultFor(line.invoiceLineId) || {}).status === filter; }).length;
}

function statusForFilter(line) {
  const result = resultFor(line.invoiceLineId);
  const status = result ? result.status : "";
  if (state.filter === "ALL") return true;
  if (state.filter === "REVIEW") return needsReview(line.invoiceLineId);
  if (state.filter === "MATCHED") return status === "MATCHED" || status === "MATCHED_WITH_TOLERANCE";
  if (state.filter === "VARIANCE") return ["AMOUNT_VARIANCE_OVER", "AMOUNT_VARIANCE_UNDER", "TAX_VARIANCE"].includes(status);
  if (state.filter === "DUPLICATE") return status === "DUPLICATE" || status === "DUPLICATE_CW";
  return status === state.filter;
}

function priorityRank(status) {
  const order = {
    IDENTIFIER_CONFLICT: 1, INVALID_REFERENCE: 2, CURRENCY_MISMATCH: 3, PO_MISMATCH: 4,
    AMBIGUOUS_MATCH: 5, MISSING_INFORMATION: 6, UNRECOGNIZED_VENDOR: 7,
    UNRECOGNIZED_CODE: 8, DUPLICATE_CW: 9, DUPLICATE: 10, MISSING_PO: 11,
    AMOUNT_VARIANCE_OVER: 12, AMOUNT_VARIANCE_UNDER: 13, TAX_VARIANCE: 14,
    GROUP_REVIEW: 15, UNMATCHED_CHARGE: 16
  };
  return order[status] || 99;
}

function filteredLines() {
  if (!state.run) return [];
  const query = state.query.trim().toLowerCase();
  let list = source.invoices.filter(function (line) {
    if (!statusForFilter(line)) return false;
    if (!query) return true;
    const result = resultFor(line.invoiceLineId);
    const haystack = [
      line.vendor, line.invoiceNumber, line.invoiceLineId, line.jobReference,
      line.hawbReference, line.mawbReference, line.poReference, line.chargeDescription,
      line.vendorChargeCode, statusNames[displayStatus(line.invoiceLineId)], result && result.reason
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
  list.sort(function (left, right) {
    const leftResult = resultFor(left.invoiceLineId) || {};
    const rightResult = resultFor(right.invoiceLineId) || {};
    if (state.groupByVendor && left.vendor !== right.vendor) return String(left.vendor).localeCompare(String(right.vendor));
    if (state.sort === "variance") return Math.abs(Number(rightResult.variance || 0)) - Math.abs(Number(leftResult.variance || 0));
    if (state.sort === "date") return String(left.invoiceDate).localeCompare(String(right.invoiceDate));
    const rank = priorityRank(leftResult.status) - priorityRank(rightResult.status);
    if (rank !== 0) return rank;
    const variance = Math.abs(Number(rightResult.variance || 0)) - Math.abs(Number(leftResult.variance || 0));
    if (variance !== 0) return variance;
    return String(left.invoiceNumber).localeCompare(String(right.invoiceNumber));
  });
  return list;
}

function relatedAccrual(line, result) {
  const ids = result && (result.matchedAccrualIds.length ? result.matchedAccrualIds : result.candidateAccrualIds);
  return ids && ids.length ? accrualById.get(ids[0]) : null;
}

function renderTableRow(line) {
  const id = line.invoiceLineId;
  const result = resultFor(id);
  const rawStatus = result ? result.status : "READY";
  const displayed = displayStatus(id);
  const accrual = relatedAccrual(line, result);
  const refs = [line.hawbReference, line.mawbReference].filter(Boolean).join(" · ") || line.jobReference || "Reference missing";
  const invoiceAmount = line.lineAmount == null ? "Missing amount" : money(line.lineAmount, line.currency);
  const accrualValue = accrual ? money(accrual.accruedAmount, accrual.currency) : "Not available";
  return '<tr class="data-row ' + (state.selectedId === id ? "selected" : "") + '" data-line-id="' + escapeHtml(id) + '">' +
    '<td><span class="invoice-primary">' + escapeHtml(line.invoiceNumber || "(invoice number missing)") + '</span><span class="invoice-secondary">' + escapeHtml(id) + ' · ' + escapeHtml(line.vendor) + '</span></td>' +
    '<td>' + escapeHtml(refs) + '</td>' +
    '<td><span class="invoice-primary">' + escapeHtml(line.vendorChargeCode) + '</span><span class="invoice-secondary">' + escapeHtml(line.chargeDescription) + '</span></td>' +
    '<td class="amount">' + escapeHtml(invoiceAmount) + '</td>' +
    '<td class="amount">' + escapeHtml(accrualValue) + (result && result.variance != null ? '<span class="amount-sub">Δ ' + escapeHtml(money(result.variance, line.currency)) + '</span>' : "") + '</td>' +
    '<td><span class="status-badge status-' + escapeHtml(displayed === "EXPORTED_LOCAL" ? "EXPORTED" : displayed) + '" title="' + escapeHtml(rawStatus) + '">' + escapeHtml(statusNames[displayed] || statusNames[rawStatus] || displayed) + '</span></td>' +
    '</tr>';
}

function renderQueueRows() {
  const body = $("#queue-body");
  if (!body) return;
  const list = filteredLines();
  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  state.page = Math.max(1, Math.min(state.page, pageCount));
  const start = (state.page - 1) * state.pageSize;
  const pageRows = list.slice(start, start + state.pageSize);
  if (!pageRows.length) {
    body.innerHTML = '<tr><td colspan="6"><div class="empty-state">No records match this view. Change the filter or search term.</div></td></tr>';
  } else if (state.groupByVendor) {
    let priorVendor = "";
    body.innerHTML = pageRows.map(function (line) {
      let divider = "";
      if (line.vendor !== priorVendor) {
        priorVendor = line.vendor;
        divider = '<tr class="vendor-divider"><td colspan="6">' + escapeHtml(line.vendor) + '</td></tr>';
      }
      return divider + renderTableRow(line);
    }).join("");
  } else {
    body.innerHTML = pageRows.map(renderTableRow).join("");
  }
  const footer = $("#queue-footer");
  if (footer) {
    const first = total ? start + 1 : 0;
    const last = Math.min(start + state.pageSize, total);
    footer.innerHTML = '<span>Showing ' + first + '–' + last + ' of ' + total.toLocaleString() + ' lines</span><div class="pagination">' +
      '<button class="button button-small" data-action="page-prev" ' + (state.page <= 1 ? "disabled" : "") + '>Previous</button>' +
      '<span>Page ' + state.page + ' / ' + pageCount + '</span>' +
      '<button class="button button-small" data-action="page-next" ' + (state.page >= pageCount ? "disabled" : "") + '>Next</button></div>';
  }
  const queueCount = $("#queue-count");
  if (queueCount) queueCount.textContent = total.toLocaleString() + (state.filter === "REVIEW" ? " open for review" : " records");
}

function renderFilterChips() {
  return filterDefinitions.map(function (filter) {
    return '<button class="filter-chip ' + (state.filter === filter.id ? "active" : "") + '" data-filter="' + filter.id + '">' +
      escapeHtml(filter.label) + ' <span>' + filterCount(filter.id).toLocaleString() + '</span></button>';
  }).join("");
}

function renderDecisionControls(line, result) {
  const decision = decisionFor(line.invoiceLineId);
  if (decision && (decision.status === "APPROVED" || decision.status === "DUPLICATE")) {
    return '<div class="manual-banner"><strong>' + escapeHtml(statusNames[decision.status]) + '.</strong> ' +
      escapeHtml(decision.note || "Local review decision recorded.") + '<br>No external accounting system was changed.' +
      '<div class="action-row"><button class="button button-small" data-action="reopen">Reopen for review</button></div></div>';
  }
  const candidateIds = Array.from(new Set([].concat(result.candidateAccrualIds || [], result.matchedAccrualIds || [])));
  const selectedCandidate = candidateIds.map(function (id) { return accrualById.get(id); }).find(Boolean) || null;
  const group = result.status === "GROUP_REVIEW";
  const cannotApprove = ["INVALID_REFERENCE", "IDENTIFIER_CONFLICT", "UNRECOGNIZED_VENDOR", "UNRECOGNIZED_CODE", "MISSING_INFORMATION", "UNMATCHED_CHARGE", "CURRENCY_MISMATCH"].includes(result.status);
  const canApprove = candidateIds.length > 0 && !cannotApprove;
  const reasonNote = ["GROUP_REVIEW", "MISSING_PO", "PO_MISMATCH", "AMOUNT_VARIANCE_OVER", "AMOUNT_VARIANCE_UNDER", "TAX_VARIANCE", "AMBIGUOUS_MATCH", "DUPLICATE_CW"].includes(result.status);
  let candidateOptionHtml = '<option value="">Select accrual candidate</option>';
  candidateIds.forEach(function (id) {
    const candidate = accrualById.get(id);
    if (!candidate) return;
    candidateOptionHtml += '<option value="' + escapeHtml(id) + '">' + escapeHtml(id) + ' · ' +
      escapeHtml(money(candidate.accruedAmount, candidate.currency)) + ' · PO ' + escapeHtml(candidate.poReference || "missing") + '</option>';
  });
  let candidateControl = "";
  if (candidateIds.length) {
    candidateControl = group
      ? '<div class="manual-banner">Grouped candidate set is fixed by the reconciliation evidence. Approval will include the whole group.</div>'
      : '<label class="detail-field"><small>Selected accrual</small><select id="chosen-candidate" class="source-select" style="width:100%;margin-top:5px">' + candidateOptionHtml + '</select></label>';
  } else {
    candidateControl = '<div class="manual-banner">No defensible source candidate was identified. Corrected source records or policy mapping are needed before matching.</div>';
  }
  const showPo = result.status === "MISSING_PO" || result.status === "PO_MISMATCH";
  const poControl = showPo
    ? '<div class="detail-section"><h3>Purchase-order reference <span>human confirmation</span></h3><input class="po-field" id="resolution-po" type="text" placeholder="Enter or confirm PO reference" value="' + escapeHtml(line.poReference || "") + '"><button class="text-button" data-action="use-candidate-po">Use selected accrual PO</button></div>'
    : "";
  const label = group ? "Approve grouped match" : "Approve selected match";
  return '<div class="detail-section"><h3>Finance decision <span>local simulation</span></h3>' +
    candidateControl + poControl +
    '<label class="detail-section"><span class="sr-only">Decision note</span><textarea id="decision-note" class="note-field" rows="2" placeholder="' + (reasonNote ? "Required: record the evidence or variance decision…" : "Optional note for the audit trail…") + '"></textarea></label>' +
    '<div class="action-row">' +
    '<button class="button button-primary button-small" data-action="approve" ' + (canApprove ? "" : "disabled") + '>' + label + '</button>' +
    '<button class="button button-small" data-action="mark-duplicate">Mark duplicate</button>' +
    '<button class="button button-small" data-action="hold">Hold</button>' +
    '</div><div class="action-row">' +
    '<button class="button button-small" data-action="reject">Reject candidate</button>' +
    '<button class="button button-small" data-action="escalate">Escalate</button>' +
    '<button class="button button-small" data-action="annotate">Add note</button>' +
    '</div>' +
    '<div class="manual-banner">Approval records your judgement in this browser. It does not post, update CargoWise or send data externally.</div></div>';
}

function renderInspector() {
  const holder = $("#inspector-content");
  if (!holder) return;
  const line = lineById.get(state.selectedId);
  const result = resultFor(state.selectedId);
  if (!line || !result) {
    holder.innerHTML = '<div class="inspector-empty">Select an invoice line to review source fields, matching evidence, candidate accruals and available decisions.</div>';
    return;
  }
  const display = displayStatus(line.invoiceLineId);
  const ids = Array.from(new Set([].concat(result.candidateAccrualIds || [], result.matchedAccrualIds || [])));
  const candidates = ids.map(function (id) { return accrualById.get(id); }).filter(Boolean);
  const assist = getSimulatedAssist(line, result, source.mappingRules);
  const evidence = result.evidence && result.evidence.length
    ? '<ul class="evidence-list">' + result.evidence.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join("") + '</ul>'
    : '<div class="reason-box">No matching evidence was returned.</div>';
  const candidateHtml = candidates.length ? candidates.map(function (candidate) {
    return '<div class="candidate-card"><div class="candidate-line"><span>' + escapeHtml(candidate.accrualReference) + '</span><span>' + escapeHtml(money(candidate.accruedAmount, candidate.currency)) + '</span></div>' +
      '<div class="candidate-meta">Job ' + escapeHtml(candidate.jobId) + ' · PO ' + escapeHtml(candidate.poReference || "missing") + ' · ' + escapeHtml(candidate.status) + '</div></div>';
  }).join("") : '<div class="reason-box">No same-vendor, mapped-charge accrual candidate was selected.</div>';
  const decision = decisionFor(line.invoiceLineId);
  const recorded = decision && !["APPROVED", "DUPLICATE"].includes(decision.status)
    ? '<div class="manual-banner">Current disposition: <strong>' + escapeHtml(statusNames[decision.status] || decision.status) + '</strong>' + (decision.note ? '<br>' + escapeHtml(decision.note) : "") + '</div>'
    : "";
  const assistHtml = assist
    ? '<div class="recommendation"><div class="recommendation-label">Simulated AI assist · not applied</div><p>' + escapeHtml(assist.suggestion) + '</p><div class="boundary-note">' + escapeHtml(assist.boundary || "No mapping or accounting action has been changed.") + '</div></div>'
    : "";
  holder.innerHTML =
    '<div class="detail-id">' + escapeHtml(line.invoiceLineId) + ' · LINE DETAIL</div>' +
    '<h3 class="detail-title">' + escapeHtml(line.invoiceNumber || "Invoice number missing") + '</h3>' +
    '<p class="detail-vendor">' + escapeHtml(line.vendor) + ' · ' + escapeHtml(line.invoiceDate || "date missing") + '</p>' +
    '<span class="status-badge status-' + escapeHtml(display === "EXPORTED_LOCAL" ? "EXPORTED" : display) + '">' + escapeHtml(statusNames[display] || statusNames[result.status] || display) + '</span>' +
    '<div class="detail-grid" style="margin-top:10px">' +
      '<div class="detail-field"><small>Invoice amount</small><strong>' + escapeHtml(money(line.lineAmount, line.currency)) + '</strong></div>' +
      '<div class="detail-field"><small>PO reference</small><strong>' + escapeHtml(line.poReference || "Missing") + '</strong></div>' +
      '<div class="detail-field"><small>Job / HAWB</small><strong>' + escapeHtml(line.jobReference || "Not available") + ' / ' + escapeHtml(line.hawbReference || "Not available") + '</strong></div>' +
      '<div class="detail-field"><small>MAWB / charge</small><strong>' + escapeHtml(line.mawbReference || "Not available") + ' / ' + escapeHtml(line.vendorChargeCode) + '</strong></div>' +
    '</div>' +
    '<div class="detail-section"><h3>Why the engine routed it</h3><div class="reason-box"><strong>' + escapeHtml(statusNames[result.status] || result.status) + ':</strong> ' + escapeHtml(result.reason) + '</div></div>' +
    '<div class="detail-section"><h3>Evidence checked</h3>' + evidence + '</div>' +
    '<div class="detail-section"><h3>Candidate CargoWise accruals <span>' + candidates.length + '</span></h3>' + candidateHtml + '</div>' +
    (result.variance != null ? '<div class="detail-section"><h3>Calculated variance</h3><div class="reason-box">' + escapeHtml(money(result.variance, line.currency)) + ' · Source amounts are unchanged.</div></div>' : "") +
    '<div class="recommendation"><div class="recommendation-label">Recommended next action</div><p>' + escapeHtml(recommendedActions[result.status] || "Review the records and decide whether to approve or hold.") + '</p></div>' +
    assistHtml + recorded + renderDecisionControls(line, result);
}

function renderWorkView() {
  const pageTitle = state.view === "exceptions" ? "Resolve finance exceptions" : "Reconcile vendor invoices";
  const pageSubtitle = state.view === "exceptions"
    ? "Work through evidence-backed exceptions; uncertain and consequential decisions stay with Finance."
    : "Inspect the batch result, review blocked lines and stage only validated records.";
  $("#page-title").textContent = pageTitle;
  $("#page-subtitle").textContent = pageSubtitle;
  if (!state.run) {
    $("#workspace-content").innerHTML = renderIntake();
    return;
  }
  $("#workspace-content").innerHTML = renderSummary() +
    '<div class="workspace-grid"><section class="queue-panel" aria-label="Invoice work queue">' +
      '<div class="queue-toolbar"><div class="queue-title"><h2>' + (state.view === "exceptions" ? "Exception queue" : "Batch work queue") + '</h2><span id="queue-count"></span></div>' +
        '<div class="queue-controls"><input id="queue-search" class="search-input" type="search" value="' + escapeHtml(state.query) + '" placeholder="Search invoice, vendor, HAWB…" aria-label="Search invoice queue">' +
        '<select id="sort-select" class="source-select" aria-label="Sort invoice queue"><option value="priority" ' + (state.sort === "priority" ? "selected" : "") + '>Priority</option><option value="variance" ' + (state.sort === "variance" ? "selected" : "") + '>Largest variance</option><option value="date" ' + (state.sort === "date" ? "selected" : "") + '>Invoice date</option></select></div></div>' +
      '<div class="filter-row">' + renderFilterChips() + '</div>' +
      '<div class="table-scroll"><table class="work-table"><thead><tr><th>Invoice / vendor</th><th>Shipment references</th><th>Charge</th><th>Invoice value</th><th>Accrual value</th><th>Disposition</th></tr></thead><tbody id="queue-body"></tbody></table></div>' +
      '<div class="table-footer" id="queue-footer"></div></section>' +
      '<aside class="inspector" aria-label="Reconciliation detail"><div class="inspector-head"><div><h2>Reconciliation inspector</h2><p>Source evidence · decision · audit</p></div><button class="text-button" data-action="toggle-group">' + (state.groupByVendor ? "Ungroup" : "Group vendor") + '</button></div><div class="inspector-body" id="inspector-content"></div></aside></div>';
  renderQueueRows();
  renderInspector();
}

function renderIntake() {
  const meta = source.metadata;
  const sourceCards = [
    ["Vendor Invoice Lines", meta.invoiceLineCount, "Invoice-level charges and vendor identifiers"],
    ["CargoWise HAWB Report", meta.hawbRecordCount, "House shipment to Job ID and MAWB links"],
    ["CargoWise MAWB Report", meta.mawbRecordCount, "Master shipment groups and carrier context"],
    ["CargoWise Accrue Cost", meta.accrueCostRecordCount, "Vendor, charge, PO, amount and export state"]
  ];
  return '<div class="content-panel"><h2>Batch intake · source records ready</h2><p>Inspect the raw demo records, then run the same reconciliation logic used by the workbench.</p>' +
    '<div class="source-tabs">' + sourceCards.map(function (item) {
      return '<button class="source-tab" data-view="sources">' + escapeHtml(item[0]) + '</button>';
    }).join("") + '</div>' +
    '<div class="source-table-wrap"><div class="grid source-cards">' + sourceCards.map(function (item) {
      return '<div class="detail-field"><small>' + escapeHtml(item[0]) + '</small><strong>' + Number(item[1]).toLocaleString() + ' records</strong><small>' + escapeHtml(item[2]) + '</small></div>';
    }).join("") + '</div></div>' +
    '<div class="export-warning"><strong>Control boundary:</strong> identifier normalization, configured charge-code mapping, amount comparison, duplicate checks and variance routing are deterministic. AI assistance is simulated and cannot approve or invent a financial match.</div>' +
    '<div class="action-row"><button class="button button-primary" data-action="run">Run reconciliation on 4,000 lines →</button><button class="button" data-view="sources">Inspect source samples</button></div></div>';
}

function sourceDefinition() {
  const tabs = [
    { id: "invoices", label: "Vendor Invoice Lines", rows: source.invoices, fields: ["invoiceLineId", "vendor", "invoiceNumber", "invoiceDate", "jobReference", "hawbReference", "mawbReference", "poReference", "vendorChargeCode", "currency", "lineAmount"] },
    { id: "hawb", label: "CargoWise HAWB", rows: source.hawbReport, fields: ["hawb", "jobId", "mawb", "origin", "destination", "pieces", "grossKg", "status"] },
    { id: "mawb", label: "CargoWise MAWB", rows: source.mawbReport, fields: ["mawb", "carrier", "origin", "destination", "houseShipmentCount", "status"] },
    { id: "accruals", label: "Accrue Cost", rows: source.accrueCost, fields: ["accrualReference", "jobId", "hawb", "mawb", "poReference", "vendor", "chargeCode", "currency", "accruedAmount", "status"] }
  ];
  return tabs.find(function (tab) { return tab.id === state.sourceTab; }) || tabs[0];
}

function renderSourceView() {
  $("#page-title").textContent = "Source records";
  $("#page-subtitle").textContent = "Inspect representative rows from the synthetic input bundle; source schemas are illustrative.";
  const definition = sourceDefinition();
  const query = state.sourceQuery.trim().toLowerCase();
  const rows = definition.rows.filter(function (row) {
    return !query || definition.fields.map(function (field) { return row[field]; }).join(" ").toLowerCase().includes(query);
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.sourcePage = Math.min(state.sourcePage, pageCount);
  const start = (state.sourcePage - 1) * state.pageSize;
  const shown = rows.slice(start, start + state.pageSize);
  const tableRows = shown.map(function (row) {
    return "<tr>" + definition.fields.map(function (field) {
      return "<td>" + escapeHtml(row[field] == null ? "Not available" : row[field]) + "</td>";
    }).join("") + "</tr>";
  }).join("");
  $("#workspace-content").innerHTML = '<section class="content-panel"><div class="export-head"><div><h2>Loaded source files</h2><p>Backlog snapshot · generated with a fixed seed · original operational records were not used.</p></div><span class="status-badge">Synthetic · seed ' + escapeHtml(source.metadata.seed) + '</span></div>' +
    '<div class="source-tabs">' + [
      ["invoices", "Vendor invoices (" + Number(source.invoices.length).toLocaleString() + ")"],
      ["hawb", "HAWB (" + Number(source.hawbReport.length).toLocaleString() + ")"],
      ["mawb", "MAWB (" + Number(source.mawbReport.length).toLocaleString() + ")"],
      ["accruals", "Accrue Cost (" + Number(source.accrueCost.length).toLocaleString() + ")"]
    ].map(function (tab) { return '<button class="source-tab ' + (state.sourceTab === tab[0] ? "active" : "") + '" data-source-tab="' + tab[0] + '">' + escapeHtml(tab[1]) + '</button>'; }).join("") + '</div>' +
    '<div class="queue-toolbar" style="padding-left:0;padding-right:0;border:0"><div class="queue-title"><h2>' + escapeHtml(definition.label) + '</h2><span>' + rows.length.toLocaleString() + ' records</span></div><div class="queue-controls"><input id="source-search" class="search-input" type="search" value="' + escapeHtml(state.sourceQuery) + '" placeholder="Search source values…" aria-label="Search source records"></div></div>' +
    '<div class="table-scroll export-table-wrap"><table class="source-table"><thead><tr>' + definition.fields.map(function (field) { return "<th>" + escapeHtml(field) + "</th>"; }).join("") + '</tr></thead><tbody>' +
    (tableRows || '<tr><td colspan="10"><div class="empty-state">No source rows match the search.</div></td></tr>') +
    '</tbody></table></div><div class="table-footer"><span>Showing ' + (rows.length ? start + 1 : 0) + '–' + Math.min(start + state.pageSize, rows.length) + ' of ' + rows.length.toLocaleString() + '</span><div class="pagination"><button class="button button-small" data-action="source-prev" ' + (state.sourcePage <= 1 ? "disabled" : "") + '>Previous</button><span>Page ' + state.sourcePage + ' / ' + pageCount + '</span><button class="button button-small" data-action="source-next" ' + (state.sourcePage >= pageCount ? "disabled" : "") + '>Next</button></div></div>' +
    '<div class="export-warning">The displayed fields are proposed simulation schemas. They are not represented as the official CargoWise report or EDI specifications.</div></section>';
}

function exportRowsCount(csv) {
  const nonempty = csv.trim().split(/\r?\n/);
  return Math.max(0, nonempty.length - 1);
}

function renderExportView() {
  $("#page-title").textContent = "Review export batch";
  $("#page-subtitle").textContent = "Only validated matches and explicitly approved resolutions can be staged. Final file release remains a human action.";
  const eligible = getEligibleLines();
  const csv = state.run ? buildIllustrativeExport(source.invoices, state.run.outcomes, accrualById, state.decisions) : "";
  const rowCount = exportRowsCount(csv);
  const preview = eligible.slice(0, 25);
  const previewRows = preview.map(function (line) {
    const result = resultFor(line.invoiceLineId);
    const decision = decisionFor(line.invoiceLineId);
    const accrualId = decision && decision.accrualIds && decision.accrualIds.length ? decision.accrualIds[0] : decision && decision.accrualId || result.matchedAccrualIds[0];
    const accrual = accrualById.get(accrualId);
    return '<tr><td>' + escapeHtml(line.invoiceNumber) + '</td><td>' + escapeHtml(line.invoiceLineId) + '</td><td>' + escapeHtml(line.jobReference) + '</td><td>' + escapeHtml(accrual && accrual.poReference || line.poReference || "Not available") + '</td><td class="amount">' + escapeHtml(money(line.lineAmount, line.currency)) + '</td><td><span class="status-badge">' + escapeHtml(decision && decision.status === "APPROVED" ? "Human approved" : statusNames[result.status] || result.status) + '</span></td></tr>';
  }).join("");
  const exportDone = eligible.length === 0 && state.exportedIds.length > 0;
  $("#workspace-content").innerHTML = '<section class="content-panel">' +
    '<div class="export-head"><div><h2>' + (state.run ? "Illustrative CargoWise-style import mapping" : "Reconciliation has not run") + '</h2><p>' +
    (state.run ? "Preview of eligible lines. One invoice line may expand to multiple export rows for an approved grouped accrual." : "Run reconciliation before preparing an export.") + '</p></div>' +
    (state.run ? '<span class="status-badge">' + eligible.length.toLocaleString() + ' source lines · ' + rowCount.toLocaleString() + ' mapped rows</span>' : "") + '</div>' +
    (state.run ? '<div class="export-warning"><strong>Illustrative only:</strong> no official CargoWise EDI template was provided or publicly verified for this prototype. The CSV mapping is a demo artifact, not production-compatible. No posting or external file upload occurs.</div>' : "") +
    (state.run && eligible.length ? '<label class="export-check"><input id="export-attestation" type="checkbox"><span>I reviewed the eligible records and understand this is a synthetic, illustrative file. Releasing it downloads locally and does not post to CargoWise.</span></label>' : "") +
    (state.run && eligible.length ? '<button class="button button-primary" data-action="release-export" disabled>Approve & download illustrative CSV ↓</button>' : "") +
    (exportDone ? '<div class="ready-state" style="margin:12px 0"><div class="ready-copy"><span class="ready-icon">✓</span><div><strong>All eligible lines in this local batch have already been exported.</strong><small>Reset the demo to replay; this does not affect an external system.</small></div></div></div>' : "") +
    (state.run && eligible.length ? '<div class="table-scroll export-table-wrap" style="margin-top:13px"><table class="source-table"><thead><tr><th>Invoice</th><th>Source line</th><th>Job ID</th><th>PO</th><th>Amount</th><th>Validation</th></tr></thead><tbody>' + previewRows + '</tbody></table></div><div class="table-footer"><span>' + Math.min(eligible.length, 25) + ' of ' + eligible.length.toLocaleString() + ' eligible invoice lines shown · file output contains ' + rowCount.toLocaleString() + ' rows</span><span>Release requires approval</span></div>' : "") +
    '<div class="export-warning">Illustrative column mapping: Job ID, HAWB, MAWB, PO, vendor, charge code, currency, amount, accrual reference and source invoice lineage. Validate the official target schema before any real implementation.</div></section>';
}

function renderAuditView() {
  $("#page-title").textContent = "Decision history";
  $("#page-subtitle").textContent = "A local audit trail of processing runs, Finance decisions and generated files.";
  const items = state.audit.map(function (item) {
    return '<div class="history-item"><div class="history-time">' + escapeHtml(displayTime(item.at)) + '</div><div class="history-copy"><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.detail) + (item.entity ? " · " + escapeHtml(item.entity) : "") + '</small></div><span class="history-type">' + escapeHtml(item.type) + '</span></div>';
  }).join("");
  $("#workspace-content").innerHTML = '<section class="content-panel"><h2>Activity and decision log</h2><p>Events are stored in this browser only. The log is not written to a finance system.</p>' +
    (items ? '<div class="history-list">' + items + '</div>' : '<div class="empty-banner">No reconciliation or review decisions have been recorded yet.</div>') +
    '</section>';
}

function renderApp() {
  if (source) updateSourceFiles();
  renderComposerSettings();
  renderBackupControl();
  renderRunBanner();
  const runMetrics = state.run && state.run.metrics;
  $("#exception-nav-count").textContent = runMetrics ? unresolvedCount().toLocaleString() : "0";
  $("#export-nav-count").textContent = runMetrics ? getEligibleLines().length.toLocaleString() : "0";
  $$(".nav-item").forEach(function (button) { button.classList.toggle("active", button.dataset.view === state.view); });
  renderSuggestions();
  if (!source) return;
  if (state.view === "sources") renderSourceView();
  else if (state.view === "export") renderExportView();
  else if (state.view === "audit") renderAuditView();
  else renderWorkView();
}

function runReconciliation() {
  if (!source || state.running) return;
  state.running = true;
  renderApp();
  return new Promise(function (resolve) {
    activeRunResolve = resolve;
    let worker;
    try {
      worker = new Worker(new URL("./reconciliation-worker.js", import.meta.url), { type: "module" });
    } catch (error) {
      state.running = false;
      activeRunResolve = null;
      renderApp();
      $("#command-feedback").textContent = "This browser could not start a background worker. No records were changed.";
      resolve(false);
      return;
    }
    reconciliationWorker = worker;
    worker.onmessage = function (event) {
      if (reconciliationWorker !== worker) return;
      worker.terminate();
      reconciliationWorker = null;
      state.running = false;
      activeRunResolve = null;
      if (event.data.type === "error") {
        renderApp();
        $("#command-feedback").textContent = "Reconciliation stopped with an error: " + event.data.message;
        toast("Reconciliation could not be completed.");
        resolve(false);
        return;
      }
      const computed = event.data.result;
      state.run = computed;
      state.runAt = new Date().toISOString();
      state.view = "work";
      state.filter = "REVIEW";
      state.query = "";
      state.sort = "priority";
      const next = firstReviewLine();
      state.selectedId = next ? next.invoiceLineId : null;
      audit("RUN", "Deterministic reconciliation completed", Number(computed.metrics.matched).toLocaleString() + " automatic matches; " + Number(computed.metrics.exceptions).toLocaleString() + " lines routed for Finance review; " + Number(computed.metrics.alreadyExported).toLocaleString() + " prior exports excluded.", "FCH-2026-10");
      persist();
      renderApp();
      $("#command-feedback").textContent = "Reconciliation completed using deterministic rules. No external system or model API was called.";
      toast("Reconciliation completed. Review the prioritized exception queue.");
      resolve(true);
    };
    worker.onerror = function () {
      if (reconciliationWorker !== worker) return;
      worker.terminate();
      reconciliationWorker = null;
      state.running = false;
      activeRunResolve = null;
      renderApp();
      $("#command-feedback").textContent = "The local reconciliation worker failed. No results were committed.";
      toast("Reconciliation could not be completed.");
      resolve(false);
    };
    try {
      worker.postMessage({ type: "reconcile", source: source });
    } catch (error) {
      worker.terminate();
      reconciliationWorker = null;
      state.running = false;
      activeRunResolve = null;
      renderApp();
      $("#command-feedback").textContent = "The batch could not be sent to the local worker. No records were changed.";
      resolve(false);
    }
  });
}

function stopReconciliation() {
  if (!state.running) return;
  if (reconciliationWorker) reconciliationWorker.terminate();
  reconciliationWorker = null;
  state.running = false;
  audit("RUN", "Reconciliation stopped", "The background worker was cancelled before results were applied.", "FCH-2026-10");
  persist();
  renderApp();
  $("#command-feedback").textContent = "Stopped before results were committed. The batch is unchanged.";
  toast("Reconciliation stopped. No result was applied.");
  if (activeRunResolve) activeRunResolve(false);
  activeRunResolve = null;
}

function openImportDb() {
  return new Promise(function (resolve, reject) {
    if (!window.indexedDB) return reject(new Error("This browser does not support local batch storage."));
    const request = window.indexedDB.open("finance-control-hub-local", 1);
    request.onupgradeneeded = function () {
      if (!request.result.objectStoreNames.contains("batches")) request.result.createObjectStore("batches", { keyPath: "id" });
    };
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error || new Error("Could not open local batch storage.")); };
  });
}

async function getLocalBatch(id) {
  const db = await openImportDb();
  return new Promise(function (resolve, reject) {
    const request = db.transaction("batches", "readonly").objectStore("batches").get(id);
    request.onsuccess = function () { db.close(); resolve(request.result && request.result.source || null); };
    request.onerror = function () { db.close(); reject(request.error); };
  });
}

async function putLocalBatch(id, batch) {
  const db = await openImportDb();
  return new Promise(function (resolve, reject) {
    const request = db.transaction("batches", "readwrite").objectStore("batches").put({ id: id, source: batch, savedAt: new Date().toISOString() });
    request.onsuccess = function () { db.close(); resolve(true); };
    request.onerror = function () { db.close(); reject(request.error); };
  });
}

async function clearLocalBatch(id) {
  const db = await openImportDb();
  return new Promise(function (resolve, reject) {
    const request = db.transaction("batches", "readwrite").objectStore("batches").delete(id);
    request.onsuccess = function () { db.close(); resolve(true); };
    request.onerror = function () { db.close(); reject(request.error); };
  });
}

async function backupCurrentBatch() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupId = "backup-" + stamp;
  await putLocalBatch(backupId, source);
  localStorage.setItem("fch-local-review-backup-" + stamp, JSON.stringify({
    decisions: state.decisions,
    exportedIds: state.exportedIds,
    audit: state.audit,
    runAt: state.runAt,
    completed: Boolean(state.run)
  }));
  localStorage.setItem("fch-latest-backup-id", backupId);
  const backupKeys = Object.keys(localStorage).filter(function (key) { return key.startsWith("fch-local-review-backup-"); }).sort();
  backupKeys.slice(0, Math.max(0, backupKeys.length - 3)).forEach(function (key) { localStorage.removeItem(key); });
  return backupId;
}

async function restorePreviousBatch() {
  const backupId = localStorage.getItem("fch-latest-backup-id");
  if (!backupId) return;
  if (!window.confirm("Restore the previous batch and its saved review decisions? The active batch will be backed up first.")) return;
  try {
    const previousSource = await getLocalBatch(backupId);
    const previousState = JSON.parse(localStorage.getItem("fch-local-review-backup-" + backupId.slice("backup-".length)) || "{}");
    if (!previousSource) throw new Error("The saved batch could not be found.");
    await backupCurrentBatch();
    await putLocalBatch("current", previousSource);
    source = previousSource;
    sourceMode = source.metadata && source.metadata.sourceKind === "local-import" ? "imported" : "synthetic";
    lineById = new Map(source.invoices.map(function (line) { return [line.invoiceLineId, line]; }));
    accrualById = new Map(source.accrueCost.map(function (row) { return [row.accrualReference, row]; }));
    state.decisions = previousState.decisions || {};
    state.exportedIds = previousState.exportedIds || [];
    state.audit = Array.isArray(previousState.audit) ? previousState.audit.slice(0, 150) : [];
    state.runAt = previousState.runAt || null;
    state.run = null;
    state.view = "work";
    state.filter = "REVIEW";
    state.page = 1;
    state.selectedId = null;
    audit("SOURCE", "Previous local batch restored", "The prior source bundle and its review state were restored from the browser backup.", "Local backup");
    persist();
    renderApp();
    if (previousState.completed) await runReconciliation();
    $("#command-feedback").textContent = "Previous batch and saved review decisions restored from this browser.";
    toast("Previous batch restored.");
  } catch (error) {
    $("#import-feedback").textContent = "Could not restore the previous batch: " + (error && error.message || "local backup unavailable.");
    toast("Restore failed. The active batch is unchanged.");
  }
}

async function stageFiles(files) {
  const inputFiles = Array.from(files || []);
  if (!inputFiles.length) return;
  if (inputFiles.some(function (file) { return String(file.name || "").toLowerCase().endsWith(".json"); })) stagedFileMap.clear();
  inputFiles.forEach(function (file) { stagedFileMap.set(file.name + "|" + file.size, file); });
  $("#import-feedback").textContent = "Reading source files on this device…";
  try {
    stagedImport = await prepareFinanceImport(Array.from(stagedFileMap.values()));
    renderStagedImport(stagedImport);
  } catch (error) {
    stagedImport = null;
    stagedFileMap.clear();
    $("#staged-import").hidden = true;
    $("#import-feedback").textContent = error && error.message || "The files could not be read.";
    toast("Import validation failed. The current batch is unchanged.");
  }
}

async function loadStagedImport() {
  if (!stagedImport || !stagedImport.complete || !stagedImport.source) return;
  const confirmed = window.confirm("Load these files as the active batch? The current batch and review decisions will be backed up in this browser first. No file will be uploaded.");
  if (!confirmed) return;
  try {
    await backupCurrentBatch();
    await putLocalBatch("current", stagedImport.source);
    source = stagedImport.source;
    sourceMode = "imported";
    lineById = new Map(source.invoices.map(function (line) { return [line.invoiceLineId, line]; }));
    accrualById = new Map(source.accrueCost.map(function (row) { return [row.accrualReference, row]; }));
    state.view = "work";
    state.filter = "REVIEW";
    state.page = 1;
    state.query = "";
    state.selectedId = null;
    state.run = null;
    state.runAt = null;
    state.decisions = {};
    state.exportedIds = [];
    audit("SOURCE", "Local source batch loaded", Number(source.invoices.length).toLocaleString() + " invoice lines and " + Number(source.accrueCost.length).toLocaleString() + " accrual rows. The previous batch and decisions were backed up in this browser.", "Local import");
    persist();
    renderStagedImport(null);
    renderApp();
    $("#command-feedback").textContent = "Local batch loaded. Files remain in this browser and are not uploaded.";
    toast("Local batch loaded. Existing review decisions were preserved in a backup.");
  } catch (error) {
    $("#import-feedback").textContent = "Could not safely load the files: " + (error && error.message || "local backup failed.");
    toast("Import stopped. The active batch was not replaced.");
  }
}

function startDictation() {
  if (speechRecognition) {
    speechRecognition.stop();
    return;
  }
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    toast("Speech input is not supported in this browser. You can still type an instruction.");
    return;
  }
  const recognition = new Speech();
  speechRecognition = recognition;
  recognition.lang = navigator.language || "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  $("#speech-button").textContent = "■";
  $("#speech-button").setAttribute("aria-label", "Stop dictation");
  recognition.onresult = function (event) {
    const transcript = event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript;
    if (transcript) $("#command-input").value = transcript;
  };
  recognition.onerror = function () { toast("Speech input could not start. Check browser microphone permission or type the instruction."); };
  recognition.onend = function () {
    if (speechRecognition !== recognition) return;
    speechRecognition = null;
    $("#speech-button").textContent = "🎙";
    $("#speech-button").setAttribute("aria-label", "Dictate an instruction");
  };
  try { recognition.start(); }
  catch (_) { speechRecognition = null; toast("Speech input could not start. Type the instruction instead."); }
}

function firstReviewLine() {
  const list = source.invoices.filter(function (line) { return needsReview(line.invoiceLineId); });
  list.sort(function (a, b) {
    const rank = priorityRank(resultFor(a.invoiceLineId).status) - priorityRank(resultFor(b.invoiceLineId).status);
    if (rank !== 0) return rank;
    return Math.abs(Number(resultFor(b.invoiceLineId).variance || 0)) - Math.abs(Number(resultFor(a.invoiceLineId).variance || 0));
  });
  return list[0] || null;
}

async function executeCommand(text) {
  const route = interpretCommand(text);
  $("#command-feedback").textContent = route.supported ? route.explanation : route.message;
  if (!route.supported) {
    toast(route.message);
    return;
  }
  audit("COMMAND", "Instruction routed", "“" + text + "” → " + route.explanation, "");
  if (route.action === "run") {
    persist();
    await runReconciliation();
    return;
  }
  if (route.action === "filter") {
    if (!state.run) {
      state.view = "work";
      state.filter = "REVIEW";
      renderApp();
      toast("Run reconciliation first; the source batch is loaded and ready.");
      return;
    }
    state.view = "work";
    state.filter = route.filter;
    state.page = 1;
    if (route.filter === "DUPLICATE" || route.filter === "MISSING_PO") state.view = "exceptions";
  } else if (route.action === "largest") {
    state.view = "exceptions";
    state.filter = "VARIANCE";
    state.sort = "variance";
  } else if (route.action === "group-vendor") {
    state.view = "exceptions";
    state.filter = "REVIEW";
    state.groupByVendor = true;
  } else if (route.action === "explain") {
    state.view = "exceptions";
    state.filter = "REVIEW";
    if (!state.selectedId || !needsReview(state.selectedId)) {
      const next = firstReviewLine();
      state.selectedId = next ? next.invoiceLineId : null;
    }
  } else if (route.action === "priority") {
    state.view = "exceptions";
    state.filter = "REVIEW";
    state.sort = "priority";
    const next = firstReviewLine();
    state.selectedId = next ? next.invoiceLineId : null;
  } else if (route.action === "export") {
    state.view = "export";
  }
  state.page = 1;
  persist();
  renderApp();
}

function chosenAccrualId(line, result) {
  if (result.status === "GROUP_REVIEW") return null;
  const select = $("#chosen-candidate");
  if (select && select.value) return select.value;
  if (result.matchedAccrualIds && result.matchedAccrualIds.length === 1) return result.matchedAccrualIds[0];
  if (result.candidateAccrualIds && result.candidateAccrualIds.length === 1) return result.candidateAccrualIds[0];
  return null;
}

function accrualAlreadyAssigned(accrualId, groupId, currentLineId) {
  if (!accrualId) return false;
  for (const line of source.invoices) {
    if (line.invoiceLineId === currentLineId) continue;
    const result = resultFor(line.invoiceLineId);
    const decision = decisionFor(line.invoiceLineId);
    if (decision && decision.status === "APPROVED") {
      const ids = decision.accrualIds || [decision.accrualId];
      if (ids.includes(accrualId) && !(groupId && result && result.groupId === groupId)) return true;
    } else if (result && result.exportEligible && result.matchedAccrualIds.includes(accrualId) && !(groupId && result.groupId === groupId)) {
      return true;
    }
  }
  return false;
}

function approveSelected() {
  const line = lineById.get(state.selectedId);
  const result = resultFor(state.selectedId);
  if (!line || !result) return toast("Select a reconciliation line first.");
  if (result.status === "CURRENCY_MISMATCH") return toast("Currency mismatch blocks approval. Confirm FX policy and correct the source data first.");
  const note = $("#decision-note") ? $("#decision-note").value.trim() : "";
  const requiresNote = ["GROUP_REVIEW", "MISSING_PO", "PO_MISMATCH", "AMOUNT_VARIANCE_OVER", "AMOUNT_VARIANCE_UNDER", "TAX_VARIANCE", "AMBIGUOUS_MATCH", "DUPLICATE_CW"].includes(result.status);
  if (requiresNote && note.length < 10) return toast("Add a short evidence note before approving this exception.");
  const group = result.status === "GROUP_REVIEW";
  let accrualIds = [];
  if (group) {
    accrualIds = result.matchedAccrualIds.slice();
  } else {
    const chosen = chosenAccrualId(line, result);
    if (!chosen) return toast("Select a source accrual candidate before approving.");
    if (!(result.candidateAccrualIds || []).includes(chosen) && !(result.matchedAccrualIds || []).includes(chosen)) return toast("The selected accrual is not in this line's reviewed candidate set.");
    accrualIds = [chosen];
  }
  const candidates = accrualIds.map(function (id) { return accrualById.get(id); });
  if (candidates.some(function (candidate) { return !candidate || String(candidate.currency).toUpperCase() !== String(line.currency).toUpperCase(); })) {
    return toast("Candidate currency does not match the invoice. No FX conversion is configured.");
  }
  if (accrualIds.some(function (id) { return accrualAlreadyAssigned(id, result.groupId, line.invoiceLineId); })) {
    return toast("This accrual is already assigned to another line or group. The engine prevents double allocation.");
  }
  const poInput = $("#resolution-po");
  const typedPo = poInput ? poInput.value.trim() : "";
  const effectivePo = typedPo || line.poReference || (candidates[0] && candidates[0].poReference) || "";
  if (!effectivePo) return toast("A confirmed purchase-order reference is required before approval.");
  if (candidates.some(function (candidate) {
    return candidate.poReference && normalizeIdentifier(effectivePo) !== normalizeIdentifier(candidate.poReference);
  })) return toast("PO does not match the selected accrual. Use the candidate PO or investigate the discrepancy.");
  const members = group ? groupMembers(result.groupId) : [line];
  const approvedAt = new Date().toISOString();
  for (const member of members) {
    const memberResult = resultFor(member.invoiceLineId);
    const memberIds = group ? memberResult.matchedAccrualIds.slice() : accrualIds.slice();
    state.decisions[member.invoiceLineId] = {
      status: "APPROVED",
      accrualId: memberIds[0],
      accrualIds: memberIds,
      poReference: effectivePo,
      note,
      approvedAt,
      groupId: memberResult.groupId || null
    };
  }
  audit("APPROVAL", group ? "Grouped reconciliation approved" : "Invoice match approved",
    group ? "Finance approved the grouped allocation after reviewing its component records. Source values are unchanged." : "Finance approved " + line.invoiceLineId + " against " + accrualIds.join(", ") + ". Source values are unchanged.",
    group ? result.groupId : line.invoiceLineId);
  persist();
  selectNextReview(line.invoiceLineId);
  renderApp();
  toast("Human decision recorded locally. No posting or external update occurred.");
}

function selectNextReview(afterId) {
  const current = lineById.get(afterId);
  const currentResult = current && resultFor(afterId);
  if (currentResult && currentResult.groupId) {
    const members = groupMembers(currentResult.groupId);
    if (members.every(function (member) { return !needsReview(member.invoiceLineId); })) {
      const next = firstReviewLine();
      state.selectedId = next ? next.invoiceLineId : null;
      return;
    }
  }
  if (!needsReview(afterId)) {
    const next = firstReviewLine();
    state.selectedId = next ? next.invoiceLineId : null;
  }
}

function storeDisposition(status, title, detail) {
  const line = lineById.get(state.selectedId);
  const result = resultFor(state.selectedId);
  if (!line || !result) return toast("Select a reconciliation line first.");
  const note = $("#decision-note") ? $("#decision-note").value.trim() : "";
  if (status === "ANNOTATED" && note.length < 3) return toast("Enter a note before saving it to the audit trail.");
  if (status === "DUPLICATE" && note.length < 10) return toast("Add a short evidence note before excluding a financial line as a duplicate.");
  const data = {
    status,
    accrualId: null,
    accrualIds: [],
    note,
    recordedAt: new Date().toISOString(),
    groupId: result.groupId || null
  };
  if (status === "DUPLICATE" && result.groupId) {
    for (const member of groupMembers(result.groupId)) state.decisions[member.invoiceLineId] = Object.assign({}, data);
  } else {
    state.decisions[line.invoiceLineId] = data;
  }
  audit(status, title, detail + (note ? " Note: " + note : ""), line.invoiceLineId);
  persist();
  selectNextReview(line.invoiceLineId);
  renderApp();
  toast("Decision recorded in this browser only.");
}

function reopenSelected() {
  const line = lineById.get(state.selectedId);
  const result = line && resultFor(line.invoiceLineId);
  if (!line) return;
  if (result && result.groupId) {
    for (const member of groupMembers(result.groupId)) delete state.decisions[member.invoiceLineId];
  } else {
    delete state.decisions[line.invoiceLineId];
  }
  audit("REOPEN", "Reconciliation returned to review", "Removed the local human disposition; original source records and engine outcome remain unchanged.", line.invoiceLineId);
  persist();
  renderApp();
  toast("Line returned to the review queue.");
}

function releaseExport() {
  if (!state.run) return toast("Run reconciliation before releasing an export.");
  const attestation = $("#export-attestation");
  if (!attestation || !attestation.checked) return toast("Confirm the illustrative-file notice before downloading.");
  const eligible = getEligibleLines();
  if (!eligible.length) return toast("There are no validated lines ready for export.");
  const csv = buildIllustrativeExport(source.invoices, state.run.outcomes, accrualById, state.decisions);
  const rows = exportRowsCount(csv);
  if (rows <= 0) return toast("No eligible output rows were produced; nothing was downloaded.");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "finance-control-hub-illustrative-import-2026-10.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  const ids = eligible.map(function (line) { return line.invoiceLineId; });
  state.exportedIds = Array.from(new Set(state.exportedIds.concat(ids)));
  for (const id of ids) {
    const prior = decisionFor(id) || {};
    state.decisions[id] = Object.assign({}, prior, { exported: true, exportedAt: new Date().toISOString() });
  }
  audit("EXPORT", "Illustrative CSV downloaded", rows.toLocaleString() + " mapped rows from " + eligible.length.toLocaleString() + " validated invoice lines. This was a local download; CargoWise was not contacted.", "FCH-2026-10");
  persist();
  renderApp();
  toast("Illustrative CSV downloaded. These records cannot be exported again in this demo state.");
}

function resetDemo() {
  const confirmed = window.confirm("Clear this browser's Finance Control Hub review decisions and restart the synthetic demo?");
  if (!confirmed) return;
  localStorage.removeItem(STORE_KEY);
  clearLocalBatch("current").catch(function () {}).finally(function () { location.reload(); });
}

function commandInput(text) {
  $("#command-input").value = text;
  executeCommand(text);
}

$("#app").addEventListener("click", function (event) {
  const viewButton = event.target.closest("[data-view]");
  const commandButton = event.target.closest("[data-command]");
  const filterButton = event.target.closest("[data-filter]");
  const lineRow = event.target.closest("[data-line-id]");
  const sourceTab = event.target.closest("[data-source-tab]");
  const actionButton = event.target.closest("[data-action]");
  if (viewButton) {
    const view = viewButton.dataset.view;
    if (view === "exceptions") state.filter = "REVIEW";
    if (view === "work" && state.run) state.filter = state.filter || "REVIEW";
    state.view = view;
    state.page = 1;
    renderApp();
    return;
  }
  if (commandButton) {
    commandInput(commandButton.dataset.command);
    return;
  }
  if (filterButton) {
    state.filter = filterButton.dataset.filter;
    state.page = 1;
    if (state.filter === "REVIEW" || state.filter === "DUPLICATE" || state.filter === "MISSING_PO") state.view = "exceptions";
    else state.view = "work";
    renderApp();
    return;
  }
  if (sourceTab) {
    state.sourceTab = sourceTab.dataset.sourceTab;
    state.sourcePage = 1;
    renderApp();
    return;
  }
  if (lineRow) {
    state.selectedId = lineRow.dataset.lineId;
    renderQueueRows();
    renderInspector();
    return;
  }
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === "run") runReconciliation();
  else if (action === "attach") $("#source-file-input").click();
  else if (action === "speech") startDictation();
  else if (action === "load-import") loadStagedImport();
  else if (action === "clear-import") { stagedImport = null; stagedFileMap.clear(); renderStagedImport(null); }
  else if (action === "restore-backup") restorePreviousBatch();
  else if (action === "page-prev") { state.page = Math.max(1, state.page - 1); renderQueueRows(); }
  else if (action === "page-next") { state.page += 1; renderQueueRows(); }
  else if (action === "source-prev") { state.sourcePage = Math.max(1, state.sourcePage - 1); renderApp(); }
  else if (action === "source-next") { state.sourcePage += 1; renderApp(); }
  else if (action === "toggle-group") { state.groupByVendor = !state.groupByVendor; persist(); renderApp(); }
  else if (action === "approve") approveSelected();
  else if (action === "mark-duplicate") storeDisposition("DUPLICATE", "Invoice line marked as duplicate", "Finance marked this line as a duplicate and blocked it from export.");
  else if (action === "hold") storeDisposition("HELD", "Invoice line held", "Finance held this line pending investigation.");
  else if (action === "reject") storeDisposition("REJECTED", "Candidate match rejected", "Finance rejected the current candidate; the exception remains open.");
  else if (action === "escalate") storeDisposition("ESCALATED", "Invoice line escalated", "Finance escalated the exception for additional review.");
  else if (action === "annotate") storeDisposition("ANNOTATED", "Review note added", "Finance recorded a note; the accounting disposition remains open.");
  else if (action === "reopen") reopenSelected();
  else if (action === "release-export") releaseExport();
  else if (action === "reset") resetDemo();
  else if (action === "use-candidate-po") {
    const selected = $("#chosen-candidate");
    const input = $("#resolution-po");
    const candidate = selected && selected.value ? accrualById.get(selected.value) : null;
    if (candidate && input) {
      input.value = candidate.poReference || "";
      toast(candidate.poReference ? "Candidate PO copied for Finance confirmation." : "Selected accrual has no PO reference.");
    } else {
      toast("Select an accrual candidate first.");
    }
  }
});

$("#command-form").addEventListener("submit", function (event) {
  event.preventDefault();
  if (state.running) { stopReconciliation(); return; }
  const text = $("#command-input").value.trim();
  executeCommand(text);
});

$("#source-file-input").addEventListener("change", function (event) {
  stageFiles(event.target.files);
  event.target.value = "";
});

const dropZone = $("#file-drop-zone");
dropZone.addEventListener("dragover", function (event) {
  event.preventDefault();
  dropZone.classList.add("is-over");
});
dropZone.addEventListener("dragleave", function (event) {
  if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove("is-over");
});
dropZone.addEventListener("drop", function (event) {
  event.preventDefault();
  dropZone.classList.remove("is-over");
  stageFiles(event.dataTransfer.files);
});
dropZone.addEventListener("click", function () { $("#source-file-input").click(); });
dropZone.addEventListener("keydown", function (event) {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $("#source-file-input").click(); }
});

$("#app").addEventListener("input", function (event) {
  if (event.target.id === "queue-search") {
    state.query = event.target.value;
    state.page = 1;
    renderQueueRows();
  } else if (event.target.id === "source-search") {
    state.sourceQuery = event.target.value;
    state.sourcePage = 1;
    const cursor = event.target.selectionStart;
    renderSourceView();
    const replacement = $("#source-search");
    replacement.focus();
    replacement.setSelectionRange(cursor, cursor);
  }
});

$("#app").addEventListener("change", function (event) {
  if (event.target.id === "sort-select") {
    state.sort = event.target.value;
    renderQueueRows();
  } else if (event.target.id === "model-select") {
    state.preferences.model = event.target.value;
    persist();
  } else if (event.target.id === "effort-select") {
    state.preferences.effort = event.target.value;
    persist();
  } else if (event.target.id === "export-attestation") {
    const releaseButton = $('[data-action="release-export"]');
    if (releaseButton) releaseButton.disabled = !event.target.checked;
  }
});

async function boot() {
  try {
    let syntheticSource = null;
    try {
      const localBatch = await getLocalBatch("current");
      if (localBatch) {
        source = localBatch;
        sourceMode = "imported";
      }
    } catch (_) {
      $("#import-feedback").textContent = "Local batch storage is unavailable in this browser. The synthetic batch is ready.";
    }
    if (!source) {
      const response = await fetch("./data/source-data.json", { cache: "force-cache" });
      if (!response.ok) throw new Error("Source file returned " + response.status + ".");
      syntheticSource = await response.json();
      source = syntheticSource;
    }
    lineById = new Map(source.invoices.map(function (line) { return [line.invoiceLineId, line]; }));
    accrualById = new Map(source.accrueCost.map(function (row) { return [row.accrualReference, row]; }));
    audit("SOURCE", sourceMode === "imported" ? "Local source batch loaded" : "Synthetic source batch loaded", source.metadata.invoiceLineCount.toLocaleString() + " invoice lines; " + source.metadata.hawbRecordCount.toLocaleString() + " HAWB rows; " + source.metadata.mawbRecordCount.toLocaleString() + " MAWB rows; " + source.metadata.accrueCostRecordCount.toLocaleString() + " accruals.", sourceMode === "imported" ? "Local import" : "FCH-2026-10");
    if (state.run) state.run = reconcileBatch(source);
    persist();
    renderApp();
  } catch (error) {
    $("#batch-state").textContent = "Source load failed";
    $("#workspace-content").innerHTML = '<div class="error-state"><span class="ready-icon">!</span><div><strong>Could not load the synthetic batch</strong><small>' + escapeHtml(error && error.message || "Source data unavailable.") + ' Reload this page or check the demo data file.</small></div></div>';
  }
}

boot();
