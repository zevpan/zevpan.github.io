const DAY = 86400000;

export const DEMO_SNAPSHOT_DATE = '2026-10-18';
export const DEMO_TODAY = '2026-10-19';

const clone = value => JSON.parse(JSON.stringify(value));
const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const round = value => Math.round(value);

export function createInitialState() {
  return {
    schemaVersion: 5,
    role: 'sales',
    activeView: 'overview',
    selectedAccountId: null,
    counters: { rfq: 1042, quote: 1042, proposal: 1042, approval: 210, execution: 18, interaction: 322 },
    accounts: [
      { id: 'AC-100', name: 'Acme Technologies', industry: 'Industrial technology', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Zev Pan', tier: 'Strategic', email: 'procurement@acme.example', phone: '+65 6123 4400', lastTouch: '18 Oct 2026', source: 'CRM account profile', contacts: [{ name: 'Avery Goh', title: 'Procurement Lead', email: 'avery.goh@acme.example', role: 'Economic buyer' }, { name: 'Maya Chen', title: 'Head of Operations', email: 'maya.chen@acme.example', role: 'Technical stakeholder' }] },
      { id: 'AC-101', name: 'Vector Labs', industry: 'Software and analytics', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Mina Koh', tier: 'Growth', email: 'finance@vector.example', phone: '+65 6770 2200', lastTouch: '17 Oct 2026', source: 'CRM account profile', contacts: [{ name: 'Sarah Lim', title: 'VP Customer Success', email: 'sarah.lim@vector.example', role: 'Executive sponsor' }] },
      { id: 'AC-102', name: 'Northstar Freight', industry: 'Logistics', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Zev Pan', tier: 'Growth', email: 'operations@northstar.example', phone: '+65 6331 1020', lastTouch: '14 Oct 2026', source: 'CRM account profile', priceAgreements: [{ id: 'AGR-NS-2026', productId: 'IDF-ENT', unitPriceCents: 46500000, minimumQuantity: 5, validFrom: '2026-09-01', validThrough: '2027-03-31', status: 'Active', source: 'Approved customer rate card' }], contacts: [{ name: 'Daniel Wong', title: 'Commercial Director', email: 'daniel.wong@northstar.example', role: 'Economic buyer' }] },
      { id: 'AC-103', name: 'Helix Advisory', industry: 'Professional services', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Mina Koh', tier: 'Core', email: 'hello@helix.example', phone: '+65 6228 1900', lastTouch: '12 Oct 2026', source: 'CRM account profile', contacts: [{ name: 'Priya Nair', title: 'COO', email: 'priya.nair@helix.example', role: 'Executive sponsor' }] },
      { id: 'AC-104', name: 'Meridian Energy Systems', industry: 'Energy and utilities', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Zev Pan', tier: 'Strategic', email: 'operations@meridian.example', phone: '+65 6812 4400', lastTouch: '18 Oct 2026', source: 'CRM account profile', contacts: [{ name: 'Jamie Tan', title: 'VP Operations', email: 'jamie.tan@meridian.example', role: 'Economic buyer' }, { name: 'Wei Lin', title: 'Data Platform Lead', email: 'wei.lin@meridian.example', role: 'Technical stakeholder' }] },
      { id: 'AC-105', name: 'Straits Process Engineering', industry: 'Process engineering', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Mina Koh', tier: 'Growth', email: 'projects@straits.example', phone: '+65 6814 2300', lastTouch: '16 Oct 2026', source: 'CRM account profile', contacts: [{ name: 'Farah Ali', title: 'Chief Technology Officer', email: 'farah.ali@straits.example', role: 'Technical stakeholder' }] },
      { id: 'AC-106', name: 'Aurora Components Group', industry: 'Industrial manufacturing', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Zev Pan', tier: 'Growth', email: 'plant.ops@aurora.example', phone: '+65 6816 5800', lastTouch: '15 Oct 2026', source: 'CRM account profile', contacts: [{ name: 'Adrian Teo', title: 'Plant Director', email: 'adrian.teo@aurora.example', role: 'Economic buyer' }] },
      { id: 'AC-107', name: 'Keystone Utilities', industry: 'Utilities', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Mina Koh', tier: 'Strategic', email: 'digital@keystone.example', phone: '+65 6818 6600', lastTouch: '17 Oct 2026', source: 'CRM account profile', contacts: [{ name: 'Grace Lim', title: 'Chief Information Officer', email: 'grace.lim@keystone.example', role: 'Executive sponsor' }] },
      { id: 'AC-108', name: 'Pioneer Industrial Services', industry: 'Industrial services', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Zev Pan', tier: 'Core', email: 'reliability@pioneer.example', phone: '+65 6820 7100', lastTouch: '12 Oct 2026', source: 'CRM account profile', contacts: [{ name: 'Joel Chua', title: 'Head of Reliability', email: 'joel.chua@pioneer.example', role: 'Technical stakeholder' }] },
      { id: 'AC-109', name: 'Harbor Energy Partners', industry: 'Energy infrastructure', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Mina Koh', tier: 'Strategic', email: 'transformation@harbor.example', phone: '+65 6822 8600', lastTouch: '18 Oct 2026', source: 'CRM account profile', contacts: [{ name: 'Ren Lee', title: 'Digital Transformation Lead', email: 'ren.lee@harbor.example', role: 'Economic buyer' }] },
      { id: 'AC-110', name: 'Summit Materials Holdings', industry: 'Industrial materials', country: 'Singapore', currency: 'SGD', taxRateBps: 900, owner: 'Zev Pan', tier: 'Growth', email: 'data.office@summit.example', phone: '+65 6824 1300', lastTouch: '11 Oct 2026', source: 'CRM account profile', contacts: [{ name: 'Emily Koh', title: 'VP Data and Analytics', email: 'emily.koh@summit.example', role: 'Executive sponsor' }] }
    ],
    opportunities: [
      { id: 'OP-2047', accountId: 'AC-100', name: 'Industrial data foundation rollout', stage: 'Solution design', valueCents: 818000000, probability: 55, owner: 'Zev Pan', nextAction: 'Confirm site, source-system and delivery scope', dueDate: '2026-10-20', lastActivity: '2026-10-19', source: 'Customer meeting', status: 'Open' },
      { id: 'OP-1984', accountId: 'AC-101', name: 'Industrial AI workbench subscription', stage: 'Discovery', valueCents: 480000000, probability: 40, owner: 'Mina Koh', nextAction: 'Confirm SSO, data access and migration scope', dueDate: '2026-10-21', lastActivity: '2026-10-17', source: 'Renewal', status: 'Open' },
      { id: 'OP-2110', accountId: 'AC-102', name: 'Freight visibility rollout', stage: 'Commercial review', valueCents: 410000000, probability: 65, owner: 'Zev Pan', nextAction: 'Review the revised service scope with procurement', dueDate: '2026-10-20', lastActivity: '2026-10-14', source: 'Inbound referral', status: 'Open' },
      { id: 'OP-1922', accountId: 'AC-103', name: 'Client onboarding workflow', stage: 'Qualification', valueCents: 470000000, probability: 25, owner: 'Mina Koh', nextAction: 'Confirm executive sponsor and onboarding requirements', dueDate: '2026-10-23', lastActivity: '2026-10-12', source: 'Inbound lead', status: 'Open' },
      { id: 'OP-2168', accountId: 'AC-104', name: 'Multi-site reliability intelligence', stage: 'Technical validation', valueCents: 430000000, probability: 45, owner: 'Zev Pan', nextAction: 'Validate historian access and reliability use cases', dueDate: '2026-10-22', lastActivity: '2026-10-18', source: 'Customer workshop', status: 'Open' },
      { id: 'OP-2174', accountId: 'AC-105', name: 'Asset data contextualization programme', stage: 'Discovery', valueCents: 510000000, probability: 35, owner: 'Mina Koh', nextAction: 'Prioritise source systems before the design session', dueDate: '2026-10-24', lastActivity: '2026-10-16', source: 'Partner introduction', status: 'Open' },
      { id: 'OP-2181', accountId: 'AC-106', name: 'Production operations workspace', stage: 'Solution design', valueCents: 400000000, probability: 50, owner: 'Zev Pan', nextAction: 'Map work orders to production and time-series data', dueDate: '2026-10-21', lastActivity: '2026-10-15', source: 'Expansion', status: 'Open' },
      { id: 'OP-2188', accountId: 'AC-107', name: 'Grid data foundation and AI workflows', stage: 'Commercial review', valueCents: 530000000, probability: 70, owner: 'Mina Koh', nextAction: 'Share security and governance scope for review', dueDate: '2026-10-23', lastActivity: '2026-10-17', source: 'Executive referral', status: 'Open' },
      { id: 'OP-2196', accountId: 'AC-108', name: 'Maintenance data integration', stage: 'Discovery', valueCents: 420000000, probability: 30, owner: 'Zev Pan', nextAction: 'Confirm connector sequence and delivery window', dueDate: '2026-10-25', lastActivity: '2026-10-12', source: 'Outbound discovery', status: 'Open' },
      { id: 'OP-2203', accountId: 'AC-109', name: 'Governed AI for asset maintenance', stage: 'Technical validation', valueCents: 490000000, probability: 55, owner: 'Mina Koh', nextAction: 'Validate the maintenance triage workflow and approvals', dueDate: '2026-10-26', lastActivity: '2026-10-18', source: 'Industry event', status: 'Open' }
    ],
    products: [
      { id: 'IDF-ENT', name: 'Industrial Data Foundation', matchTerms: ['industrial data platform', 'industrial data foundation', 'data foundation'], category: 'Industrial data platform', description: 'Unifies operational, engineering and business data into a governed operating context across sites.', unit: 'site', billingPeriod: 'year', listPriceCents: 52000000, unitCostCents: 17000000, marginFloorBps: 4200, maxDiscountBps: 1400, volumeDiscounts: [{ minimumQuantity: 5, discountBps: 500 }, { minimumQuantity: 10, discountBps: 800 }], taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Solution validation required', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Site readiness and source access review required', features: ['Operational and engineering data federation', 'Governed asset data model', 'Time-series and event pipelines', 'Pipeline health monitoring'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'ACW-ENT', name: 'Asset Context Workspace', matchTerms: ['asset context workspace', 'asset context', 'asset knowledge graph'], category: 'Asset knowledge graph', description: 'Connects asset hierarchies, engineering documents, time series and work history in a searchable context.', unit: 'site', billingPeriod: 'year', listPriceCents: 26000000, unitCostCents: 8500000, marginFloorBps: 4200, maxDiscountBps: 1200, volumeDiscounts: [{ minimumQuantity: 5, discountBps: 500 }], taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Solution validation required', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Asset model and source mapping review required', features: ['Asset hierarchy and relationship views', 'Engineering drawings and document context', 'Time-series and maintenance history', 'Cross-source entity resolution'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'IAW-ENT', name: 'Industrial AI Workbench', matchTerms: ['industrial AI workbench', 'industrial agent workbench', 'industrial AI agents'], category: 'Industrial AI workbench', description: 'Builds role-aware assistants and agents grounded in governed site data with reviewable workflow actions.', unit: 'site', billingPeriod: 'year', listPriceCents: 44000000, unitCostCents: 14500000, marginFloorBps: 4200, maxDiscountBps: 1000, volumeDiscounts: [{ minimumQuantity: 5, discountBps: 500 }], taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Solution validation required', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Identity, permissions and action boundaries require review', features: ['Grounded industrial assistants', 'Role-aware data access', 'Approval-based workflow actions', 'Agent activity and outcome traces'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'TSI-ENT', name: 'Time Series Intelligence Suite', matchTerms: ['time series intelligence', 'industrial time-series analytics', 'time series analytics platform'], category: 'Time-series analytics platform', description: 'Combines high-frequency process data, operating context and events for trend, deviation and performance analysis.', unit: 'site', billingPeriod: 'year', listPriceCents: 36000000, unitCostCents: 12000000, marginFloorBps: 4200, maxDiscountBps: 1200, volumeDiscounts: [{ minimumQuantity: 5, discountBps: 500 }, { minimumQuantity: 10, discountBps: 800 }], taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Solution validation required', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Historian coverage and sampling requirements need review', features: ['Time-series and event exploration', 'Operating-window comparisons', 'Trend and deviation analysis', 'Context-linked performance views'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'OAS-ENT', name: 'Operations App Studio', matchTerms: ['operations app studio', 'industrial operations applications', 'operations application studio'], category: 'Operations application platform', description: 'Builds role-aware operating screens and workflows from governed industrial data and reusable components.', unit: 'site', billingPeriod: 'year', listPriceCents: 32000000, unitCostCents: 10500000, marginFloorBps: 4200, maxDiscountBps: 1200, volumeDiscounts: [{ minimumQuantity: 5, discountBps: 400 }, { minimumQuantity: 10, discountBps: 700 }], taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Solution validation required', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'User roles, workflow scope and source access require review', features: ['Configurable operations screens', 'Reusable industrial data components', 'Role-aware workflow views', 'Reviewable actions and changes'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'EDG-ENT', name: 'Edge Data Gateway', matchTerms: ['edge data gateway', 'industrial edge runtime', 'edge connector runtime'], category: 'Edge data platform', description: 'Moves selected equipment and process data from plant environments into governed site pipelines.', unit: 'site', billingPeriod: 'year', listPriceCents: 18500000, unitCostCents: 6200000, marginFloorBps: 4200, maxDiscountBps: 1000, volumeDiscounts: [{ minimumQuantity: 5, discountBps: 500 }], taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Solution validation required', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Network boundaries, protocols and site security need review', features: ['Managed edge connectors', 'Protocol and source adapters', 'Buffered delivery and health status', 'Site-level deployment controls'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'DQL-ENT', name: 'Data Quality and Lineage Suite', matchTerms: ['data quality and lineage', 'industrial data quality', 'data lineage suite'], category: 'Data quality platform', description: 'Tracks source freshness, entity mapping and data-quality checks across connected operational datasets.', unit: 'site', billingPeriod: 'year', listPriceCents: 29500000, unitCostCents: 9600000, marginFloorBps: 4200, maxDiscountBps: 1200, volumeDiscounts: [{ minimumQuantity: 5, discountBps: 500 }], taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Solution validation required', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Quality dimensions and source ownership need review', features: ['Freshness and completeness monitoring', 'Entity-mapping quality checks', 'Lineage from source to operating view', 'Issue ownership and resolution history'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'S-IMPL', name: 'Industrial Integration and Contextualization', matchTerms: ['industrial data integration', 'integration and contextualization', 'contextualization services'], category: 'Data integration service', description: 'Connects source systems, maps industrial entities and establishes monitored data pipelines.', unit: 'engagement', billingPeriod: null, listPriceCents: 38000000, unitCostCents: 18000000, marginFloorBps: 3500, maxDiscountBps: 1000, taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Delivery slot requires confirmation', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Scope follows a source-system and data-quality review', features: ['Connector and source-system planning', 'Entity matching and contextualization', 'Pipeline validation and monitoring', 'Acceptance and handover checklist'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'S-MAINT', name: 'Platform Success and Support', matchTerms: ['platform success and support', 'ongoing platform support', 'support agreement'], category: 'Platform support service', description: 'Provides ongoing platform reviews, operational guidance and support coverage.', unit: 'engagement', billingPeriod: 'year', listPriceCents: 24000000, unitCostCents: 13000000, marginFloorBps: 3800, maxDiscountBps: 1000, taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Service start date requires confirmation', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Begins on an agreed service commencement date', features: ['Quarterly operating reviews', 'Data quality and pipeline reviews', 'Platform support coverage', 'Adoption and workflow planning'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'S-MIG', name: 'Data Onboarding and Connector Enablement', matchTerms: ['data onboarding and connector enablement', 'data migration', 'connector enablement'], category: 'Data onboarding service', description: 'Plans historical data onboarding, source mapping and controlled cutover to the new operating context.', unit: 'engagement', billingPeriod: null, listPriceCents: 29000000, unitCostCents: 16000000, marginFloorBps: 4000, maxDiscountBps: 1000, taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Delivery slot requires confirmation', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Timeline follows a source-data assessment', features: ['Historical data backfill plan', 'Source and identifier mapping', 'Validation and reconciliation', 'Cutover and recovery planning'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'S-MODEL', name: 'Industrial Asset Model Design', matchTerms: ['industrial asset model design', 'asset model governance', 'industrial ontology design', 'asset hierarchy design'], category: 'Asset modeling service', description: 'Defines reusable asset structures, relationships and naming rules for cross-source industrial context.', unit: 'engagement', billingPeriod: null, listPriceCents: 34000000, unitCostCents: 17000000, marginFloorBps: 3800, maxDiscountBps: 1000, taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Delivery slot requires confirmation', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Scope follows asset hierarchy and source review', features: ['Asset-model workshop', 'Relationship and naming conventions', 'Source-to-asset mapping', 'Governance and handover guide'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' },
      { id: 'S-AI', name: 'Industrial AI Use Case Delivery', matchTerms: ['industrial AI use case delivery', 'industrial agent implementation', 'governed AI workflow delivery'], category: 'Industrial AI delivery service', description: 'Takes a selected industrial workflow from discovery through governed assistant or agent implementation.', unit: 'engagement', billingPeriod: null, listPriceCents: 42000000, unitCostCents: 21000000, marginFloorBps: 4000, maxDiscountBps: 1000, taxRateBps: 900, taxable: true, stock: null, capacity: { status: 'Delivery slot requires confirmation', asOf: '2026-10-18', source: 'Example delivery plan', confidence: 'Not reserved' }, leadTime: 'Use case, data permissions and approval boundaries need review', features: ['Workflow and user discovery', 'Grounded assistant or agent design', 'Approval and action boundary definition', 'Evaluation and operational handover'], status: 'Active', pricingSource: 'Illustrative enterprise rate card, 18 Oct 2026' }
    ],
    rfqs: [],
    quotes: [],
    proposals: [],
    approvals: [],
    interactions: [
      { id: 'INT-0308', accountId: 'AC-100', opportunityId: 'OP-2047', date: '2026-10-19T09:10:00+08:00', channel: 'Customer meeting', direction: 'Internal note', summary: 'Customer discussed an industrial data foundation across three sites, asset context, governed AI workflows and a two-year support term.', source: 'Meeting notes', owner: 'Zev Pan' },
      { id: 'INT-0309', accountId: 'AC-101', opportunityId: 'OP-1984', date: '2026-10-17T14:25:00+08:00', channel: 'Email', direction: 'Inbound', summary: 'Renewal sponsor asked about SSO and migration effort. Budget and implementation window need confirmation.', source: 'CRM timeline example', owner: 'Mina Koh' },
      { id: 'INT-0310', accountId: 'AC-102', opportunityId: 'OP-2110', date: '2026-10-14T11:00:00+08:00', channel: 'Customer call', direction: 'Inbound', summary: 'Commercial director requested a review of service scope before the next quotation revision.', source: 'Call note', owner: 'Zev Pan' },
      { id: 'INT-0311', accountId: 'AC-103', opportunityId: 'OP-1922', date: '2026-10-12T10:00:00+08:00', channel: 'Discovery meeting', direction: 'Internal note', summary: 'COO asked how structured asset context could shorten client onboarding. Sponsor and data access need confirmation.', source: 'Discovery note', owner: 'Mina Koh' },
      { id: 'INT-0312', accountId: 'AC-104', opportunityId: 'OP-2168', date: '2026-10-18T11:20:00+08:00', channel: 'Customer workshop', direction: 'Inbound', summary: 'Operations VP reviewed reliability priorities across two facilities and requested an identity and source review.', source: 'Workshop notes', owner: 'Zev Pan' },
      { id: 'INT-0313', accountId: 'AC-105', opportunityId: 'OP-2174', date: '2026-10-16T15:00:00+08:00', channel: 'Partner introduction', direction: 'Inbound', summary: 'Technical sponsor shared the system landscape and asked for source prioritisation before design.', source: 'Partner referral', owner: 'Mina Koh' },
      { id: 'INT-0314', accountId: 'AC-106', opportunityId: 'OP-2181', date: '2026-10-15T10:45:00+08:00', channel: 'Customer meeting', direction: 'Internal note', summary: 'Plant director requested a view connecting work orders, production events and time-series data.', source: 'Meeting notes', owner: 'Zev Pan' },
      { id: 'INT-0315', accountId: 'AC-107', opportunityId: 'OP-2188', date: '2026-10-17T13:30:00+08:00', channel: 'Security workshop', direction: 'Inbound', summary: 'CIO asked for role-based access, governance and audit detail before a grid operations pilot.', source: 'Workshop notes', owner: 'Mina Koh' },
      { id: 'INT-0316', accountId: 'AC-108', opportunityId: 'OP-2196', date: '2026-10-12T16:15:00+08:00', channel: 'Customer call', direction: 'Inbound', summary: 'Reliability lead requested a connector plan and delivery sequence for maintenance systems.', source: 'Call note', owner: 'Zev Pan' },
      { id: 'INT-0317', accountId: 'AC-109', opportunityId: 'OP-2203', date: '2026-10-18T14:00:00+08:00', channel: 'Industry event', direction: 'Follow-up', summary: 'Digital transformation lead reviewed a governed assistant for maintenance triage and asked about approvals.', source: 'Event follow-up', owner: 'Mina Koh' },
      { id: 'INT-0318', accountId: 'AC-110', opportunityId: null, date: '2026-10-11T09:45:00+08:00', channel: 'Introductory call', direction: 'Internal note', summary: 'VP Data accepted an introductory discussion and requested an overview of source connectivity.', source: 'CRM timeline example', owner: 'Zev Pan' },
      { id: 'INT-0319', accountId: 'AC-100', opportunityId: 'OP-2047', date: '2026-10-16T16:10:00+08:00', channel: 'Email', direction: 'Inbound', summary: 'Operations lead shared historian and asset-register sources for follow-up mapping.', source: 'Customer email note', owner: 'Zev Pan' },
      { id: 'INT-0320', accountId: 'AC-102', opportunityId: 'OP-2110', date: '2026-10-10T10:30:00+08:00', channel: 'Procurement meeting', direction: 'Internal note', summary: 'Commercial director requested a revised scope summary ahead of the procurement review.', source: 'Meeting notes', owner: 'Zev Pan' },
      { id: 'INT-0321', accountId: 'AC-104', opportunityId: 'OP-2168', date: '2026-10-15T14:40:00+08:00', channel: 'Technical review', direction: 'Inbound', summary: 'Data owner confirmed historian access can be reviewed during the next architecture session.', source: 'Technical review note', owner: 'Zev Pan' },
      { id: 'INT-0322', accountId: 'AC-107', opportunityId: 'OP-2188', date: '2026-10-13T11:15:00+08:00', channel: 'Email', direction: 'Inbound', summary: 'Security team requested role-based access and audit information for internal review.', source: 'Customer email note', owner: 'Mina Koh' }
    ],
    events: [],
    executions: [],
    dailyDigest: null,
    updatedAt: '2026-10-19T01:10:00.000Z'
  };
}

export function formatMoney(cents, currency) {
  const amount = Number(cents || 0) / 100;
  try {
    const fractionDigits = Number.isInteger(amount) ? 0 : 2;
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: currency || 'SGD', currencyDisplay: 'code', minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return (currency || 'SGD') + ' ' + amount.toFixed(2);
  }
}

export function parseRequirements(text, options) {
  const config = options || {};
  const accounts = config.accounts || createInitialState().accounts;
  const products = config.products || createInitialState().products;
  const today = config.today || DEMO_TODAY;
  const source = String(text || '').trim();
  const normalized = normalize(source);
  const account = accounts.find(item => normalized.includes(normalize(item.name))) || null;
  const matchedProducts = products.filter(item => !item.category.toLowerCase().includes('service') && [item.name].concat(item.matchTerms || []).some(term => normalized.includes(normalize(term))));
  const product = matchedProducts[0] || null;
  let quantityMatch = source.match(/\b(\d[\d,]*)\s*(units?|licenses?|seats?|users?|sites?|locations?|environments?)\b/i);
  if (!quantityMatch && product) {
    const productAt = source.toLowerCase().indexOf(product.name.toLowerCase());
    const preceding = source.slice(Math.max(0, productAt - 28), productAt).match(/(\d[\d,]*)\s*$/);
    if (preceding) quantityMatch = preceding;
  }
  const quantity = quantityMatch ? Number(quantityMatch[1].replace(/,/g, '')) : null;
  const currencyPrefix = '(?:SGD\\s*)?\\$?\\s*';
  const currentPriceMatch = source.match(new RegExp('(?:currently pay(?:ing)?(?: around)?|pay(?:ing)? around|another supplier(?: at| for)?|currently paying)\\s*' + currencyPrefix + '([\\d,]+(?:\\.\\d{1,2})?)', 'i'));
  const currentPrice = currentPriceMatch ? Math.round(Number(currentPriceMatch[1].replace(/,/g, '')) * 100) : null;
  const budgetMatch = source.match(new RegExp('budget(?:\\s+is)?(?:\\s+around|\\s+of)?\\s*' + currencyPrefix + '([\\d,]+(?:\\.\\d{1,2})?)', 'i'));
  const budgetCents = budgetMatch ? Math.round(Number(budgetMatch[1].replace(/,/g, '')) * 100) : null;
  const targetPriceMatch = source.match(new RegExp('(?:closer to|target(?: price)?(?: of)?|proposed price(?: of)?|price(?: at| of| to)?|offer(?:ing)?(?: at| of| to)?)\\s*' + currencyPrefix + '([\\d,]+(?:\\.\\d{1,2})?)', 'i'));
  let targetPrice = targetPriceMatch ? Math.round(Number(targetPriceMatch[1].replace(/,/g, '')) * 100) : null;
  if (targetPrice === null && new RegExp('\\b(?:at|for|to)\\s*' + currencyPrefix + '([\\d,]+(?:\\.\\d{1,2})?)\\s+per\\s+(?:unit|user|license|seat|site|location|environment)', 'i').test(source)) {
    const priceMatch = source.match(new RegExp('\\b(?:at|for|to)\\s*' + currencyPrefix + '([\\d,]+(?:\\.\\d{1,2})?)\\s+per\\s+(?:unit|user|license|seat|site|location|environment)', 'i'));
    targetPrice = priceMatch ? Math.round(Number(priceMatch[1].replace(/,/g, '')) * 100) : null;
  }
  const termMatch = source.match(/\b(two|2|three|3|one|1)\s*[- ]?year(?:s)?\b/i);
  const termYears = termMatch ? ({ one: 1, two: 2, three: 3 }[termMatch[1].toLowerCase()] || Number(termMatch[1])) : 1;
  const subscriptionMonthMatch = source.match(/\b(6|12|18|24|36)\s*[- ]?months?\b/i);
  const subscriptionYearMatch = source.match(/\b(one|two|three|1|2|3)\s*[- ]?year\s+(?:subscription|license|term)\b/i);
  const annualSubscription = /\b(?:annual|yearly)\s+(?:subscription|license|term)\b|\b(?:subscription|license|term)\s+(?:is\s+)?(?:annual|yearly)\b/i.test(source);
  const subscriptionTermMonths = subscriptionMonthMatch ? Number(subscriptionMonthMatch[1])
    : subscriptionYearMatch ? ({ one: 12, two: 24, three: 36 }[subscriptionYearMatch[1].toLowerCase()] || Number(subscriptionYearMatch[1]) * 12)
      : annualSubscription ? 12 : null;
  const delivery = /next month/i.test(source) ? nextMonthLabel(today) : (source.match(/before\s+([A-Z][a-z]+\s+\d{4})/i) || [])[1] || null;
  const serviceIds = [];
  if (/implementation|onboarding|integration|contextualization|connector/i.test(source)) serviceIds.push('S-IMPL');
  if (/maintenance|support|service coverage/i.test(source)) serviceIds.push('S-MAINT');
  if (/migration|data move|cutover|historical backfill/i.test(source)) serviceIds.push('S-MIG');
  if (/asset model|asset hierarchy design|ontology design|data model governance/i.test(source)) serviceIds.push('S-MODEL');
  if (/industrial AI use case|industrial agent implementation|governed AI workflow delivery|agent workflow delivery/i.test(source)) serviceIds.push('S-AI');
  const blockers = [];
  if (!account) blockers.push('Link this request to an account.');
  if (!product) blockers.push('Confirm the required product or service.');
  if (!quantity || quantity < 1) blockers.push('Confirm the required quantity.');
  const openQuestions = [];
  if (/\$/.test(source) && account && account.currency) openQuestions.push('The customer used the $ symbol. Confirm the quote currency is ' + account.currency + ' before customer release.');
  if (/next month|before\s+[A-Z]/i.test(source)) openQuestions.push('Confirm delivery or implementation capacity before making a commitment.');
  if (product && product.unit === 'user / month' && subscriptionTermMonths === null) openQuestions.push('The subscription term was not provided. Draft assumes 12 months; confirm or revise before customer release.');
  if (product && product.billingPeriod === 'year' && !termMatch) openQuestions.push('The annual subscription term was not provided. Draft assumes one year; confirm or revise before customer release.');
  const assumptions = [];
  if (account) assumptions.push('Currency defaults to ' + account.currency + ' from the CRM account profile until confirmed.');
  if (account && account.taxRateBps) assumptions.push('Tax uses the example ' + (account.taxRateBps / 100) + '% policy for ' + account.country + '; validate the billing profile before issue.');
  if (/currently pay|another supplier|competitor/i.test(source)) assumptions.push('The competitor reference is customer-reported and has not been independently verified.');
  if (serviceIds.some(id => ['S-IMPL', 'S-MIG', 'S-MODEL', 'S-AI'].includes(id))) assumptions.push('Professional service timing is subject to a confirmed delivery slot.');
  const inferredUnit = product ? product.unit : null;
  const notes = [];
  if (/worried about migration|migration concern|concerned about migration/i.test(source)) notes.push('Migration concern raised by customer.');
  if (/budget/i.test(source)) notes.push('Budget context captured for commercial review.');
  if (/\bss[o]?\b|single sign.on/i.test(source)) notes.push('Single sign-on requirement captured.');
  const expiry = source.match(/expires?\s+(?:in\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i);
  if (expiry) notes.push('Existing solution expires in ' + expiry[1] + ' ' + expiry[2] + '.');
  if (product && product.unit === 'user / month' && subscriptionTermMonths === null) notes.push('Subscription term was not provided. Draft uses 12 months for review.');
  if (product && product.billingPeriod === 'year' && !termMatch) notes.push('Annual subscription term was not provided. Draft uses one year for review.');
  return {
    sourceText: source,
    accountId: account ? account.id : null,
    accountName: account ? account.name : null,
    productId: product ? product.id : null,
    productIds: matchedProducts.map(item => item.id),
    productName: product ? product.name : null,
    quantity,
    unit: inferredUnit,
    termYears,
    subscriptionTermMonths: product && product.unit === 'user / month' ? subscriptionTermMonths || 12 : null,
    currentSupplierPriceCents: currentPrice,
    budgetCents,
    targetUnitPriceCents: targetPrice,
    deliveryWindow: delivery,
    serviceIds,
    notes,
    blockers,
    openQuestions,
    assumptions,
    currency: account ? account.currency : null,
    taxRateBps: account ? account.taxRateBps : null
  };
}

function nextMonthLabel(dateString) {
  const parts = String(dateString).split('-').map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function nextId(state, key, prefix, width) {
  state.counters[key] += 1;
  return prefix + String(state.counters[key]).padStart(width || 4, '0');
}

function findAccount(state, id) {
  return state.accounts.find(item => item.id === id) || null;
}

function findOpportunity(state, accountId) {
  return state.opportunities.find(item => item.accountId === accountId && item.status === 'Open') || null;
}

function assertAccountAccess(state, accountId) {
  const account = findAccount(state, accountId);
  if (!account) throw new Error('Choose an account before changing sales records.');
  if (state.role !== 'manager' && account.owner !== 'Zev Pan') {
    throw new Error('This account is outside the active salesperson view. Switch to an authorized role or ask the Sales Manager to reassign it.');
  }
  return account;
}

function productLine(product, quantity, periodCount, unitPriceCents, label, priceBasis) {
  return {
    id: 'LINE-' + product.id,
    productId: product.id,
    name: product.name,
    description: product.description,
    quantity: quantity,
    periodCount: periodCount || 1,
    unit: product.unit,
    billingPeriod: product.billingPeriod || null,
    label: label || product.unit,
    unitPriceCents: unitPriceCents === null || unitPriceCents === undefined ? product.listPriceCents : unitPriceCents,
    priceBasis: priceBasis || 'Illustrative catalog list price',
    unitCostCents: product.unitCostCents,
    listPriceCents: product.listPriceCents,
    marginFloorBps: product.marginFloorBps,
    maxDiscountBps: product.maxDiscountBps,
    taxable: product.taxable,
    taxRateBps: product.taxRateBps
  };
}

export function calculateQuote(input) {
  const lines = input.lines || [];
  if (!lines.length) throw new Error('A quotation needs at least one product or service line.');
  let subtotalCents = 0;
  let listTotalCents = 0;
  let costTotalCents = 0;
  let taxableLinesCents = 0;
  const pricedLines = lines.map(line => {
    const quantity = Number(line.quantity);
    const periods = Number(line.periodCount || 1);
    const unitPriceCents = Number(line.unitPriceCents);
    const unitCostCents = Number(line.unitCostCents);
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be a positive whole number.');
    if (!Number.isInteger(periods) || periods < 1) throw new Error('Term must be a positive whole number.');
    if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) throw new Error('Unit price must be zero or greater.');
    if (!Number.isFinite(unitCostCents) || unitCostCents < 0) throw new Error('Unit cost is missing or invalid.');
    const count = quantity * periods;
    const lineNetCents = round(unitPriceCents * count);
    const lineListCents = round(Number(line.listPriceCents) * count);
    const lineCostCents = round(unitCostCents * count);
    subtotalCents += lineNetCents;
    listTotalCents += lineListCents;
    costTotalCents += lineCostCents;
    if (line.taxable) taxableLinesCents += lineNetCents;
    const marginBps = lineNetCents > 0 ? round((lineNetCents - lineCostCents) / lineNetCents * 10000) : -10000;
    const markupBps = lineCostCents > 0 ? round((lineNetCents - lineCostCents) / lineCostCents * 10000) : 100000;
    const discountBps = lineListCents > 0 ? round((lineListCents - lineNetCents) / lineListCents * 10000) : 0;
    return { ...line, count, lineNetCents, lineListCents, lineCostCents, marginBps, markupBps, discountBps };
  });
  const shippingCents = Number(input.shippingCents || 0);
  const shippingCostCents = Number(input.shippingCostCents || 0);
  const adminFeeCents = Number(input.adminFeeCents || 0);
  const adminCostCents = Number(input.adminCostCents || 0);
  const taxableChargesCents = (input.shippingTaxable ? shippingCents : 0) + (input.adminTaxable ? adminFeeCents : 0);
  const taxRateBps = Number(input.taxRateBps || 0);
  const taxCents = round((taxableLinesCents + taxableChargesCents) * taxRateBps / 10000);
  const amountBeforeTaxCents = subtotalCents + shippingCents + adminFeeCents;
  const totalCostCents = costTotalCents + shippingCostCents + adminCostCents;
  const grossProfitCents = amountBeforeTaxCents - totalCostCents;
  const grossMarginBps = amountBeforeTaxCents > 0 ? round(grossProfitCents / amountBeforeTaxCents * 10000) : -10000;
  const markupBps = totalCostCents > 0 ? round(grossProfitCents / totalCostCents * 10000) : 100000;
  return {
    lines: pricedLines,
    subtotalCents,
    listTotalCents,
    discountCents: listTotalCents - subtotalCents,
    shippingCents,
    adminFeeCents,
    amountBeforeTaxCents,
    taxRateBps,
    taxCents,
    totalCents: amountBeforeTaxCents + taxCents,
    totalCostCents,
    grossProfitCents,
    grossMarginBps,
    markupBps,
    currency: input.currency || 'SGD'
  };
}

export function evaluateQuote(calculation) {
  const exceptions = [];
  calculation.lines.forEach(line => {
    const minimumPriceCents = round(line.unitCostCents * 10000 / (10000 - line.marginFloorBps));
    if (line.marginBps < line.marginFloorBps) {
      exceptions.push({
        code: 'MARGIN_FLOOR',
        productId: line.productId,
        lineId: line.id,
        rule: 'Minimum gross margin ' + (line.marginFloorBps / 100) + '%',
        detail: line.name + ' margin is ' + (line.marginBps / 100).toFixed(2) + '%. Minimum unit price is ' + (minimumPriceCents / 100).toFixed(2) + '.',
        minimumPriceCents,
        requestedPriceCents: line.unitPriceCents,
        approverRole: 'Sales Manager'
      });
    }
    if (line.discountBps > line.maxDiscountBps) {
      exceptions.push({
        code: 'DISCOUNT_LIMIT',
        productId: line.productId,
        lineId: line.id,
        rule: 'Maximum discount ' + (line.maxDiscountBps / 100) + '%',
        detail: line.name + ' discount is ' + (line.discountBps / 100).toFixed(2) + '%, above the ' + (line.maxDiscountBps / 100) + '% approval threshold.',
        maximumDiscountBps: line.maxDiscountBps,
        requestedDiscountBps: line.discountBps,
        approverRole: 'Sales Manager'
      });
    }
  });
  return { exceptions, allowed: exceptions.length === 0 };
}

function addEvent(state, event) {
  state.events.unshift({
    id: 'EV-' + String(state.events.length + 1).padStart(5, '0'),
    at: event.at || new Date().toISOString(),
    type: event.type,
    actor: event.actor || 'Sales Operations Agent',
    accountId: event.accountId || null,
    opportunityId: event.opportunityId || null,
    quoteId: event.quoteId || null,
    proposalId: event.proposalId || null,
    summary: event.summary,
    detail: event.detail || ''
  });
}

function addExecution(state, title, status, actions, timestamp) {
  const record = {
    id: nextId(state, 'execution', 'RUN-', 4),
    title,
    status,
    startedAt: timestamp || new Date().toISOString(),
    completedAt: timestamp || new Date().toISOString(),
    adapter: 'Browser-local demo workflow',
    actions: actions || []
  };
  state.executions.unshift(record);
  return record;
}

function createApproval(state, quote, exceptions, timestamp) {
  const approval = {
    id: nextId(state, 'approval', 'APR-', 4),
    type: 'Pricing exception',
    quoteId: quote.id,
    accountId: quote.accountId,
    opportunityId: quote.opportunityId,
    requestedBy: quote.owner,
    approverRole: 'Sales Manager',
    status: 'PENDING',
    requestedAt: timestamp || new Date().toISOString(),
    decidedAt: null,
    decisionNote: '',
    exceptions: clone(exceptions),
    quoteVersion: quote.version
  };
  state.approvals.unshift(approval);
  quote.approvalId = approval.id;
  quote.approvalStatus = 'PENDING';
  quote.status = 'AWAITING_APPROVAL';
  addEvent(state, {
    type: 'approval.requested',
    actor: 'Quotation Agent',
    at: timestamp,
    accountId: quote.accountId,
    opportunityId: quote.opportunityId,
    quoteId: quote.id,
    summary: 'Pricing exception sent to the Sales Manager for review.',
    detail: exceptions.map(item => item.detail).join(' ')
  });
  return approval;
}

function makeQuote(state, rfq, timestamp) {
  const requirements = rfq.requirements;
  const account = findAccount(state, rfq.accountId);
  const opportunity = findOpportunity(state, rfq.accountId);
  if (!account || !requirements.productId || !requirements.quantity) return null;
  const productsForQuote = (requirements.productIds && requirements.productIds.length ? requirements.productIds : [requirements.productId])
    .map(id => state.products.find(item => item.id === id)).filter(Boolean);
  const primary = productsForQuote[0];
  if (!primary) return null;
  const quoteDate = (timestamp || new Date().toISOString()).slice(0, 10);
  const lines = productsForQuote.map((product, index) => {
    const agreement = (account.priceAgreements || []).find(item => item.productId === product.id && item.status === 'Active' && requirements.quantity >= item.minimumQuantity && quoteDate >= item.validFrom && quoteDate <= item.validThrough);
    const volumeBreak = (product.volumeDiscounts || []).filter(item => requirements.quantity >= item.minimumQuantity).sort((a, b) => b.minimumQuantity - a.minimumQuantity)[0];
    const volumePrice = volumeBreak ? round(product.listPriceCents * (10000 - volumeBreak.discountBps) / 10000) : product.listPriceCents;
    const customerTarget = index === 0 && requirements.targetUnitPriceCents !== null && requirements.targetUnitPriceCents !== undefined;
    const standardPrice = agreement ? agreement.unitPriceCents : volumePrice;
    const priceBasis = customerTarget ? 'Customer requested price, checked against policy' : agreement ? 'Customer-specific agreement ' + agreement.id : volumeBreak ? 'Volume price at ' + (volumeBreak.discountBps / 100) + '% off' : 'Illustrative catalog list price';
    const periods = product.billingPeriod === 'year' ? requirements.termYears : product.unit === 'user / month' ? (requirements.subscriptionTermMonths || 12) : 1;
    const periodLabel = product.billingPeriod === 'year' ? 'years' : product.unit === 'user / month' ? 'months' : product.unit;
    return productLine(product, requirements.quantity, periods, customerTarget ? requirements.targetUnitPriceCents : standardPrice, periodLabel, priceBasis);
  });
  requirements.serviceIds.forEach(id => {
    const service = state.products.find(item => item.id === id);
    if (!service) return;
    const periods = service.billingPeriod === 'year' ? requirements.termYears : 1;
    const periodLabel = service.billingPeriod === 'year' ? 'years' : service.unit;
    lines.push(productLine(service, 1, periods, null, periodLabel));
  });
  const physical = productsForQuote.some(item => item.category === 'Physical product');
  const calculation = calculateQuote({
    lines,
    shippingCents: physical ? 48000 : 0,
    shippingCostCents: physical ? 30000 : 0,
    shippingTaxable: physical,
    adminFeeCents: 0,
    adminCostCents: 0,
    adminTaxable: false,
    taxRateBps: requirements.taxRateBps,
    currency: requirements.currency
  });
  const releaseQuestions = (rfq.requirements.openQuestions || []).slice();
  if (productsForQuote.some(item => item.capacity)) {
    releaseQuestions.push('Site readiness, source access and delivery capacity are not reserved. Confirm the implementation plan before commitment.');
  }
  if (rfq.requirements.budgetCents && calculation.totalCents > rfq.requirements.budgetCents) {
    releaseQuestions.push('The estimated total including tax is above the stated customer budget. Confirm whether the budget includes tax or adjust scope.');
  }
  if (physical && primary.stock && primary.stock.available < requirements.quantity) {
    releaseQuestions.push('Requested quantity exceeds the latest stock snapshot. Confirm supplier availability and lead time.');
  } else if (physical) {
    releaseQuestions.push('Inventory is a dated snapshot and the requested quantity is not reserved. Reconfirm before commitment.');
  }
  if (rfq.requirements.serviceIds.some(id => ['S-IMPL', 'S-MIG', 'S-MODEL', 'S-AI'].includes(id))) {
    releaseQuestions.push('Professional service capacity is not reserved. Confirm the delivery slot before commitment.');
  }
  const evaluation = evaluateQuote(calculation);
  const quote = {
    id: nextId(state, 'quote', 'Q-2026-', 5),
    accountId: account.id,
    opportunityId: opportunity ? opportunity.id : null,
    rfqId: rfq.id,
    number: 'Q-2026-' + String(state.counters.quote).padStart(5, '0'),
    version: 1,
    versions: [],
    createdAt: timestamp || new Date().toISOString(),
    validThrough: datePlusDays(timestamp || new Date().toISOString(), 30),
    currency: account.currency,
    taxRateBps: account.taxRateBps,
    deliveryWindow: requirements.deliveryWindow,
    lines: calculation.lines,
    shippingCents: calculation.shippingCents,
    shippingCostCents: physical ? 30000 : 0,
    taxRateCents: calculation.taxRateBps,
    calculation,
    exceptions: evaluation.exceptions,
    approvalStatus: evaluation.allowed ? 'NOT_REQUIRED' : 'PENDING',
    approvalId: null,
    status: evaluation.allowed ? 'READY_FOR_SALES_REVIEW' : 'AWAITING_APPROVAL',
    releaseQuestions: releaseQuestions,
    assumptions: clone(rfq.requirements.assumptions || []),
    owner: account.owner,
    customerReference: opportunity ? opportunity.id : null
  };
  state.quotes.unshift(quote);
  rfq.quoteId = quote.id;
  rfq.status = evaluation.allowed ? 'QUOTATION_PREPARED' : 'APPROVAL_REQUIRED';
  if (opportunity) {
    opportunity.valueCents = calculation.amountBeforeTaxCents;
    opportunity.lastActivity = (timestamp || new Date().toISOString()).slice(0, 10);
    opportunity.quoteStatus = quote.status;
  }
  if (!evaluation.allowed) createApproval(state, quote, evaluation.exceptions, timestamp);
  addEvent(state, {
    type: 'quote.created',
    actor: 'Quotation Agent',
    at: timestamp,
    accountId: account.id,
    opportunityId: opportunity ? opportunity.id : null,
    quoteId: quote.id,
    summary: quote.status === 'AWAITING_APPROVAL' ? 'Quotation calculated and held for commercial approval.' : 'Quotation calculated from catalog prices and account pricing rules.',
    detail: quote.id + ' version 1, ' + formatMoney(calculation.totalCents, account.currency) + ', gross margin ' + (calculation.grossMarginBps / 100).toFixed(2) + '%.'
  });
  if (opportunity) addEvent(state, {
    type: 'opportunity.updated',
    actor: 'CRM Operations Agent',
    at: timestamp,
    accountId: account.id,
    opportunityId: opportunity.id,
    quoteId: quote.id,
    summary: 'Opportunity value and quotation status refreshed from the quotation record.',
    detail: opportunity.id + ' moved to ' + (quote.status === 'AWAITING_APPROVAL' ? 'commercial review' : 'solution review') + '.'
  });
  return quote;
}

function datePlusDays(timestamp, days) {
  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function processCustomerBrief(state, text, options) {
  const config = options || {};
  const timestamp = config.now || new Date().toISOString();
  const interpret = config.interpreter || parseRequirements;
  const parsed = interpret(text, { accounts: state.accounts, products: state.products, today: config.today || DEMO_TODAY });
  if (parsed.accountId) assertAccountAccess(state, parsed.accountId);
  const rfq = {
    id: nextId(state, 'rfq', 'RFQ-2026-', 5),
    accountId: parsed.accountId,
    opportunityId: parsed.accountId && findOpportunity(state, parsed.accountId) ? findOpportunity(state, parsed.accountId).id : null,
    sourceText: parsed.sourceText,
    requirements: clone(parsed),
    status: parsed.blockers.length ? 'NEEDS_INFORMATION' : 'STRUCTURED',
    createdAt: timestamp,
    quoteId: null,
    proposalId: null
  };
  state.rfqs.unshift(rfq);
  const actions = [
    { agent: 'RFQ Agent', status: 'complete', result: parsed.blockers.length ? 'Source notes saved with clarification items.' : 'Customer request structured and linked to the account.' },
    { agent: 'Product Intelligence Agent', status: parsed.productId ? 'complete' : 'blocked', result: parsed.productName ? 'Matched ' + parsed.productName + ' against the catalog.' : 'Product match needs review.' }
  ];
  if (parsed.accountId) {
    addEvent(state, {
      type: 'rfq.created',
      actor: 'CRM Operations Agent',
      at: timestamp,
      accountId: parsed.accountId,
      opportunityId: rfq.opportunityId,
      summary: 'Customer requirements saved to the CRM activity timeline.',
      detail: rfq.id + ' retains the original meeting notes for audit.'
    });
    const interaction = {
      id: nextId(state, 'interaction', 'INT-', 4),
      accountId: parsed.accountId,
      opportunityId: rfq.opportunityId,
      date: timestamp,
      channel: 'Customer meeting',
      direction: 'Internal note',
      summary: summarizeBrief(parsed),
      source: 'RFQ intake',
      owner: findAccount(state, parsed.accountId).owner
    };
    state.interactions.unshift(interaction);
    if (rfq.opportunityId) {
      const opportunity = state.opportunities.find(item => item.id === rfq.opportunityId);
      opportunity.lastActivity = timestamp.slice(0, 10);
      opportunity.nextAction = parsed.openQuestions[0] || opportunity.nextAction;
    }
  }
  let quote = null;
  if (!parsed.blockers.length) {
    quote = makeQuote(state, rfq, timestamp);
    if (quote) {
      actions.push({ agent: 'Quotation Agent', status: quote.exceptions.length ? 'held' : 'complete', result: quote.exceptions.length ? 'Calculated totals, then held the quote for manager approval.' : 'Calculated quote totals, taxes and margins from saved rules.' });
      actions.push({ agent: 'CRM Operations Agent', status: 'complete', result: 'Quote, RFQ and opportunity references linked in the timeline.' });
      if (!quote.exceptions.length) {
        const generate = config.proposalGenerator || generateProposal;
        const proposal = generate(state, quote.id, { now: timestamp, internal: true });
        rfq.proposalId = proposal.id;
        actions.push({ agent: 'Proposal Agent', status: 'complete', result: 'Prepared a proposal draft tied to quote version 1.' });
      } else {
        actions.push({ agent: 'Proposal Agent', status: 'waiting', result: 'Proposal waits for the commercial exception decision.' });
      }
    }
  } else {
    actions.push({ agent: 'Quotation Agent', status: 'blocked', result: 'Pricing has not started because core RFQ fields are missing.' });
  }
  const execution = addExecution(state, 'Customer brief to quotation', 'Completed with review items', actions, timestamp);
  rfq.executionId = execution.id;
  if (quote) addEvent(state, {
    type: 'execution.completed',
    actor: 'Sales Operations Agent',
    at: timestamp,
    accountId: quote.accountId,
    opportunityId: quote.opportunityId,
    quoteId: quote.id,
    summary: 'RFQ workflow completed. The salesperson has review items before customer release.',
    detail: quote.status
  });
  return { rfq, quote, parsed, execution };
}

function summarizeBrief(parsed) {
  const details = [];
  if (parsed.quantity) details.push(parsed.quantity + ' ' + (parsed.unit || 'units'));
  if (parsed.productName) details.push(parsed.productName);
  if (parsed.deliveryWindow) details.push('requested for ' + parsed.deliveryWindow);
  if (parsed.serviceIds.length) details.push('services: ' + parsed.serviceIds.join(', '));
  if (parsed.currentSupplierPriceCents) details.push('customer-reported competitor price ' + formatMoney(parsed.currentSupplierPriceCents, parsed.currency));
  if (parsed.targetUnitPriceCents) details.push('customer target ' + formatMoney(parsed.targetUnitPriceCents, parsed.currency) + ' per ' + (parsed.unit || 'unit'));
  if (parsed.budgetCents) details.push('stated budget ' + formatMoney(parsed.budgetCents, parsed.currency));
  if (parsed.notes.length) details.push('context: ' + parsed.notes.join(' '));
  return details.length ? 'Customer requirements captured: ' + details.join('; ') + '.' : 'Customer discussion saved for follow-up.';
}

export function reviseQuote(state, quoteId, updates, options) {
  const quote = state.quotes.find(item => item.id === quoteId);
  if (!quote) throw new Error('Quotation was not found.');
  assertAccountAccess(state, quote.accountId);
  const timestamp = (options && options.now) || new Date().toISOString();
  state.approvals.filter(item => item.quoteId === quote.id && item.status === 'PENDING').forEach(item => {
    item.status = 'SUPERSEDED';
    item.decidedAt = timestamp;
    item.decidedBy = 'Quotation Agent';
    item.decisionNote = 'Superseded by quotation version ' + (quote.version + 1) + '. Review the current version instead.';
  });
  quote.versions.push({
    version: quote.version,
    lines: clone(quote.lines),
    calculation: clone(quote.calculation),
    status: quote.status,
    createdAt: quote.createdAt,
    savedAt: timestamp
  });
  quote.version += 1;
  Object.entries(updates || {}).forEach(([lineId, changes]) => {
    const line = quote.lines.find(item => item.id === lineId || item.productId === lineId);
    if (!line) throw new Error('Quotation line was not found: ' + lineId);
    if (changes.quantity !== undefined) line.quantity = Number(changes.quantity);
    if (changes.periodCount !== undefined) line.periodCount = Number(changes.periodCount);
    if (changes.unitPriceCents !== undefined) line.unitPriceCents = Number(changes.unitPriceCents);
  });
  quote.calculation = calculateQuote({
    lines: quote.lines,
    shippingCents: quote.shippingCents,
    shippingCostCents: quote.shippingCostCents,
    shippingTaxable: quote.shippingCents > 0,
    taxRateBps: quote.taxRateBps,
    currency: quote.currency
  });
  quote.lines = quote.calculation.lines;
  quote.exceptions = evaluateQuote(quote.calculation).exceptions;
  quote.approvalId = null;
  quote.approvalStatus = quote.exceptions.length ? 'PENDING' : 'NOT_REQUIRED';
  quote.status = quote.exceptions.length ? 'AWAITING_APPROVAL' : 'READY_FOR_SALES_REVIEW';
  state.proposals.filter(item => item.quoteId === quote.id && item.status !== 'READY_FOR_CUSTOMER').forEach(item => {
    item.status = 'STALE_QUOTE_VERSION';
  });
  if (quote.exceptions.length) createApproval(state, quote, quote.exceptions, timestamp);
  const account = findAccount(state, quote.accountId);
  addEvent(state, {
    type: 'quote.revised',
    actor: 'Quotation Agent',
    at: timestamp,
    accountId: quote.accountId,
    opportunityId: quote.opportunityId,
    quoteId: quote.id,
    summary: 'Quotation version ' + quote.version + ' recalculated and saved.',
    detail: 'New total ' + formatMoney(quote.calculation.totalCents, quote.currency) + '. ' + (quote.exceptions.length ? 'Approval required.' : 'No pricing exception detected.')
  });
  if (quote.opportunityId) {
    const opportunity = state.opportunities.find(item => item.id === quote.opportunityId);
    opportunity.valueCents = quote.calculation.amountBeforeTaxCents;
    opportunity.quoteStatus = quote.status;
  }
  addExecution(state, 'Quote revision and policy check', quote.exceptions.length ? 'Awaiting approval' : 'Completed', [
    { agent: 'Quotation Agent', status: 'complete', result: 'Version ' + quote.version + ' totals recalculated.' },
    { agent: 'Pricing Rules Engine', status: quote.exceptions.length ? 'held' : 'complete', result: quote.exceptions.length ? quote.exceptions.length + ' exception(s) held for manager review.' : 'Margin and discount checks passed.' },
    { agent: 'CRM Operations Agent', status: 'complete', result: 'Quote version and opportunity value updated.' }
  ], timestamp);
  return quote;
}

export function decideApproval(state, approvalId, decision, options) {
  const config = options || {};
  if (config.role !== 'manager') throw new Error('Only the Sales Manager role can decide this request.');
  const approval = state.approvals.find(item => item.id === approvalId);
  if (!approval || approval.status !== 'PENDING') throw new Error('This approval is no longer pending.');
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new Error('Choose approve or reject.');
  const timestamp = config.now || new Date().toISOString();
  const quote = state.quotes.find(item => item.id === approval.quoteId);
  if (!quote || quote.version !== approval.quoteVersion) throw new Error('The quotation changed after this approval was requested. Submit the current version again.');
  approval.status = decision;
  approval.decidedAt = timestamp;
  approval.decidedBy = 'Sales Manager';
  approval.decisionNote = String(config.note || '').trim() || (decision === 'APPROVED' ? 'Approved as a documented one-time exception.' : 'Revise the price before release.');
  quote.approvalStatus = decision;
  quote.status = decision === 'APPROVED' ? 'APPROVED_EXCEPTION' : 'REVISION_REQUIRED';
  if (quote.opportunityId) {
    const opportunity = state.opportunities.find(item => item.id === quote.opportunityId);
    if (opportunity) opportunity.quoteStatus = quote.status;
  }
  addEvent(state, {
    type: 'approval.' + decision.toLowerCase(),
    actor: 'Sales Manager',
    at: timestamp,
    accountId: quote.accountId,
    opportunityId: quote.opportunityId,
    quoteId: quote.id,
    summary: decision === 'APPROVED' ? 'Manager approved the documented pricing exception.' : 'Manager rejected the pricing exception and requested a revision.',
    detail: approval.decisionNote
  });
  return approval;
}

export function confirmQuoteForCustomer(state, quoteId, confirmation, options) {
  const quote = state.quotes.find(item => item.id === quoteId);
  if (!quote) throw new Error('Quotation was not found.');
  if (state.role === 'manager') throw new Error('Switch to the assigned salesperson role to confirm customer-facing terms.');
  assertAccountAccess(state, quote.accountId);
  if (quote.status === 'REVISION_REQUIRED' || quote.approvalStatus === 'REJECTED') throw new Error('The pricing exception was rejected. Revise the quotation and submit a new version before customer release.');
  if (quote.exceptions.length && quote.approvalStatus !== 'APPROVED') throw new Error('The pricing exception must be approved before customer release.');
  if (quote.approvalStatus === 'PENDING' || quote.status === 'REVISION_REQUIRED') throw new Error('Resolve the manager approval before customer release.');
  if (quote.releaseQuestions.length && !confirmation.assumptionsConfirmed) throw new Error('Review and accept the visible assumptions before customer release.');
  if (quote.releaseQuestions.some(item => item.toLowerCase().includes('confirm') && item.toLowerCase().includes('currency')) && !confirmation.currencyConfirmed) {
    throw new Error('Confirm the quote currency before customer release.');
  }
  quote.status = 'READY_FOR_CUSTOMER';
  quote.customerReadyAt = (options && options.now) || new Date().toISOString();
  quote.customerConfirmedBy = quote.owner;
  addEvent(state, {
    type: 'quote.customer_ready',
    actor: 'Salesperson',
    at: quote.customerReadyAt,
    accountId: quote.accountId,
    opportunityId: quote.opportunityId,
    quoteId: quote.id,
    summary: 'Salesperson confirmed the commercial assumptions. Quote is ready for customer review.',
    detail: 'Commercial currency, scope and documented delivery assumptions reviewed.'
  });
  return quote;
}

export function generateProposal(state, quoteId, options) {
  const config = options || {};
  const quote = state.quotes.find(item => item.id === quoteId);
  if (!quote) throw new Error('Choose a quotation before generating a proposal.');
  assertAccountAccess(state, quote.accountId);
  if (quote.status === 'AWAITING_APPROVAL' || quote.status === 'REVISION_REQUIRED') throw new Error('A proposal cannot use a quotation with an unresolved pricing exception.');
  const account = findAccount(state, quote.accountId);
  const rfq = state.rfqs.find(item => item.id === quote.rfqId);
  const productNames = quote.lines.map(item => item.name);
  const products = quote.lines.map(item => state.products.find(product => product.id === item.productId)).filter(Boolean);
  const requirements = rfq ? rfq.requirements : {};
  const proposal = {
    id: nextId(state, 'proposal', 'PROP-2026-', 5),
    accountId: quote.accountId,
    opportunityId: quote.opportunityId,
    quoteId: quote.id,
    quoteVersion: quote.version,
    createdAt: config.now || new Date().toISOString(),
    status: 'DRAFT',
    title: account.name + ' solution proposal',
    sections: {
      customerNeed: requirements.sourceText ? summarizeBrief(requirements) : 'Requirements are linked from the CRM account and opportunity record.',
      solution: productNames.join(', '),
      benefits: products.flatMap(item => item.features || []),
      delivery: 'Requested window: ' + (quote.deliveryWindow || 'To be agreed') + '. Confirm site readiness, source-system access and delivery team capacity before committing a date.',
      commercial: 'Quotation ' + quote.number + ', version ' + quote.version + ', total ' + formatMoney(quote.calculation.totalCents, quote.currency) + ' including the example tax estimate.',
      assumptions: quote.assumptions.concat(quote.releaseQuestions)
    },
    generator: 'Local proposal template adapter',
    sourceQuoteTotalCents: quote.calculation.totalCents
  };
  state.proposals.unshift(proposal);
  if (rfq) rfq.proposalId = proposal.id;
  addEvent(state, {
    type: 'proposal.created',
    actor: 'Proposal Agent',
    at: proposal.createdAt,
    accountId: quote.accountId,
    opportunityId: quote.opportunityId,
    quoteId: quote.id,
    proposalId: proposal.id,
    summary: 'Proposal draft generated from customer requirements and quotation version ' + quote.version + '.',
    detail: 'Uses catalog facts and quoted commercial terms. Review assumptions before customer release.'
  });
  addExecution(state, 'Proposal draft prepared', 'Completed with review items', [
    { agent: 'Proposal Agent', status: 'complete', result: 'Assembled customer need, solution, delivery, commercial terms and assumptions.' },
    { agent: 'Product Intelligence Agent', status: 'complete', result: 'Benefits came from the saved product catalog record.' },
    { agent: 'CRM Operations Agent', status: 'complete', result: 'Proposal linked to ' + quote.number + ' version ' + quote.version + '.' }
  ], proposal.createdAt);
  return proposal;
}

export function markProposalReady(state, proposalId, options) {
  const proposal = state.proposals.find(item => item.id === proposalId);
  if (!proposal) throw new Error('Proposal was not found.');
  if (state.role === 'manager') throw new Error('Switch to the assigned salesperson role to confirm customer-facing terms.');
  assertAccountAccess(state, proposal.accountId);
  const quote = state.quotes.find(item => item.id === proposal.quoteId);
  if (!quote || quote.status !== 'READY_FOR_CUSTOMER') throw new Error('Confirm the linked quotation before customer release.');
  if (proposal.quoteVersion !== quote.version || proposal.sourceQuoteTotalCents !== quote.calculation.totalCents) {
    throw new Error('Regenerate the proposal against the current quotation version.');
  }
  proposal.status = 'READY_FOR_CUSTOMER';
  proposal.readyAt = (options && options.now) || new Date().toISOString();
  addEvent(state, {
    type: 'proposal.customer_ready',
    actor: 'Salesperson',
    at: proposal.readyAt,
    accountId: proposal.accountId,
    opportunityId: proposal.opportunityId,
    quoteId: quote.id,
    proposalId: proposal.id,
    summary: 'Proposal reviewed against the current quotation and marked ready for customer review.',
    detail: 'No external message was sent.'
  });
  return proposal;
}

export function runDailyReview(state, options) {
  const timestamp = (options && options.now) || new Date().toISOString();
  const visibleOpportunityIds = new Set(state.opportunities.filter(item => state.role === 'manager' || item.owner === 'Zev Pan').map(item => item.id));
  const pendingApprovals = state.approvals.filter(item => item.status === 'PENDING' && (state.role === 'manager' || visibleOpportunityIds.has(item.opportunityId)));
  const openQuestions = [];
  state.rfqs.filter(item => item.accountId && (visibleOpportunityIds.has(item.opportunityId) || (state.role === 'manager' || state.accounts.find(account => account.id === item.accountId)?.owner === 'Zev Pan'))).forEach(rfq => {
    (rfq.requirements.openQuestions || []).forEach(question => openQuestions.push({ rfqId: rfq.id, accountId: rfq.accountId, text: question }));
    const quote = state.quotes.find(item => item.id === rfq.quoteId);
    (quote && quote.releaseQuestions || []).forEach(question => openQuestions.push({ rfqId: rfq.id, accountId: rfq.accountId, text: question }));
  });
  state.opportunities.filter(item => visibleOpportunityIds.has(item.id) && item.status === 'Open').forEach(opportunity => {
    openQuestions.push({ opportunityId: opportunity.id, accountId: opportunity.accountId, text: opportunity.nextAction + ' by ' + opportunity.dueDate + '.' });
  });
  const demandedServiceIds = new Set(state.rfqs.filter(item => item.accountId && (visibleOpportunityIds.has(item.opportunityId) || state.role === 'manager')).flatMap(item => item.requirements.serviceIds || []));
  const blocked = state.products.filter(item => demandedServiceIds.has(item.id) && item.capacity && item.capacity.confidence === 'Not reserved')
    .map(product => ({ productId: product.id, text: product.name + ' timing requires a delivery team confirmation.' }));
  const completed = [
    'CRM timeline refreshed from ' + state.interactions.length + ' recorded customer interactions.',
    state.rfqs.length + ' RFQ record(s) checked against their linked quotation status.',
    state.quotes.length + ' quotation record(s) checked for approval and customer-release state.',
    'Manager view refreshed from opportunity, quotation and approval events.'
  ];
  const digest = {
    ranAt: timestamp,
    completed,
    awaitingApproval: pendingApprovals.map(item => ({ approvalId: item.id, quoteId: item.quoteId, accountId: item.accountId, text: 'Pricing exception for ' + item.quoteId + ' needs Sales Manager decision.' })),
    requiresSalesperson: openQuestions,
    blocked,
    role: state.role
  };
  state.dailyDigest = digest;
  addEvent(state, {
    type: 'daily_review.completed',
    actor: 'Sales Prioritization Agent',
    at: timestamp,
    summary: 'Daily sales review completed from current CRM, RFQ, quotation and approval records.',
    detail: completed.join(' ')
  });
  addExecution(state, 'Daily sales administration', 'Completed with attention items', [
    { agent: 'CRM Operations Agent', status: 'complete', result: 'Timeline and opportunity references reconciled.' },
    { agent: 'Quotation Agent', status: pendingApprovals.length ? 'waiting' : 'complete', result: pendingApprovals.length ? pendingApprovals.length + ' approval request(s) remain open.' : 'No pricing exceptions are awaiting approval.' },
    { agent: 'Sales Prioritization Agent', status: 'complete', result: openQuestions.length + ' customer or seller follow-up item(s) surfaced.' },
    { agent: 'Sales Operations Agent', status: 'complete', result: 'Manager view refreshed from the same workflow records.' }
  ], timestamp);
  return digest;
}

export function addInteraction(state, accountId, summary, options) {
  const account = findAccount(state, accountId);
  const text = String(summary || '').trim();
  if (!account) throw new Error('Choose an account for this interaction.');
  assertAccountAccess(state, accountId);
  if (!text) throw new Error('Add a short interaction note first.');
  const timestamp = (options && options.now) || new Date().toISOString();
  const opportunity = findOpportunity(state, accountId);
  const interaction = {
    id: nextId(state, 'interaction', 'INT-', 4),
    accountId,
    opportunityId: opportunity ? opportunity.id : null,
    date: timestamp,
    channel: (options && options.channel) || 'Meeting note',
    direction: 'Internal note',
    summary: text,
    source: 'Salesperson entry',
    owner: account.owner
  };
  state.interactions.unshift(interaction);
  account.lastTouch = timestamp.slice(0, 10);
  if (opportunity) opportunity.lastActivity = timestamp.slice(0, 10);
  addEvent(state, {
    type: 'interaction.recorded',
    actor: 'Salesperson',
    at: timestamp,
    accountId,
    opportunityId: opportunity ? opportunity.id : null,
    summary: 'Customer interaction recorded in the CRM timeline.',
    detail: text
  });
  return interaction;
}

export function visibleAccounts(state, role) {
  if (role === 'manager') return state.accounts.slice();
  return state.accounts.filter(account => account.owner === 'Zev Pan');
}

export function managerMetrics(state, role) {
  const accounts = visibleAccounts(state, role);
  const ids = new Set(accounts.map(item => item.id));
  const opportunities = state.opportunities.filter(item => ids.has(item.accountId) && item.status === 'Open');
  const quotes = state.quotes.filter(item => ids.has(item.accountId));
  const approvals = state.approvals.filter(item => ids.has(item.accountId) && item.status === 'PENDING');
  const blockers = state.rfqs.filter(item => ids.has(item.accountId)).flatMap(item => item.requirements.openQuestions || []);
  return {
    accountCount: accounts.length,
    opportunityCount: opportunities.length,
    pipelineCents: opportunities.reduce((sum, item) => sum + item.valueCents, 0),
    quoteCount: quotes.length,
    pendingApprovalCount: approvals.length,
    blockerCount: blockers.length,
    staleOpportunityCount: opportunities.filter(item => item.dueDate < DEMO_TODAY).length
  };
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function customerQuoteHtml(state, quote) {
  const account = findAccount(state, quote.accountId);
  const releasable = quote.status === 'READY_FOR_CUSTOMER';
  const lineRows = quote.calculation.lines.map(line =>
    '<tr><td>' + escapeHtml(line.name) + '<br><small>' + escapeHtml(line.description) + '<br>Price per ' + escapeHtml(line.unit) + '</small></td><td>' +
    escapeHtml(line.quantity + ' × ' + line.periodCount + ' ' + line.label) + '</td><td>' +
    escapeHtml(formatMoney(line.unitPriceCents, quote.currency)) + '</td><td>' +
    escapeHtml(formatMoney(line.lineNetCents, quote.currency)) + '</td></tr>'
  ).join('');
  const assumptions = quote.assumptions.concat(quote.releaseQuestions).map(item => '<li>' + escapeHtml(item) + '</li>').join('');
  const watermark = releasable ? '' : '<div class="watermark">DRAFT FOR INTERNAL REVIEW</div>';
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
    escapeHtml(quote.number) + ' for ' + escapeHtml(account.name) + '</title><style>' +
    'body{font:15px/1.55 Arial,sans-serif;color:#172b4d;margin:48px auto;max-width:850px;padding:0 28px}header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #172b4d;padding-bottom:18px}h1{font-size:26px;margin:0}p{color:#53627a}table{width:100%;border-collapse:collapse;margin:22px 0}th,td{text-align:left;padding:11px 8px;border-bottom:1px solid #dfe1e6;vertical-align:top}th{font-size:12px;text-transform:uppercase;color:#596579}td:last-child,th:last-child{text-align:right}.totals{margin-left:auto;width:min(340px,100%)}.totals div{display:flex;justify-content:space-between;padding:6px 0}.grand{font-size:20px;font-weight:bold;border-top:2px solid #172b4d;margin-top:8px;padding-top:12px!important}.watermark{color:#ae2a19;border:2px solid #ae2a19;padding:9px 14px;font-weight:bold;display:inline-block;margin:16px 0}.note{background:#f5f7fa;padding:14px;border-radius:8px}small{color:#68758a}.right{text-align:right}.print{margin:18px 0;padding:8px 12px}@media print{body{margin:0}.print{display:none}}</style>' +
    '<body>' + watermark + '<header><div><div>SALES QUOTATION</div><h1>' + escapeHtml(quote.number) + ' · Version ' + quote.version + '</h1><p>Prepared for ' + escapeHtml(account.name) + '<br>Reference ' + escapeHtml(quote.customerReference || quote.number) + '</p></div><div class="right"><b>Quotation date</b><br>' + escapeHtml(quote.createdAt.slice(0, 10)) + '<br><b>Valid through</b><br>' + escapeHtml(quote.validThrough) + '</div></header>' +
    '<table><thead><tr><th>Product or service</th><th>Quantity and term</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>' + lineRows + '</tbody></table>' +
    '<div class="totals"><div><span>List price total</span><b>' + escapeHtml(formatMoney(quote.calculation.listTotalCents, quote.currency)) + '</b></div>' +
    (quote.calculation.discountCents > 0 ? '<div><span>Discount</span><b>−' + escapeHtml(formatMoney(quote.calculation.discountCents, quote.currency)) + '</b></div>' : '') +
    '<div><span>Subtotal after discount</span><b>' + escapeHtml(formatMoney(quote.calculation.subtotalCents, quote.currency)) + '</b></div>' +
    (quote.calculation.shippingCents ? '<div><span>Delivery</span><b>' + escapeHtml(formatMoney(quote.calculation.shippingCents, quote.currency)) + '</b></div>' : '') +
    '<div><span>GST estimate at ' + (quote.taxRateBps / 100) + '%</span><b>' + escapeHtml(formatMoney(quote.calculation.taxCents, quote.currency)) + '</b></div><div class="grand"><span>Total</span><b>' + escapeHtml(formatMoney(quote.calculation.totalCents, quote.currency)) + '</b></div></div>' +
    '<h2>Commercial terms</h2><p>Currency: ' + escapeHtml(quote.currency) + '. Quote validity: 30 days from issue. Tax is an estimate based on the account profile and must be validated before issue.</p>' +
    '<div class="note"><b>Assumptions and exclusions</b><ul>' + assumptions + '<li>Site readiness, source access and delivery capacity require confirmation and are not reserved.</li><li>External messages are not sent from this demo.</li></ul></div><button class="print" onclick="window.print()">Print or save as PDF</button></body></html>';
}

export function proposalHtml(state, proposal) {
  const account = findAccount(state, proposal.accountId);
  const quote = state.quotes.find(item => item.id === proposal.quoteId);
  const releasable = proposal.status === 'READY_FOR_CUSTOMER' && quote && quote.status === 'READY_FOR_CUSTOMER';
  const watermark = releasable ? '' : '<div class="draft">DRAFT FOR INTERNAL REVIEW</div>';
  const benefits = proposal.sections.benefits.map(item => '<li>' + escapeHtml(item) + '</li>').join('');
  const assumptions = proposal.sections.assumptions.map(item => '<li>' + escapeHtml(item) + '</li>').join('');
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
    escapeHtml(proposal.title) + '</title><style>body{font:16px/1.65 Arial,sans-serif;color:#172b4d;margin:48px auto;max-width:780px;padding:0 30px}header{padding:72px 0 38px;border-bottom:1px solid #dfe1e6}h1{font-size:42px;line-height:1.1;margin:8px 0}h2{font-size:23px;margin:34px 0 8px}p,li{color:#53627a}.cover{color:#0c66e4;text-transform:uppercase;font-size:12px;letter-spacing:.1em;font-weight:bold}.quote{background:#f4f8ff;border:1px solid #cfe1ff;border-radius:12px;padding:20px;font-size:20px;font-weight:bold}.draft{display:inline-block;color:#ae2a19;border:2px solid #ae2a19;padding:8px 12px;font-weight:bold}@media print{body{margin:0}}</style><body>' +
    watermark + '<header><div class="cover">Solution proposal</div><h1>' + escapeHtml(proposal.title) + '</h1><p>Prepared for ' + escapeHtml(account.name) + ' · ' + escapeHtml(proposal.createdAt.slice(0, 10)) + '</p></header>' +
    '<h2>Customer requirements</h2><p>' + escapeHtml(proposal.sections.customerNeed) + '</p>' +
    '<h2>Recommended solution</h2><p>' + escapeHtml(proposal.sections.solution) + '</p><h2>Solution benefits</h2><ul>' + benefits + '</ul>' +
    '<h2>Delivery approach</h2><p>' + escapeHtml(proposal.sections.delivery) + '</p><h2>Commercial proposal</h2><div class="quote">' + escapeHtml(proposal.sections.commercial) + '</div>' +
    '<h2>Assumptions and exclusions</h2><ul>' + assumptions + '</ul><h2>Next steps</h2><ol><li>Confirm currency, requirements and delivery capacity.</li><li>Review the attached quotation terms.</li><li>Agree a delivery and service commencement date.</li></ol><p>Commercial terms are linked to quotation ' + escapeHtml(quote.number) + ' version ' + quote.version + '. Any quotation change requires a proposal refresh.</p><button onclick="window.print()">Print or save as PDF</button></body></html>';
}
