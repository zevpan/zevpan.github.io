export const ROUTES = Object.freeze([
  "HOTEL_TO_AIRPORT",
  "AIRPORT_TO_HOTEL",
  "HOTEL_TO_HOTEL"
]);

export const STATUSES = Object.freeze([
  "SCHEDULED",
  "AWAITING_CUSTOMER_DROP",
  "CUSTOMER_DROPPED",
  "DRIVER_COLLECTED",
  "ARRIVED_AT_AIRPORT",
  "ARRIVED_AT_DESTINATION",
  "LUGGAGE_COLLECTED",
  "LUGGAGE_DELIVERED",
  "COMPLETED"
]);

export const ROLES = Object.freeze([
  "admin",
  "dispatcher",
  "operator",
  "driver",
  "supplier",
  "integration",
  "scheduler"
]);

const ROUTE_STEPS = Object.freeze({
  HOTEL_TO_AIRPORT: ["AWAITING_CUSTOMER_DROP", "CUSTOMER_DROPPED", "DRIVER_COLLECTED", "ARRIVED_AT_AIRPORT", "COMPLETED"],
  HOTEL_TO_HOTEL: ["AWAITING_CUSTOMER_DROP", "CUSTOMER_DROPPED", "DRIVER_COLLECTED", "ARRIVED_AT_DESTINATION", "COMPLETED"],
  AIRPORT_TO_HOTEL: ["SCHEDULED", "ARRIVED_AT_AIRPORT", "LUGGAGE_COLLECTED", "LUGGAGE_DELIVERED", "COMPLETED"]
});

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function requireRole(principal, allowed) {
  if (!principal.roles.some(role => allowed.includes(role))) {
    throw new HttpError(403, "forbidden", "This action is not available for your role.");
  }
}

export function validateRoute(route) {
  if (!ROUTES.includes(route)) throw new HttpError(400, "invalid_route", "Route is not supported.");
  return route;
}

export function validateInitialStatus(route, status) {
  validateRoute(route);
  const first = ROUTE_STEPS[route][0];
  if (status !== first && !(route === "AIRPORT_TO_HOTEL" && status === "SCHEDULED")) {
    throw new HttpError(400, "invalid_initial_status", "The initial milestone does not match this route.");
  }
}

export function validateTransition(order, nextStatus, payload = {}) {
  if (!STATUSES.includes(nextStatus)) throw new HttpError(400, "invalid_status", "Status is not supported.");
  const steps = ROUTE_STEPS[order.route];
  const currentIndex = steps.indexOf(order.status);
  if (currentIndex < 0 || steps[currentIndex + 1] !== nextStatus) {
    throw new HttpError(409, "invalid_transition", "The requested milestone is not the next step for this route.");
  }
  if (nextStatus === "CUSTOMER_DROPPED" && !isUuid(payload.tagEvidenceId)) {
    throw new HttpError(422, "tag_evidence_required", "A verified luggage-tag evidence record is required before confirming the customer drop.");
  }
  if (nextStatus === "LUGGAGE_DELIVERED" && !isUuid(payload.deliveryEvidenceId)) {
    throw new HttpError(422, "delivery_evidence_required", "A delivery evidence record is required before confirming delivery.");
  }
}

export function validateMessage(body) {
  if (typeof body !== "string" || body.trim().length === 0) {
    throw new HttpError(400, "invalid_message", "Message text is required.");
  }
  if (body.length > 4000) throw new HttpError(413, "message_too_large", "Message text must be 4,000 characters or fewer.");
  return body.trim();
}

export function parseDateRange(from, to, maxDays = 31) {
  if (!isDate(from) || !isDate(to)) throw new HttpError(400, "invalid_date_range", "Provide from and to as YYYY-MM-DD dates.");
  const fromMs = Date.parse(`${from}T00:00:00.000Z`);
  const toMs = Date.parse(`${to}T00:00:00.000Z`);
  const days = Math.floor((toMs - fromMs) / 86400000) + 1;
  if (days < 1 || days > maxDays) throw new HttpError(400, "invalid_date_range", `Date range must include between 1 and ${maxDays} days.`);
  return { from, to, days };
}

export function parsePagination(searchParams) {
  const limitRaw = Number(searchParams.get("limit") || 100);
  const offsetRaw = Number(searchParams.get("offset") || 0);
  if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 250 || !Number.isInteger(offsetRaw) || offsetRaw < 0 || offsetRaw > 100000) {
    throw new HttpError(400, "invalid_pagination", "Limit must be 1 to 250 and offset must be 0 to 100,000.");
  }
  return { limit: limitRaw, offset: offsetRaw };
}

export function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}
