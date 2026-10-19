# Zev Pan · Intent-driven work systems

Portfolio and interactive prototypes for AI-enabled business transformation, product design, process redesign, and human-controlled workflow automation.

**Portfolio:** <https://zevpan.github.io/>

## Portfolio thesis

Software is moving from interfaces people must operate toward systems that can act on outcomes people express. The portfolio explores a credible operating model: people set intent and policy; an orchestrator plans bounded work; specialist agents use existing tools and data; evidence, exceptions, and proposed actions return for human review.

The interface still matters. Natural language sets direction; structured screens help people scan, compare, correct, and approve; agents carry out the bounded work.

## Featured work

| Project | Product / transformation question | Live public experience |
|---|---|---|
| Focusline | Which job deserves attention, who could help, and what is the next grounded step? | [Opportunity workspace demo](products/opportunity-intelligence/demo/index.html) · [Case study](case-studies/opportunity-intelligence/index.html) |
| Thread | What does the organization know about this change, what evidence is missing, and who decides? | [Thread demo](products/thread/demo/index.html) · [Product build](products/thread/index.html) |
| Prospecting operations | How should identity, interaction history, and follow-up eligibility be reconciled safely? | [Relationship operations demo](case-studies/prospecting-operations/demo/index.html) · [Case study](case-studies/prospecting-operations/index.html) |
| Travel logistics | Which operational work can proceed by rule, and what must wait for a person? | [Control Tower demo](case-studies/travel-logistics-transformation/demo/index.html) · [Case study](case-studies/travel-logistics-transformation/index.html) |
| Warehouse flow | Which evidence-backed variance should be investigated before changing physical or financial state? | [Decision workspace prototype](case-studies/warehouse-flow-stock-accuracy/prototype.html) · [Case study](case-studies/warehouse-flow-stock-accuracy/index.html) |

## Shared operating model

```text
Human intent + policy
        ↓
Provider-neutral orchestration and task planning
        ↓
Specialist agents for bounded responsibilities
        ↓
Existing tools, systems of record, APIs, files, and data
        ↓
Business actions, proposed changes, and artifacts
        ↓
Evidence, exceptions, and human approval where required
        ↓
Finished outcome and auditable business state
```

See [the operating-model architecture](docs/agentic-operating-model.md) for the responsibility boundaries and implementation seams. The conceptual LLM gateway is provider-agnostic: an organization can select suitable commercial or hosted models by policy. The public prototypes do not require a specific model provider.

## Demo behavior and privacy

- Public fixtures use invented people, companies, jobs, orders, operational records, and interaction histories.
- The command surface routes to authored, local demo scenarios; it does not make live LLM calls.
- Interactions update browser-local demo state only. Approval buttons never send a message, submit an application, contact a supplier, or update an external system.
- Tool and data labels describe the scenario’s simulated sources, not connected integrations.
- No personal LinkedIn messages, private contacts, credentials, or application data belong in this repository.

## Implementation

The portfolio is a static GitHub Pages site using semantic HTML, CSS, and vanilla JavaScript. `shared/agent-command.js` and `shared/agent-command.css` provide the common command, execution-evidence, exception, and approval pattern. Each product supplies its own bounded local routes and existing structured workspace. `shared/intent-model.css` styles the reusable architecture and case-study model.

### Local checks

```bash
git diff --check
node --check shared/agent-command.js
node --check products/opportunity-intelligence/demo/app.js
node --check products/thread/demo/app.js
node --check case-studies/prospecting-operations/demo/app.js
node --check case-studies/travel-logistics-transformation/demo/app.js
```

The warehouse prototype includes inline JavaScript and is checked through the browser demo flow.
