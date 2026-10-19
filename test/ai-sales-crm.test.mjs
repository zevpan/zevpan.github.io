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

const acmeBrief = 'I just met Acme Technologies. They need 120 units of Product X, delivered next month. They currently pay around $430 per unit to another supplier. We discussed something closer to $410 if they take the full quantity. They also want implementation support and a two-year maintenance agreement. Check availability, make sure our margins are acceptable, prepare a competitive quotation and put together a proposal explaining why they should choose us.';
const fixedNow = '2026-10-19T01:10:00.000Z';

function preparedAcme() {
  const state = createInitialState();
  const result = processCustomerBrief(state, acmeBrief, { now: fixedNow, today: '2026-10-19' });
  return { state, result };
}

test('extracts customer, product, quantity, commercial context and services from rough notes', () => {
  const state = createInitialState();
  const parsed = parseRequirements(acmeBrief, { accounts: state.accounts, products: state.products, today: '2026-10-19' });
  assert.equal(parsed.accountId, 'AC-100');
  assert.equal(parsed.productId, 'PX-120');
  assert.equal(parsed.quantity, 120);
  assert.equal(parsed.currentSupplierPriceCents, 43000);
  assert.equal(parsed.targetUnitPriceCents, 41000);
  assert.equal(parsed.deliveryWindow, 'November 2026');
  assert.equal(parsed.termYears, 2);
  assert.deepEqual(parsed.serviceIds, ['S-IMPL', 'S-MAINT']);
  assert.match(parsed.sourceText, /Check availability/);
  assert.ok(parsed.openQuestions.some(item => item.toLowerCase().includes('currency')));
});

test('extracts technology licensing requirements and preserves budget uncertainty', () => {
  const state = createInitialState();
  const text = 'Vector Labs needs 50 Operations Suite License seats. They require SSO and are worried about data migration. Budget is around $60,000. Implementation is needed before January 2027. Their current solution expires in December 2026.';
  const parsed = parseRequirements(text, { accounts: state.accounts, products: state.products, today: '2026-10-19' });
  assert.equal(parsed.accountId, 'AC-101');
  assert.equal(parsed.productId, 'OPS-50');
  assert.equal(parsed.quantity, 50);
  assert.equal(parsed.budgetCents, 6000000);
  assert.equal(parsed.deliveryWindow, 'January 2027');
  assert.equal(parsed.subscriptionTermMonths, 12);
  assert.ok(parsed.serviceIds.includes('S-IMPL'));
  assert.ok(parsed.serviceIds.includes('S-MIG'));
  assert.ok(parsed.notes.includes('Single sign-on requirement captured.'));
  assert.ok(parsed.notes.some(item => item.includes('expires in December 2026')));
  assert.ok(parsed.openQuestions.some(item => item.toLowerCase().includes('subscription term')));
});

test('calculates taxes, gross margin and markup from saved catalog rules', () => {
  const { state, result } = preparedAcme();
  const quote = result.quote;
  assert.ok(quote);
  assert.equal(quote.calculation.subtotalCents, 6280000);
  assert.equal(quote.calculation.shippingCents, 48000);
  assert.equal(quote.calculation.amountBeforeTaxCents, 6328000);
  assert.equal(quote.calculation.taxCents, 569520);
  assert.equal(quote.calculation.totalCents, 6897520);
  assert.equal(quote.calculation.totalCostCents, 4750000);
  assert.equal(quote.calculation.grossProfitCents, 1578000);
  assert.equal(quote.calculation.grossMarginBps, Math.round(1578000 / 6328000 * 10000));
  assert.equal(quote.calculation.markupBps, Math.round(1578000 / 4750000 * 10000));
  assert.notEqual(quote.calculation.grossMarginBps, quote.calculation.markupBps);
  assert.equal(quote.status, 'READY_FOR_SALES_REVIEW');
  assert.equal(quote.exceptions.length, 0);
  assert.equal(result.rfq.quoteId, quote.id);
  assert.equal(result.rfq.proposalId, state.proposals[0].id);
});

test('applies volume breaks and active customer price agreements before catalog fallback', () => {
  const volumeState = createInitialState();
  const volume = processCustomerBrief(volumeState, 'Acme Technologies needs 120 units of Product X.', { now: fixedNow });
  assert.equal(volume.quote.lines[0].unitPriceCents, 45908);
  assert.equal(volume.quote.lines[0].priceBasis, 'Volume price at 8% off');
  const agreementState = createInitialState();
  const agreement = processCustomerBrief(agreementState, 'Northstar Freight needs 50 units of Product X.', { now: fixedNow });
  assert.equal(agreement.quote.lines[0].unitPriceCents, 44500);
  assert.equal(agreement.quote.lines[0].priceBasis, 'Customer-specific agreement AGR-NS-2026');
});

test('rejects invalid quantities and keeps deterministic calculation math', () => {
  const state = createInitialState();
  const product = state.products[0];
  assert.throws(() => calculateQuote({
    lines: [{ id: 'L1', productId: product.id, quantity: 0, periodCount: 1, unitPriceCents: 41000, unitCostCents: 31000, listPriceCents: 49900, marginFloorBps: 2200, maxDiscountBps: 1800, taxable: true, taxRateBps: 900 }],
    currency: 'SGD'
  }), /positive whole number/);
  const evaluation = evaluateQuote({
    lines: [{ id: 'L1', productId: product.id, name: product.name, quantity: 120, periodCount: 1, unitPriceCents: 36500, unitCostCents: 31000, listPriceCents: 49900, marginFloorBps: 2200, maxDiscountBps: 1800, marginBps: 1507, discountBps: 2685 }]
  });
  assert.equal(evaluation.allowed, false);
  assert.ok(evaluation.exceptions.some(item => item.code === 'MARGIN_FLOOR'));
  assert.ok(evaluation.exceptions.some(item => item.code === 'DISCOUNT_LIMIT'));
});

test('holds a below-floor quotation until the manager records a version-specific decision', () => {
  const state = createInitialState();
  const result = processCustomerBrief(state, 'Acme Technologies needs 120 units of Product X next month. Revise the price to $365 per unit. Include implementation support and a two-year maintenance agreement.', { now: fixedNow });
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
  const result = processCustomerBrief(state, 'Acme Technologies needs 120 units of Product X. Offer $365 per unit.', { now: fixedNow });
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
  reviseQuote(state, quote.id, { 'LINE-PX-120': { unitPriceCents: 40000 } }, { now: fixedNow });
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
  const result = processCustomerBrief(state, 'Acme Technologies needs 120 units of Product X. Offer $365 per unit.', { now: fixedNow });
  const oldApproval = state.approvals[0];
  reviseQuote(state, result.quote.id, { 'LINE-PX-120': { unitPriceCents: 40000 } }, { now: fixedNow });
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
  assert.match(quoteHtml, /Product X/);
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
  assert.ok(digest.requiresSalesperson.some(item => item.text.toLowerCase().includes('inventory')));
  assert.ok(digest.blocked.some(item => item.productId === 'S-IMPL'));
  assert.equal(result.rfq.quoteId, result.quote.id);
  assert.equal(state.events.some(item => item.type === 'daily_review.completed'), true);
});

test('future integration points use explicit local adapters and block unsupported external actions', () => {
  const state = createInitialState();
  const adapters = createDemoAdapters(() => state);
  assert.equal(integrationRegistry.every(item => item.connected === false), true);
  assert.equal(adapters.interpretation.run(acmeBrief, { today: '2026-10-19' }).productId, 'PX-120');
  assert.equal(adapters.catalog.lookup('PX-120').name, 'Product X');
  assert.equal(adapters.inventory.availability('PX-120').confirmed, false);
  assert.throws(() => adapters.external.email.send(), /Email is not connected/);
  assert.throws(() => adapters.external.gamma.generate(), /No external proposal provider/);
});

test('salesperson role cannot process or release records for another owners account', () => {
  const state = createInitialState();
  const technologyBrief = 'Vector Labs needs 50 licenses for Operations Suite License with SSO. Budget around $60,000. Implementation before January 2027.';
  assert.throws(() => processCustomerBrief(state, technologyBrief, { now: fixedNow }), /outside the active salesperson view/);
  assert.equal(state.rfqs.length, 0);
  state.role = 'manager';
  const result = processCustomerBrief(state, technologyBrief, { now: fixedNow });
  assert.ok(result.quote);
  assert.throws(() => confirmQuoteForCustomer(state, result.quote.id, { currencyConfirmed: true, assumptionsConfirmed: true }, { now: fixedNow }), /assigned salesperson role/);
});
