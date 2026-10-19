/* Shared, provider-neutral command surface for the portfolio's local demos.
   It coordinates authored demo routes; it does not call a model or external tool. */
(function () {
  "use strict";

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function mount(config) {
    const host = document.querySelector(config.target || "#agent-command-host");
    if (!host) return null;

    const suggestions = (config.suggestions || []).slice(0, 4);
    const name = escapeHTML(config.product || "Workspace");
    host.innerHTML = `
      <section class="agent-command-surface" aria-labelledby="agent-command-title">
        <div class="agent-command-head">
          <div>
            <div class="agent-command-eyebrow">Intent layer · ${name}</div>
            <h2 id="agent-command-title">Describe the outcome you need.</h2>
            <p>Use language to set direction. Review the work and make decisions in the workspace below.</p>
          </div>
          <span class="agent-command-state" data-agent-state data-state="READY" aria-live="polite">READY</span>
        </div>
        <form class="agent-command-form" data-agent-form>
          <label class="sr-only" for="agent-command-input">Natural-language command</label>
          <input class="agent-command-input" id="agent-command-input" data-agent-input type="text" maxlength="240" autocomplete="off" placeholder="${escapeHTML(config.placeholder || "What should I focus on today?")}">
          <button class="agent-command-submit" type="submit" data-agent-submit>Run command</button>
        </form>
        <div class="agent-command-suggestions" aria-label="Suggested commands"><span>Try a command</span>${suggestions.map((suggestion) => `<button class="agent-command-suggestion" type="button" data-agent-suggestion="${escapeHTML(suggestion)}">${escapeHTML(suggestion)}</button>`).join("")}</div>
        <div class="agent-command-foot">
          <div class="agent-command-flow" aria-label="Dream, plan, execute, review, iterate"><b>Dream</b><i>→</i><b>Plan</b><i>→</i><b>Execute</b><i>→</i><b>Review</b><i>→</i><b>Iterate</b></div>
          <span class="agent-command-local">Simulated run · no live model or external action</span>
        </div>
        <section class="agent-run" data-agent-run aria-label="Command execution evidence" aria-live="polite" hidden></section>
      </section>`;

    const form = host.querySelector("[data-agent-form]");
    const input = host.querySelector("[data-agent-input]");
    const submit = host.querySelector("[data-agent-submit]");
    const stateBadge = host.querySelector("[data-agent-state]");
    const runPanel = host.querySelector("[data-agent-run]");
    let latest = null;
    let runSequence = 0;

    function setState(label) {
      stateBadge.dataset.state = label;
      stateBadge.textContent = label;
    }

    function stepMarkup(step, index) {
      const status = step.status || "pending";
      const mark = status === "done" ? "✓" : status === "active" ? "·" : String(index + 1).padStart(2, "0");
      return `<li class="agent-run-step ${status === "done" ? "is-done" : status === "active" ? "is-active" : ""}" data-agent-step="${index}">
        <span class="agent-run-check" aria-hidden="true">${mark}</span>
        <span><strong>${escapeHTML(step.agent || "Agent")}</strong><small>${escapeHTML(step.task || step.evidence || "Bounded task")}</small></span>
      </li>`;
    }

    function renderSteps(steps) {
      const list = runPanel.querySelector("[data-agent-steps]");
      if (list) list.innerHTML = steps.map(stepMarkup).join("");
    }

    function resultMarkup(outcome) {
      const facts = (outcome.facts || []).slice(0, 5);
      const sources = (outcome.sources || []).slice(0, 6);
      const assumptions = (outcome.assumptions || []).slice(0, 3);
      const nextAction = outcome.action && outcome.action.label
        ? `<div class="agent-run-actions"><button class="agent-command-action" type="button" data-agent-next>${escapeHTML(outcome.action.label)}</button></div>` : "";
      const exception = outcome.exception
        ? `<div class="agent-run-exception"><strong>Exception / limit</strong><br>${escapeHTML(outcome.exception)}</div>` : "";
      let approval = "";
      if (outcome.approval && !outcome.resolution) {
        approval = `<div class="agent-run-approval" data-agent-approval>
          <strong>Human approval required · ${escapeHTML(outcome.approval.title || "Review before external action")}</strong>
          <span>${escapeHTML(outcome.approval.description || "This demo will prepare work for review and will not send or submit it.")}</span>
          ${outcome.approval.text ? `<textarea class="agent-run-draft" data-agent-draft aria-label="Edit proposed action" hidden>${escapeHTML(outcome.approval.text)}</textarea>` : ""}
          <div class="agent-run-actions">
            ${outcome.approval.text ? '<button class="agent-command-action secondary" type="button" data-agent-edit>Edit proposal</button>' : ""}
            ${outcome.approval.text ? '<button class="agent-command-action secondary" type="button" data-agent-save-edit hidden>Save edit</button>' : ""}
            <button class="agent-command-action" type="button" data-agent-approve>${escapeHTML(outcome.approval.approveLabel || "Approve draft")}</button>
            <button class="agent-command-action danger" type="button" data-agent-reject>Reject</button>
          </div>
        </div>`;
      }
      return `<div class="agent-run-result" data-agent-result>
        <div class="agent-run-label">Result · ${escapeHTML(outcome.confidence || "Confidence not rated")}</div>
        <h3>${escapeHTML(outcome.title || "Work completed")}</h3>
        <p>${escapeHTML(outcome.summary || "The requested work has been prepared for review.")}</p>
        ${facts.length ? `<div class="agent-run-label">Evidence returned</div><ul class="agent-run-list">${facts.map((fact) => `<li>${escapeHTML(fact)}</li>`).join("")}</ul>` : ""}
        <div class="agent-run-meta">
          <div><strong>Records checked</strong><span>${escapeHTML(outcome.checked || "Synthetic demo records")}</span></div>
          <div><strong>Source freshness</strong><span>${escapeHTML(outcome.freshness || "Local sample · updated for this scenario")}</span></div>
        </div>
        ${sources.length ? `<div class="agent-run-sources" aria-label="Tools and data used">${sources.map((source) => `<span class="agent-run-source">${escapeHTML(source)}</span>`).join("")}</div>` : ""}
        ${assumptions.length ? `<div class="agent-run-meta"><div><strong>Assumptions</strong><span>${escapeHTML(assumptions.join(" · "))}</span></div><div><strong>Decision boundary</strong><span>Recommendation is evidence-led guidance, not certainty.</span></div></div>` : ""}
        ${exception}${approval}${outcome.resolution ? `<span class="agent-run-resolution" role="status">${escapeHTML(outcome.resolution)}</span>` : ""}
        ${nextAction}
      </div>`;
    }

    function paint(route, stateLabel, outcome) {
      const objective = route.objective || route.label || "Complete the requested work";
      const steps = route.steps || [];
      const count = steps.filter((step) => step.status === "done").length;
      const stateText = stateLabel === "EXECUTING" ? `STEP ${Math.min(count + 1, steps.length)} OF ${steps.length}` : stateLabel;
      runPanel.hidden = false;
      runPanel.innerHTML = `<div class="agent-run-top"><strong>${escapeHTML(objective)}</strong><span data-agent-run-status>${escapeHTML(stateText)}</span></div>
        <div class="agent-run-body"><div><div class="agent-run-label">Work performed</div><ol class="agent-run-steps" data-agent-steps>${steps.map(stepMarkup).join("")}</ol></div>${outcome ? resultMarkup(outcome) : '<div class="agent-run-result"><div class="agent-run-label">Execution</div><h3>Preparing the result…</h3><p>Specialist tasks are running against the demo’s local records.</p></div>'}</div>`;
    }

    async function run(text) {
      const commandText = String(text || input.value || "").trim();
      if (!commandText || submit.disabled) return;
      input.value = commandText;
      runSequence += 1;
      const currentRun = runSequence;
      submit.disabled = true;
      setState("UNDERSTANDING REQUEST");
      runPanel.hidden = false;
      runPanel.innerHTML = `<div class="agent-run-top"><strong>${escapeHTML(commandText)}</strong><span>UNDERSTANDING REQUEST</span></div><div class="agent-run-body"><div class="agent-run-result"><div class="agent-run-label">Request</div><h3>Scoping a bounded task</h3><p>Matching your instruction to supported demo actions. No work has changed yet.</p></div></div>`;

      let route;
      try {
        route = config.resolve ? await config.resolve(commandText) : null;
      } catch (error) {
        route = null;
      }
      if (currentRun !== runSequence) return;
      if (!route) {
        latest = null;
        setState("BLOCKED");
        runPanel.innerHTML = `<div class="agent-run-top"><strong>${escapeHTML(commandText)}</strong><span>BLOCKED · NO ACTION TAKEN</span></div><div class="agent-run-body"><div class="agent-run-result"><div class="agent-run-label">Command not mapped</div><h3>This demo does not support that instruction yet.</h3><p>Try one of the suggested commands. The simulation has not changed any records.</p>${(config.fallback || []).length ? `<div class="agent-run-sources">${config.fallback.slice(0, 3).map((item) => `<span class="agent-run-source">${escapeHTML(item)}</span>`).join("")}</div>` : ""}</div></div>`;
        submit.disabled = false;
        return;
      }

      const steps = [{ agent: "Orchestrator", task: "Set scope, break the request into bounded tasks, and preserve the existing system of record.", status: "pending" }, ...(route.steps || []).map((step) => ({ ...step, status: "pending" }))];
      const plannedRoute = { ...route, objective: route.objective || commandText, steps };
      paint(plannedRoute, "PLANNING", null);
      setState("PLANNING");
      await wait(130);
      setState("EXECUTING");
      for (let index = 0; index < steps.length; index += 1) {
        if (currentRun !== runSequence) return;
        steps[index].status = "active";
        paint(plannedRoute, "EXECUTING", null);
        await wait(125);
        steps[index].status = "done";
        paint(plannedRoute, "EXECUTING", null);
      }

      try {
        const outcome = typeof route.run === "function" ? await route.run() : route.outcome || {};
        if (currentRun !== runSequence) return;
        latest = { route: plannedRoute, outcome, commandText };
        paint(plannedRoute, outcome.status || (outcome.approval ? "WAITING FOR APPROVAL" : "COMPLETED"), outcome);
        setState(outcome.status || (outcome.approval ? "WAITING FOR APPROVAL" : "COMPLETED"));
      } catch (error) {
        latest = null;
        setState("BLOCKED");
        paint(plannedRoute, "BLOCKED", { title: "Execution paused", summary: "The simulated workflow could not complete this step.", checked: "No external records changed", freshness: "Local sample", exception: "No action was taken. Retry the command or use the structured controls.", confidence: "Not assessed" });
      } finally {
        if (currentRun === runSequence) submit.disabled = false;
      }
    }

    async function handleReviewAction() {
      if (!latest?.outcome?.action?.run) return;
      await latest.outcome.action.run();
      if (latest) {
        latest.outcome.action = null;
        paint(latest.route, latest.outcome.status || (latest.outcome.approval ? "WAITING FOR APPROVAL" : "COMPLETED"), latest.outcome);
      }
    }

    async function handleApproval(action) {
      if (!latest) return;
      const textarea = runPanel.querySelector("[data-agent-draft]");
      const text = textarea ? textarea.value : "";
      if (action === "edit") {
        if (typeof latest.route.onApproval === "function") await latest.route.onApproval("edit", text, latest.outcome);
        latest.outcome.approval.text = text;
        latest.outcome.resolution = "Edited locally · review the updated proposal before approval.";
        paint(latest.route, "WAITING FOR APPROVAL", latest.outcome);
        const updatedArea = runPanel.querySelector("[data-agent-draft]");
        if (updatedArea) {
          updatedArea.hidden = false;
          updatedArea.focus();
          const saveEdit = runPanel.querySelector("[data-agent-save-edit]");
          if (saveEdit) saveEdit.hidden = false;
          const edit = runPanel.querySelector("[data-agent-edit]");
          if (edit) edit.hidden = true;
        }
        return;
      }
      let response = "";
      if (typeof latest.route.onApproval === "function") response = await latest.route.onApproval(action, text, latest.outcome);
      latest.outcome.approval = null;
      latest.outcome.resolution = typeof response === "string" && response ? response : action === "approve" ? "Approved in this local demo · no external action was sent." : "Rejected by the user · no external action was taken.";
      latest.outcome.status = "COMPLETED";
      setState("COMPLETED");
      paint(latest.route, "COMPLETED", latest.outcome);
    }

    form.addEventListener("submit", (event) => { event.preventDefault(); run(); });
    host.addEventListener("click", (event) => {
      const suggestion = event.target.closest("[data-agent-suggestion]");
      if (suggestion) { input.value = suggestion.dataset.agentSuggestion; run(input.value); return; }
      if (event.target.closest("[data-agent-next]")) { handleReviewAction(); return; }
      if (event.target.closest("[data-agent-edit]")) {
        const draft = runPanel.querySelector("[data-agent-draft]");
        const saveEdit = runPanel.querySelector("[data-agent-save-edit]");
        const edit = runPanel.querySelector("[data-agent-edit]");
        if (draft) { draft.hidden = false; draft.focus(); }
        if (saveEdit) saveEdit.hidden = false;
        if (edit) edit.hidden = true;
        return;
      }
      if (event.target.closest("[data-agent-save-edit]")) { handleApproval("edit"); return; }
      if (event.target.closest("[data-agent-approve]")) { handleApproval("approve"); return; }
      if (event.target.closest("[data-agent-reject]")) { handleApproval("reject"); }
    });

    return { run, getLatest: () => latest };
  }

  window.AgentCommandSurface = { mount };
})();
