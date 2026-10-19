import { reconcileBatch } from "./engine.js";

self.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "reconcile") return;
  try {
    const result = reconcileBatch(event.data.source);
    self.postMessage({ type: "complete", result: result });
  } catch (error) {
    self.postMessage({ type: "error", message: error && error.message || "Reconciliation failed." });
  }
});
