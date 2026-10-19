# Focusline — product brief

## Primary user

A serious professional job seeker managing several plausible roles at once, with limited time and a need to balance role fit, career direction, application effort, and relevant relationships. The demo profile and all records are synthetic.

## Core job to be done

When several opportunities compete for my attention, help me understand which are worth pursuing, what evidence supports that view, and what I should do next—while keeping the final decision mine.

## Decisions the product improves

1. Which opportunity should I inspect or act on first?
2. What in the job description supports or weakens my fit?
3. What career-value signals are present, and which are still unverified?
4. Is there a relevant contact, and what relationship action is proportionate?
5. Which resume variant is the best starting point, and what should I tailor?
6. What is the next action, and has the opportunity gone stale?

## Product boundaries

- Focusline is an opportunity decision workspace, not a job board or auto-apply bot.
- A priority score is a transparent triage aid, not a hiring probability or company reputation verdict.
- Company/career value is shown as evidence-based signals and remains editable by the user.
- Relationship readiness is contextual guidance, not a prediction of someone’s willingness to refer.
- No message, connection request, referral ask, or application is sent by the demo.
- The demo uses synthetic jobs, people, resume variants, and interaction histories. User-created records stay in that browser’s local storage.

## Primary journey

Review the attention queue → open an opportunity → inspect fit and career-value evidence → choose a proportionate network action → select or change a resume strategy → complete, snooze, or override the next action → update the application stage.

## Minimum coherent scope

- Prioritized inbox with search, stage filters, and neglected-opportunity detection.
- Opportunity detail with fit evidence, gaps, confidence, career-value signals, and score breakdown.
- Company-linked synthetic contacts with relationship state and an overridable action recommendation.
- Resume-variant selection with actionable tailoring notes.
- Browser-local opportunity creation, stage progression, notes, snoozing, and activity history.
- A visible distinction between deterministic rules, simulated AI analysis, and human decisions.

## Information architecture and working data model

- **Priority inbox:** ranked active roles plus a separate attention filter for due or quiet work.
- **Opportunities:** full pipeline with stage filtering and a contextual opportunity brief.
- **People:** synthetic contacts shown in the context of each linked opportunity.
- **Activity:** local audit trail of user decisions and changes.

The JSON fixture is the replaceable data boundary. `Job` holds the posting, fit evidence, career-value signals, selected resume, and `Application`. `Person` holds identity, network state, and interaction history. `JobPersonLink` holds role-specific referral relevance, relationship readiness, action guidance, and draft text; one person can have different guidance for different roles. `Resume` holds a variant summary and tailoring prompts. The browser adapter derives dates and priority, then persists the editable workspace in local storage.

## Prototype validation tasks

1. Find the highest-ranked opportunity and explain how the weights produced its score.
2. Identify one fit strength and one open question; distinguish evidence confidence from hiring probability.
3. Find a company-relevant contact, explain the suggested relationship action, then override it.
4. Choose or change a resume variant and identify one specific tailoring point.
5. Record the next step, progress the application stage, and find a quiet or overdue opportunity.

Acceptance means the user can complete each task from the UI, see the result persist after reload, and explain that recommendations are guidance rather than certainty. User preference and time saved remain study questions; this demo makes no outcome-improvement claim.

## Decision model

The default priority score weights role fit at 50%, career value at 40%, and timing at 10%. The user can change those weights. Network access does not raise job quality or ranking; it informs the next action. This avoids treating a warm contact as proof that a job is worth pursuing.

## AI and control boundary

- **Deterministic:** stage changes, date calculations, stale/overdue flags, score arithmetic, sorting, and persistence.
- **AI-assisted in a production concept:** extract job requirements, compare them with user evidence, summarize strengths/gaps, and draft a next-step rationale.
- **Simulated in this demo:** fixture-based assessments and rule-based analysis for jobs the user adds. No model is called.
- **Human-controlled:** priority overrides, company-value judgment, contact action, resume choice, application submission, and all external communication.

## Lightweight decision log

1. **Evidence:** current job trackers already offer pipelines, resume support, and contact fields. **Inference:** another tracker or isolated match score would be weak differentiation. **Decision:** make the core interaction a justified attention decision connected to a next action.
2. **Evidence:** a reachable network contact does not establish referral readiness. **Inference:** putting network access inside the quality score could overvalue a contact. **Decision:** rank jobs without network access; use relationship state only to shape the action recommendation.
3. **Evidence:** the public product must not expose private LinkedIn material. **Decision:** synthetic data only, local persistence, and no live sending or integration.
