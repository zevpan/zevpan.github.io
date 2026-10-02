(() => {
  "use strict";

  const STORAGE_KEY = "thread-ops-v1";
  const LEGACY_KEY = "thread-mvp0";
  const SCHEMA_VERSION = 1;
  const CURRENT_USER = "Zev";
  const TEAM = ["Zev", "Aisha Rahman", "Marco Reyes", "Jen Loh"];
  const CRESTLINE_ID = "crestline-q4-rates";
  const SAMPLE_TITLE = "Rate card received from Crestline Logistics, 29 Sep 2026";
  const SAMPLE_DATE = "2026-09-29";
  const SAMPLE_BODY = "Crestline Logistics has issued a revised rate schedule effective 01 Nov 2026. Standard transfer: $47.00. Priority transfer: $75.00. Fuel surcharge removed. Written confirmation required within 14 days. [SYNTHETIC DEMO CONTENT — not a real document]";

  const CONNECTOR_STORAGE_KEY = "thread-connectors-demo-v1";
  const DEFAULT_DEMO_CONNECTIONS = ["microsoft-outlook", "google-sheets", "netsuite"];
  const INTEGRATION_APPS = [
    { id: "microsoft-outlook", name: "Microsoft Outlook", category: "Communication", icon: "O", color: "#1769aa", description: "Email threads, attachments, and calendar context", data: ["Email", "Calendar"] },
    { id: "gmail", name: "Gmail", category: "Communication", icon: "G", color: "#c74440", description: "Mail conversations and attached documents", data: ["Email", "Attachments"] },
    { id: "microsoft-teams", name: "Microsoft Teams", category: "Communication", icon: "T", color: "#5558af", description: "Team conversations, meeting notes, and shared files", data: ["Messages", "Meetings"] },
    { id: "slack", name: "Slack", category: "Communication", icon: "S", color: "#611f69", description: "Channel conversations and operational updates", data: ["Messages", "Events"] },
    { id: "zoom", name: "Zoom", category: "Communication", icon: "Z", color: "#2d8cff", description: "Meeting records and follow-up context", data: ["Meetings", "Notes"] },
    { id: "google-calendar", name: "Google Calendar", category: "Communication", icon: "C", color: "#4285f4", description: "Meeting schedules and event changes", data: ["Events", "Dates"] },
    { id: "drive", name: "Google Drive", category: "Documents & knowledge", icon: "D", color: "#1a8f55", description: "Shared documents and team folders", data: ["Files", "Folders"] },
    { id: "google-sheets", name: "Google Sheets", category: "Documents & knowledge", icon: "GS", color: "#188038", description: "Structured spreadsheets and changing values", data: ["Sheets", "Rows"] },
    { id: "google-docs", name: "Google Docs", category: "Documents & knowledge", icon: "GD", color: "#4285f4", description: "Policies, working documents, and approvals", data: ["Documents", "Comments"] },
    { id: "sharepoint", name: "Microsoft SharePoint", category: "Documents & knowledge", icon: "SP", color: "#087e8b", description: "Team sites, files, and internal knowledge", data: ["Files", "Lists"] },
    { id: "onedrive", name: "OneDrive", category: "Documents & knowledge", icon: "OD", color: "#1673c9", description: "Personal and shared work files", data: ["Files", "Folders"] },
    { id: "notion", name: "Notion", category: "Documents & knowledge", icon: "N", color: "#252525", description: "Team knowledge pages and databases", data: ["Pages", "Databases"] },
    { id: "box", name: "Box", category: "Documents & knowledge", icon: "B", color: "#1769aa", description: "Governed files and shared content", data: ["Files", "Folders"] },
    { id: "dropbox", name: "Dropbox", category: "Documents & knowledge", icon: "DB", color: "#0061ff", description: "Shared files and team folders", data: ["Files", "Folders"] },
    { id: "jira", name: "Jira", category: "Projects & IT", icon: "J", color: "#1868db", description: "Issues, project status, and delivery work", data: ["Issues", "Projects"] },
    { id: "asana", name: "Asana", category: "Projects & IT", icon: "A", color: "#f06a6a", description: "Tasks, owners, and project milestones", data: ["Tasks", "Projects"] },
    { id: "linear", name: "Linear", category: "Projects & IT", icon: "L", color: "#5e6ad2", description: "Issues, cycles, and engineering follow-up", data: ["Issues", "Cycles"] },
    { id: "monday", name: "monday.com", category: "Projects & IT", icon: "M", color: "#6c4ce3", description: "Boards, work items, and ownership", data: ["Boards", "Tasks"] },
    { id: "trello", name: "Trello", category: "Projects & IT", icon: "Tr", color: "#0969da", description: "Cards, checklists, and team boards", data: ["Cards", "Boards"] },
    { id: "clickup", name: "ClickUp", category: "Projects & IT", icon: "CU", color: "#7b68ee", description: "Tasks, status changes, and project context", data: ["Tasks", "Projects"] },
    { id: "servicenow", name: "ServiceNow", category: "Projects & IT", icon: "SN", color: "#62d84e", description: "Service requests, incidents, and changes", data: ["Tickets", "Incidents"] },
    { id: "netsuite", name: "Oracle NetSuite", category: "Finance & ERP", icon: "NS", color: "#52657a", description: "Purchasing, finance, inventory, and supplier records", data: ["Finance", "Inventory"] },
    { id: "sap", name: "SAP S/4HANA", category: "Finance & ERP", icon: "SAP", color: "#0878a4", description: "Enterprise finance, procurement, and inventory", data: ["ERP", "Inventory"] },
    { id: "quickbooks", name: "QuickBooks Online", category: "Finance & ERP", icon: "QB", color: "#2ca01c", description: "Accounting records, bills, and supplier payments", data: ["Accounting", "Bills"] },
    { id: "xero", name: "Xero", category: "Finance & ERP", icon: "X", color: "#13b5ea", description: "Accounting activity and financial records", data: ["Accounting", "Invoices"] },
    { id: "oracle-fusion", name: "Oracle Fusion Cloud", category: "Finance & ERP", icon: "OF", color: "#c74634", description: "Enterprise finance and business operations", data: ["ERP", "Finance"] },
    { id: "sage-intacct", name: "Sage Intacct", category: "Finance & ERP", icon: "SI", color: "#00a376", description: "Financial records and multi-entity reporting", data: ["Accounting", "Reports"] },
    { id: "workday", name: "Workday", category: "Finance & ERP", icon: "W", color: "#f5a623", description: "People, finance, and planning records", data: ["People", "Finance"] },
    { id: "salesforce", name: "Salesforce", category: "CRM & Support", icon: "SF", color: "#1798c1", description: "Customer accounts, cases, and service context", data: ["Accounts", "Cases"] },
    { id: "hubspot", name: "HubSpot", category: "CRM & Support", icon: "H", color: "#ff7a59", description: "Customer records and service activity", data: ["Contacts", "Tickets"] },
    { id: "zendesk", name: "Zendesk", category: "CRM & Support", icon: "Z", color: "#17494d", description: "Support tickets and customer conversations", data: ["Tickets", "Comments"] },
    { id: "intercom", name: "Intercom", category: "CRM & Support", icon: "I", color: "#286efa", description: "Customer conversations and support cases", data: ["Messages", "Cases"] },
    { id: "freshdesk", name: "Freshdesk", category: "CRM & Support", icon: "F", color: "#24a148", description: "Service tickets and support queues", data: ["Tickets", "Queues"] },
    { id: "zoho-crm", name: "Zoho CRM", category: "CRM & Support", icon: "ZC", color: "#e64b3c", description: "Customer records and service follow-up", data: ["Accounts", "Tasks"] },
    { id: "snowflake", name: "Snowflake", category: "Data & Operations", icon: "SF", color: "#29b5e8", description: "Warehouse data and governed reporting", data: ["Tables", "Reports"] },
    { id: "postgresql", name: "PostgreSQL", category: "Data & Operations", icon: "PG", color: "#336791", description: "Operational database records", data: ["Tables", "Records"] },
    { id: "bigquery", name: "Google BigQuery", category: "Data & Operations", icon: "BQ", color: "#4285f4", description: "Analytics tables and operational datasets", data: ["Tables", "Queries"] },
    { id: "airtable", name: "Airtable", category: "Data & Operations", icon: "AT", color: "#fc5c63", description: "Flexible team databases and work queues", data: ["Bases", "Records"] },
    { id: "shopify", name: "Shopify", category: "Data & Operations", icon: "SH", color: "#96bf48", description: "Orders, products, and fulfillment status", data: ["Orders", "Inventory"] },
    { id: "dynamics365", name: "Microsoft Dynamics 365", category: "Data & Operations", icon: "D3", color: "#0052cc", description: "Business applications and operational records", data: ["Records", "Workflows"] },
    { id: "amazon-s3", name: "Amazon S3", category: "Data & Operations", icon: "S3", color: "#ec7211", description: "Files and data exports from internal systems", data: ["Files", "Exports"] },
    { id: "rest-api", name: "REST API / HTTP", category: "Data & Operations", icon: "API", color: "#44546f", description: "Custom API access for long-tail business tools", data: ["API", "Custom"] },
    { id: "webhooks", name: "Webhooks", category: "Data & Operations", icon: "WH", color: "#5e4db2", description: "Event delivery from internal and external systems", data: ["Events", "Custom"] }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const view = $("#view");
  const title = $("#title");
  const subtitle = $("#subtitle");
  const pageMeta = $("#page-meta");
  const pageEyebrow = $("#page-eyebrow");
  const searchInput = $("#search");
  const storageBanner = $("#storage-banner");
  const appMessage = $("#app-message");

  function node(tag, attrs = {}, ...children) {
    const element = document.createElement(tag);
    const deferred = [];
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (key.startsWith("on") && typeof value === "function") {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === "className") {
        element.className = value;
      } else if (key === "htmlFor") {
        element.htmlFor = value;
      } else if (["value", "checked", "selected", "disabled", "required", "multiple"].includes(key)) {
        deferred.push([key, value]);
      } else if (key === "textContent") {
        element.textContent = value;
      } else if (value === true) {
        element.setAttribute(key, "");
      } else if (value !== false) {
        element.setAttribute(key, String(value));
      }
    });
    const append = (child) => {
      if (child === null || child === undefined || child === false) return;
      if (Array.isArray(child)) {
        child.forEach(append);
      } else if (child instanceof Node) {
        element.appendChild(child);
      } else {
        element.appendChild(document.createTextNode(String(child)));
      }
    };
    children.forEach(append);
    deferred.forEach(([key, value]) => { element[key] = value; });
    return element;
  }

  function button(label, handler, className = "btn", attrs = {}) {
    return node("button", { type: "button", className, onClick: handler, ...attrs }, label);
  }

  function field(labelText, control, id) {
    const label = node("label", { htmlFor: id || control.id }, labelText);
    return node("div", { className: "field" }, label, control);
  }

  function makeSeed() {
    const financeSource = {
      id: "source-finance-model-sep25",
      type: "Pasted text",
      title: "Finance costing model snapshot — 25 Sep 2026",
      date: "2026-09-25",
      body: "Q4 costing model inputs:\nStandard transfer rate: $42.00.\nPriority transfer rate: $68.00.\nFuel surcharge: Applied.\n[SYNTHETIC DEMO CONTENT — not a real document]",
      supportsFactIds: ["standard-rate", "priority-rate", "fuel-surcharge"],
      createdAt: "2026-09-25T08:00:00.000Z",
      createdBy: "Demo data",
      sample: false
    };
    const operationsIntake = {
      id: "source-operations-intake-sep29",
      type: "Meeting note",
      title: "Operations intake note — revised rate card received, 29 Sep 2026",
      date: "2026-09-29",
      body: "Operations logged receipt of a revised Crestline Logistics rate card with an effective date of 01 Nov 2026. The rate values and surcharge treatment are awaiting Finance review.\n[SYNTHETIC DEMO CONTENT — not a real note]",
      supportsFactIds: ["effective-date"],
      createdAt: "2026-09-29T08:00:00.000Z",
      createdBy: "Demo data",
      sample: false
    };
    const stockLedger = {
      id: "source-bin7c-ledger",
      type: "Pasted text",
      title: "Inventory system snapshot — Bin 7C, 30 Sep 2026",
      date: "2026-09-30",
      body: "System quantity for bin location 7C: 360 units.\n[SYNTHETIC DEMO CONTENT — not a real record]",
      supportsFactIds: ["system-quantity"],
      createdAt: "2026-09-30T08:00:00.000Z",
      createdBy: "Demo data",
      sample: false
    };
    const countSource = {
      id: "source-bin7c-count",
      type: "Meeting note",
      title: "September cycle count note — Bin 7C",
      date: "2026-09-30",
      body: "Physical cycle count for bin location 7C: 315 units. The count team did not verify the cause of the difference.\n[SYNTHETIC DEMO CONTENT — not a real record]",
      supportsFactIds: ["physical-count", "quantity-difference"],
      createdAt: "2026-09-30T09:00:00.000Z",
      createdBy: "Demo data",
      sample: false
    };

    return {
      schemaVersion: SCHEMA_VERSION,
      selectedMember: CURRENT_USER,
      records: [
        {
          id: CRESTLINE_ID,
          title: "Crestline Logistics — Q4 Transfer Rate Update",
          category: "Supplier rates",
          owner: "Aisha Rahman",
          summary: "Crestline's revised Q4 rate card is expected to take effect on 01 Nov 2026. The finance costing model still lists the previous rates. Review the source evidence and record a decision before treating either set as current.",
          defaultStatus: "Decision pending",
          facts: [
            { id: "standard-rate", label: "Standard transfer rate", value: "$42.00", sourceId: financeSource.id, confirmedBy: "Marco Reyes", confirmedAt: "2026-09-25T08:00:00.000Z", previousValues: [] },
            { id: "priority-rate", label: "Priority transfer rate", value: "$68.00", sourceId: financeSource.id, confirmedBy: "Marco Reyes", confirmedAt: "2026-09-25T08:00:00.000Z", previousValues: [] },
            { id: "fuel-surcharge", label: "Fuel surcharge", value: "Applied", sourceId: financeSource.id, confirmedBy: "Marco Reyes", confirmedAt: "2026-09-25T08:00:00.000Z", previousValues: [] },
            { id: "effective-date", label: "Revised rate effective date", value: "01 Nov 2026", sourceId: operationsIntake.id, confirmedBy: "Aisha Rahman", confirmedAt: operationsIntake.createdAt, previousValues: [] }
          ],
          uncertainties: [],
          conflicts: [],
          sources: [financeSource, operationsIntake],
          proposals: [],
          decisions: [],
          tasks: [
            { id: "task-crestline-zev-review", title: "Review rate impact on Q4 pricing model", owner: "Zev", dueDate: "2026-10-05", status: "open", createdAt: "2026-09-29T08:00:00.000Z", createdBy: "Demo data", completionNote: "", completedAt: "" },
            { id: "task-crestline-aisha-response", title: "Respond to Crestline with decision", owner: "Aisha Rahman", dueDate: "2026-10-12", status: "open", createdAt: "2026-09-29T08:05:00.000Z", createdBy: "Demo data", completionNote: "", completedAt: "" }
          ],
          draft: ""
        },
        {
          id: "bin-location-7c-variance",
          title: "Bin Location 7C — September Stock Count Variance",
          category: "Inventory position",
          owner: "Jen Loh",
          summary: "The September cycle count and inventory system disagree for bin location 7C. The difference is 45 units (12.5% of the system quantity). The cause is unverified, so a finance adjustment should wait for the investigation result.",
          defaultStatus: "Needs review",
          facts: [
            { id: "system-quantity", label: "System quantity", value: "360 units", sourceId: stockLedger.id, confirmedBy: "Jen Loh", confirmedAt: "2026-09-30T08:00:00.000Z", previousValues: [] },
            { id: "physical-count", label: "Physical count", value: "315 units", sourceId: countSource.id, confirmedBy: "Jen Loh", confirmedAt: "2026-09-30T09:00:00.000Z", previousValues: [] },
            { id: "quantity-difference", label: "Difference", value: "45 units", sourceId: countSource.id, confirmedBy: "Demo calculation", confirmedAt: "2026-09-30T09:00:00.000Z", previousValues: [] }
          ],
          uncertainties: [
            { id: "variance-cause", label: "Cause of variance", note: "Not verified. Check receiving and movement records before recording an adjustment.", status: "open", blocksStatus: true },
            { id: "finance-not-informed", label: "Finance notification", note: "Finance has not been informed in this synthetic scenario. The demo does not send a notification.", status: "open", blocksStatus: true }
          ],
          conflicts: [
            { label: "System quantity vs physical count", leftValue: "360 units", leftSourceId: stockLedger.id, rightValue: "315 units", rightSourceId: countSource.id, note: "The source records disagree. The cause is unverified; do not record a finance adjustment yet." }
          ],
          sources: [stockLedger, countSource],
          proposals: [],
          decisions: [],
          tasks: [
            { id: "task-bin7c-jen-check", title: "Check inbound receiving records for bin 7C — Sep", owner: "Jen Loh", dueDate: "2026-10-07", status: "open", createdAt: "2026-09-30T09:10:00.000Z", createdBy: "Demo data", completionNote: "", completedAt: "" },
            { id: "task-bin7c-marco-hold", title: "Hold variance adjustment until investigation result received", owner: "Marco Reyes", dueDate: "2026-10-07", status: "open", createdAt: "2026-09-30T09:12:00.000Z", createdBy: "Demo data", completionNote: "", completedAt: "" }
          ],
          draft: ""
        }
      ],
      history: [
        { id: "history-seed-crestline", recordId: CRESTLINE_ID, type: "Source added", message: "The synthetic finance costing model snapshot is available on the Crestline Logistics rate record.", actor: "Demo data", at: "2026-09-25T08:00:00.000Z" },
        { id: "history-seed-operations-intake", recordId: CRESTLINE_ID, type: "Source added", message: "The synthetic Operations intake note records the revised rate card's 01 Nov effective date.", actor: "Demo data", at: "2026-09-29T08:00:00.000Z" },
        { id: "history-seed-bin7c", recordId: "bin-location-7c-variance", type: "Source added", message: "Synthetic inventory and cycle-count sources are available for the Bin Location 7C review.", actor: "Demo data", at: "2026-09-30T09:00:00.000Z" }
      ]
    };
  }

  function validState(candidate) {
    return !!candidate && candidate.schemaVersion === SCHEMA_VERSION &&
      Array.isArray(candidate.records) && candidate.records.length >= 2 &&
      Array.isArray(candidate.history) &&
      candidate.records.every((record) => record && typeof record.id === "string" &&
        Array.isArray(record.facts) && Array.isArray(record.sources) &&
        Array.isArray(record.proposals) && Array.isArray(record.decisions) &&
        Array.isArray(record.tasks) && Array.isArray(record.uncertainties));
  }

  function createStorage() {
    let persistent = true;
    let warning = "";
    let current;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (validState(parsed)) {
            current = parsed;
          } else {
            current = makeSeed();
            warning = "A saved demo version could not be read. A clean synthetic seed is loaded.";
            window.localStorage.removeItem(STORAGE_KEY);
          }
        } catch (_error) {
          current = makeSeed();
          warning = "Saved demo data was unreadable. A clean synthetic seed is loaded.";
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        current = makeSeed();
        if (window.localStorage.getItem(LEGACY_KEY)) {
          warning = "An older demo save was found. It was not imported; a clean synthetic seed is loaded.";
        }
      }
    } catch (_error) {
      persistent = false;
      current = makeSeed();
      warning = "Browser storage is unavailable. Changes will stay in memory only and will be lost when you leave this page.";
    }

    return {
      get persistent() { return persistent; },
      get warning() { return warning; },
      get data() { return current; },
      save(data) {
        if (!persistent) return;
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (_error) {
          persistent = false;
          warning = "Browser storage became unavailable. The demo is running in memory only; changes will be lost when you leave this page.";
          renderStorageBanner();
        }
      },
      reset() {
        if (!persistent) return;
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (_error) {
          persistent = false;
          warning = "Browser storage is unavailable. The reset applies in memory only.";
        }
      }
    };
  }

  const storage = createStorage();
  let state = storage.data;

  function readDemoConnections() {
    try {
      const raw = window.localStorage.getItem(CONNECTOR_STORAGE_KEY);
      if (raw === null) return new Set(DEFAULT_DEMO_CONNECTIONS);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set(DEFAULT_DEMO_CONNECTIONS);
      const validIds = new Set(INTEGRATION_APPS.map((app) => app.id));
      return new Set(parsed.filter((id) => validIds.has(id)));
    } catch (_error) {
      return new Set(DEFAULT_DEMO_CONNECTIONS);
    }
  }

  let demoConnections = readDemoConnections();

  function saveDemoConnections() {
    try {
      window.localStorage.setItem(CONNECTOR_STORAGE_KEY, JSON.stringify([...demoConnections]));
    } catch (_error) {
      showMessage("Connection state could not be saved. The demo simulation remains in this browser session only.");
    }
  }

  function resetDemoConnections() {
    demoConnections = new Set(DEFAULT_DEMO_CONNECTIONS);
    try { window.localStorage.removeItem(CONNECTOR_STORAGE_KEY); } catch (_error) { /* Keep the in-memory demo reset. */ }
  }

  const transient = {
    sourceForm: new Set(),
    taskForm: new Set(),
    manualProposalForm: new Set(),
    decisionForm: new Set(),
    completionForms: new Set(),
    reassignForms: new Set(),
    correctionForms: new Set(),
    selectedText: Object.create(null),
    noticeTimer: 0
  };

  function renderStorageBanner() {
    const base = storage.persistent
      ? "Demo data saved in this browser only. In production, context records are shared across your team."
      : "This demo is running in memory only; changes will be lost when you leave this page. In production, context records are shared across your team.";
    storageBanner.textContent = storage.warning ? `${base} ${storage.warning}` : base;
  }

  function saveState() {
    state.schemaVersion = SCHEMA_VERSION;
    storage.save(state);
    renderStorageBanner();
  }

  function showMessage(message) {
    window.clearTimeout(transient.noticeTimer);
    appMessage.replaceChildren(
      node("span", {}, message),
      button("Dismiss", () => appMessage.replaceChildren(), "notice-dismiss")
    );
  }

  function clearMessage() {
    appMessage.replaceChildren();
  }

  function recordById(id) {
    return state.records.find((record) => record.id === id) || null;
  }

  function sourceById(record, sourceId) {
    return record.sources.find((source) => source.id === sourceId) || null;
  }

  function factById(record, factId) {
    return record.facts.find((fact) => fact.id === factId) || null;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function addHistory(record, type, message, actor = CURRENT_USER, at = nowIso()) {
    state.history.unshift({
      id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      recordId: record.id,
      type,
      message,
      actor,
      at
    });
  }

  function attachCrestlineSampleProposals(record, source) {
    if (!record || record.id !== CRESTLINE_ID) return;
    if (!record.uncertainties.some((item) => item.id === "written-confirmation")) {
      record.uncertainties.push({ id: "written-confirmation", label: "Written confirmation", note: "The synthetic rate card requests written confirmation within 14 days. A follow-up is assigned locally; the demo does not send a response.", status: "open", blocksStatus: false });
    }
    const proposalSpecs = [
      { factId: "standard-rate", factLabel: "Standard transfer rate", category: "Rate", proposedValue: "$47.00", excerpt: "Standard transfer: $47.00." },
      { factId: "priority-rate", factLabel: "Priority transfer rate", category: "Rate", proposedValue: "$75.00", excerpt: "Priority transfer: $75.00." },
      { factId: "fuel-surcharge", factLabel: "Fuel surcharge", category: "Condition", proposedValue: "Removed", excerpt: "Fuel surcharge removed." }
    ];
    proposalSpecs.forEach((spec) => {
      const currentFact = factById(record, spec.factId);
      record.proposals.unshift({
        id: `proposal-${Date.now()}-${spec.factId}`,
        ...spec,
        sourceId: source.id,
        currentValue: currentFact ? currentFact.value : "No current value recorded",
        currentSourceId: currentFact ? currentFact.sourceId : "",
        status: "pending",
        createdAt: source.createdAt,
        reviewedAt: "",
        reviewNote: "",
        correctionValue: "",
        prewritten: true
      });
    });
    source.supportsFactIds = proposalSpecs.map((spec) => spec.factId);
    addHistory(record, "Conflict surfaced", "Finance costing model references $42.00 / $68.00. The new Crestline rate card states $47.00 / $75.00. Human review is required before a decision.", "Thread demo");
  }

  function statusFor(record) {
    if (record.decisions.length) return "Decision recorded";
    if (record.proposals.some((proposal) => proposal.status === "pending" || proposal.status === "unsure")) return "Needs review";
    if (record.uncertainties.some((item) => item.status === "open" && item.blocksStatus !== false)) return "Needs review";
    return record.defaultStatus || "Decision pending";
  }

  function statusClass(status) {
    if (status === "Decision pending") return "pending";
    if (status === "Needs review") return "review";
    if (status === "Decision recorded") return "recorded";
    if (status === "Up to date") return "current";
    return "blocked";
  }

  function statusPill(status) {
    return node("span", { className: `status-pill ${statusClass(status)}` }, status);
  }

  function taskStatus(task) {
    if (task.status === "done") return "Done";
    if (task.status === "reassigned") return "Reassigned";
    return "Open";
  }

  function dateLabel(dateValue) {
    if (!dateValue) return "No due date";
    const date = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function timestampLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Time not available";
    const delta = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(delta / 60000);
    const hours = Math.floor(delta / 3600000);
    const days = Math.floor(delta / 86400000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const sameDay = new Date().toDateString() === date.toDateString();
    if (sameDay) return `Today at ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date)}`;
    if (days === 1) return `Yesterday at ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date)}`;
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function dateSortValue(value) {
    const date = new Date(`${value || "9999-12-31"}T12:00:00`);
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
  }

  function setPage(heading, description, meta = "", eyebrow = "AX WORKSPACE · LOCAL DEMO") {
    title.textContent = heading;
    subtitle.textContent = description;
    pageMeta.textContent = meta;
    if (pageEyebrow) pageEyebrow.textContent = eyebrow;
  }

  function setNav(activeView) {
    document.querySelectorAll(".nav").forEach((navButton) => {
      const active = navButton.dataset.view === activeView;
      navButton.classList.toggle("active", active);
      navButton.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  function go(hash) {
    if (window.location.hash === hash) renderApp();
    else window.location.hash = hash;
  }

  function goToRecord(recordId) {
    go(`#record/${encodeURIComponent(recordId)}`);
  }

  function panel(heading, helperText, body) {
    return node("section", { className: "panel" },
      node("div", { className: "panel-head" },
        node("div", {}, node("h2", {}, heading), helperText ? node("p", {}, helperText) : null)
      ),
      node("div", { className: "panel-body" }, body)
    );
  }

  function emptyState(message, nextStep) {
    return node("div", { className: "empty" }, node("strong", {}, message), nextStep ? node("p", {}, nextStep) : null);
  }

  function metric(value, label) {
    return node("div", { className: "metric" }, node("b", {}, String(value)), node("span", {}, label));
  }

  function recordCard(record) {
    const openTaskCount = record.tasks.filter((task) => task.status !== "done").length;
    const card = node("article", { className: "record-card" },
      node("div", { className: "card-top" },
        node("div", {}, node("div", { className: "card-category" }, record.category), node("h3", {}, record.title)),
        statusPill(statusFor(record))
      ),
      node("p", {}, record.summary),
      node("div", { className: "card-meta" },
        node("span", {}, `Owner: ${record.owner}`),
        node("span", {}, `${record.sources.length} source${record.sources.length === 1 ? "" : "s"}`),
        node("span", {}, `${openTaskCount} open task${openTaskCount === 1 ? "" : "s"}`)
      ),
      node("div", { className: "task-actions" }, button("Open context record →", () => goToRecord(record.id), "btn primary"))
    );
    return card;
  }

  function taskCard(task, record, compact = false) {
    const card = node("article", { className: "task-card" });
    const top = node("div", { className: "task-top" },
      node("div", {}, node("h4", {}, task.title), node("p", {}, record.title)),
      node("span", { className: task.status === "done" ? "task-done" : "type-pill" }, taskStatus(task))
    );
    card.appendChild(top);
    card.appendChild(node("div", { className: "card-meta" },
      node("span", {}, `Owner: ${task.owner}`),
      node("span", {}, `Due ${dateLabel(task.dueDate)}`)
    ));
    if (task.status === "done") {
      card.appendChild(node("p", {}, `Completed ${timestampLabel(task.completedAt)}${task.completionNote ? ` · ${task.completionNote}` : ""}`));
    } else {
      const actions = node("div", { className: "task-actions" });
      if (!compact) {
        actions.appendChild(button(transient.completionForms.has(task.id) ? "Close completion note" : "Complete task", () => {
          transient.completionForms.has(task.id) ? transient.completionForms.delete(task.id) : transient.completionForms.add(task.id);
          renderApp();
        }, "btn primary"));
      }
      actions.appendChild(button(transient.reassignForms.has(task.id) ? "Close reassignment" : "Reassign", () => {
        transient.reassignForms.has(task.id) ? transient.reassignForms.delete(task.id) : transient.reassignForms.add(task.id);
        renderApp();
      }, "btn"));
      card.appendChild(actions);
      if (transient.completionForms.has(task.id)) card.appendChild(completionForm(task, record));
      if (transient.reassignForms.has(task.id)) card.appendChild(reassignmentForm(task, record));
    }
    return card;
  }

  function completionForm(task, record) {
    const form = node("form", { className: "inline-form" });
    const note = node("textarea", { id: `completion-${task.id}`, required: true, maxlength: "3000", placeholder: "Record what happened or what was confirmed." });
    form.appendChild(field("Completion note (required)", note, note.id));
    form.appendChild(node("div", { className: "helper" }, "The note is saved with this task in this browser."));
    form.appendChild(node("div", { className: "task-actions" },
      node("button", { type: "submit", className: "btn primary" }, "Save note and complete"),
      button("Cancel", () => { transient.completionForms.delete(task.id); renderApp(); }, "btn")
    ));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = note.value.trim();
      if (!text) {
        note.setCustomValidity("Add a completion note before marking this task done.");
        note.reportValidity();
        return;
      }
      note.setCustomValidity("");
      const completedAt = nowIso();
      task.status = "done";
      task.completionNote = text;
      task.completedAt = completedAt;
      addHistory(record, "Task completed", `${task.title} was completed by ${CURRENT_USER}. Note: ${text}`);
      transient.completionForms.delete(task.id);
      saveState();
      showMessage("Task completed and saved in this browser.");
      renderApp();
    });
    return form;
  }

  function ownerSelect(id, selected) {
    const select = node("select", { id, required: true }, TEAM.map((member) => node("option", { value: member }, member)));
    select.value = selected;
    return select;
  }

  function reassignmentForm(task, record) {
    const form = node("form", { className: "inline-form" });
    const owner = ownerSelect(`reassign-owner-${task.id}`, task.owner);
    form.appendChild(field("New owner", owner, owner.id));
    form.appendChild(node("div", { className: "task-actions" },
      node("button", { type: "submit", className: "btn primary" }, "Save assignment"),
      button("Cancel", () => { transient.reassignForms.delete(task.id); renderApp(); }, "btn")
    ));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const previousOwner = task.owner;
      task.owner = owner.value;
      task.status = "reassigned";
      task.assignedAt = nowIso();
      addHistory(record, "Task assigned", `${task.title} was reassigned from ${previousOwner} to ${task.owner} by ${CURRENT_USER}.`);
      transient.reassignForms.delete(task.id);
      saveState();
      showMessage(`Task saved. In production, ${task.owner} would receive a notification. This demo records the assignment locally only — nothing was sent.`);
      renderApp();
    });
    return form;
  }

  function renderToday() {
    const decisionRank = { "Decision pending": 0, "Needs review": 1, "Decision recorded": 2, "Up to date": 3, "Blocked": 4 };
    const attentionRecords = [...state.records]
      .filter((record) => statusFor(record) !== "Decision recorded" && statusFor(record) !== "Up to date")
      .sort((a, b) => (decisionRank[statusFor(a)] ?? 9) - (decisionRank[statusFor(b)] ?? 9));
    const openTasks = state.records.flatMap((record) => record.tasks
      .filter((task) => task.status !== "done")
      .map((task) => ({ task, record })))
      .sort((a, b) => dateSortValue(a.task.dueDate) - dateSortValue(b.task.dueDate));
    const pendingCount = state.records.filter((record) => statusFor(record) === "Decision pending").length;
    const reviewCount = state.records.filter((record) => statusFor(record) === "Needs review").length;

    setPage("Today", "Operational context that needs a decision or follow-up.", `${state.records.length} context records`);
    const hero = node("div", { className: "hero-panel" },
      node("div", {}, node("h2", {}, "Start with the work that needs a human decision."), node("p", {}, "Open the synthetic Crestline rate record, add the sample source, review each fact, and record a team decision. All changes stay in this browser.")),
      node("div", { className: "hero-actions" }, button("Open Crestline rate record", () => goToRecord(CRESTLINE_ID), "btn primary"))
    );
    const metrics = node("div", { className: "metrics" },
      metric(pendingCount, "Decisions pending"),
      metric(reviewCount, "Needs review"),
      metric(openTasks.length, "Open follow-up tasks")
    );
    const recordsBody = attentionRecords.length
      ? node("div", { className: "stack" }, attentionRecords.map(recordCard))
      : emptyState("No records need a decision right now.", "Open Context to review the current records.");
    const taskBody = openTasks.length
      ? node("div", { className: "task-list" }, openTasks.slice(0, 5).map(({ task, record }) => taskCard(task, record, true)))
      : emptyState("No open tasks.", "Create a follow-up task from a context record when work remains.");
    const columns = node("div", { className: "columns" },
      panel("Needs attention", "Decision pending first, then records that need review.", recordsBody),
      panel("Follow-up due", "Open tasks ordered by due date.", taskBody)
    );
    view.replaceChildren(hero, metrics, columns, node("p", { className: "footer-note" }, "Synthetic operational scenarios only. No source system, notification, email, or other external service is contacted by this demo."));
  }

  function renderWork() {
    setPage("My Work", "Follow-up tasks assigned to the selected demo team member.");
    const selected = TEAM.includes(state.selectedMember) ? state.selectedMember : CURRENT_USER;
    const selector = ownerSelect("member-view", selected);
    selector.addEventListener("change", () => {
      state.selectedMember = selector.value;
      saveState();
      renderApp();
    });
    const switcher = node("div", { className: "inline-form" },
      node("div", { className: "form-grid" }, field("Viewing tasks for:", selector, selector.id)),
      node("p", { className: "helper" }, "Demo view only — this is not authentication. In production, each person sees their own work after signing in.")
    );
    const tasks = state.records.flatMap((record) => record.tasks
      .filter((task) => task.owner === selected)
      .map((task) => ({ task, record })))
      .sort((a, b) => dateSortValue(a.task.dueDate) - dateSortValue(b.task.dueDate));
    const openCount = tasks.filter(({ task }) => task.status !== "done").length;
    const doneCount = tasks.length - openCount;
    const metrics = node("div", { className: "metrics" }, metric(openCount, "Open tasks"), metric(doneCount, "Completed tasks"), metric(tasks.length, "Total assigned"));
    const taskBody = tasks.length
      ? node("div", { className: "task-list" }, tasks.map(({ task, record }) => taskCard(task, record)))
      : emptyState(`No tasks assigned to ${selected}.`, "Switch to another demo team member or add a follow-up task from a context record.");
    view.replaceChildren(switcher, metrics, panel("Assigned tasks", "Complete an open task with a note, or reassign it to another demo owner.", taskBody));
  }

  function renderContext() {
    setPage("Context", "AX Memory records the sources, facts, decisions, uncertainty, and work behind each operational issue.", `${state.records.length} synthetic records`);
    view.replaceChildren(node("div", { className: "context-list" }, state.records.map(recordCard)), node("p", { className: "footer-note" }, "In this MVP, AX Memory is browser-local. Production sharing and team permissions require a real backend."));
  }


  function simulateIntegrationSync(recordId, requiredApps, source, summary) {
    if (!requiredApps.every((appId) => demoConnections.has(appId))) {
      showMessage("Connect the required demo apps first. No external account connection is available in this prototype.");
      return;
    }
    const record = recordById(recordId);
    if (!record) return;
    if (sourceById(record, source.id)) {
      searchInput.value = "";
      showMessage("This sample sync is already in AX Memory. Opening its context record.");
      goToRecord(recordId);
      return;
    }
    record.sources.unshift(source);
    if (recordId === CRESTLINE_ID) attachCrestlineSampleProposals(record, source);
    addHistory(record, "Source added", `${source.title} was added to AX Memory by the simulated connector workflow.`, "Demo connector");
    addHistory(record, "Integration sync", summary, "Demo connector");
    saveState();
    searchInput.value = "";
    showMessage("Simulated sync complete. Source evidence and review work were added locally; no external account or live system was contacted.");
    goToRecord(recordId);
  }

  function runCrestlineIntegrationSync() {
    simulateIntegrationSync(CRESTLINE_ID, ["microsoft-outlook", "google-sheets"], {
      id: "source-demo-connectors-crestline",
      type: "Simulated Outlook + Sheets sync",
      title: "Outlook rate-card email synced — Crestline Logistics, 29 Sep 2026",
      date: SAMPLE_DATE,
      body: SAMPLE_BODY,
      supportsFactIds: [],
      createdAt: nowIso(),
      createdBy: "Demo connector flow",
      sample: true
    }, "Microsoft Outlook supplied the revised rate-card email and Google Sheets supplied the existing finance baseline. Thread linked the new source to three proposed fact changes for human review.");
  }

  function runInventoryIntegrationSync() {
    simulateIntegrationSync("bin-location-7c-variance", ["netsuite", "google-sheets"], {
      id: "source-demo-connectors-bin7c",
      type: "Simulated NetSuite + Sheets sync",
      title: "NetSuite + cycle-count sync — Bin Location 7C, 30 Sep 2026",
      date: "2026-09-30",
      body: "NetSuite on-hand quantity: 360 units.\nWarehouse cycle count: 315 units.\nDifference: 45 units (12.5%).\nCause has not been verified.\n[SYNTHETIC DEMO CONTENT — no live inventory system was accessed]",
      supportsFactIds: ["system-quantity", "physical-count", "quantity-difference"],
      createdAt: nowIso(),
      createdBy: "Demo connector flow",
      sample: true
    }, "NetSuite and a cycle-count spreadsheet were represented as connected sources. The simulated sync preserved the 360-versus-315 discrepancy and left the cause unverified for human investigation.");
  }

  function renderIntegrationCard(app, refreshCatalog) {
    const connected = demoConnections.has(app.id);
    const card = node("article", { className: "connector-card" },
      node("div", { className: "connector-card-top" },
        node("span", { className: "connector-icon", style: `background:${app.color}` }, app.icon),
        node("div", { className: "connector-ident" }, node("h3", {}, app.name), node("small", {}, app.category))
      ),
      node("span", { className: `connector-state${connected ? " is-connected" : ""}` }, connected ? "Connected in demo" : "Available in concept"),
      node("p", { className: "connector-description" }, app.description),
      node("div", { className: "connector-scope" }, app.data.map((item) => node("span", {}, item))),
      button(connected ? "Disconnect demo" : "Connect in demo", () => {
        if (connected) demoConnections.delete(app.id);
        else demoConnections.add(app.id);
        saveDemoConnections();
        showMessage(`${app.name} is marked ${connected ? "not connected" : "connected"} in this local simulation. No account or data was accessed.`);
        refreshCatalog();
      }, connected ? "btn" : "btn primary")
    );
    return card;
  }

  function renderIntegrations() {
    setPage("Integration library", "Browse the work systems Thread is designed to bring into shared, source-linked context.", `${INTEGRATION_APPS.length} representative examples · 1,000+ target`, "INTEGRATION ECOSYSTEM · LOCAL SIMULATION");
    const connectedValue = node("b", {}, String(demoConnections.size));
    const summaryMetrics = node("div", { className: "metrics" },
      metric("1,000+", "Ecosystem target · roadmap"),
      metric(INTEGRATION_APPS.length, "Representative app cards shown"),
      node("div", { className: "metric" }, connectedValue, node("span", {}, "Simulated connections"))
    );

    const hero = node("section", { className: "integration-hero" },
      node("div", { className: "eyebrow" }, "INTEGRATION ECOSYSTEM · CLICKABLE SIMULATION"),
      node("h2", {}, "One context layer across the apps teams already use."),
      node("p", {}, "Explore a representative catalog across communication, documents, work management, finance, customer support, data, and operations. Connect sample apps, then run a workflow that brings source evidence into AX Memory and routes it to AX Workspace."),
      node("div", { className: "integration-proof" },
        node("span", {}, `${INTEGRATION_APPS.length} representative apps shown`),
        node("span", {}, "6 work categories"),
        node("span", {}, "No live account access")
      )
    );
    const flow = node("section", { className: "integration-flow" },
      node("div", {}, node("h3", {}, "What happens after a source changes"), node("p", {}, "The connector brings evidence in. Thread preserves where it came from and gives the team a reviewable next step.")),
      node("div", { className: "integration-flow-row" },
        node("div", { className: "integration-flow-node" }, node("b", {}, "Connected apps"), node("small", {}, "Read / receive")),
        node("span", { className: "integration-flow-arrow", "aria-hidden": "true" }, "→"),
        node("div", { className: "integration-flow-node" }, node("b", {}, "AX Memory"), node("small", {}, "Source + history")),
        node("span", { className: "integration-flow-arrow", "aria-hidden": "true" }, "→"),
        node("div", { className: "integration-flow-node" }, node("b", {}, "AX Workspace"), node("small", {}, "Review + follow-up"))
      )
    );
    const overview = node("div", { className: "integration-overview" }, hero, flow);

    const crestlineDone = !!sourceById(recordById(CRESTLINE_ID), "source-demo-connectors-crestline");
    const inventoryRecord = recordById("bin-location-7c-variance");
    const inventoryDone = !!sourceById(inventoryRecord, "source-demo-connectors-bin7c");
    const crestlineRun = button("", runCrestlineIntegrationSync, "btn primary");
    const inventoryRun = button("", runInventoryIntegrationSync, "btn primary");
    const crestlineScenario = node("article", { className: "integration-scenario" },
      node("h3", {}, "Supplier rate change · Operations + Finance"),
      node("p", {}, "An updated rate-card email meets the older finance model. Thread shows the source conflict and prepares three facts for human review."),
      node("div", { className: "source-pair" }, node("span", {}, "Microsoft Outlook · supplier email"), node("b", { "aria-hidden": "true" }, "+"), node("span", {}, "Google Sheets · finance baseline")),
      crestlineRun
    );
    const inventoryScenario = node("article", { className: "integration-scenario" },
      node("h3", {}, "Stock variance · Warehouse + Finance"),
      node("p", {}, "An inventory balance and a cycle-count sheet disagree. Thread preserves both values and keeps the cause unverified until a person investigates."),
      node("div", { className: "source-pair" }, node("span", {}, "Oracle NetSuite · system quantity"), node("b", { "aria-hidden": "true" }, "+"), node("span", {}, "Google Sheets · cycle count")),
      inventoryRun
    );
    const scenarios = node("div", { className: "integration-scenarios" }, crestlineScenario, inventoryScenario);

    const search = node("input", { id: "integration-search", type: "search", placeholder: `Search ${INTEGRATION_APPS.length} representative apps`, autocomplete: "off", "aria-label": "Search representative integrations" });
    const category = node("select", { id: "integration-category", "aria-label": "Filter integrations by category" }, [
      node("option", { value: "all" }, "All categories"),
      ...[...new Set(INTEGRATION_APPS.map((app) => app.category))].map((item) => node("option", { value: item }, item))
    ]);
    const status = node("select", { id: "integration-status", "aria-label": "Filter integrations by demo status" }, [
      node("option", { value: "all" }, "All demo states"),
      node("option", { value: "connected" }, "Connected in demo"),
      node("option", { value: "available" }, "Not connected")
    ]);
    const results = node("div", { className: "integration-results", role: "status" });
    const grid = node("div", { className: "connector-grid", "aria-label": "Representative integration examples" });
    const controls = node("div", { className: "integration-controls" }, search, category, status, results);
    const catalog = panel("Browse representative integrations", `The target ecosystem is 1,000+ apps. These ${INTEGRATION_APPS.length} named cards make the concept tangible; search and filters operate on this sample catalog.`, node("div", {}, controls, grid));
    const disclosure = node("p", { className: "integration-disclosure" }, "Prototype boundary: all connector states and sample syncs are simulated and saved only in this browser. No credentials are requested, no external API is called, and no live information is read or written. The 1,000+ figure is a product target, not a count of connectors implemented in this demo.");

    function fillCatalog() {
      const query = search.value.trim().toLowerCase();
      const chosenCategory = category.value;
      const chosenStatus = status.value;
      const filtered = INTEGRATION_APPS.filter((app) => {
        const matchesQuery = `${app.name} ${app.category} ${app.description} ${app.data.join(" ")}`.toLowerCase().includes(query);
        const matchesCategory = chosenCategory === "all" || app.category === chosenCategory;
        const connected = demoConnections.has(app.id);
        const matchesStatus = chosenStatus === "all" || (chosenStatus === "connected" ? connected : !connected);
        return matchesQuery && matchesCategory && matchesStatus;
      });
      results.textContent = `${filtered.length} of ${INTEGRATION_APPS.length} representative apps shown`;
      grid.replaceChildren(...(filtered.length ? filtered.map((app) => renderIntegrationCard(app, fillCatalog)) : [emptyState("No sample integrations match.", "Try another app name or category.")]));
      connectedValue.textContent = String(demoConnections.size);
      const crestlineReady = ["microsoft-outlook", "google-sheets"].every((id) => demoConnections.has(id));
      const inventoryReady = ["netsuite", "google-sheets"].every((id) => demoConnections.has(id));
      crestlineRun.disabled = !crestlineReady;
      inventoryRun.disabled = !inventoryReady;
      crestlineRun.textContent = crestlineDone ? "Open the synced rate review →" : crestlineReady ? "Run simulated sync → open review" : "Connect Outlook + Sheets first";
      inventoryRun.textContent = inventoryDone ? "Open the synced variance review →" : inventoryReady ? "Run simulated sync → open review" : "Connect NetSuite + Sheets first";
    }
    search.addEventListener("input", fillCatalog);
    category.addEventListener("change", fillCatalog);
    status.addEventListener("change", fillCatalog);
    fillCatalog();
    view.replaceChildren(summaryMetrics, overview, scenarios, catalog, disclosure);
  }

  function sourceLabel(record, sourceId) {
    const source = sourceById(record, sourceId);
    return source ? source.title : "Source not available";
  }

  function recordToolbar(record) {
    return node("div", { className: "detail-toolbar" },
      button("← Back to Today", () => go("#today"), "btn subtle"),
      node("span", { className: "helper" }, `Record owner: ${record.owner} · ${record.category}`)
    );
  }

  function sourceCard(record, source) {
    const sourceText = node("div", {
      className: "source-text",
      tabindex: "0",
      onMouseup: () => captureSelection(source.id),
      onKeyup: () => captureSelection(source.id)
    }, source.body);
    return node("article", { className: "source-card", id: `source-${source.id}` },
      node("div", { className: "card-top" }, node("div", {}, node("h4", {}, source.title), node("div", { className: "card-meta" }, node("span", {}, source.type), node("span", {}, dateLabel(source.date)))), node("span", { className: "type-pill" }, source.type.startsWith("Simulated") ? "Connector simulation" : source.sample ? "Synthetic sample" : "Synthetic source")),
      node("p", {}, `Added by ${source.createdBy} · ${timestampLabel(source.createdAt)}`),
      sourceText,
      node("div", { className: "helper" }, source.type.startsWith("Simulated")
        ? "This source came from a local connector simulation. No external data was fetched; any suggested facts are pre-written for this demo."
        : "Select text in this source if you want to create a manual proposal. No automated extraction runs for manually added sources.")
    );
  }

  function captureSelection(sourceId) {
    const selection = window.getSelection ? window.getSelection().toString().trim() : "";
    if (selection) transient.selectedText[sourceId] = selection;
  }

  function sourceForm(record) {
    const form = node("form", { className: "inline-form" });
    const sourceType = node("select", { id: `source-type-${record.id}`, required: true }, [
      node("option", { value: "Meeting note" }, "Meeting note"),
      node("option", { value: "Pasted text" }, "Pasted text"),
      node("option", { value: "Local demo event" }, "Local demo event")
    ]);
    sourceType.value = "Local demo event";
    const sourceTitle = node("input", { id: `source-title-${record.id}`, required: true, maxlength: "180", value: SAMPLE_TITLE });
    const sourceDate = node("input", { id: `source-date-${record.id}`, type: "date", required: true, value: SAMPLE_DATE });
    const sourceBody = node("textarea", { id: `source-body-${record.id}`, required: true, maxlength: "12000", value: SAMPLE_BODY });
    const bodyHelp = node("div", { className: "helper" }, "Synthetic sample is pre-filled for one-click use. Choose another source type or edit the text to add your own synthetic source.");
    const localEventNote = node("div", { className: "disclosure" }, "In production, Thread can receive updates from connected spreadsheets or inboxes. This demo records the event locally only — no external source was contacted.");
    const sampleButton = button("Restore the synthetic sample", () => {
      sourceType.value = "Local demo event";
      sourceTitle.value = SAMPLE_TITLE;
      sourceDate.value = SAMPLE_DATE;
      sourceBody.value = SAMPLE_BODY;
      bodyHelp.textContent = "Synthetic sample restored. Add it to create the pre-written fact proposals.";
      localEventNote.hidden = false;
    }, "btn");
    sourceType.addEventListener("change", () => { localEventNote.hidden = sourceType.value !== "Local demo event"; });
    form.append(
      node("div", { className: "form-grid" },
        field("Source type", sourceType, sourceType.id),
        field("Source date", sourceDate, sourceDate.id),
        field("Source title", sourceTitle, sourceTitle.id),
        node("div", { className: "field" }, node("span", { className: "field-label" }, "Synthetic sample"), sampleButton),
        node("div", { className: "field full" }, node("span", { className: "field-label" }, "Local event boundary"), localEventNote),
        node("div", { className: "field full" }, node("span", { className: "field-label" }, "Source text"), sourceBody, bodyHelp)
      ),
      node("p", { className: "form-error", hidden: true }),
      node("div", { className: "task-actions" },
        node("button", { type: "submit", className: "btn primary" }, "Add source"),
        button("Cancel", () => { transient.sourceForm.delete(record.id); renderApp(); }, "btn")
      )
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = sourceBody.value.trim();
      const error = $(".form-error", form);
      if (!text) {
        error.hidden = false;
        error.textContent = "Add source text before saving this source.";
        sourceBody.focus();
        return;
      }
      if (!sourceTitle.value.trim()) {
        error.hidden = false;
        error.textContent = "Add a source title before saving.";
        sourceTitle.focus();
        return;
      }
      error.hidden = true;
      const isSample = sourceType.value === "Local demo event" && sourceTitle.value.trim() === SAMPLE_TITLE && sourceDate.value === SAMPLE_DATE && text === SAMPLE_BODY;
      const source = {
        id: `source-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: sourceType.value,
        title: sourceTitle.value.trim(),
        date: sourceDate.value,
        body: text,
        supportsFactIds: [],
        createdAt: nowIso(),
        createdBy: CURRENT_USER,
        sample: isSample
      };
      record.sources.unshift(source);
      addHistory(record, "Source added", `${source.title} was added to ${record.title} by ${CURRENT_USER}.`);
      if (isSample && record.id === CRESTLINE_ID) attachCrestlineSampleProposals(record, source);
      transient.sourceForm.delete(record.id);
      saveState();
      if (source.type === "Local demo event") {
        showMessage("Demo: local state updated — in production this change would arrive from a connected source.");
      } else if (isSample) {
        showMessage("Synthetic sample source added. The demo did not contact an external source.");
      } else {
        showMessage("Source saved locally. No automated extraction or external source connection was used.");
      }
      renderApp();
    });
    return form;
  }

  function proposalStatusLabel(status) {
    return ({ pending: "Pending review", unsure: "Not sure yet", accepted: "Accepted", corrected: "Corrected", rejected: "Rejected" })[status] || "Pending review";
  }

  function openSource(record, sourceId) {
    const source = $(`#source-${CSS.escape(sourceId)}`);
    if (source) source.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function proposalCard(record, proposal) {
    const source = sourceById(record, proposal.sourceId);
    const currentSource = sourceById(record, proposal.currentSourceId);
    const article = node("article", { className: "proposal-card" });
    const status = proposalStatusLabel(proposal.status);
    article.appendChild(node("div", { className: "card-top" },
      node("div", {}, node("h4", {}, proposal.factLabel), node("div", { className: "card-meta" }, node("span", {}, proposal.category), node("span", {}, status))),
      proposal.prewritten ? node("span", { className: "type-pill" }, "Suggested (pre-written for this demo; no AI is running)") : node("span", { className: "type-pill" }, "Manual proposal")
    ));
    const conflict = node("div", { className: "conflict-grid" },
      node("div", { className: "conflict-side current" },
        node("small", {}, "Current value at review"),
        node("strong", {}, proposal.currentValue),
        node("div", { className: "small-copy" }, currentSource ? `Source: ${currentSource.title}` : "No prior source is recorded.")
      ),
      node("div", { className: "conflict-side proposed" },
        node("small", {}, "Proposed value"),
        node("strong", {}, proposal.status === "corrected" ? proposal.correctionValue : proposal.proposedValue),
        node("div", { className: "small-copy" }, `Source: ${source ? source.title : "Source not available"}`)
      )
    );
    article.appendChild(conflict);
    article.appendChild(node("p", {}, "Exact source excerpt"));
    article.appendChild(node("div", { className: "excerpt" }, proposal.excerpt));
    if (source) article.appendChild(button(`View source: ${source.title}`, () => openSource(record, source.id), "link-button"));
    if (proposal.reviewedAt) article.appendChild(node("p", { className: "small-copy" }, `Reviewed by ${proposal.reviewedBy || CURRENT_USER} · ${timestampLabel(proposal.reviewedAt)}${proposal.reviewNote ? ` · Note: ${proposal.reviewNote}` : ""}`));

    if (proposal.status === "pending" || proposal.status === "unsure") {
      const reviewNote = node("textarea", { id: `proposal-note-${proposal.id}`, maxlength: "3000", placeholder: "Optional review note" });
      article.appendChild(field("Review note (optional)", reviewNote, reviewNote.id));
      if (transient.correctionForms.has(proposal.id)) {
        const correction = node("input", { id: `proposal-correction-${proposal.id}`, required: true, maxlength: "240", value: proposal.proposedValue });
        article.appendChild(field("Corrected value", correction, correction.id));
        article.appendChild(node("div", { className: "proposal-actions" },
          button("Save corrected value", () => {
            const value = correction.value.trim();
            if (!value) {
              correction.setCustomValidity("Enter the corrected value.");
              correction.reportValidity();
              return;
            }
            correction.setCustomValidity("");
            reviewProposal(record, proposal, "corrected", value, reviewNote.value.trim());
          }, "btn primary"),
          button("Cancel correction", () => { transient.correctionForms.delete(proposal.id); renderApp(); }, "btn")
        ));
      } else {
        article.appendChild(node("div", { className: "proposal-actions" },
          button("Accept", () => reviewProposal(record, proposal, "accepted", proposal.proposedValue, reviewNote.value.trim()), "btn primary"),
          button("Accept with correction", () => { transient.correctionForms.add(proposal.id); renderApp(); }, "btn"),
          button("Reject", () => reviewProposal(record, proposal, "rejected", "", reviewNote.value.trim()), "btn"),
          button("Not sure yet", () => reviewProposal(record, proposal, "unsure", "", reviewNote.value.trim()), "btn")
        ));
      }
    }
    return article;
  }

  function reviewProposal(record, proposal, decision, value, note) {
    const reviewedAt = nowIso();
    proposal.status = decision;
    proposal.reviewedAt = reviewedAt;
    proposal.reviewedBy = CURRENT_USER;
    proposal.reviewNote = note || "";
    if (decision === "accepted" || decision === "corrected") {
      const actualValue = decision === "corrected" ? value : proposal.proposedValue;
      let fact = factById(record, proposal.factId);
      if (!fact) {
        fact = { id: proposal.factId, label: proposal.factLabel, value: actualValue, sourceId: proposal.sourceId, confirmedBy: CURRENT_USER, confirmedAt: reviewedAt, previousValues: [] };
        record.facts.push(fact);
      } else {
        fact.previousValues = Array.isArray(fact.previousValues) ? fact.previousValues : [];
        fact.previousValues.unshift({ value: fact.value, sourceId: fact.sourceId, confirmedBy: fact.confirmedBy, confirmedAt: fact.confirmedAt });
        fact.value = actualValue;
        fact.sourceId = proposal.sourceId;
        fact.confirmedBy = CURRENT_USER;
        fact.confirmedAt = reviewedAt;
      }
      if (decision === "corrected") proposal.correctionValue = actualValue;
      const uncertainty = record.uncertainties.find((item) => item.id === proposal.factId);
      if (uncertainty) {
        uncertainty.status = "resolved";
        uncertainty.resolution = actualValue;
        uncertainty.resolvedAt = reviewedAt;
      }
    }
    const verb = ({ accepted: "accepted", corrected: "corrected", rejected: "rejected", unsure: "marked as not sure yet" })[decision];
    const detail = decision === "accepted" ? ` as ${value}` : decision === "corrected" ? ` to ${value}` : "";
    addHistory(record, "Fact update reviewed", `${CURRENT_USER} ${verb} the ${proposal.factLabel} proposal${detail}.${note ? ` Note: ${note}` : ""}`);
    transient.correctionForms.delete(proposal.id);
    saveState();
    showMessage("Fact review saved in this browser. The team still controls the final operational decision.");
    renderApp();
  }

  function manualProposalForm(record) {
    const form = node("form", { className: "inline-form" });
    const sourceSelect = node("select", { id: `manual-source-${record.id}`, required: true }, record.sources.map((source) => node("option", { value: source.id }, source.title)));
    const category = node("select", { id: `manual-category-${record.id}`, required: true }, ["Rate", "Date", "Commitment", "Condition", "Other"].map((name) => node("option", { value: name }, name)));
    const factLabel = node("input", { id: `manual-label-${record.id}`, required: true, maxlength: "120", placeholder: "For example, Variance cause" });
    const value = node("input", { id: `manual-value-${record.id}`, required: true, maxlength: "240", placeholder: "Proposed value" });
    const excerpt = node("textarea", { id: `manual-excerpt-${record.id}`, required: true, maxlength: "3000", placeholder: "Paste the exact excerpt selected from the source." });
    const useSelection = button("Use selected text from source", () => {
      const text = transient.selectedText[sourceSelect.value] || (window.getSelection ? window.getSelection().toString().trim() : "");
      if (!text) {
        showMessage("Select text in the source above, then choose Use selected text from source.");
        return;
      }
      excerpt.value = text;
      transient.selectedText[sourceSelect.value] = text;
    }, "btn");
    form.append(
      node("div", { className: "form-grid" },
        field("Source", sourceSelect, sourceSelect.id),
        field("Category", category, category.id),
        field("Context fact", factLabel, factLabel.id),
        field("Proposed value", value, value.id),
        node("div", { className: "field full" }, node("span", { className: "field-label" }, "Exact excerpt"), excerpt, useSelection, node("span", { className: "helper" }, "Manual proposals are created only from the text you select or enter. No automated extraction runs."))
      ),
      node("p", { className: "form-error", hidden: true }),
      node("div", { className: "task-actions" },
        node("button", { type: "submit", className: "btn primary" }, "Create proposal for review"),
        button("Cancel", () => { transient.manualProposalForm.delete(record.id); renderApp(); }, "btn")
      )
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!excerpt.value.trim()) {
        const error = $(".form-error", form);
        error.hidden = false;
        error.textContent = "Add the source excerpt before creating a proposal.";
        excerpt.focus();
        return;
      }
      const factText = factLabel.value.trim();
      const matched = record.facts.find((fact) => fact.label.toLowerCase() === factText.toLowerCase());
      const uncertainty = record.uncertainties.find((item) => item.label.toLowerCase() === factText.toLowerCase());
      const source = sourceById(record, sourceSelect.value);
      const factId = matched ? matched.id : uncertainty ? uncertainty.id : `manual-${factText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "fact"}`;
      const currentFact = matched || (uncertainty && record.facts.find((fact) => fact.id === uncertainty.id));
      const proposal = {
        id: `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        factId,
        factLabel: factText,
        category: category.value,
        proposedValue: value.value.trim(),
        excerpt: excerpt.value.trim(),
        sourceId: source.id,
        currentValue: currentFact ? currentFact.value : "No current value recorded",
        currentSourceId: currentFact ? currentFact.sourceId : "",
        status: "pending",
        createdAt: nowIso(),
        reviewedAt: "",
        reviewNote: "",
        correctionValue: "",
        prewritten: false
      };
      record.proposals.unshift(proposal);
      if (!Array.isArray(source.supportsFactIds)) source.supportsFactIds = [];
      if (!source.supportsFactIds.includes(factId)) source.supportsFactIds.push(factId);
      if (currentFact && currentFact.value !== proposal.proposedValue) {
        addHistory(record, "Conflict surfaced", `${factText} has a proposed value that differs from the current context. Human review is required.`);
      }
      addHistory(record, "Fact update reviewed", `${CURRENT_USER} created a manual proposal for ${factText} from ${source.title}.`);
      transient.manualProposalForm.delete(record.id);
      saveState();
      showMessage("Manual proposal saved for human review. No automated extraction ran.");
      renderApp();
    });
    return form;
  }

  function sourceAddSection(record) {
    const sources = record.sources.length
      ? node("div", { className: "source-list" }, record.sources.map((source) => sourceCard(record, source)))
      : emptyState("No sources have been added yet.", "Add a source so the team can review where this context came from.");
    return node("div", { className: "section-block" },
      node("div", { className: "section-heading" }, node("div", {}, node("h3", {}, "Sources"), node("p", {}, "Every source is synthetic and stays in this browser.")), button(transient.sourceForm.has(record.id) ? "Close source form" : "Add a source", () => {
        transient.sourceForm.has(record.id) ? transient.sourceForm.delete(record.id) : transient.sourceForm.add(record.id);
        renderApp();
      }, "btn primary")),
      transient.sourceForm.has(record.id) ? sourceForm(record) : null,
      sources,
      node("div", { className: "section-block" },
        node("div", { className: "section-heading" }, node("div", {}, node("h3", {}, "Add a manual proposal"), node("p", {}, "Select a source excerpt and assign it a category and value. Nothing is extracted automatically.")), button(transient.manualProposalForm.has(record.id) ? "Close proposal form" : "Create manual proposal", () => {
          transient.manualProposalForm.has(record.id) ? transient.manualProposalForm.delete(record.id) : transient.manualProposalForm.add(record.id);
          renderApp();
        }, "btn")),
        transient.manualProposalForm.has(record.id) ? manualProposalForm(record) : null
      )
    );
  }

  function factsSection(record) {
    const cards = record.facts.map((fact) => {
      const source = sourceById(record, fact.sourceId);
      const previous = (fact.previousValues || [])[0];
      return node("article", { className: "fact-card" },
        node("h4", {}, fact.label),
        node("div", { className: "fact-value" }, fact.value),
        node("div", { className: "fact-meta" }, `Source: ${source ? source.title : "Source not available"}`),
        node("div", { className: "fact-meta" }, `Confirmed by ${fact.confirmedBy || "Not recorded"} · ${timestampLabel(fact.confirmedAt)}`),
        previous ? node("div", { className: "fact-meta" }, `Previous value: ${previous.value} · ${sourceLabel(record, previous.sourceId)}`) : null
      );
    });
    return node("div", { className: "section-block" },
      node("div", { className: "section-heading" }, node("div", {}, node("h3", {}, "Current facts"), node("p", {}, "Values update only after a person reviews a proposal."))),
      cards.length ? node("div", { className: "fact-list two-col" }, cards) : emptyState("No facts have been recorded yet.", "Add a source and propose a fact for review.")
    );
  }

  function uncertaintySection(record) {
    if (!record.uncertainties.length) return null;
    return node("div", { className: "section-block" },
      node("div", { className: "section-heading" }, node("div", {}, node("h3", {}, "Uncertain or disputed"), node("p", {}, "Open items stay visible until evidence resolves them."))),
      node("div", { className: "fact-list" }, record.uncertainties.map((item) => node("article", { className: "fact-card" },
        node("div", { className: "card-top" }, node("h4", {}, item.label), node("span", { className: item.status === "resolved" ? "status-pill current" : "status-pill review" }, item.status === "resolved" ? "Resolved" : "Open")),
        node("p", {}, item.status === "resolved" ? `Recorded resolution: ${item.resolution || "Evidence added"}` : item.note)
      )))
    );
  }

  function conflictsSection(record) {
    if (!Array.isArray(record.conflicts) || !record.conflicts.length) return null;
    return node("div", { className: "section-block" },
      node("div", { className: "section-heading" }, node("div", {}, node("h3", {}, "Conflicts"), node("p", {}, "Contradicting source values stay visible side by side."))),
      node("div", { className: "stack" }, record.conflicts.map((conflict) => node("article", { className: "proposal-card" },
        node("h4", {}, conflict.label),
        node("div", { className: "conflict-grid" },
          node("div", { className: "conflict-side current" }, node("small", {}, "System record"), node("strong", {}, conflict.leftValue), node("div", { className: "small-copy" }, sourceLabel(record, conflict.leftSourceId))),
          node("div", { className: "conflict-side proposed" }, node("small", {}, "Physical count"), node("strong", {}, conflict.rightValue), node("div", { className: "small-copy" }, sourceLabel(record, conflict.rightSourceId)))
        ),
        node("p", {}, conflict.note)
      )))
    );
  }

  function proposalsSection(record) {
    if (!record.proposals.length) {
      return node("div", { className: "section-block" },
        node("div", { className: "section-heading" }, node("div", {}, node("h3", {}, "Proposed fact updates"), node("p", {}, "New sources can create a proposed change for human review."))),
        emptyState("No proposals are waiting.", "Add the pre-filled Crestline sample source or create a manual proposal from selected source text.")
      );
    }
    const standard = record.proposals.find((proposal) => proposal.factId === "standard-rate");
    const priority = record.proposals.find((proposal) => proposal.factId === "priority-rate");
    let conflictText = "Compare the current value with the source proposal. The record changes only after a human review.";
    if (standard && priority && record.decisions.length === 0) {
      conflictText = `Finance costing model references ${standard.currentValue} / ${priority.currentValue}. New source states ${standard.proposedValue} / ${priority.proposedValue}. A decision is required before either can be treated as current.`;
    } else if (record.decisions.length) {
      conflictText = `A decision was recorded by ${record.decisions[record.decisions.length - 1].actor}. The original source comparison remains visible in the history below.`;
    }
    return node("div", { className: "section-block" },
      node("div", { className: "section-heading" }, node("div", {}, node("h3", {}, "Proposed fact updates"), node("p", {}, "Review each change. Nothing updates the context until you choose an action."))),
      node("div", { className: "notice-card" }, conflictText),
      node("div", { className: "proposal-list", style: "margin-top:10px" }, record.proposals.map((proposal) => proposalCard(record, proposal)))
    );
  }

  const DECISION_OPTIONS = [
    "Accept new rates, effective 01 Nov 2026 — update Finance model, confirm to supplier",
    "Dispute the increase — request extension of current rates while negotiating",
    "Escalate before responding — seek sign-off before committing"
  ];

  function decisionForm(record) {
    const form = node("form", { className: "inline-form" });
    const legend = record.decisions.length ? "Suggested superseding options for this demo" : "Suggested for this demo";
    const fieldset = node("fieldset", {}, node("legend", {}, legend));
    const name = `decision-${record.id}`;
    DECISION_OPTIONS.forEach((option, index) => {
      const input = node("input", { type: "radio", name, value: option, id: `${name}-${index}`, required: true });
      fieldset.appendChild(node("label", { className: "radio-option", htmlFor: input.id }, input, node("span", {}, option)));
    });
    const note = node("textarea", { id: `decision-note-${record.id}`, maxlength: "3000", placeholder: "Optional note or rationale" });
    form.append(
      fieldset,
      field("Decision note (optional)", note, note.id),
      node("div", { className: "helper" }, "The decision is appended to the log and cannot be edited. Add a superseding decision to change it later."),
      node("p", { className: "form-error", hidden: true }),
      node("div", { className: "task-actions" },
        node("button", { type: "submit", className: "btn primary" }, "Record decision"),
        button("Cancel", () => { transient.decisionForm.delete(record.id); renderApp(); }, "btn")
      )
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = $(`input[name="${CSS.escape(name)}"]:checked`, form);
      const error = $(".form-error", form);
      if (!selected) {
        error.hidden = false;
        error.textContent = "Choose one decision before saving.";
        return;
      }
      const decision = { id: `decision-${Date.now()}`, text: selected.value, actor: CURRENT_USER, timestamp: nowIso(), note: note.value.trim(), rationale: note.value.trim() };
      record.decisions.push(decision);
      addHistory(record, "Decision recorded", `${record.title} decision recorded by ${CURRENT_USER}: ${decision.text}${decision.note ? `. Note: ${decision.note}` : ""}`);
      transient.decisionForm.delete(record.id);
      saveState();
      showMessage("Decision recorded in this browser. Thread does not contact a supplier or change an external system.");
      renderApp();
    });
    return form;
  }

  function decisionsSection(record) {
    const decisions = record.decisions.length
      ? node("div", { className: "stack" }, record.decisions.map((decision, index) => node("article", { className: "decision-card" },
        node("div", { className: "card-top" }, node("strong", {}, decision.text), node("span", { className: "type-pill" }, index === 0 ? "Recorded decision" : "Superseding decision")),
        node("p", {}, `Recorded by ${decision.actor} · ${timestampLabel(decision.timestamp)}`),
        decision.note ? node("p", {}, `Note: ${decision.note}`) : null
      )))
      : emptyState("No decision is recorded yet.", "Review the evidence above, then choose an option to add an immutable decision entry.");
    return node("div", { className: "section-block" },
      node("div", { className: "section-heading" }, node("div", {}, node("h3", {}, "Decision log"), node("p", {}, "Decisions are append-only; later decisions supersede earlier ones.")), button(transient.decisionForm.has(record.id) ? "Close decision form" : (record.decisions.length ? "Record superseding decision" : "Record a decision"), () => {
        transient.decisionForm.has(record.id) ? transient.decisionForm.delete(record.id) : transient.decisionForm.add(record.id);
        renderApp();
      }, "btn primary")),
      transient.decisionForm.has(record.id) ? decisionForm(record) : null,
      decisions
    );
  }

  function suggestedTaskForm(record) {
    const form = node("form", { className: "inline-form" });
    const taskTitle = node("input", { id: `task-title-${record.id}`, required: true, maxlength: "180", value: record.id === CRESTLINE_ID ? "Update costing model with confirmed Crestline rates" : "Review source evidence and record investigation result" });
    const owner = ownerSelect(`task-owner-${record.id}`, record.id === CRESTLINE_ID ? "Marco Reyes" : "Jen Loh");
    const due = node("input", { id: `task-due-${record.id}`, type: "date", required: true, value: record.id === CRESTLINE_ID ? "2026-10-30" : "2026-10-09" });
    form.append(
      node("div", { className: "form-grid" },
        field("Task", taskTitle, taskTitle.id),
        field("Owner", owner, owner.id),
        field("Due date", due, due.id)
      ),
      node("div", { className: "helper" }, record.id === CRESTLINE_ID ? "Suggested for this demo: Marco Reyes · 30 Oct 2026, before the 01 Nov effective date." : "Synthetic follow-up task. Choose an owner and due date before saving."),
      node("p", { className: "form-error", hidden: true }),
      node("div", { className: "task-actions" },
        node("button", { type: "submit", className: "btn primary" }, "Save task"),
        button("Cancel", () => { transient.taskForm.delete(record.id); renderApp(); }, "btn")
      )
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!taskTitle.value.trim()) {
        const error = $(".form-error", form);
        error.hidden = false;
        error.textContent = "Enter a task name before saving.";
        taskTitle.focus();
        return;
      }
      const task = { id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: taskTitle.value.trim(), owner: owner.value, dueDate: due.value, status: "open", createdAt: nowIso(), createdBy: CURRENT_USER, completionNote: "", completedAt: "" };
      record.tasks.unshift(task);
      addHistory(record, "Task assigned", `${task.title} was assigned to ${task.owner} by ${CURRENT_USER}.`);
      transient.taskForm.delete(record.id);
      saveState();
      showMessage(`Task saved. In production, ${task.owner} would receive a notification. This demo records the assignment locally only — nothing was sent.`);
      renderApp();
    });
    return form;
  }

  function tasksSection(record) {
    const tasks = [...record.tasks].sort((a, b) => dateSortValue(a.dueDate) - dateSortValue(b.dueDate));
    const taskList = tasks.length
      ? node("div", { className: "task-list" }, tasks.map((task) => taskCard(task, record)))
      : emptyState("No tasks are attached to this record.", "Create a follow-up task after reviewing the evidence.");
    return node("div", { className: "section-block" },
      node("div", { className: "section-heading" }, node("div", {}, node("h3", {}, "Open tasks"), node("p", {}, "Assignments are saved locally; this demo sends no notifications.")), button(transient.taskForm.has(record.id) ? "Close task form" : "Add a follow-up task", () => {
        transient.taskForm.has(record.id) ? transient.taskForm.delete(record.id) : transient.taskForm.add(record.id);
        renderApp();
      }, "btn primary")),
      transient.taskForm.has(record.id) ? suggestedTaskForm(record) : null,
      taskList
    );
  }

  function draftSection(record) {
    const form = node("form", { className: "inline-form" });
    const draft = node("textarea", { id: `draft-${record.id}`, maxlength: "5000", placeholder: "Write a draft for a person to review and send themselves." });
    draft.value = record.draft || "";
    form.append(
      field("Draft for you to copy and send — Thread does not send messages or contact external parties.", draft, draft.id),
      node("div", { className: "task-actions" }, node("button", { type: "submit", className: "btn" }, "Save draft locally")),
      node("div", { className: "helper" }, "There is no send action. The saved draft remains in this browser.")
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      record.draft = draft.value;
      addHistory(record, "Draft saved", `A supplier response draft was saved locally by ${CURRENT_USER}. No message was sent.`);
      saveState();
      showMessage("Draft saved locally. It was not sent or shared.");
      renderApp();
    });
    return node("div", { className: "section-block" },
      node("div", { className: "section-heading" }, node("div", {}, node("h3", {}, "Optional draft"), node("p", {}, "A person remains responsible for copying, reviewing, and sending any message."))),
      form
    );
  }

  function renderRecord(record) {
    setPage("Context record", "Review source evidence, update governed context, and decide what happens next.", statusFor(record));
    const hero = node("div", { className: "detail-summary" },
      node("div", { className: "context-title" }, node("div", {}, node("div", { className: "card-category" }, record.category), node("h2", {}, record.title), node("p", {}, record.summary)), statusPill(statusFor(record))),
      node("div", { className: "card-meta" }, node("span", {}, `Record owner: ${record.owner}`), node("span", {}, `${record.sources.length} source${record.sources.length === 1 ? "" : "s"}`), node("span", {}, `${record.tasks.filter((task) => task.status !== "done").length} open task${record.tasks.filter((task) => task.status !== "done").length === 1 ? "" : "s"}`))
    );
    const sections = [
      recordToolbar(record),
      hero,
      record.sources.some((source) => source.type === "Local demo event") ? node("div", { className: "notice-card" }, "Demo: local state updated — in production this change would arrive from a connected source.") : null,
      factsSection(record),
      conflictsSection(record),
      uncertaintySection(record),
      proposalsSection(record),
      decisionsSection(record),
      tasksSection(record),
      draftSection(record),
      sourceAddSection(record),
      node("p", { className: "footer-note" }, "AX Memory holds the persistent context model; AX Workspace is this review and action surface. In this static MVP, all records and actions stay in one browser. No team sync, real source connectors, notifications, or AI are running.")
    ].filter(Boolean);
    view.replaceChildren(...sections);
  }

  function renderHistory() {
    setPage("History", "Plain-language record of source changes, reviews, decisions, and follow-up work.");
    const recordFilter = node("select", { id: "history-record-filter" }, [node("option", { value: "all" }, "All context records"), ...state.records.map((record) => node("option", { value: record.id }, record.title))]);
    const typeValues = ["all", ...new Set(state.history.map((entry) => entry.type))];
    const typeFilter = node("select", { id: "history-type-filter" }, typeValues.map((type) => node("option", { value: type }, type === "all" ? "All history types" : type)));
    const list = node("div", { className: "history-list" });
    const count = node("div", { className: "helper" });
    function fillHistory() {
      const recordId = recordFilter.value;
      const type = typeFilter.value;
      const entries = [...state.history]
        .filter((entry) => (recordId === "all" || entry.recordId === recordId) && (type === "all" || entry.type === type))
        .sort((a, b) => new Date(b.at) - new Date(a.at));
      count.textContent = `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`;
      list.replaceChildren(...(entries.length ? entries.map((entry) => {
        const record = recordById(entry.recordId);
        return node("article", { className: "history-item" },
          node("p", {}, entry.message),
          node("small", {}, `${entry.type} · ${entry.actor} · ${timestampLabel(entry.at)}${record ? ` · ${record.title}` : ""}`)
        );
      }) : [emptyState("No history matches these filters.", "Choose a different record or history type.")]));
    }
    recordFilter.addEventListener("change", fillHistory);
    typeFilter.addEventListener("change", fillHistory);
    const filters = node("div", { className: "inline-form form-grid" }, field("Context record", recordFilter, recordFilter.id), field("History type", typeFilter, typeFilter.id));
    fillHistory();
    view.replaceChildren(filters, count, list);
  }

  function renderSearch(query) {
    setPage("Search results", `Matching context records and tasks for “${query}”.`, "Browser-local search");
    const normalized = query.toLowerCase();
    const records = state.records.filter((record) => [record.title, record.category, record.summary, ...record.facts.map((fact) => `${fact.label} ${fact.value}`)].join(" ").toLowerCase().includes(normalized));
    const tasks = state.records.flatMap((record) => record.tasks
      .filter((task) => `${task.title} ${task.owner} ${task.status} ${record.title} ${record.category}`.toLowerCase().includes(normalized))
      .map((task) => ({ task, record })));
    const recordPanel = records.length ? node("div", { className: "context-list" }, records.map(recordCard)) : emptyState("No context records match.", "Try a different title or category.");
    const taskPanel = tasks.length ? node("div", { className: "task-list" }, tasks.map(({ task, record }) => taskCard(task, record))) : emptyState("No tasks match.", "Try a different task title or owner.");
    view.replaceChildren(node("div", { className: "search-results" },
      panel("Context records", `${records.length} result${records.length === 1 ? "" : "s"}`, recordPanel),
      panel("Tasks", `${tasks.length} result${tasks.length === 1 ? "" : "s"}`, taskPanel)
    ));
  }

  function renderApp() {
    renderStorageBanner();
    const hash = window.location.hash.replace(/^#/, "") || "today";
    const match = hash.match(/^record\/(.+)$/);
    const routeView = match ? "context" : (["work", "context", "history", "integrations"].includes(hash) ? hash : "today");
    setNav(routeView);
    const query = searchInput.value.trim();
    if (query) {
      renderSearch(query);
      return;
    }
    if (match) {
      let recordId = match[1];
      try { recordId = decodeURIComponent(recordId); } catch (_error) { /* Keep the original hash value. */ }
      const record = recordById(recordId);
      if (record) renderRecord(record);
      else {
        setPage("Context record not found", "This saved link does not match a synthetic record in this demo.");
        view.replaceChildren(emptyState("Record unavailable.", "Open Context or reset the demo to return to the seed records."), button("Go to Context", () => go("#context"), "btn primary"));
      }
      return;
    }
    if (routeView === "work") renderWork();
    else if (routeView === "context") renderContext();
    else if (routeView === "history") renderHistory();
    else if (routeView === "integrations") renderIntegrations();
    else renderToday();
  }

  document.querySelectorAll(".nav").forEach((navButton) => {
    navButton.addEventListener("click", () => go(`#${navButton.dataset.view}`));
  });
  $("#reset").addEventListener("click", () => {
    storage.reset();
    resetDemoConnections();
    state = makeSeed();
    Object.values(transient).forEach((value) => { if (value instanceof Set) value.clear(); });
    transient.selectedText = Object.create(null);
    searchInput.value = "";
    clearMessage();
    saveState();
    go("#today");
    showMessage("Demo reset to clean synthetic data and the starting simulated connections.");
  });
  searchInput.addEventListener("input", renderApp);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      searchInput.value = "";
      renderApp();
      searchInput.blur();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      searchInput.focus();
    }
  });
  window.addEventListener("hashchange", renderApp);
  renderStorageBanner();
  if (!window.location.hash) window.history.replaceState(null, "", "#today");
  renderApp();
})();
