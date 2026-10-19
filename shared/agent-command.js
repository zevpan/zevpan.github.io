/* Shared, provider-neutral command surface for the portfolio's local demos.
   It coordinates authored demo routes; it does not call a model or external tool. */
(function () {
  "use strict";

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  const icons = {
    plus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>',
    mic: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="2.5" width="6" height="10" rx="3"/><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v3M7 18h6"/></svg>',
    arrow: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15V4M5.5 8.5 10 4l4.5 4.5"/></svg>'
  };

  function readPreference(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  }

  function savePreference(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* Preference is optional. */ }
  }

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
          <div class="agent-composer" data-agent-composer>
            <div class="agent-drop-overlay" data-agent-drop-overlay aria-hidden="true"><span>Drop files to add context</span></div>
            <div class="agent-attachment-list" data-agent-attachments role="status" aria-live="polite" hidden></div>
            <label class="sr-only" for="agent-command-input">Natural-language instruction</label>
            <textarea class="agent-command-input" id="agent-command-input" data-agent-input rows="2" maxlength="1000" autocomplete="off" placeholder="${escapeHTML(config.placeholder || "What should I focus on today?")}"></textarea>
            <div class="agent-composer-toolbar">
              <div class="agent-composer-leading">
                <input class="sr-only" data-agent-file-input type="file" multiple accept=".csv,.json,.txt,.md,text/csv,application/json,text/plain,text/markdown" aria-label="Choose files to add as context">
                <button class="agent-icon-button" type="button" data-agent-attach aria-label="Add files" title="Add files">${icons.plus}</button>
                <span class="agent-file-hint">Add files or drop here</span>
              </div>
              <div class="agent-composer-trailing">
                <label class="agent-setting"><span>Model</span><select data-agent-model aria-label="Model"><option value="default">Default</option><option value="gpt-6-astra">GPT-6 Astra</option><option value="gpt-6-1-sol">GPT-6.1 Sol</option><option value="gpt-6-sol">GPT-6 Sol</option><option value="gpt-6-luna">GPT-6 Luna</option></select></label>
                <label class="agent-setting"><span>Effort</span><select data-agent-effort aria-label="Effort"><option value="default">Default</option><option value="instant">Instant</option><option value="high">High</option><option value="max">Max</option></select></label>
                <button class="agent-icon-button agent-dictate" type="button" data-agent-dictate aria-label="Start dictation" title="Dictate">${icons.mic}</button>
                <button class="agent-command-submit" type="submit" data-agent-submit><span data-agent-submit-label>Start</span><span class="agent-command-start-icon" data-agent-start-icon>${icons.arrow}</span></button>
              </div>
            </div>
          </div>
        </form>
        <div class="agent-command-suggestions" aria-label="Suggested commands"><span>Try a command</span>${suggestions.map((suggestion) => `<button class="agent-command-suggestion" type="button" data-agent-suggestion="${escapeHTML(suggestion)}">${escapeHTML(suggestion)}</button>`).join("")}</div>
        <div class="agent-command-foot">
          <div class="agent-command-flow" aria-label="Dream, plan, execute, review, iterate"><b>Dream</b><i>→</i><b>Plan</b><i>→</i><b>Execute</b><i>→</i><b>Review</b><i>→</i><b>Iterate</b></div>
          <span class="agent-command-local">Local demo actions · model choice is a preference only · no external action</span>
        </div>
        <section class="agent-run" data-agent-run aria-label="Command execution evidence" aria-live="polite" hidden></section>
      </section>`;

    const form = host.querySelector("[data-agent-form]");
    const input = host.querySelector("[data-agent-input]");
    const submit = host.querySelector("[data-agent-submit]");
    const submitLabel = host.querySelector("[data-agent-submit-label]");
    const startIcon = host.querySelector("[data-agent-start-icon]");
    const stateBadge = host.querySelector("[data-agent-state]");
    const runPanel = host.querySelector("[data-agent-run]");
    const composer = host.querySelector("[data-agent-composer]");
    const fileInput = host.querySelector("[data-agent-file-input]");
    const attachmentList = host.querySelector("[data-agent-attachments]");
    const dropOverlay = host.querySelector("[data-agent-drop-overlay]");
    const modelSelect = host.querySelector("[data-agent-model]");
    const effortSelect = host.querySelector("[data-agent-effort]");
    const dictateButton = host.querySelector("[data-agent-dictate]");
    let latest = null;
    let runSequence = 0;
    let running = false;
    let speechRecognition = null;
    let attachments = [];

    const modelPreference = readPreference("zev-demo-model", "default");
    const effortPreference = readPreference("zev-demo-effort", "default");
    if (Array.from(modelSelect.options).some((option) => option.value === modelPreference)) modelSelect.value = modelPreference;
    if (Array.from(effortSelect.options).some((option) => option.value === effortPreference)) effortSelect.value = effortPreference;

    function syncSubmitState() {
      submit.disabled = false;
      submitLabel.textContent = running ? "Stop" : "Start";
      submit.setAttribute("aria-label", running ? "Stop this demo run" : "Start this demo run");
      submit.classList.toggle("is-stop", running);
      startIcon.hidden = running;
    }

    function renderAttachments(message) {
      if (!attachments.length) {
        attachmentList.hidden = true;
        attachmentList.innerHTML = "";
        return;
      }
      attachmentList.hidden = false;
      attachmentList.innerHTML = attachments.map((file, index) => `<span class="agent-attachment-chip" title="${escapeHTML(file.name)}">${escapeHTML(file.name)}<button type="button" data-agent-remove-file="${index}" aria-label="Remove ${escapeHTML(file.name)}">×</button></span>`).join("");
      if (message) attachmentList.setAttribute("aria-label", message);
    }

    function addFiles(fileList) {
      const incoming = Array.from(fileList || []);
      if (!incoming.length) return;
      const eligible = incoming.filter((file) => /\.(csv|json|txt|md)$/i.test(file.name));
      const room = Math.max(0, 10 - attachments.length);
      const accepted = eligible.filter((file) => file.size <= 5 * 1024 * 1024).slice(0, room);
      attachments = attachments.concat(accepted);
      renderAttachments();
      if (incoming.length !== accepted.length) {
        const rejected = incoming.length - accepted.length;
        runPanel.hidden = false;
        runPanel.innerHTML = `<div class="agent-run-result" role="status"><h3>Some files were not added</h3><p>${rejected} file(s) were skipped. Add up to 10 CSV, JSON, TXT, or MD files, each up to 5 MB.</p></div>`;
      }
      if (accepted.length) input.focus();
    }

    async function getRunContext(commandText) {
      const files = await Promise.all(attachments.map(async (file) => {
        let text = "";
        try { text = await file.text(); } catch (_) { /* File metadata remains available. */ }
        return { name: file.name, type: file.type, size: file.size, text: text.slice(0, 60000) };
      }));
      return { commandText, model: modelSelect.value, effort: effortSelect.value, files };
    }

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
      if (running) {
        runSequence += 1;
        running = false;
        latest = null;
        setState("STOPPED");
        syncSubmitState();
        runPanel.hidden = false;
        runPanel.innerHTML = '<div class="agent-run-result"><h3>Run stopped</h3><p>The local action was cancelled before it completed. No external action was taken.</p></div>';
        return;
      }
      const commandText = String(text || input.value || "").trim();
      if (!commandText) { input.focus(); return; }
      input.value = commandText;
      runSequence += 1;
      const currentRun = runSequence;
      running = true;
      syncSubmitState();
      setState("UNDERSTANDING REQUEST");
      runPanel.hidden = false;
      runPanel.innerHTML = `<div class="agent-run-top"><strong>${escapeHTML(commandText)}</strong><span>UNDERSTANDING REQUEST</span></div><div class="agent-run-body"><div class="agent-run-result"><div class="agent-run-label">Request</div><h3>Scoping a bounded task</h3><p>Matching your instruction to supported demo actions. No work has changed yet.</p></div></div>`;

      let route;
      let context;
      try {
        context = await getRunContext(commandText);
        route = config.resolve ? await config.resolve(commandText, context) : null;
      } catch (error) {
        route = null;
      }
      if (currentRun !== runSequence) return;
      if (!route) {
        latest = null;
        running = false;
        setState("BLOCKED");
        runPanel.innerHTML = `<div class="agent-run-top"><strong>${escapeHTML(commandText)}</strong><span>BLOCKED · NO ACTION TAKEN</span></div><div class="agent-run-body"><div class="agent-run-result"><div class="agent-run-label">Command not mapped</div><h3>This demo does not support that instruction yet.</h3><p>Try one of the suggested commands. The simulation has not changed any records.</p>${(config.fallback || []).length ? `<div class="agent-run-sources">${config.fallback.slice(0, 3).map((item) => `<span class="agent-run-source">${escapeHTML(item)}</span>`).join("")}</div>` : ""}</div></div>`;
        syncSubmitState();
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
        const outcome = typeof route.run === "function" ? await route.run(context) : route.outcome || {};
        if (currentRun !== runSequence) return;
        if (context.files.length) {
          outcome.sources = [...(outcome.sources || []), ...context.files.map((file) => `Local attachment · ${file.name}`)];
          outcome.facts = [...(outcome.facts || []), `${context.files.length} file(s) stayed in this browser. This demo action uses authored rules and does not interpret file contents.`];
        }
        latest = { route: plannedRoute, outcome, commandText };
        running = false;
        paint(plannedRoute, outcome.status || (outcome.approval ? "WAITING FOR APPROVAL" : "COMPLETED"), outcome);
        setState(outcome.status || (outcome.approval ? "WAITING FOR APPROVAL" : "COMPLETED"));
      } catch (error) {
        latest = null;
        running = false;
        setState("BLOCKED");
        paint(plannedRoute, "BLOCKED", { title: "Execution paused", summary: "The simulated workflow could not complete this step.", checked: "No external records changed", freshness: "Local sample", exception: "No action was taken. Retry the command or use the structured controls.", confidence: "Not assessed" });
      } finally {
        if (currentRun === runSequence) syncSubmitState();
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
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); run(); }
    });
    host.addEventListener("click", (event) => {
      if (event.target.closest("[data-agent-attach]")) fileInput.click();
      if (event.target.closest("[data-agent-remove-file]")) {
        attachments.splice(Number(event.target.closest("[data-agent-remove-file]").dataset.agentRemoveFile), 1);
        renderAttachments();
      }
      if (event.target.closest("[data-agent-dictate]")) toggleDictation();
    });
    fileInput.addEventListener("change", (event) => { addFiles(event.target.files); event.target.value = ""; });
    ["dragenter", "dragover"].forEach((type) => composer.addEventListener(type, (event) => {
      if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
      event.preventDefault();
      composer.classList.add("is-dragging");
      dropOverlay.setAttribute("aria-hidden", "false");
    }));
    composer.addEventListener("dragleave", (event) => {
      if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
      event.preventDefault();
      if (composer.contains(event.relatedTarget)) return;
      composer.classList.remove("is-dragging");
      dropOverlay.setAttribute("aria-hidden", "true");
    });
    composer.addEventListener("drop", (event) => {
      if (!event.dataTransfer?.files?.length) return;
      event.preventDefault();
      composer.classList.remove("is-dragging");
      dropOverlay.setAttribute("aria-hidden", "true");
      addFiles(event.dataTransfer.files);
    });
    modelSelect.addEventListener("change", () => savePreference("zev-demo-model", modelSelect.value));
    effortSelect.addEventListener("change", () => savePreference("zev-demo-effort", effortSelect.value));

    function toggleDictation() {
      if (speechRecognition) { speechRecognition.stop(); return; }
      const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Speech) {
        runPanel.hidden = false;
        runPanel.innerHTML = '<div class="agent-run-result" role="status"><h3>Dictation is unavailable</h3><p>This browser does not expose speech recognition. Type your instruction instead.</p></div>';
        return;
      }
      const recognition = new Speech();
      speechRecognition = recognition;
      recognition.lang = navigator.language || "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      dictateButton.classList.add("is-recording");
      dictateButton.setAttribute("aria-label", "Stop dictation");
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) input.value = `${input.value.trim()}${input.value.trim() ? " " : ""}${transcript}`;
        input.focus();
      };
      recognition.onerror = () => {
        runPanel.hidden = false;
        runPanel.innerHTML = '<div class="agent-run-result" role="status"><h3>Dictation could not start</h3><p>Check microphone permission or type your instruction.</p></div>';
      };
      recognition.onend = () => {
        if (speechRecognition !== recognition) return;
        speechRecognition = null;
        dictateButton.classList.remove("is-recording");
        dictateButton.setAttribute("aria-label", "Start dictation");
      };
      try { recognition.start(); } catch (_) {
        speechRecognition = null;
        dictateButton.classList.remove("is-recording");
        dictateButton.setAttribute("aria-label", "Start dictation");
      }
    }
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

    return { run, getLatest: () => latest, getPreferences: () => ({ model: modelSelect.value, effort: effortSelect.value }) };
  }

  window.AgentCommandSurface = { mount };
})();
