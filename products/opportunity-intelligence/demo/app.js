(() => {
  "use strict";

  const STORAGE_KEY = "focusline-opportunity-workspace-v1";
  const ACTION_LABELS = {
    DIRECT_REFERRAL_ASK: "Ask for a referral",
    ASK_ROLE_INSIGHT: "Ask for role insight",
    RECONNECT_FIRST: "Reconnect first",
    CONNECT_FIRST: "Connect first",
    RECRUITER_OUTREACH: "Contact recruiter",
    SKIP: "Skip outreach"
  };
  const ACTIONS = Object.keys(ACTION_LABELS);
  const STAGES = ["Saved", "Researching", "Networking", "Preparing", "Applied", "Interview", "Offer", "Closed"];
  const VIEWS = {
    inbox: { title: "Priority inbox", eyebrow: "DECISIONS BEFORE APPLICATIONS", subtitle: "Choose what deserves your attention next.", crumb: "Priority inbox" },
    opportunities: { title: "Opportunities", eyebrow: "YOUR SEARCH PIPELINE", subtitle: "Review every role and keep its next step current.", crumb: "Opportunities" },
    people: { title: "People", eyebrow: "RELATIONSHIPS IN CONTEXT", subtitle: "Find a relevant person, then choose an action that fits the relationship.", crumb: "People" },
    activity: { title: "Activity", eyebrow: "SEARCH HISTORY", subtitle: "A local record of decisions and actions in this demo.", crumb: "Activity" }
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  let seedData;
  let state;
  let view = "inbox";
  let activeFilter = "active";
  let selectedJobId = null;
  let selectedPersonId = null;
  let pendingSubmitJobId = null;
  let query = "";
  let toastTimer;
  let storageAvailable = true;

  const localDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const addDays = (date, days) => {
    const out = localDay(date);
    out.setDate(out.getDate() + Number(days || 0));
    return out;
  };
  const isoDay = (date) => {
    const d = localDay(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const parseDay = (value) => value ? new Date(`${value}T00:00:00`) : null;
  const dateFromAge = (daysAgo) => isoDay(addDays(new Date(), -Number(daysAgo || 0)));
  const dateFromOffset = (days) => days === null || days === undefined ? "" : isoDay(addDays(new Date(), Number(days)));
  const daysBetween = (from, to = new Date()) => Math.floor((localDay(to) - localDay(from)) / 86400000);
  const formatDate = (value, options = { day: "numeric", month: "short" }) => {
    const date = parseDay(value);
    return date ? new Intl.DateTimeFormat("en-SG", options).format(date) : "Not set";
  };
  const dateLabel = (value) => {
    if (!value) return "No date set";
    const delta = daysBetween(parseDay(value));
    if (delta === 0) return "Due today";
    if (delta === 1) return "1 day overdue";
    if (delta > 1) return `${delta} days overdue`;
    if (delta === -1) return "Due tomorrow";
    return `Due in ${Math.abs(delta)} days`;
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = (name) => String(name || "A").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  const personById = (id) => state.people.find(person => person.id === id);
  const jobById = (id) => state.jobs.find(job => job.id === id);
  const relationshipFor = (jobId, personId) => state.jobPersonLinks?.find(link => link.jobId === jobId && link.personId === personId);
  const resumeById = (id) => state.resumes.find(resume => resume.id === id) || state.resumes[0];
  const contactAction = (link) => state.actionOverrides?.[link.id] || link.recommendedAction;
  const normalizedWeights = () => {
    const values = state.profile.weights || { fit: 50, value: 40, timing: 10 };
    const total = Math.max(1, Number(values.fit) + Number(values.value) + Number(values.timing));
    return { fit: Number(values.fit) / total, value: Number(values.value) / total, timing: Number(values.timing) / total };
  };
  const careerScore = (job) => Number(job.careerValueOverride ?? job.careerValue ?? 50);
  const priorityScore = (job) => {
    const weights = normalizedWeights();
    return Math.round(Number(job.fitScore || 0) * weights.fit + careerScore(job) * weights.value + Number(job.timingScore ?? 50) * weights.timing);
  };
  const ageDays = (value) => value ? daysBetween(parseDay(value)) : null;
  const attentionReason = (job) => {
    if (job.stage === "Closed" || !job.nextAction?.dueDate) return "";
    const dueAge = ageDays(job.nextAction.dueDate);
    if (dueAge !== null && dueAge >= 0) return dueAge === 0 ? "Due today" : `${dueAge}d overdue`;
    const lastTouched = ageDays(job.lastTouchedAt);
    if (lastTouched !== null && lastTouched >= 7) return `Quiet for ${lastTouched}d`;
    return "";
  };
  const isAttention = (job) => Boolean(attentionReason(job));
  const activeJobs = () => state.jobs.filter(job => job.stage !== "Closed");
  const sortedJobs = (jobs) => [...jobs].sort((a, b) => {
    const pin = (job) => job.priorityOverride === "top" ? -1 : job.priorityOverride === "lower" ? 1 : 0;
    if (pin(a) !== pin(b)) return pin(a) - pin(b);
    return priorityScore(b) - priorityScore(a);
  });

  function buildInitialState(source) {
    const data = clone(source);
    data.jobs.forEach(job => {
      const application = job.application || {};
      job.stage = application.stage || job.stage || "Saved";
      job.stageUpdatedDaysAgo = application.stageUpdatedDaysAgo ?? job.stageUpdatedDaysAgo;
      job.appliedAt = application.appliedAt ?? job.appliedAt ?? null;
      job.nextAction = application.nextAction !== undefined ? application.nextAction : (job.nextAction || null);
      job.referralState = application.referralState || job.referralState || "Not assessed";
      job.outcome = application.outcome ?? job.outcome ?? "";
      job.postedAt = dateFromAge(job.postedDaysAgo);
      job.closesAt = dateFromOffset(job.closesInDays);
      job.lastTouchedAt = dateFromAge(job.lastTouchedDaysAgo);
      job.stageUpdatedAt = dateFromAge(job.stageUpdatedDaysAgo);
      if (job.nextAction) job.nextAction.dueDate = dateFromOffset(job.nextAction.dueInDays);
      delete job.postedDaysAgo;
      delete job.closesInDays;
      delete job.lastTouchedDaysAgo;
      delete job.stageUpdatedDaysAgo;
      if (job.careerValueOverride === undefined) job.careerValueOverride = null;
      syncApplication(job);
    });
    data.activity = [
      { id: "evt-seed-1", time: new Date().toISOString(), kind: "workspace", title: "Synthetic search profile loaded", detail: "Role focus and score weights are editable in Search profile." },
      { id: "evt-seed-2", time: new Date(Date.now() - 3600000).toISOString(), kind: "assessment", title: "Opportunity assessments prepared", detail: "All fit notes and career-value signals are synthetic demo examples." }
    ];
    return data;
  }

  function syncApplication(job) {
    job.application = {
      stage: job.stage,
      stageUpdatedAt: job.stageUpdatedAt || null,
      appliedAt: job.appliedAt || null,
      nextAction: job.nextAction ? clone(job.nextAction) : null,
      referralState: job.referralState || "Not assessed",
      outcome: job.outcome || ""
    };
  }

  function restoreApplication(job) {
    const application = job.application || {};
    job.stage = application.stage || job.stage || "Saved";
    job.stageUpdatedAt = application.stageUpdatedAt || job.stageUpdatedAt || null;
    job.appliedAt = application.appliedAt || job.appliedAt || null;
    job.nextAction = application.nextAction !== undefined ? application.nextAction : (job.nextAction || null);
    job.referralState = application.referralState || job.referralState || "Not assessed";
    job.outcome = application.outcome ?? job.outcome ?? "";
  }

  function persist() {
    try {
      state.jobs.forEach(syncApplication);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageAvailable = true;
      $("#storage-notice").hidden = true;
    } catch (error) {
      storageAvailable = false;
      const notice = $("#storage-notice");
      notice.hidden = false;
      notice.textContent = "Browser storage is unavailable. Changes will remain only until this tab closes.";
    }
  }

  function addActivity(kind, title, detail) {
    state.activity.unshift({ id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, time: new Date().toISOString(), kind, title, detail });
    state.activity = state.activity.slice(0, 120);
    persist();
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function updateHeader() {
    const profile = state.profile;
    $("#focus-role").textContent = profile.roleFamilies.slice(0, 2).join(" · ") || "Add target roles";
    $("#focus-location").textContent = profile.location || "Location not set";
    $("#user-initials").textContent = initials(profile.displayName);
    $("#user-short-name").textContent = (profile.displayName.split(/\s+/)[0] || "Profile");
    $("#scenario-date").textContent = `Scenario · ${formatDate(isoDay(new Date()), { day: "numeric", month: "short", year: "numeric" })}`;
    $("#active-count").textContent = activeJobs().length;
    $("#all-count").textContent = state.jobs.length;
    $("#due-count").textContent = activeJobs().filter(isAttention).length;
    $("#inbox-count").textContent = activeJobs().filter(isAttention).length;
    $("#people-count").textContent = state.people.length;
    const attention = activeJobs().filter(isAttention);
    $("#attention-title").textContent = attention.length ? `${attention.length} need attention` : "No overdue next steps";
    $("#attention-copy").textContent = attention.length ? "Open the queue to review due or quiet opportunities." : "Your active queue is up to date.";
    $("#attention-card").classList.toggle("is-clear", !attention.length);
  }

  function setView(next) {
    view = next;
    selectedPersonId = null;
    $$(".nav-item").forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    const meta = VIEWS[view] || VIEWS.inbox;
    $("#view-title").textContent = meta.title;
    $("#view-eyebrow").textContent = meta.eyebrow;
    $("#view-subtitle").textContent = meta.subtitle;
    $("#crumb-view").textContent = meta.crumb;
    $(".workspace-layout").classList.toggle("is-people-view", view === "people");
    $(".workspace-layout").classList.toggle("is-activity-view", view === "activity");
    render();
  }

  function setFilter(next) {
    activeFilter = next;
    $$(".queue-tab").forEach(tab => {
      const active = tab.dataset.filter === next;
      tab.classList.toggle("is-selected", active);
      tab.setAttribute("aria-selected", String(active));
    });
    renderQueue();
  }

  function getVisibleJobs() {
    let jobs = state.jobs;
    if (view === "inbox") {
      jobs = activeJobs();
      if (activeFilter === "attention") jobs = jobs.filter(isAttention);
      else if (activeFilter === "active") jobs = jobs.filter(job => job.stage !== "Closed");
    } else if (view === "opportunities") {
      if (activeFilter === "attention") jobs = jobs.filter(isAttention);
      else if (activeFilter === "active") jobs = activeJobs();
    }
    const stage = $("#stage-filter").value;
    if (stage !== "all") jobs = jobs.filter(job => job.stage === stage);
    if (query) {
      const term = query.toLowerCase();
      jobs = jobs.filter(job => [job.company, job.roleTitle, job.roleFamily, job.location, job.stage].join(" ").toLowerCase().includes(term));
    }
    return sortedJobs(jobs);
  }

  function priorityLabel(score) {
    if (score >= 84) return { text: "High priority", className: "priority-high" };
    if (score >= 72) return { text: "Worth a closer look", className: "priority-mid" };
    return { text: "Lower priority", className: "priority-low" };
  }

  function renderQueue() {
    const container = $("#queue-content");
    if (view === "people") return renderPeople(container);
    if (view === "activity") return renderActivity(container);
    const jobs = getVisibleJobs();
    const stageFilter = $("#stage-filter").value;
    $("#queue-hint").textContent = view === "inbox"
      ? "Ranked by your fit, career-value, and timing weights. Network access does not raise a job’s score."
      : "Use the stage filter to review open, applied, and closed opportunities.";
    if (!jobs.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon" aria-hidden="true">⌕</div><h3>${query || stageFilter !== "all" ? "No matching opportunities" : "Your queue is clear"}</h3><p>${query || stageFilter !== "all" ? "Try a different search or stage filter." : "Add a role to start comparing opportunities."}</p><button class="button button-primary" type="button" data-open-add>Add an opportunity</button></div>`;
      if (!state.jobs.length) selectedJobId = null;
      renderDetail(null);
      return;
    }
    if (!jobs.some(job => job.id === selectedJobId)) selectedJobId = jobs[0].id;
    const weights = normalizedWeights();
    container.innerHTML = `
      <div class="queue-summary"><span><strong>${jobs.length}</strong> ${jobs.length === 1 ? "opportunity" : "opportunities"}</span><span>Sorted by <strong>your priorities</strong></span></div>
      <div class="job-list">${jobs.map((job, index) => {
        const score = priorityScore(job);
        const priority = priorityLabel(score);
        const attention = attentionReason(job);
        const isSelected = job.id === selectedJobId;
        const isClosed = job.stage === "Closed";
        return `<button class="job-row ${isSelected ? "is-selected" : ""} ${attention ? "has-attention" : ""}" type="button" data-select-job="${esc(job.id)}" aria-pressed="${isSelected}" aria-label="Open ${esc(job.roleTitle)} at ${esc(job.company)}, priority score ${score}">
          <span class="rank-number">${String(index + 1).padStart(2, "0")}</span>
          <span class="company-mark mark-${esc(job.companyColor)}" aria-hidden="true">${esc(job.companyMark)}</span>
          <span class="job-row-main"><span class="job-company">${esc(job.company)}</span><strong>${esc(job.roleTitle)}</strong><span class="job-row-meta">${esc(job.location)} <span>·</span> ${esc(job.roleFamily)}</span>
            <span class="job-row-bottom"><span class="stage-pill ${isClosed ? "stage-closed" : ""}">${esc(job.stage)}</span>${attention ? `<span class="attention-pill">${esc(attention)}</span>` : ""}${job.priorityOverride ? `<span class="override-pill">Priority changed</span>` : ""}</span>
          </span>
          <span class="job-score ${priority.className}"><strong>${score}</strong><small>${priority.text}</small></span>
        </button>`;
      }).join("")}</div>
      <div class="queue-footnote"><span class="info-dot" aria-hidden="true">i</span> Score weights: ${Math.round(weights.fit * 100)}% fit · ${Math.round(weights.value * 100)}% career value · ${Math.round(weights.timing * 100)}% timing <button type="button" class="inline-link" data-open-preferences>Change</button></div>`;
    renderDetail(jobById(selectedJobId));
  }

  function renderContactCard(person, relationship, job) {
    if (!person || !relationship) return "";
    const action = contactAction(relationship);
    const options = ACTIONS.map(code => `<option value="${code}" ${action === code ? "selected" : ""}>${esc(ACTION_LABELS[code])}</option>`).join("");
    const readiness = relationship.relationshipReadiness || "Unknown";
    const label = ACTION_LABELS[action];
    const draft = relationship.messageDraft || "No draft recommended for this contact.";
    const selected = selectedPersonId === person.id;
    const last = person.latestInteractionDays === null ? "No interaction logged" : person.latestInteractionDays === 0 ? "Interacted today" : `Last interaction ${person.latestInteractionDays}d ago`;
    return `<article class="contact-card ${selected ? "is-focused" : ""}" id="contact-${esc(person.id)}" data-contact-card="${esc(person.id)}">
      <div class="contact-head">
        <span class="person-avatar" aria-hidden="true">${esc(person.initials || initials(person.name))}</span>
        <div class="contact-ident"><strong>${esc(person.name)}</strong><span>${esc(person.role)} · ${esc(person.company)}</span></div>
        <span class="readiness-chip readiness-${readiness.toLowerCase()}">${esc(readiness)} readiness</span>
      </div>
      <div class="contact-facts"><span>${esc(person.networkState)}</span><span>${esc(person.relationshipState)}</span><span>${esc(last)}</span><span>${esc(relationship.referralRelevance)} role relevance</span></div>
      <div class="recommendation-line"><span class="recommendation-spark" aria-hidden="true">✳</span><span><b>Suggested:</b> ${esc(label)} <small>· guidance, not certainty</small></span></div>
      <p class="contact-rationale">${esc(relationship.rationale)}</p>
      <label class="action-override"><span>Relationship action</span><select data-field="contact-action" data-relationship-id="${esc(relationship.id)}" aria-label="Relationship action for ${esc(person.name)}">${options}</select></label>
      <details class="draft-details"><summary>Review a message draft</summary><div class="message-draft">${esc(draft)}</div><div class="draft-actions"><button type="button" class="text-button" data-copy-draft="${esc(person.id)}" data-job-id="${esc(job.id)}" ${!relationship.messageDraft ? "disabled" : ""}>Copy draft</button><span>Nothing is sent from Focusline.</span></div></details>
      ${action === "SKIP" ? `<div class="contact-footnote">No outreach is recommended for this opportunity.</div>` : `<button class="button button-small button-outline contact-log" type="button" data-action="log-contact" data-person-id="${esc(person.id)}" data-job-id="${esc(job.id)}">Log as contacted</button><span class="contact-log-note">Use after you send it yourself.</span>`}
    </article>`;
  }

  function fitRows(job) {
    const strength = Math.min(100, Math.max(28, Number(job.fitScore || 0)));
    const gaps = Math.min(100, Math.max(15, Math.round((100 - strength) * 1.15)));
    return { strength, gaps };
  }

  function renderDetail(job) {
    const panel = $("#detail-panel");
    if (!job) {
      panel.innerHTML = `<div class="detail-empty"><span class="detail-empty-mark">◎</span><h2>Select an opportunity</h2><p>Its fit, career signals, people, resume strategy, and next step will appear here.</p></div>`;
      return;
    }
    const score = priorityScore(job);
    const priority = priorityLabel(score);
    const fitBars = fitRows(job);
    const resume = resumeById(job.resumeId);
    const attention = attentionReason(job);
    const weights = normalizedWeights();
    const contacts = (state.jobPersonLinks || []).filter(link => link.jobId === job.id)
      .map(link => ({ person: personById(link.personId), relationship: link }))
      .filter(item => item.person);
    const stageOptions = STAGES.map(stage => `<option value="${esc(stage)}" ${job.stage === stage ? "selected" : ""}>${esc(stage)}</option>`).join("");
    const resumeOptions = state.resumes.map(item => `<option value="${esc(item.id)}" ${item.id === resume.id ? "selected" : ""}>${esc(item.name)}</option>`).join("");
    const overrideOptions = [
      ["", "Use suggested ranking"], ["top", "Pin near top"], ["lower", "Move lower"]
    ].map(([value, label]) => `<option value="${esc(value)}" ${job.priorityOverride === value ? "selected" : ""}>${esc(label)}</option>`).join("");
    const careerOptions = [
      ["", `Use role-scope estimate (${job.careerValue})`], ["90", "My view · very high"], ["75", "My view · high"], ["60", "My view · moderate"], ["40", "My view · low"]
    ].map(([value, label]) => `<option value="${esc(value)}" ${String(job.careerValueOverride ?? "") === value ? "selected" : ""}>${esc(label)}</option>`).join("");
    const due = job.nextAction ? dateLabel(job.nextAction.dueDate) : "No next action set";
    const isDue = job.nextAction && ageDays(job.nextAction.dueDate) >= 0;
    panel.innerHTML = `
      <div class="detail-scroll">
        <div class="detail-topline"><span class="eyebrow">OPPORTUNITY BRIEF</span><span class="detail-id">${esc(job.id.toUpperCase())}</span></div>
        <div class="detail-title-row"><span class="company-mark mark-${esc(job.companyColor)} company-mark-large" aria-hidden="true">${esc(job.companyMark)}</span><div><h2>${esc(job.roleTitle)}</h2><div class="detail-company">${esc(job.company)} <span>·</span> ${esc(job.industry)}</div></div><button class="more-button" type="button" aria-label="More opportunity actions" data-menu-toggle>•••</button></div>
        <div class="detail-meta"><span>${esc(job.location)}</span><span>Posted ${formatDate(job.postedAt)}</span><span>${job.closesAt ? `Closes ${formatDate(job.closesAt)}` : "No closing date"}</span></div>
        ${attention ? `<div class="neglected-banner"><span aria-hidden="true">!</span><div><strong>${esc(attention)} · this opportunity needs a decision</strong><small>${esc(job.nextAction?.label || "Review whether to keep it active")}</small></div><button type="button" data-action="snooze" data-job-id="${esc(job.id)}">Snooze 3d</button></div>` : ""}
        <section class="detail-section priority-section">
          <div class="section-heading"><div><span class="section-kicker">ATTENTION PRIORITY</span><h3>Why it ranks ${score >= 84 ? "near the top" : score >= 72 ? "in the middle" : "lower"}</h3></div><span class="priority-score ${priority.className}">${score}<small>/100</small></span></div>
          <p class="section-copy">A transparent triage score from your chosen weights. It does not estimate your chance of being hired.</p>
          <div class="score-breakdown">
            <div class="score-row"><span>Role fit <small>${Math.round(weights.fit * 100)}% weight</small></span><div class="mini-track"><i style="width:${Number(job.fitScore)}%"></i></div><b>${Number(job.fitScore)}</b></div>
            <div class="score-row"><span>Career value <small>${Math.round(weights.value * 100)}% weight</small></span><div class="mini-track"><i style="width:${careerScore(job)}%"></i></div><b>${careerScore(job)}</b></div>
            <div class="score-row"><span>Timing <small>${Math.round(weights.timing * 100)}% weight</small></span><div class="mini-track"><i style="width:${Number(job.timingScore ?? 50)}%"></i></div><b>${Number(job.timingScore ?? 50)}</b></div>
          </div>
          <div class="score-why"><span class="why-icon" aria-hidden="true">✳</span><span><strong>Reasoning:</strong> ${esc(priorityReason(job, score))}</span></div>
          <label class="select-row priority-override"><span>Your priority</span><select data-field="priority-override" data-job-id="${esc(job.id)}">${overrideOptions}</select></label>
        </section>

        <section class="detail-section fit-section">
          <div class="section-heading"><div><span class="section-kicker">FIT ASSESSMENT · ${esc(job.fitConfidence.toUpperCase())} CONFIDENCE</span><h3>What matches—and what to check</h3></div><span class="fit-score">${Number(job.fitScore)}<small>/100</small></span></div>
          <div class="fit-bar-pair"><div><span>Evidence match</span><div class="mini-track"><i style="width:${fitBars.strength}%"></i></div></div><div><span>Open questions</span><div class="mini-track gap-track"><i style="width:${fitBars.gaps}%"></i></div></div></div>
          <p class="assessment-rationale">${esc(job.fitRationale)}</p>
          <div class="evidence-columns"><div><h4><span class="evidence-check">✓</span> Strengths</h4><ul>${job.strengths.map(item => `<li>${esc(item)}</li>`).join("")}</ul></div><div><h4><span class="evidence-question">?</span> Gaps to verify</h4><ul>${job.gaps.map(item => `<li>${esc(item)}</li>`).join("")}</ul></div></div>
          <div class="source-line"><span class="source-mark" aria-hidden="true">↗</span><span>Assessment source: ${esc(job.assessmentSource)}. Confidence describes evidence coverage, not hiring odds.</span></div>
        </section>

        <section class="detail-section value-section">
          <div class="section-heading"><div><span class="section-kicker">COMPANY &amp; CAREER VALUE · ROLE-SCOPE SIGNALS</span><h3>${esc(job.careerValueLabel)}</h3></div><span class="value-score">${careerScore(job)}<small>/100</small></span></div>
          <div class="signal-tags">${job.careerSignals.map(signal => `<span>${esc(signal)}</span>`).join("")}</div>
          <p class="value-caveat">${esc(job.careerCaveat)} No external employer-reputation data is connected; verify team quality and growth path.</p>
          <label class="select-row"><span>Override with your judgment</span><select data-field="career-override" data-job-id="${esc(job.id)}">${careerOptions}</select></label>
        </section>

        <section class="detail-section network-section">
          <div class="section-heading"><div><span class="section-kicker">NETWORK OPTIONS · ${contacts.length} ${contacts.length === 1 ? "PERSON" : "PEOPLE"}</span><h3>Who could help, and how?</h3></div><span class="human-badge">You choose</span></div>
          <div class="relationship-boundary"><strong>Relationship readiness is uncertain.</strong> It reflects recorded context and relevance, not someone’s willingness to refer. No message will be sent by this demo.</div>
          ${contacts.length ? contacts.map(({ person, relationship }) => renderContactCard(person, relationship, job)).join("") : `<div class="empty-contact"><strong>No matching contact in the sample.</strong><span>You can still pursue the role or add a contact record later.</span></div>`}
        </section>

        <section class="detail-section resume-section">
          <div class="section-heading"><div><span class="section-kicker">RESUME STRATEGY</span><h3>Choose a starting point</h3></div><span class="resume-badge">Suggested</span></div>
          <label class="select-row resume-select"><span>Resume variant</span><select data-field="resume-id" data-job-id="${esc(job.id)}">${resumeOptions}</select></label>
          <p class="resume-summary">${esc(resume.summary)}</p>
          <div class="resume-reason"><strong>Why this variant</strong><span>${esc(job.resumeReason)}</span></div>
          <ul class="tailoring-list">${resume.tailoring.map((point, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span>${esc(point)}</li>`).join("")}</ul>
        </section>

        <section class="detail-section next-section">
          <div class="section-heading"><div><span class="section-kicker">NEXT ACTION</span><h3>${job.nextAction ? esc(job.nextAction.label) : "No action is scheduled"}</h3></div><span class="due-label ${isDue ? "is-overdue" : ""}">${esc(due)}</span></div>
          ${job.nextAction ? `<div class="next-action-meta"><span>Owner · ${esc(job.nextAction.owner || "You")}</span><span>Stage · ${esc(job.stage)}</span></div>${renderNextButton(job)}` : `<button type="button" class="button button-outline" data-action="set-next" data-job-id="${esc(job.id)}">Set a next action</button>`}
          <label class="select-row stage-select"><span>Application stage</span><select data-field="stage" data-job-id="${esc(job.id)}">${stageOptions}</select></label>
          <div class="stage-help">Changing a stage is a user-recorded decision. The demo does not submit applications or contact employers.</div>
        </section>

        <section class="detail-section description-section">
          <details><summary>Review the job description</summary><p>${esc(job.description)}</p><div class="source-line">${esc(job.source)}</div></details>
        </section>
        <div class="detail-footer"><span>Last touched ${job.lastTouchedAt ? formatDate(job.lastTouchedAt, { day: "numeric", month: "short", year: "numeric" }) : "never"}</span><button type="button" data-action="add-note" data-job-id="${esc(job.id)}">Add a note</button></div>
      </div>`;
    if (selectedPersonId) {
      requestAnimationFrame(() => $(`#contact-${CSS.escape(selectedPersonId)}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    }
  }

  function priorityReason(job, score) {
    const parts = [];
    if (Number(job.fitScore) >= 80) parts.push("clear overlap with your experience");
    else if (Number(job.fitScore) < 70) parts.push("several fit questions remain");
    if (careerScore(job) >= 85) parts.push("strong role-scope signals for career growth");
    if (job.closesAt && ageDays(job.closesAt) >= -4) parts.push("a short application window");
    if (job.stage === "Closed") parts.push("this opportunity is closed");
    if (!parts.length) parts.push("a moderate mix of fit, career value, and timing");
    return `${parts.join(" and ")}. Current score ${score}/100 follows your editable weights.`;
  }

  function renderNextButton(job) {
    const type = job.nextAction?.type;
    if (type === "relationship") return `<div class="next-guidance"><span class="next-icon" aria-hidden="true">↗</span><span>Review the relationship options above. Log outreach only after you send it yourself.</span></div>`;
    const config = {
      research: ["Mark research complete", "research"],
      resume: ["Mark tailoring complete", "resume"],
      submit: ["Confirm application submitted", "submit"],
      followup: ["Log follow-up completed", "followup"],
      review: ["Mark review complete", "review"],
      "interview-prep": ["Log preparation complete", "interview-prep"],
      "source-check": ["Confirm source checked", "source-check"]
    };
    const [label, action] = config[type] || ["Mark next step complete", "complete"];
    return `<button type="button" class="button button-primary next-complete" data-action="complete-next" data-kind="${action}" data-job-id="${esc(job.id)}">${label}<span aria-hidden="true">→</span></button>`;
  }

  function renderPeople(container) {
    const people = state.people.filter(person => {
      if (!query) return true;
      return [person.name, person.company, person.role, person.relationshipState, person.networkState].join(" ").toLowerCase().includes(query.toLowerCase());
    }).sort((a, b) => String(a.name).localeCompare(b.name));
    $("#queue-hint").textContent = "People are synthetic. Readiness is an estimate from relationship context, not a promise of help.";
    if (!people.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">◎</div><h3>No people match</h3><p>Try another name, company, or role.</p></div>`;
      renderDetail(null);
      return;
    }
    container.innerHTML = `<div class="people-list">${people.map(person => {
      const links = (state.jobPersonLinks || []).filter(link => link.personId === person.id);
      const last = person.latestInteractionDays === null ? "No interaction recorded" : person.latestInteractionDays === 0 ? "Interacted today" : `Last interaction ${person.latestInteractionDays}d ago`;
      const opportunities = links.map(link => {
        const job = jobById(link.jobId);
        if (!job) return "";
        const action = contactAction(link);
        const readiness = link.relationshipReadiness || "Unknown";
        return `<div class="directory-opportunity"><div><strong>${esc(job.company)} · ${esc(job.roleTitle)}</strong><small>${esc(readiness)} readiness · ${esc(link.referralRelevance)} role relevance · Suggested: ${esc(ACTION_LABELS[action])}</small><p>${esc(link.rationale)}</p></div><button class="inline-link" type="button" data-person-open="${esc(person.id)}" data-job-id="${esc(job.id)}">Review role →</button></div>`;
      }).filter(Boolean).join("");
      return `<article class="directory-person"><div class="contact-head"><span class="person-avatar">${esc(person.initials)}</span><div class="contact-ident"><strong>${esc(person.name)}</strong><span>${esc(person.role)} · ${esc(person.company)}</span></div></div><div class="contact-facts"><span>${esc(person.networkState)}</span><span>${esc(person.relationshipState)}</span><span>${esc(last)}</span></div><div class="directory-links"><strong>Opportunity context</strong>${opportunities || `<p>No matching opportunity is linked yet.</p>`}</div></article>`;
    }).join("")}</div>`;
    renderDetail(null);
  }

  function renderActivity(container) {
    $("#queue-hint").textContent = "Activity is stored locally in this browser. Synthetic seed entries are identified as demo content.";
    const events = state.activity || [];
    if (!events.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">↺</div><h3>No activity yet</h3><p>Decisions and changes will appear here.</p></div>`;
      renderDetail(null);
      return;
    }
    container.innerHTML = `<div class="activity-list">${events.map(event => `<article class="activity-item"><span class="activity-dot kind-${esc(event.kind)}" aria-hidden="true"></span><div><strong>${esc(event.title)}</strong><p>${esc(event.detail)}</p><time datetime="${esc(event.time)}">${new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.time))}</time></div></article>`).join("")}</div>`;
    renderDetail(null);
  }

  function render() {
    updateHeader();
    $(".queue-toolbar").hidden = view === "people" || view === "activity";
    $("#stage-filter").hidden = view === "people" || view === "activity";
    renderQueue();
  }

  function populateStageFilter() {
    const select = $("#stage-filter");
    select.innerHTML = `<option value="all">All stages</option>${STAGES.map(stage => `<option value="${esc(stage)}">${esc(stage)}</option>`).join("")}`;
  }

  function saveStage(job, nextStage) {
    const previous = job.stage;
    job.stage = nextStage;
    job.stageUpdatedAt = isoDay(new Date());
    job.lastTouchedAt = isoDay(new Date());
    if (previous === "Closed" && nextStage !== "Closed") job.outcome = "";
    if (nextStage === "Applied" && previous !== "Applied") {
      job.appliedAt = isoDay(new Date());
      job.referralState = job.referralState || "Not requested";
      job.nextAction = { label: "Check for a response or prepare a follow-up", dueDate: dateFromOffset(5), dueInDays: 5, owner: "You", type: "followup" };
    } else if (nextStage === "Interview") {
      job.nextAction = { label: "Prepare evidence-led interview examples", dueDate: dateFromOffset(1), dueInDays: 1, owner: "You", type: "interview-prep" };
    } else if (nextStage === "Offer") {
      job.nextAction = { label: "Review offer details and decision criteria", dueDate: dateFromOffset(1), dueInDays: 1, owner: "You", type: "review" };
    } else if (nextStage === "Closed") {
      job.nextAction = null;
      job.outcome = job.outcome || "Closed by user";
    } else if (previous === "Closed") {
      job.nextAction = { label: "Review role requirements", dueDate: dateFromOffset(1), dueInDays: 1, owner: "You", type: "research" };
      job.outcome = "";
    }
    addActivity("stage", `Stage changed · ${job.company}`, `${previous} → ${nextStage} · ${job.roleTitle}`);
    render();
    showToast(`Stage updated to ${nextStage}`);
  }

  function completeNext(job, kind) {
    const today = isoDay(new Date());
    job.lastTouchedAt = today;
    job.stageUpdatedAt = today;
    const title = job.nextAction?.label || "Next action";
    if (kind === "submit") {
      pendingSubmitJobId = job.id;
      $("#submit-dialog").showModal();
      return;
    }
    if (kind === "research" || kind === "source-check") {
      if (job.stage === "Saved") job.stage = "Researching";
      job.nextAction = { label: "Review fit evidence and decide whether to pursue", dueDate: dateFromOffset(1), dueInDays: 1, owner: "You", type: "review" };
    } else if (kind === "review") {
      job.stage = "Preparing";
      job.nextAction = { label: "Tailor the selected resume for this role", dueDate: dateFromOffset(1), dueInDays: 1, owner: "You", type: "resume" };
    } else if (kind === "resume") {
      job.stage = "Preparing";
      job.nextAction = { label: "Submit the application yourself", dueDate: dateFromOffset(1), dueInDays: 1, owner: "You", type: "submit" };
    } else if (kind === "followup") {
      job.nextAction = { label: "Check for a response or choose another follow-up", dueDate: dateFromOffset(5), dueInDays: 5, owner: "You", type: "followup" };
    } else if (kind === "interview-prep") {
      job.nextAction = { label: "Review your interview notes after the conversation", dueDate: dateFromOffset(1), dueInDays: 1, owner: "You", type: "review" };
    } else {
      job.nextAction = { label: "Review progress and choose the next step", dueDate: dateFromOffset(2), dueInDays: 2, owner: "You", type: "review" };
    }
    addActivity("action", `Next step completed · ${job.company}`, `${title} · ${job.roleTitle}`);
    render();
    showToast("Progress recorded. You remain in control of the next step.");
  }

  function logContact(personId, jobId) {
    const person = personById(personId);
    const job = jobById(jobId);
    const relationship = relationshipFor(jobId, personId);
    if (!person || !job || !relationship) return;
    const action = contactAction(relationship);
    if (action === "SKIP") return;
    person.latestInteractionDays = 0;
    person.latestInteractionAt = new Date().toISOString();
    person.relationshipState = "Contacted · waiting for reply";
    person.relationshipStrength = person.relationshipStrength === "Unknown" ? "Emerging" : person.relationshipStrength;
    job.stage = "Networking";
    job.referralState = action === "DIRECT_REFERRAL_ASK" ? "Referral asked · awaiting reply" : "Role context requested · awaiting reply";
    job.lastTouchedAt = isoDay(new Date());
    job.nextAction = { label: "Review reply and decide whether to proceed", dueDate: dateFromOffset(4), dueInDays: 4, owner: "You", type: "review" };
    addActivity("relationship", `${ACTION_LABELS[action]} logged · ${person.name}`, `${job.roleTitle} at ${job.company} · recorded locally after you sent it`);
    render();
    showToast("Outreach logged locally. No message was sent.");
  }

  function snooze(job) {
    if (!job.nextAction) return;
    job.nextAction.dueDate = dateFromOffset(3);
    job.nextAction.dueInDays = 3;
    addActivity("snooze", `Next step snoozed · ${job.company}`, `${job.nextAction.label} · due ${formatDate(job.nextAction.dueDate)}`);
    render();
    showToast("Next step snoozed for 3 days");
  }

  function mockAssessNewJob({ company, roleTitle, location, roleFamily, description }) {
    const text = `${roleTitle} ${roleFamily} ${description}`.toLowerCase();
    const matches = state.profile.skillSignals.filter(signal => text.includes(signal.toLowerCase()));
    const fitScore = Math.min(86, Math.max(42, 46 + matches.length * 4));
    const strengths = matches.slice(0, 4).map(signal => `Posting mentions ${signal}`);
    if (!strengths.length) strengths.push("Role title is in your search; verify responsibilities against your experience");
    const gaps = matches.length < 3 ? ["Compare the full requirements with your experience", "Confirm seniority, location, and required domain exposure"] : ["Verify the role’s expected level of ownership", "Confirm domain-specific requirements"];
    const matchingResume = state.resumes.find(resume => resume.bestFor.includes(roleFamily)) || state.resumes[0];
    return {
      id: `job-${Date.now()}`,
      company, companyMark: initials(company).replace(/\s/g, "").slice(0, 2), companyColor: "blue", industry: "Not assessed",
      roleTitle, location: location || state.profile.location, roleFamily,
      postedAt: isoDay(new Date()), closesAt: "", source: "User added · local browser record", description: description || "No job description added. Add one to improve the fit review.",
      fitScore, fitConfidence: matches.length >= 4 ? "Medium" : "Low",
      fitRationale: `${matches.length} profile skill signals appear in the text you provided. This is a local keyword comparison, not semantic AI or a hiring prediction. Check the original posting before deciding.`,
      strengths, gaps, careerValue: 55, careerValueOverride: null, careerValueLabel: "Unassessed · set your view",
      careerSignals: ["Role-level scope not yet reviewed", "Employer context not yet verified"],
      careerCaveat: "No reputation or career-growth claim has been verified. Set your own role-scope view after research.",
      timingScore: 55, lastTouchedAt: isoDay(new Date()), priorityOverride: "", stage: "Saved", stageUpdatedAt: isoDay(new Date()),
      referralState: "Not assessed", nextAction: { label: "Review the original posting and confirm role scope", dueDate: dateFromOffset(1), dueInDays: 1, owner: "You", type: "research" },
      resumeId: matchingResume.id,
      resumeReason: `The ${matchingResume.name} variant is the closest starting point for this role family. Review each claim before using it.`,
      assessmentSource: "Local keyword comparison · synthetic profile", outcome: ""
    };
  }

  function addNewOpportunity(form) {
    const values = new FormData(form);
    const job = mockAssessNewJob({
      company: String(values.get("company") || "").trim(),
      roleTitle: String(values.get("roleTitle") || "").trim(),
      location: String(values.get("location") || "").trim(),
      roleFamily: String(values.get("roleFamily") || "Other"),
      description: String(values.get("jobDescription") || "").trim()
    });
    if (!job.company || !job.roleTitle) return;
    state.jobs.unshift(job);
    selectedJobId = job.id;
    view = "opportunities";
    activeFilter = "active";
    $("#stage-filter").value = "all";
    $("#global-search").value = "";
    query = "";
    addActivity("opportunity", `Opportunity added · ${job.company}`, `${job.roleTitle} · local assessment has ${job.fitConfidence.toLowerCase()} confidence`);
    setView("opportunities");
    $("#add-dialog").close();
    form.reset();
    showToast("Opportunity added. Review the local fit estimate before acting.");
  }

  function openPreferences() {
    const form = $("#preferences-form");
    form.elements.displayName.value = state.profile.displayName;
    form.elements.location.value = state.profile.location;
    form.elements.roleFamilies.value = state.profile.roleFamilies.join(", ");
    form.elements.skillSignals.value = state.profile.skillSignals.join(", ");
    form.elements.weightFit.value = state.profile.weights.fit;
    form.elements.weightValue.value = state.profile.weights.value;
    form.elements.weightTiming.value = state.profile.weights.timing;
    $("#preferences-dialog").showModal();
  }

  function savePreferences(form) {
    const values = new FormData(form);
    const positive = (name) => Math.max(0, Math.min(100, Number(values.get(name)) || 0));
    let weights = { fit: positive("weightFit"), value: positive("weightValue"), timing: positive("weightTiming") };
    if (weights.fit + weights.value + weights.timing === 0) weights = { fit: 50, value: 40, timing: 10 };
    state.profile.displayName = String(values.get("displayName") || "Job seeker").trim();
    state.profile.location = String(values.get("location") || "").trim();
    state.profile.roleFamilies = String(values.get("roleFamilies") || "").split(",").map(part => part.trim()).filter(Boolean);
    state.profile.skillSignals = String(values.get("skillSignals") || "").split(",").map(part => part.trim()).filter(Boolean);
    state.profile.weights = weights;
    addActivity("profile", "Search profile updated", `Role focus: ${state.profile.roleFamilies.join(", ") || "not set"} · priority weights saved`);
    $("#preferences-dialog").close();
    render();
    showToast("Search profile saved. Opportunity order has been recalculated.");
  }

  async function copyDraft(personId, jobId) {
    const relationship = relationshipFor(jobId, personId);
    if (!relationship?.messageDraft) return;
    try {
      await navigator.clipboard.writeText(relationship.messageDraft);
      showToast("Draft copied. Review it before sending.");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = relationship.messageDraft;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast("Draft copied. Review it before sending.");
    }
  }

  function addNote(job) {
    const note = window.prompt("Add a private note for this opportunity. It stays in this browser:");
    if (note === null || !note.trim()) return;
    if (!Array.isArray(job.notes)) job.notes = [];
    job.notes.push({ text: note.trim(), createdAt: new Date().toISOString() });
    job.lastTouchedAt = isoDay(new Date());
    addActivity("note", `Note added · ${job.company}`, `${job.roleTitle} · private browser-local note`);
    render();
    showToast("Note saved in this browser");
  }

  function focusJobFromCommand(jobId, section) {
    selectedJobId = jobId;
    selectedPersonId = null;
    query = "";
    $("#global-search").value = "";
    $("#stage-filter").value = "all";
    activeFilter = "active";
    setView("inbox");
    window.setTimeout(() => {
      const target = section ? $(`#detail-panel .${section}-section`) : $("#detail-panel");
      (target || $("#detail-panel")).scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function commandJob(text) {
    const normalized = text.toLowerCase();
    return state.jobs.find(job => normalized.includes(job.company.toLowerCase()) || normalized.includes(job.roleTitle.toLowerCase()))
      || jobById(selectedJobId)
      || sortedJobs(activeJobs())[0]
      || null;
  }

  function commandContact(job, text) {
    if (!job) return null;
    const links = (state.jobPersonLinks || []).filter(link => link.jobId === job.id)
      .map(link => ({ link, person: personById(link.personId) }))
      .filter(item => item.person);
    const named = links.find(item => text.toLowerCase().includes(item.person.name.toLowerCase()));
    if (named) return named;
    const unknownName = text.match(/\b(?:ask|contact|message|referral for)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
    if (unknownName && !links.some(item => item.person.name.toLowerCase() === unknownName[1].toLowerCase())) return { missingName: unknownName[1] };
    const readinessRank = { High: 3, Medium: 2, Low: 1, Unknown: 0 };
    links.sort((a, b) => (readinessRank[b.link.relationshipReadiness] || 0) - (readinessRank[a.link.relationshipReadiness] || 0)
      || (b.link.referralRelevance === "High" ? 1 : 0) - (a.link.referralRelevance === "High" ? 1 : 0));
    return links[0] || null;
  }

  function mountFocuslineCommand() {
    if (!window.AgentCommandSurface) return;
    window.AgentCommandSurface.mount({
      product: "Focusline",
      placeholder: "What should I focus on today?",
      suggestions: [
        "What should I focus on today?",
        "Who can help me with this role?",
        "Tailor my resume for this job",
        "What opportunities am I neglecting?"
      ],
      fallback: ["Find the best opportunities", "Review a stretch role", "Prepare a resume strategy"],
      resolve(text) {
        const normalized = text.toLowerCase();
        const job = commandJob(text);
        if (/\b(add|save)\b/.test(normalized)) {
          const match = text.match(/\b(?:add|save)\s+(?:a\s+)?(?:job\s+)?(.+?)\s+at\s+(.+?)(?:\s+in\s+(.+))?$/i);
          return {
            label: "Add and assess an opportunity",
            objective: "Add a role and check the available evidence",
            steps: [
              { agent: "Opportunity Analyst", task: "Create a local opportunity record and compare role text with the editable search profile." },
              { agent: "Network Analyst", task: "Check the synthetic people records for an exact company match." },
              { agent: "Resume Agent", task: "Choose a starting resume variant from the role family." }
            ],
            run: () => {
              if (!match) {
                return { title: "Role details are needed", summary: "The demo cannot read an external job page. Open the add form and enter the company, title, and role description to create a local assessment.", confidence: "Not assessed", checked: "No role record created", freshness: "No source URL retrieved", exception: "A URL alone is not fetched in this demo. Paste the posting text or enter role details.", sources: ["Local opportunity form"], action: { label: "Open add opportunity form", run: () => $("#add-dialog").showModal() } };
              }
              const roleTitle = match[1].trim().replace(/[.,;]+$/, "");
              const company = match[2].trim().replace(/[.,;]+$/, "");
              const location = (match[3] || state.profile.location || "").trim();
              const roleFamily = state.profile.roleFamilies.find(family => roleTitle.toLowerCase().includes(family.toLowerCase().split(" ")[0])) || "Other";
              const added = mockAssessNewJob({ company, roleTitle, location, roleFamily, description: "Added through a natural-language command. Paste the original job description to improve the local comparison." });
              state.jobs.unshift(added);
              selectedJobId = added.id;
              state.jobPersonLinks = state.jobPersonLinks || [];
              const matches = state.people.filter(person => person.company.toLowerCase() === company.toLowerCase());
              matches.forEach(person => {
                const id = `link-${added.id}-${person.id}`;
                const readiness = person.relationshipStrength === "Strong" ? "High" : person.relationshipStrength === "Warm" ? "Medium" : "Low";
                const action = readiness === "High" ? "ASK_ROLE_INSIGHT" : person.networkState.startsWith("2nd") ? "CONNECT_FIRST" : "RECONNECT_FIRST";
                state.jobPersonLinks.push({ id, jobId: added.id, personId: person.id, referralRelevance: "Medium", relationshipReadiness: readiness, recommendedAction: action, rationale: "Exact company match in the synthetic network. Check role relevance and relationship context before any outreach.", messageDraft: "" });
              });
              addActivity("opportunity", `Opportunity added · ${company}`, `${roleTitle} · local comparison prepared from the supplied role title`);
              setView("opportunities");
              const related = (state.jobPersonLinks || []).filter(link => link.jobId === added.id);
              return {
                title: `${company} · ${roleTitle}`,
                summary: "The role is now in your opportunity list. Fit and resume matching are local estimates; company career value remains unverified until you review the role scope.",
                facts: [`Local fit estimate: ${added.fitScore}/100 · ${added.fitConfidence.toLowerCase()} confidence`, `${related.length} synthetic network contact${related.length === 1 ? "" : "s"} matched by exact company`, `Starting resume: ${resumeById(added.resumeId).name}`],
                confidence: "Medium · role description not supplied",
                checked: "1 new role · synthetic network records",
                freshness: "Created now · role text still needs review",
                assumptions: ["Company match is exact-name only", "Career value is not an employer reputation rating"],
                sources: ["Focusline opportunity list", "Synthetic People records", "Resume variants"],
                action: { label: "Review the new opportunity", run: () => focusJobFromCommand(added.id) }
              };
            }
          };
        }

        if (/\b(neglect|overdue|attention|follow.?up|focus.*today|today.*focus|what should i focus)\b/.test(normalized)) {
          const attention = sortedJobs(activeJobs().filter(isAttention));
          const best = attention[0] || sortedJobs(activeJobs())[0];
          return {
            objective: "Find the next opportunity that deserves attention today",
            steps: [
              { agent: "Application Agent", task: "Check due dates, open stages, and time since each opportunity was last touched." },
              { agent: "Opportunity Analyst", task: "Keep role quality separate from urgency and rank active roles by the saved profile." },
              { agent: "Network Analyst", task: "Check job-specific contact options for the highest-priority role." }
            ],
            run: () => {
              setView("inbox");
              setFilter(attention.length ? "attention" : "active");
              return {
                title: attention.length ? `${attention.length} ${attention.length === 1 ? "opportunity" : "opportunities"} need attention` : "No overdue opportunity is recorded",
                summary: best ? `${best.company} · ${best.roleTitle} is the first item to review. Priority remains based on your profile; due dates identify urgency separately.` : "Your active opportunity queue is empty. Add a role to begin a search.",
                facts: best ? [`Next action: ${best.nextAction?.label || "Choose a next step"}`, `Priority score: ${priorityScore(best)}/100 · fit ${best.fitScore} · career value ${careerScore(best)} · timing ${best.timingScore}`, `${attention.length} active role${attention.length === 1 ? "" : "s"} currently due or quiet`] : ["No active roles are available in this sample"],
                confidence: "High for recorded dates · not a hiring prediction",
                checked: `${activeJobs().length} active opportunities · ${state.jobs.filter(job => job.stage !== "Closed" && job.nextAction).length} next actions`,
                freshness: "Dates are recalculated for this browser session",
                assumptions: ["Only records in this local demo were checked"],
                sources: ["Opportunity records", "Application next actions", "Synthetic relationship links"],
                action: best ? { label: "Review the first opportunity", run: () => focusJobFromCommand(best.id) } : null
              };
            }
          };
        }

        if (/\b(stretch|fit|gap|why.*role|why.*rank|why.*score)\b/.test(normalized)) {
          return {
            objective: `Explain the fit and ranking for ${job?.company || "the selected role"}`,
            steps: [
              { agent: "Opportunity Analyst", task: "Compare role responsibilities with the candidate's stated skills and the authored evidence notes." },
              { agent: "Company Analyst", task: "Separate role-scope signals from unverified employer reputation or career-growth claims." }
            ],
            run: () => {
              if (job) { selectedJobId = job.id; setView("inbox"); }
              return {
                title: job ? `${job.fitScore}/100 fit · ${job.company}` : "No opportunity is selected",
                summary: job ? job.fitRationale : "Open an opportunity before asking for an explanation.",
                facts: job ? [...job.strengths.map(item => `Strength · ${item}`), ...job.gaps.map(item => `Gap · ${item}`), `Ranking uses ${Math.round(normalizedWeights().fit * 100)}% fit · ${Math.round(normalizedWeights().value * 100)}% career value · ${Math.round(normalizedWeights().timing * 100)}% timing`] : ["No record changed"],
                confidence: job?.fitConfidence || "Not assessed",
                checked: job ? `1 job description · ${state.profile.skillSignals.length} profile signals` : "No role record checked",
                freshness: job?.assessmentSource || "Local sample",
                assumptions: job ? ["Role descriptions and candidate evidence are synthetic demo inputs", "Fit is not a hiring probability"] : [],
                sources: ["Synthetic job description", "Editable search profile", "Priority weights"],
                action: job ? { label: "Review the evidence in the workspace", run: () => focusJobFromCommand(job.id) } : null
              };
            }
          };
        }

        if (/\b(network|contact|referral|refer|anyone.*help|who can help|relationship|ask [a-z]+)\b/.test(normalized)) {
          const contact = commandContact(job, text);
          const wantsAsk = /\b(should i ask|ask .*referral|draft|write|message|contact|reach out)\b/.test(normalized);
          return {
            objective: `Check relationship options for ${job?.company || "the selected role"}`,
            steps: [
              { agent: "Network Analyst", task: "Match synthetic people to the role's company and function." },
              { agent: "Relationship Agent", task: "Check connection state, interaction recency, and job-specific referral relevance." },
              ...(wantsAsk ? [{ agent: "Drafting Agent", task: "Prepare a low-pressure draft for human review; do not send it." }] : [])
            ],
            run: () => {
              if (job) { selectedJobId = job.id; setView("inbox"); }
              if (contact?.missingName) return { title: `No synthetic contact named ${contact.missingName}`, summary: "No relationship was selected or changed. Search the People view or name a contact from this sample.", confidence: "Low · identity not matched", checked: job ? `1 job · ${(state.jobPersonLinks || []).filter(link => link.jobId === job.id).length} linked people` : "No role record checked", freshness: "Synthetic sample", exception: "An unmatched name is not treated as a contact or a referral lead.", sources: ["Synthetic People records", "Job-person links"] };
              if (!job || !contact) return { title: "No job-specific contact found", summary: "The current sample has no linked contact for this opportunity. Network access does not change the opportunity ranking.", confidence: "Medium · sample coverage only", checked: job ? `1 role · ${state.people.length} synthetic people` : "No role record checked", freshness: "Synthetic sample", exception: "No matching person is not evidence that no real-world contact exists.", sources: ["Synthetic People records", "Job-person links"] };
              const action = contactAction(contact.link);
              const suggested = ACTION_LABELS[action];
              const approval = wantsAsk && contact.link.messageDraft && action !== "SKIP" ? {
                title: "External outreach stays under your control",
                description: `${contact.person.name} has not agreed to refer you. Review or edit this draft; approving here only records your review and does not send a LinkedIn message.`,
                text: contact.link.messageDraft,
                approveLabel: "Approve draft for manual use"
              } : null;
              return {
                title: `${contact.person.name} · ${suggested}`,
                summary: contact.link.rationale,
                facts: [`${contact.person.role} · ${contact.person.company}`, `${contact.person.networkState} · ${contact.person.relationshipState}`, `Last interaction: ${contact.person.latestInteractionDays === null ? "not recorded" : `${contact.person.latestInteractionDays} days ago`}`, `Relationship readiness: ${contact.link.relationshipReadiness} · role relevance: ${contact.link.referralRelevance}`, action === "DIRECT_REFERRAL_ASK" ? "A referral is possible to ask about; willingness is unknown." : `Suggested action: ${suggested}`],
                confidence: `${contact.link.relationshipReadiness} readiness · guidance, not certainty`,
                checked: `1 job · ${(state.jobPersonLinks || []).filter(link => link.jobId === job.id).length} job-specific contact record${(state.jobPersonLinks || []).filter(link => link.jobId === job.id).length === 1 ? "" : "s"}`,
                freshness: `Interaction summary is ${contact.person.latestInteractionDays === null ? "not available" : `${contact.person.latestInteractionDays} days old in the synthetic sample`}`,
                assumptions: ["Recorded relationship context is incomplete", "Referral willingness is unknown"],
                sources: ["Synthetic People records", "Job-person relevance links", "Interaction summaries"],
                approval,
                action: { label: "Open this role and contact", run: () => focusJobFromCommand(job.id) }
              };
            },
            onApproval: (actionName, editedText) => {
              if (actionName === "edit") return "Draft edit is saved in this run only. Review it before any external use.";
              addActivity("approval", actionName === "approve" ? `Draft reviewed · ${contact?.person?.name || "contact"}` : `Draft rejected · ${contact?.person?.name || "contact"}`, `${job?.roleTitle || "Opportunity"} · ${actionName === "approve" ? "ready for manual use; no message sent" : "no outreach sent"}${editedText ? " · edited draft" : ""}`);
              return actionName === "approve" ? "Approved for manual use · no LinkedIn message was sent." : "Rejected · no LinkedIn message was sent.";
            }
          };
        }

        if (/\b(resume|tailor|tailoring|prepare.*application|application.*prepare)\b/.test(normalized)) {
          return {
            objective: `Prepare a grounded resume strategy for ${job?.company || "the selected role"}`,
            steps: [
              { agent: "Resume Agent", task: "Select the closest synthetic resume variant using the role family and saved search profile." },
              { agent: "Opportunity Analyst", task: "Identify evidence to foreground and claims that still need verification." },
              { agent: "Application Agent", task: "Update the local next step without submitting an application." }
            ],
            run: () => {
              if (job) {
                const resume = resumeById(job.resumeId);
                job.stage = "Preparing";
                job.nextAction = { label: "Review tailored evidence, then submit yourself", dueDate: dateFromOffset(1), dueInDays: 1, owner: "You", type: "resume" };
                addActivity("plan", `Resume strategy prepared · ${job.company}`, `${resume.name} · local tailoring checklist only; no application submitted`);
                selectedJobId = job.id;
                setView("inbox");
                return { title: resume.name, summary: resume.summary, facts: [...resume.tailoring, `Next action: ${job.nextAction.label}`, "Every example and claim still needs your verification."], confidence: "Medium · based on synthetic job scope", checked: `1 role · ${state.resumes.length} resume variants`, freshness: "Synthetic resume library", assumptions: ["The selected variant is a starting point", "No resume document was edited or submitted"], sources: ["Resume variants", "Role-family match", "Opportunity next action"], action: { label: "Review the resume panel", run: () => focusJobFromCommand(job.id, "resume") } };
              }
              return { title: "Select a role first", summary: "Open an opportunity so the resume strategy can be matched to a specific job.", confidence: "Not assessed", checked: "No role selected", freshness: "Local sample", action: { label: "Open the priority inbox", run: () => setView("inbox") } };
            }
          };
        }

        if (/\b(drop|remove|discard|not worth|deprioriti[sz]e|close anything)\b/.test(normalized)) {
          const lower = sortedJobs(activeJobs()).filter(item => priorityScore(item) < 72);
          return {
            objective: "Find opportunities that may not justify more time",
            steps: [
              { agent: "Opportunity Analyst", task: "Compare active roles against the saved fit, career-value, and timing weights." },
              { agent: "Application Agent", task: "Identify roles below the current review threshold without changing their stage." }
            ],
            run: () => ({ title: `${lower.length} role${lower.length === 1 ? "" : "s"} below the current triage threshold`, summary: "These opportunities are candidates for your review. No roles were closed, deleted, or moved automatically.", facts: lower.slice(0, 4).map(item => `${item.company} · ${item.roleTitle} · ${priorityScore(item)}/100`), confidence: "High for the saved score · threshold is user-editable", checked: `${activeJobs().length} active roles`, freshness: "Current browser-local state", assumptions: ["A lower score is not proof a role is unsuitable", "You make the decision to close or continue"], exception: "No destructive action was taken. Review any role before changing its application stage.", sources: ["Opportunity records", "Search-profile weights"], action: { label: "Review lower-priority opportunities", run: () => setView("opportunities") } })
          };
        }

        if (/\b(interview|tomorrow)\b/.test(normalized)) {
          const interview = activeJobs().filter(item => item.stage === "Interview").sort((a, b) => priorityScore(b) - priorityScore(a))[0];
          return {
            objective: "Prepare for a recorded upcoming interview",
            steps: [
              { agent: "Application Agent", task: "Check application stages and dated next actions for an interview." },
              { agent: "Opportunity Analyst", task: "Gather the role's fit evidence and open questions for review." }
            ],
            run: () => interview ? { title: `${interview.company} · ${interview.roleTitle}`, summary: "Interview preparation checklist ready from the role record.", facts: [...interview.strengths, ...interview.gaps.map(gap => `Verify · ${gap}`)], confidence: "Medium · synthetic role evidence", checked: "1 interview-stage opportunity", freshness: "Browser-local application record", sources: ["Application stage", "Role fit notes"], action: { label: "Open the interview role", run: () => focusJobFromCommand(interview.id) } } : { title: "No interview is recorded for tomorrow", summary: "No active opportunity in this demo is in the Interview stage. Nothing was changed.", confidence: "High for the local application stages", checked: `${state.jobs.length} application records`, freshness: "Browser-local sample", exception: "The demo cannot inspect your real calendar or employer messages.", sources: ["Application stages", "Local next actions"] }
          };
        }
        return null;
      },
      onApproval() { return "Human decision recorded in this browser only. Nothing was sent to a contact or employer." }
    });
  }

  function bindEvents() {
    $$(".nav-item").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
    $$(".queue-tab").forEach(button => button.addEventListener("click", () => setFilter(button.dataset.filter)));
    $("#global-search").addEventListener("input", event => { query = event.target.value.trim(); renderQueue(); });
    $("#stage-filter").addEventListener("change", renderQueue);
    document.addEventListener("click", async event => {
      const target = event.target.closest("[data-open-add], [data-open-preferences], [data-close-dialog], [data-select-job], [data-person-open], [data-action], [data-copy-draft], [data-menu-toggle]");
      if (!target) return;
      if (target.matches("[data-open-add]")) { $("#add-dialog").showModal(); return; }
      if (target.matches("[data-open-preferences]")) { openPreferences(); return; }
      if (target.matches("[data-close-dialog]")) { target.closest("dialog")?.close(); return; }
      if (target.matches("[data-select-job]")) { selectedJobId = target.dataset.selectJob; selectedPersonId = null; renderQueue(); return; }
      if (target.matches("[data-person-open]")) {
        selectedJobId = target.dataset.jobId;
        setView("inbox");
        selectedPersonId = target.dataset.personOpen;
        setFilter("all");
        return;
      }
      if (target.matches("[data-copy-draft]")) { await copyDraft(target.dataset.copyDraft, target.dataset.jobId); return; }
      if (target.matches("[data-menu-toggle]")) {
        const job = jobById(selectedJobId);
        if (job) addNote(job);
        return;
      }
      if (target.matches("[data-action]")) {
        const job = jobById(target.dataset.jobId || selectedJobId);
        if (!job) return;
        const action = target.dataset.action;
        if (action === "snooze") snooze(job);
        else if (action === "complete-next") completeNext(job, target.dataset.kind);
        else if (action === "log-contact") logContact(target.dataset.personId, target.dataset.jobId);
        else if (action === "add-note") addNote(job);
        else if (action === "set-next") {
          job.nextAction = { label: "Review the opportunity and choose a next step", dueDate: dateFromOffset(1), dueInDays: 1, owner: "You", type: "research" };
          addActivity("action", `Next action set · ${job.company}`, job.nextAction.label);
          render();
          showToast("Next action added");
        }
      }
    });
    document.addEventListener("change", event => {
      const field = event.target.dataset.field;
      if (!field) return;
      const job = jobById(event.target.dataset.jobId || selectedJobId);
      if (field === "stage" && job) { saveStage(job, event.target.value); return; }
      if (field === "resume-id" && job) {
        job.resumeId = event.target.value;
        job.lastTouchedAt = isoDay(new Date());
        job.resumeReason = `You selected ${resumeById(job.resumeId).name}. Review the role-specific tailoring points before using it.`;
        addActivity("resume", `Resume strategy changed · ${job.company}`, `${resumeById(job.resumeId).name} · ${job.roleTitle}`);
        render();
        showToast("Resume strategy updated");
      } else if (field === "contact-action") {
        state.actionOverrides = state.actionOverrides || {};
        const relationship = (state.jobPersonLinks || []).find(link => link.id === event.target.dataset.relationshipId);
        const person = relationship ? personById(relationship.personId) : null;
        if (relationship) state.actionOverrides[relationship.id] = event.target.value;
        if (person && relationship) addActivity("override", `Relationship action changed · ${person.name}`, `${jobById(relationship.jobId)?.company || "Opportunity"} · ${ACTION_LABELS[event.target.value]} · human override`);
        render();
        showToast("Relationship recommendation overridden");
      } else if (field === "priority-override" && job) {
        job.priorityOverride = event.target.value;
        addActivity("override", `Priority changed · ${job.company}`, event.target.value === "top" ? "Pinned near the top by the user" : event.target.value === "lower" ? "Moved lower by the user" : "Returned to suggested ranking");
        render();
        showToast(event.target.value ? "Your priority override is saved" : "Suggested ranking restored");
      } else if (field === "career-override" && job) {
        job.careerValueOverride = event.target.value ? Number(event.target.value) : null;
        addActivity("override", `Career-value assessment changed · ${job.company}`, event.target.value ? `User rating ${event.target.value}/100` : "Returned to role-scope estimate");
        render();
        showToast("Career-value view updated. The queue was recalculated.");
      }
    });
    $("#add-form").addEventListener("submit", event => { event.preventDefault(); addNewOpportunity(event.currentTarget); });
    $("#preferences-form").addEventListener("submit", event => { event.preventDefault(); savePreferences(event.currentTarget); });
    $("#submit-dialog").addEventListener("close", () => { pendingSubmitJobId = null; });
    $("#submit-form").addEventListener("submit", event => {
      event.preventDefault();
      const job = jobById(pendingSubmitJobId);
      pendingSubmitJobId = null;
      $("#submit-dialog").close();
      if (job) saveStage(job, "Applied");
    });
    $("#confirm-form").addEventListener("submit", event => {
      event.preventDefault();
      localStorage.removeItem(STORAGE_KEY);
      state = buildInitialState(seedData);
      selectedJobId = null;
      selectedPersonId = null;
      query = "";
      $("#global-search").value = "";
      $("#stage-filter").value = "all";
      $("#confirm-dialog").close();
      persist();
      setView("inbox");
      setFilter("active");
      showToast("Sample workspace restored");
    });
    $("#reset-demo").addEventListener("click", () => $("#confirm-dialog").showModal());
    $("#global-search").addEventListener("keydown", event => { if (event.key === "Escape") { event.currentTarget.value = ""; query = ""; renderQueue(); } });
    document.addEventListener("keydown", event => {
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && !event.metaKey && !event.ctrlKey) {
        event.preventDefault(); $("#global-search").focus();
      }
      if (event.key === "Escape") $$("dialog[open]").forEach(dialog => dialog.close());
    });
  }

  async function start() {
    try {
      const response = await fetch("data/demo-data.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load sample data (${response.status})`);
      seedData = await response.json();
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        state = saved ? JSON.parse(saved) : buildInitialState(seedData);
        if (state.schemaVersion !== seedData.schemaVersion) {
          state = buildInitialState(seedData);
        } else {
          state.jobs.forEach(restoreApplication);
          state.jobPersonLinks = state.jobPersonLinks || clone(seedData.jobPersonLinks || []);
          state.actionOverrides = state.actionOverrides || {};
        }
      } catch (error) {
        state = buildInitialState(seedData);
        storageAvailable = false;
        $("#storage-notice").hidden = false;
        $("#storage-notice").textContent = "Saved data could not be read. A clean sample is open in memory; changes may not persist.";
      }
      populateStageFilter();
      bindEvents();
      mountFocuslineCommand();
      if (!storageAvailable) $("#storage-notice").hidden = false;
      setView("inbox");
      if (!localStorage.getItem(STORAGE_KEY)) persist();
    } catch (error) {
      $("#queue-content").innerHTML = `<div class="error-state"><strong>Could not load the sample workspace.</strong><p>${esc(error.message)}</p><button class="button" type="button" onclick="location.reload()">Try again</button></div>`;
      $("#detail-panel").innerHTML = `<div class="detail-empty"><span class="detail-empty-mark">!</span><h2>Workspace unavailable</h2><p>Refresh the page to try again.</p></div>`;
    }
  }

  start();
})();
