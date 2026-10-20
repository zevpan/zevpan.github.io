# Zev Pan | AI Business Analysis & Transformation Portfolio

I redesign messy work into governed operating systems.

I analyze fragmented workflows, define requirements and decision logic, and prototype practical improvements with process design, automation, and AI, keeping people responsible for consequential decisions.

**Portfolio:** https://zevpan.github.io/

**Roles of interest:** AI Business Analyst · Business Analyst · Business Transformation · Digital Transformation · Process Improvement · AI Implementation

## What I can do

| Work | Evidence in the portfolio |
|---|---|
| Diagnose | Current-state workflow and handoff analysis; bottleneck, failure, and exception mapping |
| Design | Requirements, acceptance criteria, data models, operating rules, ownership, and human/automation/AI boundaries |
| Build | Workflow orchestration, AI-assisted decision support, and interactive product prototypes |
| Govern | Deterministic gates, review paths, exception handling, auditability, testing, and workflow health |

## Selected work

| Project | Zev’s contribution | What it demonstrates |
|---|---|---|
| Order Management System | Mapped workflows and failure points; defined requirements, routing, controls, and an interactive order-management prototype | Process analysis, operating-model design, workflow orchestration, governance |
| AI Sales CRM | Designed reconciliation, relationship state, AI analysis gates, and safe next-action rules | Data modelling, deterministic controls, AI boundaries, auditability |
| Warehouse Management System | Designed evidence-led review paths and human decision points | Process improvement, decision support, validation, human control |
| [Finance Control Hub](case-studies/finance-control-hub/index.html) | Translated a freight-finance reconciliation need into a seeded dataset, matching rules, exception controls and approval-gated workbench | Finance process analysis, data modelling, deterministic reconciliation, human approvals |
| Thread · Team Workspace | Designed source-linked context and review flows; built a browser-local MVP | Information architecture, decision records, workflow UX |
| Focusline · AI Job Search Agent | Defined the job-search journey, prioritization logic, relationship-readiness boundaries, and validation criteria | Product analysis, prioritization, explainability, human control |

## Finance Control Hub · Case Study 06

- [Read the case study](case-studies/finance-control-hub/index.html) · [Open the interactive workbench](case-studies/finance-control-hub/demo/index.html)
- The public product uses 4,000 invoice lines generated deterministically from seed 20261014; no original finance files or personal records are included.
- The engine normalizes Job ID/HAWB/MAWB identifiers, applies explicit vendor charge-code rules, checks amounts/currency/POs, detects duplicates and grouped candidates, and prevents an accrual from being allocated twice.
- Uncertain matches and exceptions stay reviewable. Human approvals and export release update browser-local demo state only.
- The CSV is an illustrative CargoWise-style mapping, not an official or production-validated EDI template.
- Rebuild the fixtures with node scripts/generate-finance-data.mjs; validate with node --test test/finance-control-hub.test.mjs.

## How I approach AI-enabled transformation

I start with the business objective, current process, policy, data, and decision rights. Stable state changes, calculations, and eligibility checks belong in explicit rules. Language models assist with ambiguous information and synthesis. People retain authority over consequential decisions and external actions.

The intelligence layer should be model-provider agnostic and work through tools and systems the organization already uses. Natural language can express intent; structured interfaces remain valuable for scanning, comparison, correction, and approval.

## Ownership and use of AI

I define the outcome, constraints, requirements, and acceptance criteria. AI can accelerate research, analysis, design, and implementation. I inspect the evidence, make product and process decisions, test the result, and own acceptance.

## Demo behavior and privacy

- Public fixtures use invented people, companies, jobs, orders, operational records, and interaction histories.
- Command surfaces route to authored local scenarios; they do not call a live LLM.
- Interactions update browser-local demo state only.
- Approval controls never send messages, submit applications, contact suppliers, or update external systems.
- Product pages describe simulated data sources, not connected integrations.
- Finance Control Hub uses generated vendors, references, invoices, amounts, and test cases; its downloadable file is illustrative only.
- The public repository should not contain real LinkedIn messages, private contacts, credentials, or application records.

## Implementation

The site is a static GitHub Pages portfolio built with semantic HTML, CSS, and vanilla JavaScript. Shared command and architecture styles support consistent interaction patterns across demos while each project keeps its own workflow and structured review interface.

Local checks used for the demos:

```bash
git diff --check
node --check shared/agent-command.js
node --check products/opportunity-intelligence/demo/app.js
node --check products/thread/demo/app.js
node --check case-studies/prospecting-operations/demo/app.js
node --check case-studies/travel-logistics-transformation/demo/app.js
```

The Order Management System now also includes a separate PostgreSQL service foundation at `case-studies/travel-logistics-transformation/service`. Its API, migration, tenant and role controls, supplier capacity rules, SLA handling, and remaining integration gates are documented in that folder. The public static demo remains browser-local until an identity provider, database, file store, and messaging or booking adapters are selected.
