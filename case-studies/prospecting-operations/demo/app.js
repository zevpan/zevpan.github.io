import {
  DEMO_TODAY,
  confirmQuoteForCustomer,
  createInitialState,
  customerQuoteHtml,
  decideApproval,
  formatMoney,
  managerMetrics,
  markProposalReady,
  processCustomerBrief,
  proposalHtml,
  reviseQuote,
  runDailyReview,
  visibleAccounts
} from './sales-engine.mjs?v=crm-workspace-4';
import { createDemoAdapters, integrationRegistry } from './adapters.mjs';

const STORAGE_KEY = 'ai-sales-crm-demo-v5';
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value == null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.schemaVersion === 5) return saved;
  } catch (error) {
    console.warn('Could not restore this demo session.', error);
  }
  return createInitialState();
}

let state = loadState();
const adapters = createDemoAdapters(() => state);
state.search = state.search || '';
state.commandDraft = state.commandDraft || '';
state.selectedQuoteId = state.selectedQuoteId || null;
state.selectedProposalId = state.selectedProposalId || null;
state.selectedRfqId = state.selectedRfqId || null;

const prompts = {
  flagship: 'Acme Technologies is planning a two-year Industrial Data Foundation across 3 sites. Connect its process historian, asset management system, engineering drawings and maintenance history. Include the Asset Context Workspace, Industrial AI Workbench, industrial data integration and contextualization, and ongoing platform support. The existing platform contract expires in December 2027. The initial budget is around $8,000,000. Prepare an enterprise quotation and proposal explaining the unified asset context and governed workflows.',
  exception: 'Acme Technologies needs the Industrial Data Foundation across 3 sites for 2 years, with the Asset Context Workspace and Industrial AI Workbench. Revise the Industrial Data Foundation price to $200,000 per site per year. Calculate the margin and prepare a manager approval request.',
  technology: 'Vector Labs needs one Industrial AI Workbench site for a two-year term. They require SSO and are concerned about data migration. Budget is around $1,200,000. Integration is needed before January 2027. Their current solution expires in December 2026. Prepare a quotation and show what still needs confirmation.',
  daily: 'What needs my attention today? Handle everything else.'
};

const pageMeta = {
  overview: ['Sales workspace', 'Customer work first. The system keeps records, quotations and approvals in step.'],
  pipeline: ['Accounts and pipeline', 'Review active opportunities, account context and the next customer action.'],
  rfqs: ['RFQ workbench', 'Start from a conversation, pasted email or rough notes. The original source stays attached.'],
  quotes: ['Quotations', 'Inspect calculations, revise commercial terms and resolve policy exceptions.'],
  proposals: ['Proposals', 'Prepare customer proposals from current account facts and quotation versions.'],
  approvals: ['Approval queue', 'Review commercial exceptions and record a clear decision.'],
  products: ['Enterprise product catalog', 'Review illustrative enterprise prices, margin rules and delivery assumptions.'],
  team: ['Team visibility', 'See pipeline and commercial work derived from the same operational records.'],
  activity: ['Execution history', 'Review what the workflow recorded, completed, held or surfaced for attention.']
};

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('This browser could not save the current demo session.', error);
  }
}

function accountFor(id) {
  return state.accounts.find(item => item.id === id) || null;
}

function opportunityFor(accountId) {
  return state.opportunities.find(item => item.accountId === accountId && item.status === 'Open') || null;
}

function quoteFor(id) {
  return state.quotes.find(item => item.id === id) || null;
}

function visibleAccountIds() {
  return new Set(visibleAccounts(state, state.role).map(item => item.id));
}

function money(cents, currency) {
  return escapeHtml(formatMoney(cents, currency || 'SGD'));
}

function dateLabel(value) {
  if (!value) return 'Not set';
  const date = new Date(value.length === 10 ? value + 'T12:00:00' : value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function statusLabel(value) {
  const labels = {
    READY_FOR_SALES_REVIEW: 'Sales review',
    AWAITING_APPROVAL: 'Awaiting approval',
    APPROVED_EXCEPTION: 'Approved exception',
    REVISION_REQUIRED: 'Revision required',
    READY_FOR_CUSTOMER: 'Ready for customer',
    NOT_REQUIRED: 'No approval needed',
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    DRAFT: 'Draft',
    STALE_QUOTE_VERSION: 'Quote changed',
    NEEDS_INFORMATION: 'Needs information',
    QUOTATION_PREPARED: 'Quotation prepared',
    APPROVAL_REQUIRED: 'Approval required',
    STRUCTURED: 'Structured'
  };
  return labels[value] || String(value || 'Open').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
}

function badge(value) {
  const key = String(value || '').toLowerCase().replaceAll('_', '-');
  const tone = key.includes('ready') || key === 'approved' || key === 'complete' ? 'good'
    : key.includes('approval') || key.includes('review') || key.includes('draft') || key.includes('waiting') ? 'warning'
    : key.includes('reject') || key.includes('revision') || key.includes('blocked') ? 'bad'
    : 'neutral';
  return '<span class="badge ' + tone + '">' + escapeHtml(statusLabel(value)) + '</span>';
}

function render() {
  const view = pageMeta[state.activeView] ? state.activeView : 'overview';
  state.activeView = view;
  const [title, description] = pageMeta[view];
  $('#page-title').textContent = title;
  $('#page-description').textContent = description;
  $('#role-switch').value = state.role;
  $('#global-search').value = state.search;
  $('#storage-label').textContent = 'Example workspace · saved in this browser';
  document.querySelectorAll('[data-nav-view]').forEach(button => {
    const isActive = button.dataset.navView === view;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const panel = $('#view');
  if (view === 'overview') panel.innerHTML = renderOverview();
  if (view === 'pipeline') panel.innerHTML = renderPipeline();
  if (view === 'rfqs') panel.innerHTML = renderRfqs();
  if (view === 'quotes') panel.innerHTML = renderQuotes();
  if (view === 'proposals') panel.innerHTML = renderProposals();
  if (view === 'approvals') panel.innerHTML = renderApprovals();
  if (view === 'products') panel.innerHTML = renderProducts();
  if (view === 'team') panel.innerHTML = renderTeam();
  if (view === 'activity') panel.innerHTML = renderActivity();
  saveState();
}

function renderComposer(compact) {
  const isCompact = Boolean(compact);
  return '<section class="command-card ' + (isCompact ? 'compact' : '') + '">' +
    '<div class="command-intro"><div><span class="eyebrow">OUTCOME FIRST</span><h2>' + (isCompact ? 'Start from the customer conversation' : 'Tell the workspace what the customer needs') + '</h2>' +
    '<p>Describe the outcome. The local demo extracts the request, checks the saved catalog and pricing rules, then records the work for review.</p></div>' +
    '<span class="command-mark" aria-hidden="true">↗</span></div>' +
    '<form id="command-form" class="command-form"><label class="sr-only" for="command-input">Customer notes or sales request</label>' +
    '<textarea id="command-input" name="command" rows="' + (isCompact ? '5' : '4') + '" placeholder="Paste meeting notes, customer email or a sales task. You can start with incomplete details.">' + escapeHtml(state.commandDraft) + '</textarea>' +
    '<div class="command-footer"><span>Original notes are saved with the RFQ. No email or WhatsApp message is sent.</span><label class="attach-btn">Attach text or CSV<input id="brief-file" type="file" accept=".txt,.md,.csv,text/plain,text/csv"></label><div class="button-row">' +
    '<button class="btn secondary" type="button" data-action="run-daily">Review my day</button><button class="btn primary" type="submit">Process request <span aria-hidden="true">→</span></button></div></div></form>' +
    '<div class="prompt-row"><span>Try an example</span><button class="prompt-chip" type="button" data-action="load-prompt" data-prompt="flagship">Acme RFQ</button><button class="prompt-chip" type="button" data-action="load-prompt" data-prompt="exception">Below-floor price</button><button class="prompt-chip" type="button" data-action="load-prompt" data-prompt="technology">Technology renewal</button><button class="prompt-chip" type="button" data-action="load-prompt" data-prompt="daily">Daily review</button></div>' +
    '<p class="demo-limit">This browser-local prototype uses a rule-based extraction adapter and example company records. It does not connect to a live CRM, ERP, email, WhatsApp or model provider.</p>' +
    '</section>';
}

function renderOverview() {
  const accounts = visibleAccounts(state, state.role);
  const accountIds = new Set(accounts.map(item => item.id));
  const opportunities = state.opportunities.filter(item => accountIds.has(item.accountId) && item.status === 'Open');
  const quotes = state.quotes.filter(item => accountIds.has(item.accountId));
  const approvals = state.approvals.filter(item => item.status === 'PENDING' && accountIds.has(item.accountId));
  const proposals = state.proposals.filter(item => accountIds.has(item.accountId));
  const metrics = managerMetrics(state, state.role);
  const latest = state.executions.slice(0, 3);
  return '<div class="overview-hero"><div><span class="eyebrow">LESS ADMIN. MORE SELLING.</span><h2>Keep customer work moving. Let the workspace handle the follow-through.</h2><p>Capture a conversation once. Requirements, pricing, quotation status and management visibility stay connected to the same account and opportunity.</p><button class="btn light" type="button" data-nav-view="rfqs">Open RFQ workbench <span aria-hidden="true">→</span></button></div>' +
    '<div class="hero-orbit" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="orbit-center">CRM<br>OPS</span><span class="orbit-node node-one">RFQ</span><span class="orbit-node node-two">QUOTE</span><span class="orbit-node node-three">CRM</span></div></div>' +
    renderComposer(false) +
    (state.dailyDigest ? renderDailyDigest(state.dailyDigest) : '') +
    '<div class="metric-grid">' +
    metricCard('Open opportunities', metrics.opportunityCount, 'Across ' + metrics.accountCount + ' visible accounts', 'blue') +
    metricCard('Open pipeline', money(metrics.pipelineCents, 'SGD'), 'Values recalculate from current quote records', '') +
    metricCard('Awaiting approval', metrics.pendingApprovalCount, 'Commercial exceptions held for a manager', approvals.length ? 'amber' : '') +
    metricCard('Proposals prepared', proposals.length, quotes.length + ' quotation record(s) linked', '') +
    '</div><div class="content-grid overview-grid"><section class="panel"><div class="panel-head"><div><span class="eyebrow">CUSTOMER WORK</span><h3>Opportunities needing a next step</h3></div><button class="text-button" data-nav-view="pipeline">View pipeline</button></div>' +
    (opportunities.length ? '<div class="opportunity-list">' + opportunities.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(opportunityRow).join('') + '</div>' : '<div class="empty-state">No open opportunities in this view.</div>') +
    '</section><section class="panel"><div class="panel-head"><div><span class="eyebrow">HUMAN REVIEW</span><h3>What still needs a person</h3></div><button class="text-button" data-nav-view="approvals">Open review queue</button></div>' +
    renderAttention(approvals, opportunities, proposals) +
    '</section></div><section class="panel recent-panel"><div class="panel-head"><div><span class="eyebrow">EXECUTION HISTORY</span><h3>Recent agent work</h3></div><button class="text-button" data-nav-view="activity">Open activity</button></div>' +
    (latest.length ? '<div class="execution-list">' + latest.map(executionRow).join('') + '</div>' : '<div class="empty-state">Process a customer brief or run a daily review to see recorded work here.</div>') + '</section>';
}

function renderDailyDigest(digest) {
  const group = (title, items, emptyText, tone) => '<section class="digest-card ' + tone + '"><h3>' + title + '</h3>' +
    (items.length ? '<ul>' + items.map(item => '<li>' + escapeHtml(typeof item === 'string' ? item : item.text) + '</li>').join('') + '</ul>' : '<p>' + emptyText + '</p>') + '</section>';
  return '<section class="daily-digest"><div class="digest-heading"><div><span class="eyebrow">DAILY REVIEW · ' + dateLabel(digest.ranAt) + '</span><h2>Here is what needs you today.</h2></div><span class="source-chip">Built from current workspace records</span></div><div class="digest-grid">' +
    group('Completed by agents', digest.completed, 'No background actions were needed.', 'digest-done') +
    group('Awaiting approval', digest.awaitingApproval, 'No commercial decisions are waiting.', 'digest-approval') +
    group('Requires salesperson', digest.requiresSalesperson, 'No customer or seller follow-up is due.', 'digest-human') +
    group('Blocked or unconfirmed', digest.blocked, 'No delivery or catalog blockers surfaced.', 'digest-blocked') +
    '</div></section>';
}

function metricCard(label, value, hint, tone) {
  return '<article class="metric-card ' + escapeHtml(tone || '') + '"><span>' + escapeHtml(label) + '</span><b>' + value + '</b><small>' + escapeHtml(hint) + '</small></article>';
}

function opportunityRow(opportunity) {
  const account = accountFor(opportunity.accountId);
  return '<button type="button" class="opportunity-row" data-action="open-account" data-account="' + escapeHtml(opportunity.accountId) + '">' +
    '<span class="account-avatar">' + escapeHtml((account ? account.name : '?').split(' ').map(part => part[0]).slice(0, 2).join('')) + '</span>' +
    '<span class="opportunity-copy"><b>' + escapeHtml(opportunity.name) + '</b><small>' + escapeHtml(account ? account.name : 'Account') + ' · ' + escapeHtml(opportunity.stage) + '</small></span>' +
    '<span class="opportunity-value">' + money(opportunity.valueCents, account ? account.currency : 'SGD') + '<small>Next: ' + escapeHtml(opportunity.nextAction) + '</small></span>' +
    '<span class="due-date">' + dateLabel(opportunity.dueDate) + '</span></button>';
}

function renderAttention(approvals, opportunities, proposals) {
  const rows = [];
  approvals.slice(0, 2).forEach(item => rows.push('<div class="attention-row"><span class="attention-icon amber">!</span><span><b>Manager decision</b><small>' + escapeHtml(item.quoteId) + ' · pricing exception</small></span><button class="text-button" data-nav-view="approvals">Review</button></div>'));
  const due = opportunities.filter(item => item.dueDate <= DEMO_TODAY).slice(0, 2);
  due.forEach(item => rows.push('<div class="attention-row"><span class="attention-icon blue">•</span><span><b>Customer follow-up</b><small>' + escapeHtml(item.name) + ' · ' + dateLabel(item.dueDate) + '</small></span><button class="text-button" data-action="open-account" data-account="' + escapeHtml(item.accountId) + '">Open</button></div>'));
  const drafts = proposals.filter(item => item.status !== 'READY_FOR_CUSTOMER').slice(0, 2);
  drafts.forEach(item => rows.push('<div class="attention-row"><span class="attention-icon purple">↗</span><span><b>Proposal review</b><small>' + escapeHtml(item.title) + ' · ' + escapeHtml(statusLabel(item.status)) + '</small></span><button class="text-button" data-action="open-proposal" data-proposal="' + escapeHtml(item.id) + '">Open</button></div>'));
  if (!rows.length) return '<div class="empty-state">No approvals or customer actions are waiting in this view.</div>';
  return '<div class="attention-list">' + rows.join('') + '</div><button class="btn secondary full-width" data-action="run-daily">Review the day and refresh the team view</button>';
}

function executionRow(item) {
  const time = dateLabel(item.startedAt);
  return '<div class="execution-row"><span class="execution-glyph">✓</span><span><b>' + escapeHtml(item.title) + '</b><small>' + escapeHtml(item.adapter) + ' · ' + time + '</small></span>' + badge(item.status) + '</div>';
}

function renderPipeline() {
  if (state.selectedAccountId) return renderAccountDetail(state.selectedAccountId);
  const accounts = visibleAccounts(state, state.role);
  const accountIds = new Set(accounts.map(item => item.id));
  const needle = String(state.search || '').toLowerCase();
  const opportunities = state.opportunities.filter(item => accountIds.has(item.accountId)).filter(item => {
    if (!needle) return true;
    const account = accountFor(item.accountId);
    return (item.name + ' ' + (account ? account.name : '') + ' ' + item.stage + ' ' + item.owner).toLowerCase().includes(needle);
  });
  const leads = opportunities.filter(item => item.source.toLowerCase().includes('lead') || item.source.toLowerCase().includes('referral'));
  return '<div class="page-toolbar"><div><span class="eyebrow">ACCOUNT AND OPPORTUNITY RECORDS</span><h2>' + opportunities.length + ' opportunities in view</h2><p>Customer conversations, assigned ownership, next actions and quotation status share one source of record.</p></div><div class="toolbar-actions">' + integrationRegistry.filter(item => item.id === 'email' || item.id === 'whatsapp').map(item => '<span class="source-chip">' + escapeHtml(item.label) + ': ' + escapeHtml(item.mode.toLowerCase()) + '</span>').join('') + '</div></div>' +
    '<div class="metric-grid compact-metrics">' + metricCard('Active opportunities', opportunities.filter(item => item.status === 'Open').length, 'Owned by the active role', '') + metricCard('Lead or referral source', leads.length, 'Qualification happens in the same pipeline', '') + metricCard('Customer accounts', accounts.length, state.role === 'manager' ? 'Manager view' : 'Assigned to Zev Pan', '') + metricCard('Customer messages sent', '0', 'External communication stays under human control', '') + '</div>' +
    '<section class="panel"><div class="panel-head"><div><span class="eyebrow">PIPELINE</span><h3>Active customer opportunities</h3></div><span>Values from current CRM records</span></div>' +
    '<div class="table-scroll"><table class="data-table"><thead><tr><th>Account / opportunity</th><th>Stage</th><th>Value</th><th>Owner</th><th>Next action</th><th>Due</th></tr></thead><tbody>' +
    opportunities.map(item => {
      const account = accountFor(item.accountId);
      return '<tr><td><button class="table-link" data-action="open-account" data-account="' + escapeHtml(item.accountId) + '">' + escapeHtml(account.name) + '<small>' + escapeHtml(item.name) + '</small></button></td><td>' + escapeHtml(item.stage) + '</td><td>' + money(item.valueCents, account.currency) + '</td><td>' + escapeHtml(item.owner) + '</td><td>' + escapeHtml(item.nextAction) + '</td><td>' + dateLabel(item.dueDate) + '</td></tr>';
    }).join('') + '</tbody></table></div></section>';
}

function renderAccountDetail(accountId) {
  const account = accountFor(accountId);
  if (!account || (state.role === 'sales' && account.owner !== 'Zev Pan')) {
    state.selectedAccountId = null;
    return '<section class="panel empty-state">This account is not available in the active salesperson view.</section>';
  }
  const opportunity = opportunityFor(account.id);
  const interactions = state.interactions.filter(item => item.accountId === account.id).sort((a, b) => b.date.localeCompare(a.date));
  const quotes = state.quotes.filter(item => item.accountId === account.id);
  const events = state.events.filter(item => item.accountId === account.id).slice(0, 8);
  const timeline = interactions.map(item => '<div class="timeline-entry"><span class="timeline-dot"></span><div><b>' + escapeHtml(item.channel) + ' · ' + escapeHtml(item.direction) + '</b><small>' + dateLabel(item.date) + ' · ' + escapeHtml(item.owner) + '</small><p>' + escapeHtml(item.summary) + '</p></div></div>').join('');
  const eventRows = events.map(item => '<div class="timeline-entry agent-entry"><span class="timeline-dot agent-dot"></span><div><b>' + escapeHtml(item.actor) + ' · ' + escapeHtml(item.type.replaceAll('.', ' ')) + '</b><small>' + dateLabel(item.at) + '</small><p>' + escapeHtml(item.summary) + '</p></div></div>').join('');
  return '<button class="back-link" data-action="back-pipeline">← Accounts and pipeline</button><div class="account-title-row"><div><span class="eyebrow">' + escapeHtml(account.tier) + ' ACCOUNT</span><h2>' + escapeHtml(account.name) + '</h2><p>' + escapeHtml(account.industry) + ' · ' + escapeHtml(account.country) + ' · Account owner: ' + escapeHtml(account.owner) + '</p></div><button class="btn secondary" data-nav-view="rfqs">Create RFQ</button></div>' +
    '<div class="account-grid"><div class="account-main"><section class="panel"><div class="panel-head"><div><span class="eyebrow">OPPORTUNITY</span><h3>' + escapeHtml(opportunity ? opportunity.name : 'No active opportunity') + '</h3></div>' + (opportunity ? badge(opportunity.stage) : '') + '</div>' +
    (opportunity ? '<div class="opportunity-facts"><div><small>Current value</small><b>' + money(opportunity.valueCents, account.currency) + '</b></div><div><small>Next action</small><b>' + escapeHtml(opportunity.nextAction) + '</b></div><div><small>Due</small><b>' + dateLabel(opportunity.dueDate) + '</b></div><div><small>Source</small><b>' + escapeHtml(opportunity.source) + '</b></div></div>' : '<div class="panel-body">Use RFQ intake to create a linked sales request.</div>') +
    '<div class="panel-head subpanel-head"><div><span class="eyebrow">QUOTATIONS</span><h3>Commercial records</h3></div></div>' +
    (quotes.length ? '<div class="inline-record-list">' + quotes.map(item => '<button class="inline-record" data-action="open-quote" data-quote="' + escapeHtml(item.id) + '"><span><b>' + escapeHtml(item.number) + ' · v' + item.version + '</b><small>' + dateLabel(item.createdAt) + '</small></span><span>' + money(item.calculation.totalCents, item.currency) + '</span>' + badge(item.status) + '</button>').join('') + '</div>' : '<div class="empty-state">No quotation yet. Process a customer brief to start one.</div>') +
    '</section><section class="panel"><div class="panel-head"><div><span class="eyebrow">CUSTOMER TIMELINE</span><h3>Interaction and agent history</h3></div><span>Manual entries are saved with the account</span></div><div class="timeline">' + (timeline || '<div class="empty-state">No customer interactions recorded.</div>') + eventRows + '</div></section>' +
    '<section class="panel interaction-panel"><div class="panel-head"><div><span class="eyebrow">RECORD AN INTERACTION</span><h3>Keep the relationship context current</h3></div></div><form data-form="interaction" class="interaction-form"><input type="hidden" name="accountId" value="' + escapeHtml(account.id) + '"><label>Channel<select name="channel"><option>Meeting note</option><option>Customer call</option><option>Email note</option><option>Business WhatsApp note</option></select></label><label>What happened?<textarea name="summary" rows="3" placeholder="Record the customer need, objection or commitment."></textarea></label><button class="btn primary" type="submit">Add to CRM timeline</button><p class="helper">The entry is saved in this browser. It does not send a message.</p></form></section></div>' +
    '<aside class="account-side"><section class="panel"><div class="panel-head"><div><span class="eyebrow">CUSTOMER CONTACTS</span><h3>People involved</h3></div></div><div class="contact-list">' + account.contacts.map(contact => '<article class="contact-card"><span class="contact-avatar">' + escapeHtml(contact.name.split(' ').map(part => part[0]).slice(0, 2).join('')) + '</span><div><b>' + escapeHtml(contact.name) + '</b><small>' + escapeHtml(contact.title) + '</small><span>' + escapeHtml(contact.role) + '</span></div></article>').join('') + '</div></section>' +
    '<section class="panel"><div class="panel-head"><div><span class="eyebrow">ACCOUNT CONTEXT</span><h3>Commercial profile</h3></div></div><div class="profile-list"><div><span>Account currency</span><b>' + escapeHtml(account.currency) + '</b></div><div><span>Tax policy</span><b>' + (account.taxRateBps / 100) + '% example rate</b></div><div><span>Price source</span><b>Illustrative enterprise rate card</b></div><div><span>Last account touch</span><b>' + dateLabel(account.lastTouch) + '</b></div></div><p class="profile-note">Email and Business WhatsApp are shown for context only. No live connection is configured.</p></section></aside></div>';
}

function renderRfqs() {
  const rfq = state.rfqs.find(item => item.id === state.selectedRfqId) || null;
  const visible = state.rfqs.filter(item => visibleAccountIds().has(item.accountId));
  const parsed = rfq ? rfq.requirements : null;
  return renderComposer(true) + '<div class="rfq-layout"><section class="panel"><div class="panel-head"><div><span class="eyebrow">STRUCTURED CUSTOMER DEMAND</span><h3>RFQ records</h3></div><span>' + visible.length + ' saved</span></div>' +
    (visible.length ? '<div class="rfq-list">' + visible.map(item => '<button class="rfq-row ' + (rfq && rfq.id === item.id ? 'selected' : '') + '" data-action="open-rfq" data-rfq="' + escapeHtml(item.id) + '"><span class="rfq-icon">R</span><span><b>' + escapeHtml(item.id) + ' · ' + escapeHtml(item.requirements.accountName || 'Account needed') + '</b><small>' + escapeHtml(item.requirements.productName || 'Product to confirm') + (item.requirements.quantity ? ' · ' + item.requirements.quantity + ' ' + escapeHtml(item.requirements.unit || 'units') : '') + '</small></span>' + badge(item.status) + '</button>').join('') + '</div>' : '<div class="empty-state">Paste a customer request to create the first RFQ.</div>') + '</section>' +
    '<section class="panel rfq-detail">' + (rfq ? renderRfqDetail(rfq, parsed) : '<div class="empty-state large-empty"><span class="empty-illustration">RFQ</span><h3>Turn rough notes into structured demand</h3><p>The system saves the original source, matches the customer and product, and surfaces what is still uncertain.</p><ul><li>Quantity, services and delivery window</li><li>Competitor context and target price</li><li>Catalog, availability and policy checks</li></ul></div>') + '</section></div>';
}

function renderRfqDetail(rfq, parsed) {
  const account = accountFor(rfq.accountId);
  const quote = quoteFor(rfq.quoteId);
  const productIds = parsed.productIds && parsed.productIds.length ? parsed.productIds : [parsed.productId];
  const catalogItems = [...new Set(productIds.concat(parsed.serviceIds || []))].map(id => state.products.find(item => item.id === id)).filter(Boolean);
  const catalogMarkup = catalogItems.map(product => {
    const agreement = account && (account.priceAgreements || []).find(item => item.productId === product.id && item.status === 'Active' && parsed.quantity >= item.minimumQuantity && item.validFrom <= DEMO_TODAY && item.validThrough >= DEMO_TODAY);
    const volumeBreak = (product.volumeDiscounts || []).filter(item => parsed.quantity >= item.minimumQuantity).sort((a, b) => b.minimumQuantity - a.minimumQuantity)[0];
    const unitPrice = agreement ? agreement.unitPriceCents : volumeBreak ? Math.round(product.listPriceCents * (10000 - volumeBreak.discountBps) / 10000) : product.listPriceCents;
    const priceSource = agreement ? 'Customer agreement ' + agreement.id : volumeBreak ? volumeBreak.discountBps / 100 + '% volume break' : 'Illustrative list price';
    const priceUnit = 'per ' + product.unit + (product.billingPeriod ? ' / ' + product.billingPeriod : '');
    return '<div class="catalog-match"><div class="catalog-match-heading"><b>' + escapeHtml(product.name) + '</b><span>' + escapeHtml(product.category) + ' · ' + escapeHtml(product.id) + '</span></div>' +
      '<div class="catalog-match-price"><b>' + money(unitPrice, account ? account.currency : 'SGD') + '</b><span>' + escapeHtml(priceUnit) + '</span></div>' +
      '<small>' + escapeHtml(priceSource) + ' · margin floor ' + (product.marginFloorBps / 100) + '% · max discount ' + (product.maxDiscountBps / 100) + '%</small>' +
      '<small>' + escapeHtml(product.capacity ? product.capacity.status : product.leadTime) + '</small></div>';
  }).join('');
  const matchedProducts = productIds.map(id => state.products.find(item => item.id === id)).filter(Boolean);
  const productSummary = matchedProducts.map(item => item.name).join(', ') || parsed.productName || 'Needs confirmation';
  const quantityLabel = parsed.quantity ? parsed.quantity + ' ' + (parsed.unit === 'site' ? (parsed.quantity === 1 ? 'site' : 'sites') : parsed.unit || 'units') + (parsed.termYears > 1 ? ' · ' + parsed.termYears + '-year term' : '') : 'Quantity not found';
  return '<div class="panel-head"><div><span class="eyebrow">' + escapeHtml(rfq.id) + ' · ' + dateLabel(rfq.createdAt) + '</span><h3>' + escapeHtml(account ? account.name : 'Account needs review') + '</h3></div>' + badge(rfq.status) + '</div>' +
    '<div class="rfq-structured"><div class="fact-card"><small>Product scope and quantity</small><b>' + escapeHtml(productSummary) + '</b><span>' + escapeHtml(quantityLabel) + '</span></div><div class="fact-card"><small>Requested delivery</small><b>' + escapeHtml(parsed.deliveryWindow || 'To be agreed') + '</b><span>Customer window, not a delivery commitment</span></div><div class="fact-card"><small>Competitor reference</small><b>' + (parsed.currentSupplierPriceCents ? money(parsed.currentSupplierPriceCents, parsed.currency) : 'Not provided') + '</b><span>Customer reported</span></div><div class="fact-card"><small>Target price</small><b>' + (parsed.targetUnitPriceCents ? money(parsed.targetUnitPriceCents, parsed.currency) : 'Catalog list') + '</b><span>Per ' + escapeHtml(parsed.unit || 'unit') + (matchedProducts[0] && matchedProducts[0].billingPeriod ? ' / ' + escapeHtml(matchedProducts[0].billingPeriod) : '') + '</span></div>' + (parsed.budgetCents ? '<div class="fact-card"><small>Stated budget</small><b>' + money(parsed.budgetCents, parsed.currency) + '</b><span>Confirm whether tax is included</span></div>' : '') + '</div>' +
    '<div class="rfq-columns"><div><h4>Requirements and source</h4><p class="source-quote">' + escapeHtml(parsed.sourceText) + '</p><details class="source-details"><summary>Show extracted notes</summary><ul>' + (parsed.notes.length ? parsed.notes.map(item => '<li>' + escapeHtml(item) + '</li>').join('') : '<li>No additional notes extracted.</li>') + '</ul></details>' +
    (parsed.assumptions.length ? '<h4>Pricing assumptions</h4><ul class="check-list">' + parsed.assumptions.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>' : '') +
    (parsed.openQuestions.length ? '<h4>Clarification before release</h4><ul class="question-list">' + parsed.openQuestions.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>' : '') +
    (parsed.blockers.length ? '<div class="callout danger-callout"><b>Pricing paused</b><ul>' + parsed.blockers.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>' : '') +
    '</div><div class="rfq-next"><h4>Catalog and policy check</h4>' + (catalogMarkup || '<p class="helper">A catalog match will appear when the required product is identified.</p>') +
    (quote ? '<div class="prepared-record"><span class="eyebrow">QUOTATION PREPARED</span><b>' + escapeHtml(quote.number) + ' · version ' + quote.version + '</b><span>' + money(quote.calculation.totalCents, quote.currency) + ' including tax</span>' + badge(quote.status) + '<button class="btn primary" data-action="open-quote" data-quote="' + escapeHtml(quote.id) + '">Review quotation</button></div>' : '') +
    '</div></div>';
}

function renderQuotes() {
  const visibleQuotes = state.quotes.filter(item => visibleAccountIds().has(item.accountId));
  const selected = quoteFor(state.selectedQuoteId);
  if (selected && visibleAccountIds().has(selected.accountId)) return renderQuoteDetail(selected);
  return '<div class="page-toolbar"><div><span class="eyebrow">DETERMINISTIC PRICING</span><h2>' + visibleQuotes.length + ' quotation record(s)</h2><p>Totals and policy decisions come from catalog costs, price rules, services and tax assumptions stored with each version.</p></div><button class="btn primary" data-nav-view="rfqs">Start an RFQ</button></div>' +
    '<section class="panel"><div class="panel-head"><div><span class="eyebrow">QUOTATION REGISTER</span><h3>Current commercial work</h3></div><span>Internal margin available to authorized sales roles</span></div>' +
    (visibleQuotes.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Quote</th><th>Account</th><th>Version</th><th>Total</th><th>Gross margin</th><th>Status</th><th></th></tr></thead><tbody>' + visibleQuotes.map(item => {
      const account = accountFor(item.accountId);
      return '<tr><td><b>' + escapeHtml(item.number) + '</b><small>' + dateLabel(item.createdAt) + '</small></td><td>' + escapeHtml(account.name) + '</td><td>v' + item.version + '</td><td>' + money(item.calculation.totalCents, item.currency) + '</td><td>' + (item.calculation.grossMarginBps / 100).toFixed(2) + '%</td><td>' + badge(item.status) + '</td><td><button class="text-button" data-action="open-quote" data-quote="' + escapeHtml(item.id) + '">Open</button></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="empty-state">A quotation appears after an RFQ has a linked account, product and quantity.</div>') + '</section>';
}

function renderQuoteDetail(quote) {
  const account = accountFor(quote.accountId);
  const rfq = state.rfqs.find(item => item.id === quote.rfqId);
  const approval = state.approvals.find(item => item.id === quote.approvalId);
  const latestProposal = state.proposals.find(item => item.quoteId === quote.id && item.quoteVersion === quote.version);
  const visibleCost = state.role === 'manager';
  const lines = quote.calculation.lines.map(line => {
    const quantityUnit = line.unit === 'site' ? (line.quantity === 1 ? 'site' : 'sites') : line.unit;
    const termUnit = line.billingPeriod === 'year' ? 'years' : line.billingPeriod === 'month' ? 'months' : 'one-time';
    const priceUnit = line.unit + (line.billingPeriod ? ' / ' + line.billingPeriod : '');
    return '<tr><td><b>' + escapeHtml(line.name) + '</b><small>' + escapeHtml(line.description) + '<br>Price per ' + escapeHtml(priceUnit) + '<br>Price basis: ' + escapeHtml(line.priceBasis) + '</small></td>' +
      '<td><div class="quote-input-cell"><input name="qty-' + escapeHtml(line.id) + '" type="number" min="1" step="1" value="' + line.quantity + '" aria-label="Quantity for ' + escapeHtml(line.name) + '"><small>' + escapeHtml(quantityUnit) + '</small></div></td>' +
      '<td><div class="quote-input-cell"><input name="period-' + escapeHtml(line.id) + '" type="number" min="1" step="1" value="' + line.periodCount + '" aria-label="Term for ' + escapeHtml(line.name) + '"><small>' + escapeHtml(termUnit) + '</small></div></td>' +
      '<td><input name="price-' + escapeHtml(line.id) + '" type="number" min="0" step="0.01" value="' + (line.unitPriceCents / 100).toFixed(2) + '" aria-label="Unit price for ' + escapeHtml(line.name) + '"></td>' +
      (visibleCost ? '<td>' + money(line.unitCostCents, quote.currency) + '</td>' : '') + '<td>' + (line.marginBps / 100).toFixed(2) + '%</td><td>' + money(line.lineNetCents, quote.currency) + '</td></tr>';
  }).join('');
  const violations = quote.exceptions.length ? '<div class="callout danger-callout"><b>Release held by pricing rules</b><ul>' + quote.exceptions.map(item => '<li><strong>' + escapeHtml(item.rule) + ':</strong> ' + escapeHtml(item.detail) + '</li>').join('') + '</ul><p>Approver: ' + escapeHtml(quote.exceptions[0].approverRole) + '. The final customer document stays marked as a draft until a decision is recorded.</p>' + (approval ? '<button class="btn secondary" data-nav-view="approvals">Open ' + escapeHtml(approval.id) + '</button>' : '') + '</div>' : '<div class="callout success-callout"><b>Pricing rules passed</b><p>All lines meet their saved gross margin floors and discount limits. Sales review is still required before the quote is marked ready for the customer.</p></div>';
  return '<button class="back-link" data-action="back-quotes">← Quotations</button><div class="account-title-row quote-heading"><div><span class="eyebrow">' + escapeHtml(quote.number) + ' · VERSION ' + quote.version + '</span><h2>' + escapeHtml(account.name) + '</h2><p>Opportunity ' + escapeHtml(quote.opportunityId || 'not linked') + ' · RFQ ' + escapeHtml(quote.rfqId) + ' · Valid through ' + dateLabel(quote.validThrough) + '</p></div>' + badge(quote.status) + '</div>' +
    '<div class="quote-facts">' + metricCard('Quotation total', money(quote.calculation.totalCents, quote.currency), 'Includes ' + (quote.taxRateBps / 100) + '% example tax estimate', 'blue') + metricCard('Amount before tax', money(quote.calculation.amountBeforeTaxCents, quote.currency), 'Discounted lines plus delivery and fees', '') + metricCard('Gross margin', (quote.calculation.grossMarginBps / 100).toFixed(2) + '%', 'Gross margin = profit divided by selling price', '') + metricCard('Markup', (quote.calculation.markupBps / 100).toFixed(2) + '%', 'Markup = profit divided by cost', '') + '</div>' +
    '<div class="quote-detail-grid"><div class="quote-main"><section class="panel"><div class="panel-head"><div><span class="eyebrow">QUOTE VERSION ' + quote.version + '</span><h3>Quotation lines</h3></div><span>Change a line and save a new version</span></div>' +
    '<form data-form="quote-revision"><div class="table-scroll"><table class="data-table quote-table"><thead><tr><th>Product or service</th><th>Quantity</th><th>Billing term</th><th>Unit price (' + escapeHtml(quote.currency) + ')</th>' + (visibleCost ? '<th>Internal cost</th>' : '') + '<th>Gross margin</th><th>Line total</th></tr></thead><tbody>' + lines + '</tbody></table></div><div class="form-footer"><span>Line calculations use whole quantities and saved policy floors.</span><button class="btn secondary" type="submit">Save as version ' + (quote.version + 1) + '</button></div></form>' +
    '<div class="totals-list"><div><span>List price total</span><b>' + money(quote.calculation.listTotalCents, quote.currency) + '</b></div><div><span>Discount</span><b>' + money(quote.calculation.discountCents, quote.currency) + '</b></div><div><span>Subtotal after discount</span><b>' + money(quote.calculation.subtotalCents, quote.currency) + '</b></div><div><span>Delivery</span><b>' + money(quote.calculation.shippingCents, quote.currency) + '</b></div><div><span>Tax estimate at ' + (quote.taxRateBps / 100) + '%</span><b>' + money(quote.calculation.taxCents, quote.currency) + '</b></div><div class="total-row"><span>Total</span><b>' + money(quote.calculation.totalCents, quote.currency) + '</b></div></div></section>' +
    '<section class="panel"><div class="panel-head"><div><span class="eyebrow">POLICY EVALUATION</span><h3>Commercial control</h3></div>' + badge(quote.approvalStatus) + '</div>' + violations + '</section>' +
    '<section class="panel"><div class="panel-head"><div><span class="eyebrow">VERSION HISTORY</span><h3>Earlier calculations</h3></div><span>' + quote.versions.length + ' saved revision(s)</span></div>' + (quote.versions.length ? '<div class="version-list">' + quote.versions.slice().reverse().map(item => '<div><span><b>Version ' + item.version + '</b><small>' + dateLabel(item.savedAt) + ' · ' + escapeHtml(statusLabel(item.status)) + '</small></span><b>' + money(item.calculation.totalCents, quote.currency) + '</b></div>').join('') + '</div>' : '<div class="empty-state">Quote revisions preserve the prior totals and line values here.</div>') + '</section></div>' +
    '<aside class="quote-side"><section class="panel"><div class="panel-head"><div><span class="eyebrow">CUSTOMER RELEASE</span><h3>Review and approve</h3></div></div><div class="release-copy"><p>Internal costs and margins stay out of the customer quotation. The downloaded preview uses a draft mark until the seller confirms the assumptions.</p>' +
    (quote.releaseQuestions.length ? '<ul class="question-list">' + quote.releaseQuestions.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>' : '<p>No unresolved release questions.</p>') +
    (quote.releaseQuestions.some(item => item.toLowerCase().includes('currency')) ? '<label class="check-control"><input type="checkbox" id="currency-confirm"> I confirm ' + escapeHtml(quote.currency) + ' is the intended quote currency.</label>' : '') +
    (quote.releaseQuestions.length ? '<label class="check-control"><input type="checkbox" id="assumptions-confirm"> I reviewed the listed assumptions and will not present unconfirmed availability or delivery as a commitment.</label>' : '') +
    '<button class="btn primary full-width" data-action="confirm-quote" data-quote="' + escapeHtml(quote.id) + '" ' + (['READY_FOR_CUSTOMER', 'AWAITING_APPROVAL', 'REVISION_REQUIRED'].includes(quote.status) ? 'disabled' : '') + '>Mark ready for customer</button>' +
    '<button class="btn secondary full-width" data-action="download-quote" data-quote="' + escapeHtml(quote.id) + '">' + (quote.status === 'READY_FOR_CUSTOMER' ? 'Download customer quotation' : 'Download draft quotation preview') + '</button>' +
    (quote.status !== 'AWAITING_APPROVAL' && quote.status !== 'REVISION_REQUIRED' ? '<button class="btn secondary full-width" data-action="generate-proposal" data-quote="' + escapeHtml(quote.id) + '">' + (latestProposal ? 'Prepare another proposal version' : 'Generate proposal draft') + '</button>' : '<p class="helper">Proposal preparation waits until the commercial exception is resolved.</p>') +
    (latestProposal ? '<button class="text-button full-width" data-action="open-proposal" data-proposal="' + escapeHtml(latestProposal.id) + '">Open linked proposal · ' + escapeHtml(statusLabel(latestProposal.status)) + '</button>' : '') +
    '</div></section>' +
    '<section class="panel"><div class="panel-head"><div><span class="eyebrow">SOURCE NOTES</span><h3>RFQ audit trail</h3></div></div><div class="source-notes">' + escapeHtml(rfq ? rfq.sourceText : 'No source notes are linked.') + '</div><p class="helper">Quote status is written back to the linked opportunity and account timeline.</p></section></aside></div>';
}

function renderProposals() {
  const items = state.proposals.filter(item => visibleAccountIds().has(item.accountId));
  const selected = state.proposals.find(item => item.id === state.selectedProposalId && visibleAccountIds().has(item.accountId));
  if (selected) return renderProposalDetail(selected);
  return '<div class="page-toolbar"><div><span class="eyebrow">QUOTE-LINKED DOCUMENTS</span><h2>' + items.length + ' proposal draft(s)</h2><p>Proposal sections use verified catalog facts, the linked RFQ and a specific quotation version. A quote revision makes an older draft visibly stale.</p></div><button class="btn primary" data-nav-view="quotes">Open quotations</button></div>' +
    (items.length ? '<div class="proposal-grid">' + items.map(item => {
      const account = accountFor(item.accountId);
      const quote = quoteFor(item.quoteId);
      return '<article class="proposal-card"><div class="proposal-cover"><span>PROPOSAL</span><b>' + escapeHtml(account.name) + '</b><small>' + escapeHtml(item.title) + '</small></div><div class="proposal-info"><div>' + badge(item.status) + '<span>Quote ' + escapeHtml(quote ? quote.number : item.quoteId) + ' · v' + item.quoteVersion + '</span></div><p>' + escapeHtml(item.sections.solution) + '</p><button class="btn secondary" data-action="open-proposal" data-proposal="' + escapeHtml(item.id) + '">Review proposal</button></div></article>';
    }).join('') + '</div>' : '<section class="panel empty-state large-empty"><span class="empty-illustration">DOC</span><h3>Proposal drafts follow a quotation</h3><p>Start with a customer RFQ. The proposal uses that account context and stays linked to the calculated quote.</p><button class="btn primary" data-nav-view="rfqs">Start an RFQ</button></section>');
}

function renderProposalDetail(proposal) {
  const account = accountFor(proposal.accountId);
  const quote = quoteFor(proposal.quoteId);
  const current = quote && quote.version === proposal.quoteVersion && proposal.sourceQuoteTotalCents === quote.calculation.totalCents;
  const sections = proposal.sections;
  const benefits = sections.benefits.map(item => '<li>' + escapeHtml(item) + '</li>').join('');
  const assumptions = sections.assumptions.map(item => '<li>' + escapeHtml(item) + '</li>').join('');
  return '<button class="back-link" data-action="back-proposals">← Proposals</button><div class="account-title-row"><div><span class="eyebrow">PROPOSAL DRAFT · ' + escapeHtml(proposal.id) + '</span><h2>' + escapeHtml(proposal.title) + '</h2><p>Prepared from ' + escapeHtml(quote ? quote.number : 'quote unavailable') + ' · version ' + proposal.quoteVersion + '</p></div>' + badge(proposal.status) + '</div>' +
    (!current ? '<div class="callout warning-callout"><b>This proposal is out of date</b><p>The linked quotation has changed. Refresh the proposal from the current quotation before customer review.</p><button class="btn secondary" data-action="refresh-proposal" data-quote="' + escapeHtml(proposal.quoteId) + '">Refresh from current quote</button></div>' : '') +
    '<div class="proposal-preview"><div class="proposal-page"><div class="proposal-page-head"><span>SOLUTION PROPOSAL</span><h2>' + escapeHtml(account.name) + '</h2><p>' + dateLabel(proposal.createdAt) + '</p></div><section><h3>Customer requirements</h3><p>' + escapeHtml(sections.customerNeed) + '</p></section><section><h3>Recommended solution</h3><p>' + escapeHtml(sections.solution) + '</p></section><section><h3>Solution benefits</h3><ul>' + benefits + '</ul></section><section><h3>Delivery approach</h3><p>' + escapeHtml(sections.delivery) + '</p></section><section><h3>Commercial proposal</h3><p class="proposal-commercial">' + escapeHtml(sections.commercial) + '</p></section><section><h3>Assumptions and exclusions</h3><ul>' + assumptions + '</ul></section><section><h3>Next steps</h3><ol><li>Confirm requirements and delivery capacity.</li><li>Review the linked quotation terms.</li><li>Agree the implementation and service start date.</li></ol></section></div><aside class="proposal-controls panel"><div class="panel-head"><div><span class="eyebrow">DOCUMENT ACTIONS</span><h3>Keep terms aligned</h3></div></div><p>Benefits are sourced from product records. Commercial totals are copied from the linked quotation version.</p><p><b>Generator:</b> ' + escapeHtml(proposal.generator) + '</p><p><b>Linked quote total:</b> ' + money(proposal.sourceQuoteTotalCents, quote.currency) + '</p>' +
    (proposal.status !== 'READY_FOR_CUSTOMER' ? '<button class="btn primary full-width" data-action="proposal-ready" data-proposal="' + escapeHtml(proposal.id) + '" ' + (!current || quote.status !== 'READY_FOR_CUSTOMER' ? 'disabled' : '') + '>Mark proposal ready for customer</button>' : '<div class="callout success-callout">Proposal is ready for customer review.</div>') +
    '<button class="btn secondary full-width" data-action="download-proposal" data-proposal="' + escapeHtml(proposal.id) + '">Download ' + (proposal.status === 'READY_FOR_CUSTOMER' ? 'proposal' : 'draft preview') + '</button><p class="helper">The local adapter prepares HTML that can be opened and printed to PDF. No external provider generated this document.</p></aside></div>';
}

function renderApprovals() {
  const accounts = visibleAccountIds();
  const approvals = state.approvals.filter(item => accounts.has(item.accountId));
  const pending = approvals.filter(item => item.status === 'PENDING');
  const past = approvals.filter(item => item.status !== 'PENDING');
  return '<div class="page-toolbar"><div><span class="eyebrow">HUMAN COMMERCIAL CONTROL</span><h2>' + pending.length + ' decision(s) pending</h2><p>Prices below policy stay held until a manager records an approval or rejection. Decisions apply to one quotation version only.</p></div>' + (state.role === 'manager' ? '<span class="role-pill">Sales Manager actions enabled</span>' : '<span class="role-pill">Read-only for salesperson</span>') + '</div>' +
    (state.role !== 'manager' ? '<div class="callout warning-callout"><b>Manager review required</b><p>Switch the role control to Sales Manager to decide a pricing exception.</p></div>' : '') +
    '<section class="panel"><div class="panel-head"><div><span class="eyebrow">PENDING</span><h3>Commercial exception requests</h3></div><span>Internal cost and margin are visible to the manager role</span></div>' +
    (pending.length ? '<div class="approval-list">' + pending.map(item => renderApprovalCard(item, state.role === 'manager')).join('') + '</div>' : '<div class="empty-state">No commercial exception needs a decision.</div>') + '</section>' +
    '<section class="panel history-panel"><div class="panel-head"><div><span class="eyebrow">DECISION HISTORY</span><h3>Resolved requests</h3></div><span>' + past.length + ' recorded</span></div>' +
    (past.length ? '<div class="approval-history">' + past.map(item => '<div><span><b>' + escapeHtml(item.id) + ' · ' + escapeHtml(item.type) + '</b><small>' + escapeHtml(item.quoteId) + ' · ' + escapeHtml(item.decidedBy || '') + ' · ' + dateLabel(item.decidedAt) + '</small></span>' + badge(item.status) + '<p>' + escapeHtml(item.decisionNote) + '</p></div>').join('') + '</div>' : '<div class="empty-state">Approval decisions are appended here with the version and decision note.</div>') + '</section>';
}

function renderApprovalCard(approval, canDecide) {
  const quote = quoteFor(approval.quoteId);
  const account = accountFor(approval.accountId);
  const exceptionRows = approval.exceptions.map(item => '<li><b>' + escapeHtml(item.rule) + '</b><span>' + escapeHtml(item.detail) + '</span></li>').join('');
  return '<article class="approval-card"><div class="approval-top"><div><span class="eyebrow">' + escapeHtml(approval.id) + ' · ' + dateLabel(approval.requestedAt) + '</span><h3>' + escapeHtml(account.name) + ' · ' + escapeHtml(quote.number) + ' v' + approval.quoteVersion + '</h3><p>Requested by ' + escapeHtml(approval.requestedBy) + ' · approver ' + escapeHtml(approval.approverRole) + '</p></div>' + badge(approval.status) + '</div>' +
    '<div class="approval-data"><div><small>Proposed total</small><b>' + money(quote.calculation.totalCents, quote.currency) + '</b></div><div><small>Gross margin</small><b>' + (quote.calculation.grossMarginBps / 100).toFixed(2) + '%</b></div><div><small>Internal cost</small><b>' + money(quote.calculation.totalCostCents, quote.currency) + '</b></div></div>' +
    '<ul class="exception-list">' + exceptionRows + '</ul><div class="approval-actions"><button class="text-button" data-action="open-quote" data-quote="' + escapeHtml(quote.id) + '">Open quotation</button>' +
    (canDecide && approval.status === 'PENDING' ? '<label class="approval-note">Decision note<input name="note-' + escapeHtml(approval.id) + '" placeholder="Add a commercial reason"></label><div class="button-row"><button class="btn danger" data-action="decide-approval" data-approval="' + escapeHtml(approval.id) + '" data-decision="REJECTED">Reject</button><button class="btn primary" data-action="decide-approval" data-approval="' + escapeHtml(approval.id) + '" data-decision="APPROVED">Approve exception</button></div>' : '') + '</div></article>';
}

function renderProducts() {
  const products = state.products;
  return '<div class="page-toolbar"><div><span class="eyebrow">ILLUSTRATIVE ENTERPRISE CATALOG</span><h2>' + products.length + ' product and service records</h2><p>Example SGD rates for a multi-site industrial data, asset context and AI workflow deployment. Source access, scope and delivery capacity require review.</p></div><span class="snapshot-chip">Example rate card · 18 Oct 2026</span></div>' +
    '<div class="product-grid">' + products.map(product => {
      const priceUnit = 'per ' + product.unit + (product.billingPeriod ? ' / ' + product.billingPeriod : '');
      const readiness = product.capacity ? product.capacity.status : 'Delivery plan requires confirmation';
      const source = product.pricingSource || 'Illustrative rate card';
      const volume = (product.volumeDiscounts || []).length
        ? '<span>Volume breaks <b>' + product.volumeDiscounts.map(item => item.minimumQuantity + '+ sites at ' + (item.discountBps / 100) + '%').join(', ') + '</b></span>'
        : '';
      const internalCost = state.role === 'manager'
        ? '<span>Internal cost <b>' + money(product.unitCostCents, 'SGD') + ' per ' + escapeHtml(product.unit) + (product.billingPeriod ? ' / ' + escapeHtml(product.billingPeriod) : '') + '</b></span>'
        : '';
      return '<article class="product-card"><div class="product-top"><span class="category-tag">' + escapeHtml(product.category) + '</span><span class="status-live">' + escapeHtml(product.status) + '</span></div>' +
        '<h3>' + escapeHtml(product.name) + '</h3><p>' + escapeHtml(product.description) + '</p>' +
        '<div class="product-price"><div><small>LIST PRICE</small><b>' + money(product.listPriceCents, 'SGD') + '</b><span>' + escapeHtml(priceUnit) + '</span></div><div class="product-price-meta"><small>CATALOG ID</small><b>' + escapeHtml(product.id) + '</b><span>' + escapeHtml(source) + '</span></div></div>' +
        '<div class="availability"><span class="readiness-mark" aria-hidden="true">R</span><span><b>Readiness review</b><small>' + escapeHtml(readiness) + (product.capacity && product.capacity.confidence === 'Not reserved' ? ' · capacity not reserved' : '') + '</small></span></div>' +
        '<div class="product-features"><b>Included capabilities</b><ul>' + product.features.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>' +
        '<div class="policy-strip"><span>Margin floor <b>' + (product.marginFloorBps / 100) + '%</b></span><span>Maximum discount <b>' + (product.maxDiscountBps / 100) + '%</b></span>' + volume + internalCost + '</div>' +
        '<p class="freshness-note">' + escapeHtml(product.leadTime) + '</p></article>';
    }).join('') + '</div>';
}

function renderTeam() {
  if (state.role !== 'manager') return '<div class="callout warning-callout"><b>Manager view</b><p>Switch to Sales Manager to see team-level records and commercial exceptions.</p></div>';
  const metrics = managerMetrics(state, state.role);
  const owners = [...new Set(state.opportunities.map(item => item.owner))];
  const allAccounts = visibleAccounts(state, state.role);
  const pending = state.approvals.filter(item => item.status === 'PENDING');
  const allQuotes = state.quotes.filter(item => allAccounts.some(account => account.id === item.accountId));
  const stageCounts = {};
  state.opportunities.filter(item => item.status === 'Open').forEach(item => stageCounts[item.stage] = (stageCounts[item.stage] || 0) + 1);
  return '<div class="team-intro"><div><span class="eyebrow">REPORTING WITHOUT REPORTING</span><h2>Operational work is the report.</h2><p>Pipeline value, RFQ state, quotation status and exceptions are derived from the same account and event records used by sales.</p></div><button class="btn secondary" data-action="run-daily">Refresh from current records</button></div>' +
    '<div class="metric-grid">' + metricCard('Team opportunities', metrics.opportunityCount, 'Open opportunities', '') + metricCard('Pipeline value', money(metrics.pipelineCents, 'SGD'), 'Current opportunity values', 'blue') + metricCard('Quotes in progress', allQuotes.length, 'Includes saved versions and exceptions', '') + metricCard('Pending approvals', pending.length, 'Manager queue', pending.length ? 'amber' : '') + '</div>' +
    '<div class="content-grid team-grid"><section class="panel"><div class="panel-head"><div><span class="eyebrow">TEAM WORKLOAD</span><h3>Open opportunities by owner</h3></div><span>Derived from pipeline records</span></div><div class="workload-list">' + owners.map(owner => {
      const items = state.opportunities.filter(item => item.owner === owner && item.status === 'Open');
      const amount = items.reduce((sum, item) => sum + item.valueCents, 0);
      return '<div class="workload-row"><span class="owner-avatar">' + escapeHtml(owner.split(' ').map(part => part[0]).join('')) + '</span><span><b>' + escapeHtml(owner) + '</b><small>' + items.length + ' open opportunities · ' + money(amount, 'SGD') + '</small></span><span class="bar-track"><i style="width:' + Math.max(8, items.length / Math.max(1, metrics.opportunityCount) * 100) + '%"></i></span></div>';
    }).join('') + '</div><div class="panel-subsection"><h4>Pipeline by stage</h4><div class="stage-chips">' + Object.entries(stageCounts).map(entry => '<span>' + escapeHtml(entry[0]) + '<b>' + entry[1] + '</b></span>').join('') + '</div></div></section>' +
    '<section class="panel"><div class="panel-head"><div><span class="eyebrow">COMMERCIAL CONTROL</span><h3>Exceptions and blockers</h3></div><button class="text-button" data-nav-view="approvals">Approval queue</button></div>' +
    (pending.length ? '<div class="manager-approval-list">' + pending.map(item => '<div><span><b>' + escapeHtml(accountFor(item.accountId).name) + '</b><small>' + escapeHtml(item.quoteId) + ' · ' + escapeHtml(item.exceptions[0].rule) + '</small></span><b>' + money(quoteFor(item.quoteId).calculation.totalCents, quoteFor(item.quoteId).currency) + '</b><button class="text-button" data-action="open-quote" data-quote="' + escapeHtml(item.quoteId) + '">Review</button></div>').join('') + '</div>' : '<div class="empty-state">No pricing exceptions are pending.</div>') +
    '<div class="panel-subsection"><h4>Unconfirmed operations</h4><p class="helper">Site readiness, source access and delivery capacity require confirmation. Integration and onboarding slots are not reserved.</p></div></section></div>' +
    '<section class="panel"><div class="panel-head"><div><span class="eyebrow">TEAM PIPELINE</span><h3>Current opportunity state</h3></div><span>All entries from sales operations</span></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Account</th><th>Opportunity</th><th>Owner</th><th>Stage</th><th>Value</th><th>Next action</th></tr></thead><tbody>' +
    state.opportunities.map(item => '<tr><td>' + escapeHtml(accountFor(item.accountId).name) + '</td><td>' + escapeHtml(item.name) + '</td><td>' + escapeHtml(item.owner) + '</td><td>' + escapeHtml(item.stage) + '</td><td>' + money(item.valueCents, 'SGD') + '</td><td>' + escapeHtml(item.nextAction) + '</td></tr>').join('') +
    '</tbody></table></div></section>';
}

function renderActivity() {
  const ids = visibleAccountIds();
  const events = state.events.filter(item => !item.accountId || ids.has(item.accountId));
  const runs = state.executions;
  return '<div class="page-toolbar"><div><span class="eyebrow">AUDITABLE WORK</span><h2>Agent and CRM activity</h2><p>Actions, holds and decisions are recorded against the same quote, account and opportunity records.</p></div><button class="btn secondary" data-action="run-daily">Run daily review</button></div>' +
    '<div class="content-grid activity-grid"><section class="panel"><div class="panel-head"><div><span class="eyebrow">AGENT EXECUTIONS</span><h3>' + runs.length + ' run(s)</h3></div><span>Local demo adapter</span></div>' +
    (runs.length ? '<div class="execution-list">' + runs.map(item => '<div class="run-detail"><div class="run-detail-top"><span><b>' + escapeHtml(item.id) + ' · ' + escapeHtml(item.title) + '</b><small>' + dateLabel(item.startedAt) + ' · ' + escapeHtml(item.adapter) + '</small></span>' + badge(item.status) + '</div><ul>' + item.actions.map(action => '<li class="run-agent"><span class="agent-check ' + escapeHtml(action.status) + '">' + (action.status === 'complete' ? '✓' : action.status === 'held' ? '!' : action.status === 'blocked' ? '×' : '·') + '</span><span><b>' + escapeHtml(action.agent) + '</b><small>' + escapeHtml(action.result) + '</small></span>' + badge(action.status) + '</li>').join('') + '</ul></div>').join('') + '</div>' : '<div class="empty-state">Run a customer or daily workflow to build execution history.</div>') + '</section>' +
    '<section class="panel"><div class="panel-head"><div><span class="eyebrow">CRM EVENT TIMELINE</span><h3>' + events.length + ' event(s)</h3></div><span>Latest first</span></div>' +
    (events.length ? '<div class="event-feed">' + events.map(item => '<article class="event-entry"><div><b>' + escapeHtml(item.actor) + '</b><small>' + dateLabel(item.at) + ' · ' + escapeHtml(item.type) + '</small></div><p>' + escapeHtml(item.summary) + '</p><small>' + escapeHtml(item.detail) + '</small></article>').join('') + '</div>' : '<div class="empty-state">CRM events appear as agents prepare quotes, sellers log interactions and managers decide approvals.</div>') + '</section></div>';
}

function runCommand(text) {
  const command = String(text || '').trim();
  if (!command) {
    showToast('Add customer notes or a sales task first.', 'warning');
    return;
  }
  state.commandDraft = command;
  if (command.toLowerCase().includes('attention today') || command.toLowerCase().includes('handle everything else') || command.toLowerCase().includes('sales admin')) {
    runDailyReview(state, { now: new Date().toISOString() });
    state.commandDraft = '';
    state.activeView = 'overview';
    saveState();
    render();
    showToast('Daily review completed. Open actions, approvals and blockers are listed below.', 'success');
    return;
  }
  let result;
  try {
    result = processCustomerBrief(state, command, {
      now: new Date().toISOString(),
      today: DEMO_TODAY,
      interpreter: adapters.interpretation.run,
      proposalGenerator: (_state, quoteId, options) => adapters.proposal.generate(quoteId, options)
    });
  } catch (error) {
    showToast(error.message, 'warning');
    return;
  }
  state.selectedRfqId = result.rfq.id;
  state.selectedQuoteId = result.quote ? result.quote.id : null;
  state.activeView = 'rfqs';
  state.commandDraft = '';
  saveState();
  render();
  if (result.quote && result.quote.status === 'AWAITING_APPROVAL') {
    showToast('RFQ saved. Pricing was calculated and held for manager approval.', 'warning');
  } else if (result.quote) {
    showToast('RFQ, quotation and proposal draft are linked to the opportunity.', 'success');
  } else {
    showToast('RFQ saved with clarification items. Pricing is paused until the core fields are confirmed.', 'warning');
  }
}

function showToast(message, tone) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = 'toast visible ' + (tone || 'info');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('visible'), 4200);
}

function downloadHtml(filename, contents) {
  const blob = new Blob([contents], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener('click', event => {
  const nav = event.target.closest('[data-nav-view]');
  if (nav) {
    if (nav.dataset.navView === 'pipeline' && state.activeView !== 'pipeline') state.selectedAccountId = null;
    if (nav.dataset.navView === 'quotes' && state.activeView !== 'quotes') state.selectedQuoteId = null;
    if (nav.dataset.navView === 'proposals' && state.activeView !== 'proposals') state.selectedProposalId = null;
    state.activeView = nav.dataset.navView;
    render();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'load-prompt') {
    state.commandDraft = prompts[button.dataset.prompt] || '';
    render();
    $('#command-input').focus();
    return;
  }
  if (action === 'run-daily') {
    runDailyReview(state, { now: new Date().toISOString() });
    state.activeView = 'overview';
    render();
    showToast('Daily sales review refreshed from current CRM and quotation records.', 'success');
    return;
  }
  if (action === 'open-account') {
    state.selectedAccountId = button.dataset.account;
    state.activeView = 'pipeline';
    render();
    return;
  }
  if (action === 'back-pipeline') {
    state.selectedAccountId = null;
    render();
    return;
  }
  if (action === 'open-rfq') {
    state.selectedRfqId = button.dataset.rfq;
    render();
    return;
  }
  if (action === 'open-quote') {
    state.selectedQuoteId = button.dataset.quote;
    state.activeView = 'quotes';
    render();
    return;
  }
  if (action === 'back-quotes') {
    state.selectedQuoteId = null;
    render();
    return;
  }
  if (action === 'open-proposal') {
    state.selectedProposalId = button.dataset.proposal;
    state.activeView = 'proposals';
    render();
    return;
  }
  if (action === 'back-proposals') {
    state.selectedProposalId = null;
    render();
    return;
  }
  if (action === 'confirm-quote') {
    const currencyConfirmed = Boolean($('#currency-confirm') && $('#currency-confirm').checked);
    const assumptionsConfirmed = Boolean($('#assumptions-confirm') && $('#assumptions-confirm').checked);
    try {
      confirmQuoteForCustomer(state, button.dataset.quote, { currencyConfirmed, assumptionsConfirmed }, { now: new Date().toISOString() });
      render();
      showToast('Quotation is ready for customer review. No message was sent.', 'success');
    } catch (error) {
      showToast(error.message, 'warning');
    }
    return;
  }
  if (action === 'download-quote') {
    const quote = quoteFor(button.dataset.quote);
    if (!quote) return;
    downloadHtml(quote.number + '-v' + quote.version + (quote.status === 'READY_FOR_CUSTOMER' ? '-customer.html' : '-draft.html'), customerQuoteHtml(state, quote));
    return;
  }
  if (action === 'generate-proposal') {
    try {
      const proposal = adapters.proposal.generate(button.dataset.quote, { now: new Date().toISOString() });
      state.selectedProposalId = proposal.id;
      state.activeView = 'proposals';
      render();
      showToast('Proposal draft assembled from the linked quotation and catalog facts.', 'success');
    } catch (error) {
      showToast(error.message, 'warning');
    }
    return;
  }
  if (action === 'refresh-proposal') {
    try {
      const proposal = adapters.proposal.generate(button.dataset.quote, { now: new Date().toISOString() });
      state.selectedProposalId = proposal.id;
      render();
      showToast('Proposal refreshed from the current quote version.', 'success');
    } catch (error) {
      showToast(error.message, 'warning');
    }
    return;
  }
  if (action === 'proposal-ready') {
    try {
      markProposalReady(state, button.dataset.proposal, { now: new Date().toISOString() });
      render();
      showToast('Proposal is ready for customer review. No message was sent.', 'success');
    } catch (error) {
      showToast(error.message, 'warning');
    }
    return;
  }
  if (action === 'download-proposal') {
    const proposal = state.proposals.find(item => item.id === button.dataset.proposal);
    if (!proposal) return;
    downloadHtml(proposal.id + (proposal.status === 'READY_FOR_CUSTOMER' ? '-proposal.html' : '-draft.html'), proposalHtml(state, proposal));
    return;
  }
  if (action === 'decide-approval') {
    const approvalId = button.dataset.approval;
    const note = $('[name="note-' + CSS.escape(approvalId) + '"]');
    try {
      decideApproval(state, approvalId, button.dataset.decision, { role: state.role, note: note ? note.value : '', now: new Date().toISOString() });
      render();
      showToast(button.dataset.decision === 'APPROVED' ? 'Exception approved for this quotation version.' : 'Exception rejected. The salesperson must revise the quote.', 'success');
    } catch (error) {
      showToast(error.message, 'warning');
    }
    return;
  }
  if (action === 'reset') {
    localStorage.removeItem(STORAGE_KEY);
    state = createInitialState();
    state.search = '';
    state.commandDraft = '';
    render();
    showToast('Demo workspace reset to its starting records.', 'info');
  }
});

document.addEventListener('submit', event => {
  const form = event.target;
  if (form.id === 'command-form') {
    event.preventDefault();
    runCommand(new FormData(form).get('command'));
    return;
  }
  if (form.dataset.form === 'interaction') {
    event.preventDefault();
    const data = new FormData(form);
    try {
      adapters.crm.recordInteraction(data.get('accountId'), data.get('summary'), { channel: data.get('channel'), now: new Date().toISOString() });
      render();
      showToast('Interaction added to the CRM timeline.', 'success');
    } catch (error) {
      showToast(error.message, 'warning');
    }
    return;
  }
  if (form.dataset.form === 'quote-revision') {
    event.preventDefault();
    const quote = quoteFor(state.selectedQuoteId);
    if (!quote) return;
    const data = new FormData(form);
    const changes = {};
    quote.lines.forEach(line => {
      changes[line.id] = {
        quantity: Number(data.get('qty-' + line.id)),
        periodCount: Number(data.get('period-' + line.id)),
        unitPriceCents: Math.round(Number(data.get('price-' + line.id)) * 100)
      };
    });
    try {
      reviseQuote(state, quote.id, changes, { now: new Date().toISOString() });
      render();
      showToast('A new quotation version was saved and recalculated.', quoteFor(quote.id).exceptions.length ? 'warning' : 'success');
    } catch (error) {
      showToast(error.message, 'warning');
    }
  }
});

document.addEventListener('change', async event => {
  const input = event.target;
  if (input.id !== 'brief-file' || !input.files || !input.files[0]) return;
  const file = input.files[0];
  input.value = '';
  if (file.size > 2 * 1024 * 1024) {
    showToast('This demo accepts note files up to 2 MB.', 'warning');
    return;
  }
  try {
    const contents = await file.text();
    state.commandDraft = (state.commandDraft ? state.commandDraft + '\n\n' : '') + 'Attachment: ' + file.name + '\n' + contents;
    const textarea = $('#command-input');
    if (textarea) textarea.value = state.commandDraft;
    saveState();
    showToast('File contents added locally to the RFQ notes. Nothing was uploaded.', 'success');
  } catch (error) {
    showToast('Could not read this file as text.', 'warning');
  }
});

$('#role-switch').addEventListener('change', event => {
  state.role = event.target.value;
  if (state.role === 'manager') state.activeView = 'team';
  else {
    state.activeView = 'overview';
    if (state.selectedAccountId && !visibleAccountIds().has(state.selectedAccountId)) state.selectedAccountId = null;
  }
  render();
  showToast(state.role === 'manager' ? 'Sales Manager view enabled. Commercial costs and approval actions are visible.' : 'Salesperson view enabled. Records are limited to assigned accounts.', 'info');
});

$('#global-search').addEventListener('input', event => {
  state.search = event.target.value;
  if (state.activeView === 'pipeline') render();
});

$('#global-search').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    state.activeView = 'pipeline';
    state.selectedAccountId = null;
    render();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    $('#global-search').focus();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'enter') {
    const form = document.querySelector('#command-form');
    if (form) form.requestSubmit();
  }
});

render();
