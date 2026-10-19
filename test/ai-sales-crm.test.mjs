import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoAdapters, integrationRegistry } from '../case-studies/prospecting-operations/demo/adapters.mjs';
import {
  calculateQuote,
  confirmQuoteForCustomer,
  createInitialState,
  customerQuoteHtml,
  decideApproval,
  evaluateQuote,
  formatMoney,
  generateProposal,
  managerMetrics,
  markProposalReady,
  parseRequirements,
  processCustomerBrief,
  proposalHtml,
  reviseQuote,
  runDailyReview,
  visibleAccounts
} from '../case-studies/prospecting-operations/demo/sales-engine.mjs';

const acmeBrief = 'Acme Technologies is planning a two-year Industrial Data Foundation across 3 sites. Connect its process historian, asset management system, engineering drawings and maintenance history. Include the Asset Context Workspace, Industrial AI Workbench, industrial data integration and contextualization, and ongoing platform support. The existing platform contract expires in December 2027. The initial budget is around $8,000,000. Prepare an enterprise quotation and proposal explaining the unified asset context and governed workflows.';
const fixedNow = '2026-10-19T01:10:00.000Z';

function preparedAcme() {
  const state = createInitialState();
  const result = processCustomerBrief(state, acmeBrief, { now: fixedNow, today: '2026-10-19' });
  return { state, result };
}

test('extracts an industrial solution across several products, sites, term and services', () => {
  const state = createInitialState();
  const parsed = parseRequirements(acmeBrief, { accounts: state.accounts, products: state.products, today: '2026-10-19' });
  assert.equal(parsed.accountId, 'AC-100');
  assert.equal(parsed.productId, 'IDF-ENT');
  assert.deepEqual(parsed.productIds, ['IDF-ENT', 'ACW-ENT', 'IAW-ENT']);
  assert.equal(parsed.quantity, 3);
  assert.equal(parsed.currentSupplierPriceCents, null);
  assert.equal(parsed.targetUnitPriceCents, null);
  assert.equal(parsed.budgetCents, 800000000);
  assert.equal(parsed.deliveryWindow, null);
  assert.equal(parsed.termYears, 2);
  assert.deepEqual(parsed.serviceIds, ['S-IMPL', 'S-MAINT']);
  assert.match(parsed.sourceText, /asset context/);
  assert.ok(parsed.openQuestions.some(item => item.toLowerCase().includes('currency')));
});

test('extracts an annual workbench request and preserves budget uncertainty', () => {
  const state = createInitialState();
  const text = 'Vector Labs needs 1 site of Industrial AI Workbench for a two-year term. They require SSO and are worried about data migration. Budget is around $1,200,000. Integration is needed before January 2027. Their current solution expires in December 2026.';
  const parsed = parseRequirements(text, { accounts: state.accounts, products: state.products, today: '2026-10-19' });
  assert.equal(parsed.accountId, 'AC-101');
  assert.equal(parsed.productId, 'IAW-ENT');
  assert.deepEqual(parsed.productIds, ['IAW-ENT']);
  assert.equal(parsed.quantity, 1);
  assert.equal(parsed.budgetCents, 120000000);
  assert.equal(parsed.deliveryWindow, 'January 2027');
  assert.equal(parsed.termYears, 2);
  assert.ok(parsed.serviceIds.includes('S-IMPL'));
  assert.ok(parsed.serviceIds.includes('S-MIG'));
  assert.ok(parsed.notes.includes('Single sign-on requirement captured.'));
  assert.ok(parsed.notes.some(item => item.includes('expires in December 2026')));
  assert.ok(parsed.openQuestions.some(item => item.toLowerCase().includes('delivery')));
});

test('calculates taxes, gross margin and markup from saved catalog rules', () => {
  const { state, result } = preparedAcme();
  const quote = result.quote;
  assert.ok(quote);
  assert.equal(quote.calculation.lines.length, 5);
  assert.equal(quote.calculation.subtotalCents, 818000000);
  assert.equal(quote.calculation.shippingCents, 0);
  assert.equal(quote.calculation.amountBeforeTaxCents, 818000000);
  assert.equal(quote.calculation.taxCents, 73620000);
  assert.equal(quote.calculation.totalCents, 891620000);
  assert.equal(quote.calculation.totalCostCents, 284000000);
  assert.equal(quote.calculation.grossProfitCents, 534000000);
  assert.equal(quote.calculation.grossMarginBps, Math.round(534000000 / 818000000 * 10000));
  assert.equal(quote.calculation.markupBps, Math.round(534000000 / 284000000 * 10000));
  assert.notEqual(quote.calculation.grossMarginBps, quote.calculation.markupBps);
  assert.equal(quote.status, 'READY_FOR_SALES_REVIEW');
  assert.equal(quote.exceptions.length, 0);
  assert.equal(result.rfq.quoteId, quote.id);
  assert.equal(result.rfq.proposalId, state.proposals[0].id);
});

test('applies volume breaks and active customer price agreements to site pricing', () => {
  const volumeState = createInitialState();
  const volume = processCustomerBrief(volumeState, 'Acme Technologies needs Industrial Data Foundation across 5 sites for 2 years.', { now: fixedNow });
  assert.equal(volume.quote.lines[0].unitPriceCents, 49400000);
  assert.equal(volume.quote.lines[0].priceBasis, 'Volume price at 5% off');
  const agreementState = createInitialState();
  const agreement = processCustomerBrief(agreementState, 'Northstar Freight needs Industrial Data Foundation across 5 sites for 2 years.', { now: fixedNow });
  assert.equal(agreement.quote.lines[0].unitPriceCents, 46500000);
  assert.equal(agreement.quote.lines[0].priceBasis, 'Customer-specific agreement AGR-NS-2026');
});

test('rejects invalid quantities and keeps deterministic calculation math', () => {
  const state = createInitialState();
  const product = state.products[0];
  assert.throws(() => calculateQuote({
    lines: [{ id: 'L1', productId: product.id, quantity: 0, periodCount: 1, unitPriceCents: 40000000, unitCostCents: 17000000, listPriceCents: 52000000, marginFloorBps: 4200, maxDiscountBps: 1400, taxable: true, taxRateBps: 900 }],
    currency: 'SGD'
  }), /positive whole number/);
  const evaluation = evaluateQuote({
    lines: [{ id: 'L1', productId: product.id, name: product.name, quantity: 3, periodCount: 1, unitPriceCents: 20000000, unitCostCents: 17000000, listPriceCents: 52000000, marginFloorBps: 4200, maxDiscountBps: 1400, marginBps: 1500, discountBps: 6154 }]
  });
  assert.equal(evaluation.allowed, false);
  assert.ok(evaluation.exceptions.some(item => item.code === 'MARGIN_FLOOR'));
  assert.ok(evaluation.exceptions.some(item => item.code === 'DISCOUNT_LIMIT'));
});

test('holds a below-floor quotation until the manager records a version-specific decision', () => {
  const state = createInitialState();
  const result = processCustomerBrief(state, 'Acme Technologies needs the Industrial Data Foundation across 3 sites for 2 years. Revise the price to $200,000 per site per year. Include industrial integration and platform support.', { now: fixedNow });
  const quote = result.quote;
  assert.equal(quote.status, 'AWAITING_APPROVAL');
  assert.equal(quote.approvalStatus, 'PENDING');
  assert.equal(state.proposals.length, 0);
  assert.throws(() => confirmQuoteForCustomer(state, quote.id, { currencyConfirmed: true }, { now: fixedNow }), /must be approved/);
  const approval = state.approvals[0];
  assert.throws(() => decideApproval(state, approval.id, 'APPROVED', { role: 'sales', now: fixedNow }), /Sales Manager/);
  decideApproval(state, approval.id, 'APPROVED', { role: 'manager', note: 'Strategic order. One-time exception recorded.', now: fixedNow });
  assert.equal(approval.status, 'APPROVED');
  assert.equal(quote.status, 'APPROVED_EXCEPTION');
  confirmQuoteForCustomer(state, quote.id, { currencyConfirmed: true, assumptionsConfirmed: true }, { now: fixedNow });
  assert.equal(quote.status, 'READY_FOR_CUSTOMER');
  const proposal = generateProposal(state, quote.id, { now: fixedNow });
  assert.equal(proposal.quoteVersion, quote.version);
  assert.equal(proposal.sourceQuoteTotalCents, quote.calculation.totalCents);
  markProposalReady(state, proposal.id, { now: fixedNow });
  assert.equal(proposal.status, 'READY_FOR_CUSTOMER');
});

test('a rejected pricing exception remains unreleasable', () => {
  const state = createInitialState();
  const result = processCustomerBrief(state, 'Acme Technologies needs the Industrial Data Foundation across 3 sites for 2 years. Revise the price to $200,000 per site per year.', { now: fixedNow });
  const quote = result.quote;
  const approval = state.approvals[0];
  decideApproval(state, approval.id, 'REJECTED', { role: 'manager', note: 'Price is below the approved threshold.', now: fixedNow });
  assert.equal(approval.status, 'REJECTED');
  assert.equal(quote.status, 'REVISION_REQUIRED');
  assert.throws(() => confirmQuoteForCustomer(state, quote.id, { currencyConfirmed: true, assumptionsConfirmed: true }, { now: fixedNow }), /pricing exception was rejected/);
  assert.equal(state.proposals.length, 0);
});

test('saves quote revisions without overwriting history and sends new exceptions to approval', () => {
  const { state, result } = preparedAcme();
  const quote = result.quote;
  const originalTotal = quote.calculation.totalCents;
  const originalProposal = state.proposals[0];
  reviseQuote(state, quote.id, { 'LINE-IDF-ENT': { unitPriceCents: 40000000 } }, { now: fixedNow });
  assert.equal(quote.version, 2);
  assert.equal(quote.versions.length, 1);
  assert.equal(quote.versions[0].calculation.totalCents, originalTotal);
  assert.ok(quote.calculation.totalCents < originalTotal);
  assert.equal(quote.status, 'AWAITING_APPROVAL');
  assert.ok(quote.exceptions.some(item => item.code === 'DISCOUNT_LIMIT'));
  assert.equal(originalProposal.status, 'STALE_QUOTE_VERSION');
  assert.equal(state.approvals[0].quoteVersion, 2);
});

test('a new quote version supersedes any open approval for an older version', () => {
  const state = createInitialState();
  const result = processCustomerBrief(state, 'Acme Technologies needs the Industrial Data Foundation across 3 sites for 2 years. Revise the price to $200,000 per site per year.', { now: fixedNow });
  const oldApproval = state.approvals[0];
  reviseQuote(state, result.quote.id, { 'LINE-IDF-ENT': { unitPriceCents: 40000000 } }, { now: fixedNow });
  assert.equal(oldApproval.status, 'SUPERSEDED');
  assert.equal(state.approvals[0].quoteVersion, 2);
  assert.equal(state.approvals[0].status, 'PENDING');
  assert.throws(() => decideApproval(state, oldApproval.id, 'APPROVED', { role: 'manager', now: fixedNow }), /no longer pending/);
});

test('keeps internal costs and margin out of downloaded customer documents', () => {
  const { state, result } = preparedAcme();
  const quoteHtml = customerQuoteHtml(state, result.quote);
  const proposalHtmlText = proposalHtml(state, state.proposals[0]);
  assert.match(quoteHtml, /DRAFT FOR INTERNAL REVIEW/);
  assert.doesNotMatch(quoteHtml, /Internal cost|gross margin|markup/i);
  assert.doesNotMatch(proposalHtmlText, /Internal cost|gross margin|markup/i);
  assert.match(quoteHtml, /Industrial Data Foundation/);
  assert.match(proposalHtmlText, /quotation Q-2026-01043 version 1/);
});

test('requires salesperson currency confirmation and keeps proposal totals tied to the quote version', () => {
  const { state, result } = preparedAcme();
  assert.throws(() => confirmQuoteForCustomer(state, result.quote.id, { currencyConfirmed: true, assumptionsConfirmed: false }, { now: fixedNow }), /assumptions/);
  assert.throws(() => confirmQuoteForCustomer(state, result.quote.id, { currencyConfirmed: false, assumptionsConfirmed: true }, { now: fixedNow }), /Confirm the quote currency/);
  confirmQuoteForCustomer(state, result.quote.id, { currencyConfirmed: true, assumptionsConfirmed: true }, { now: fixedNow });
  const proposal = state.proposals[0];
  markProposalReady(state, proposal.id, { now: fixedNow });
  assert.equal(proposal.status, 'READY_FOR_CUSTOMER');
  assert.match(customerQuoteHtml(state, result.quote), /SALES QUOTATION/);
  assert.doesNotMatch(customerQuoteHtml(state, result.quote), /DRAFT FOR INTERNAL REVIEW/);
  assert.equal(formatMoney(41000, 'SGD').includes('SGD'), true);
  assert.match(formatMoney(52000000, 'SGD'), /520,000/);
  assert.doesNotMatch(formatMoney(52000000, 'SGD'), /\.00/);
});

test('daily review reflects shared workflow records and manager visibility expands the view', () => {
  const { state, result } = preparedAcme();
  assert.equal(visibleAccounts(state, 'sales').length, 2);
  assert.equal(visibleAccounts(state, 'manager').length, 4);
  assert.equal(managerMetrics(state, 'sales').accountCount, 2);
  assert.equal(managerMetrics(state, 'manager').accountCount, 4);
  const digest = runDailyReview(state, { now: fixedNow });
  assert.ok(digest.completed.length >= 3);
  assert.ok(digest.requiresSalesperson.some(item => item.text.toLowerCase().includes('currency')));
  assert.ok(digest.requiresSalesperson.some(item => item.text.toLowerCase().includes('delivery capacity')));
  assert.ok(digest.blocked.some(item => item.productId === 'S-IMPL'));
  assert.equal(result.rfq.quoteId, result.quote.id);
  assert.equal(state.events.some(item => item.type === 'daily_review.completed'), true);
});

test('future integration points use explicit local adapters and block unsupported external actions', () => {
  const state = createInitialState();
  const adapters = createDemoAdapters(() => state);
  assert.equal(integrationRegistry.every(item => item.connected === false), true);
  assert.equal(adapters.interpretation.run(acmeBrief, { today: '2026-10-19' }).productId, 'IDF-ENT');
  assert.equal(adapters.catalog.lookup('IDF-ENT').name, 'Industrial Data Foundation');
  assert.equal(adapters.inventory.availability('IDF-ENT').confirmed, false);
  assert.throws(() => adapters.external.email.send(), /Email is not connected/);
  assert.throws(() => adapters.external.gamma.generate(), /No external proposal provider/);
});

test('salesperson role cannot process or release records for another owners account', () => {
  const state = createInitialState();
  const technologyBrief = 'Vector Labs needs 1 site of Industrial AI Workbench for a two-year term with SSO. Budget around $1,200,000. Integration and migration before January 2027.';
  assert.throws(() => processCustomerBrief(state, technologyBrief, { now: fixedNow }), /outside the active salesperson view/);
  assert.equal(state.rfqs.length, 0);
  state.role = 'manager';
  const result = processCustomerBrief(state, technologyBrief, { now: fixedNow });
  assert.ok(result.quote);
  assert.throws(() => confirmQuoteForCustomer(state, result.quote.id, { currencyConfirmed: true, assumptionsConfirmed: true }, { now: fixedNow }), /assigned salesperson role/);
});
