import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createJwksVerifier } from "./auth.mjs";
import {
  HttpError,
  isUuid,
  parseDateRange,
  parsePagination,
  requireRole,
  validateInitialStatus,
  validateMessage,
  validateRoute,
  validateTransition
} from "./domain.mjs";

const BODY_LIMIT = 256 * 1024;
const ALLOWED_ROLES = {
  read: ["admin", "dispatcher", "operator", "driver", "supplier"],
  operationsRead: ["admin", "dispatcher", "operator"],
  milestone: ["admin", "dispatcher", "operator", "driver"],
  assign: ["admin", "dispatcher"],
  resolve: ["admin", "dispatcher", "operator"],
  internalMessage: ["admin", "dispatcher", "operator"],
  intake: ["admin", "integration"]
};

export function createOmsHandler({ pool, verifyAuthorization, allowedOrigins = [] }) {
  const originSet = new Set(allowedOrigins);
  return async function omsHandler(request, response) {
    const started = performance.now();
    const requestId = randomUUID();
    response.setHeader("X-Request-Id", requestId);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    const origin = request.headers.origin;
    if (origin && originSet.has(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }

    let statusCode = 500;
    try {
      if (request.method === "OPTIONS") {
        if (origin && !originSet.has(origin)) throw new HttpError(403, "origin_denied", "Request origin is not allowed.");
        statusCode = 204;
        response.writeHead(statusCode).end();
        return;
      }
      const url = new URL(request.url, "http://oms.local");
      if (request.method === "GET" && url.pathname === "/healthz") {
        await pool.query("SELECT 1");
        statusCode = 200;
        writeJson(response, statusCode, { status: "ok" });
        return;
      }
      if (origin && !originSet.has(origin)) throw new HttpError(403, "origin_denied", "Request origin is not allowed.");
      const principal = await verifyAuthorization(request.headers.authorization);

      const result = await withTenant(pool, principal.tenantId, async db => routeRequest({ request, url, db, principal }));
      statusCode = result.status || 200;
      writeJson(response, statusCode, result.body);
    } catch (error) {
      statusCode = error instanceof HttpError ? error.status : 500;
      const body = error instanceof HttpError
        ? { error: error.code, message: error.message, requestId }
        : { error: "internal_error", message: "The request could not be completed.", requestId };
      writeJson(response, statusCode, body);
      if (!(error instanceof HttpError)) process.stderr.write(JSON.stringify({ level: "error", requestId, name: error?.name || "Error", code: error?.code || "unknown" }) + "\n");
    } finally {
      process.stdout.write(JSON.stringify({ level: "info", requestId, method: request.method, path: safePath(request.url), status: statusCode, durationMs: Math.round(performance.now() - started) }) + "\n");
    }
  };
}

async function routeRequest({ request, url, db, principal }) {
  const { pathname } = url;

  if (request.method === "GET" && (pathname === "/v1/orders" || pathname === "/v1/dispatch")) {
    requireRole(principal, ALLOWED_ROLES.read);
    const isDispatch = pathname === "/v1/dispatch";
    const range = parseDateRange(url.searchParams.get("from"), url.searchParams.get("to"), isDispatch ? 2 : 31);
    const pagination = parsePagination(url.searchParams);
    const filters = orderFilters(url.searchParams);
    const values = [principal.tenantId, range.from, range.to];
    let predicate = "tenant_id = $1 AND service_date >= $2::date AND service_date <= $3::date";
    if (filters.status) { values.push(filters.status); predicate += ` AND status = $${values.length}`; }
    if (filters.route) { values.push(filters.route); predicate += ` AND route = $${values.length}`; }
    if (filters.dispatchStatus) { values.push(filters.dispatchStatus); predicate += ` AND dispatch_status = $${values.length}`; }
    const scope = recordScope(principal);
    if (scope.column) { values.push(scope.value); predicate += ` AND ${scope.column} = $${values.length}`; }
    const count = await db.query(`SELECT count(*)::int AS total FROM orders WHERE ${predicate}`, values);
    const rows = await db.query(
      `SELECT id, display_id AS "displayId", external_reference AS "externalReference", booking_source AS "bookingSource", booking_channel AS "bookingChannel", route, market, time_zone AS "timeZone", service_date AS "serviceDate", service_at AS "serviceAt", customer_display_name AS "customerName", customer_channel AS "customerChannel", pickup, delivery, status, dispatch_status AS "dispatchStatus", supplier_id AS "supplierId", driver_ref AS "driverRef", owner_sub AS "ownerSub", created_at AS "createdAt", updated_at AS "updatedAt" FROM orders WHERE ${predicate} ORDER BY service_date, service_at, id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pagination.limit, pagination.offset]
    );
    return { body: { items: rows.rows, total: count.rows[0].total, range, pagination } };
  }

  if (request.method === "GET" && pathname === "/v1/exceptions") {
    requireRole(principal, ALLOWED_ROLES.operationsRead);
    const pagination = parsePagination(url.searchParams);
    const exceptionStatus = url.searchParams.get("status") || "OPEN";
    if (!new Set(["OPEN", "RESOLVED"]).has(exceptionStatus)) throw new HttpError(400, "invalid_exception_status", "Exception status must be OPEN or RESOLVED.");
    const values = [principal.tenantId, exceptionStatus];
    let scopeSql = "";
    const scope = recordScope(principal);
    if (scope.column) { values.push(scope.value); scopeSql = ` AND o.${scope.column} = $${values.length}`; }
    const rows = await db.query(
      `SELECT e.id, e.order_id AS "orderId", o.display_id AS "displayId", e.exception_type AS type, e.priority, e.owner_sub AS "ownerSub", e.due_at AS "dueAt", e.status, e.created_at AS "createdAt" FROM exceptions e JOIN orders o ON o.tenant_id=e.tenant_id AND o.id=e.order_id WHERE e.tenant_id=$1 AND e.status=$2${scopeSql} ORDER BY CASE e.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, e.due_at NULLS LAST, e.created_at LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pagination.limit, pagination.offset]
    );
    return { body: { items: rows.rows, pagination } };
  }

  if (request.method === "POST" && pathname === "/v1/orders") {
    requireRole(principal, ALLOWED_ROLES.intake);
    idempotencyKey(request);
    const body = await readJson(request);
    const order = validateOrderInput(body);
    const id = randomUUID();
    const dayKey = order.serviceDate.replaceAll("-", "");
    const displayId = `OMS-${dayKey}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const firstStatus = order.route === "AIRPORT_TO_HOTEL" ? "SCHEDULED" : "AWAITING_CUSTOMER_DROP";
    validateInitialStatus(order.route, firstStatus);
    const inserted = await db.query(
      `INSERT INTO orders (id, tenant_id, display_id, external_reference, booking_source, booking_channel, route, market, time_zone, service_date, service_at, customer_display_name, customer_channel, pickup, delivery, status, driver_ref) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (tenant_id, booking_source, external_reference) DO NOTHING RETURNING id, display_id AS "displayId", status, service_date AS "serviceDate", service_at AS "serviceAt"`,
      [id, principal.tenantId, displayId, order.externalReference, order.bookingSource, order.bookingChannel, order.route, order.market, order.timeZone, order.serviceDate, order.serviceAt, order.customerName, order.customerChannel, order.pickup, order.delivery, firstStatus, order.driverRef]
    );
    if (!inserted.rowCount) {
      const existing = await db.query(`SELECT id, display_id AS "displayId", status FROM orders WHERE tenant_id=$1 AND booking_source=$2 AND external_reference=$3`, [principal.tenantId, order.bookingSource, order.externalReference]);
      const original = await db.query(`SELECT request_hash AS "requestHash" FROM order_events WHERE tenant_id=$1 AND order_id=$2 AND event_type='ORDER_CREATED'`, [principal.tenantId, existing.rows[0].id]);
      if (original.rows[0]?.requestHash !== hashObject(order)) throw new HttpError(409, "booking_reference_conflict", "This booking reference already exists with different order details.");
      return { status: 200, body: { item: existing.rows[0], deduplicated: true } };
    }
    await appendEvent(db, principal, id, {
      eventType: "ORDER_CREATED",
      fromStatus: null,
      toStatus: firstStatus,
      payload: { bookingSource: order.bookingSource, externalReference: order.externalReference },
      idempotencyKey: `intake:${idempotencyKey(request)}`,
      requestHash: hashObject(order)
    });
    return { status: 201, body: { item: inserted.rows[0], deduplicated: false } };
  }

  const orderMatch = pathname.match(/^\/v1\/orders\/([0-9a-f-]+)(?:\/(events|messages|assign|supplier-response))?$/i);
  if (orderMatch) {
    const orderId = orderMatch[1];
    const action = orderMatch[2] || "detail";
    if (!isUuid(orderId)) throw new HttpError(400, "invalid_order_id", "Order id must be a UUID.");

    if (request.method === "GET" && action === "detail") {
      requireRole(principal, ALLOWED_ROLES.read);
      const order = await getOrder(db, principal.tenantId, orderId);
      assertOrderScope(order, principal);
      return { body: { item: order } };
    }
    if (request.method === "GET" && (action === "events" || action === "messages")) {
      requireRole(principal, ALLOWED_ROLES.read);
      const order = await getOrder(db, principal.tenantId, orderId);
      assertOrderScope(order, principal);
      const table = action === "events" ? "order_events" : "messages";
      let query = `SELECT * FROM ${table} WHERE tenant_id=$1 AND order_id=$2`;
      const values = [principal.tenantId, orderId];
      if (!principal.roles.some(role => ALLOWED_ROLES.operationsRead.includes(role))) {
        if (action === "events") {
          const allowedTypes = principal.roles.includes("supplier")
            ? ["SUPPLIER_ASSIGNED", "SUPPLIER_ACCEPTED", "SUPPLIER_DECLINED", "MILESTONE_RECORDED"]
            : ["MILESTONE_RECORDED"];
          values.push(allowedTypes);
          query += ` AND event_type=ANY($${values.length}::text[])`;
        } else if (principal.roles.includes("driver")) {
          values.push(principal.driverId);
          query += ` AND (audience='DRIVER' OR (sender_type='DRIVER' AND sender_ref=$${values.length}))`;
        } else {
          values.push(principal.supplierId);
          query += ` AND (audience='SUPPLIER' OR (sender_type='SUPPLIER' AND sender_ref=$${values.length}))`;
        }
      }
      query += ` ORDER BY ${action === "events" ? "sequence" : "created_at"}`;
      const rows = await db.query(query, values);
      return { body: { items: rows.rows } };
    }
    if (request.method === "POST" && action === "events") return recordMilestone({ request, db, principal, orderId });
    if (request.method === "POST" && action === "messages") return recordMessage({ request, db, principal, orderId });
    if (request.method === "POST" && action === "assign") return assignSupplier({ request, db, principal, orderId });
    if (request.method === "POST" && action === "supplier-response") return supplierResponse({ request, db, principal, orderId });
  }

  const exceptionMatch = pathname.match(/^\/v1\/exceptions\/([0-9a-f-]+)\/resolve$/i);
  if (request.method === "POST" && exceptionMatch) {
    requireRole(principal, ALLOWED_ROLES.resolve);
    const exceptionId = exceptionMatch[1];
    if (!isUuid(exceptionId)) throw new HttpError(400, "invalid_exception_id", "Exception id must be a UUID.");
    const key = idempotencyKey(request);
    const result = await db.query(
      `UPDATE exceptions SET status='RESOLVED', resolved_by=$3, resolved_at=now() WHERE tenant_id=$1 AND id=$2 AND status='OPEN' RETURNING id, order_id AS "orderId", status, resolved_at AS "resolvedAt"`,
      [principal.tenantId, exceptionId, principal.subject]
    );
    if (!result.rowCount) {
      const resolved = await db.query(`SELECT id, order_id AS "orderId", status, resolved_at AS "resolvedAt" FROM exceptions WHERE tenant_id=$1 AND id=$2 AND status='RESOLVED'`, [principal.tenantId, exceptionId]);
      if (!resolved.rowCount) throw new HttpError(404, "exception_not_found", "Open exception was not found.");
      return { status: 200, body: { item: resolved.rows[0], deduplicated: true } };
    }
    await appendEvent(db, principal, result.rows[0].orderId, { eventType: "EXCEPTION_RESOLVED", payload: { exceptionId }, idempotencyKey: `exception:${key}`, requestHash: hashObject({ exceptionId }) });
    return { body: { item: result.rows[0] } };
  }

  if (request.method === "POST" && pathname === "/v1/operations/sla-sweep") {
    requireRole(principal, ["admin", "scheduler"]);
    const inserted = await db.query(
      `INSERT INTO exceptions (id, tenant_id, order_id, exception_type, priority, owner_sub, due_at) SELECT gen_random_uuid(), o.tenant_id, o.id, 'SUPPLIER_ACK_OVERDUE', 'HIGH', o.owner_sub, o.acknowledgement_due_at FROM orders o WHERE o.tenant_id=$1 AND o.dispatch_status='AWAITING_SUPPLIER' AND o.acknowledgement_due_at < now() ON CONFLICT (tenant_id, order_id, exception_type) WHERE status='OPEN' DO NOTHING RETURNING id, order_id AS "orderId"`,
      [principal.tenantId]
    );
    for (const item of inserted.rows) {
      await appendEvent(db, principal, item.orderId, { eventType: "SUPPLIER_ACK_EXCEPTION_OPENED", payload: { exceptionId: item.id }, idempotencyKey: `sla:${item.id}`, requestHash: hashObject({ exceptionId: item.id }) });
    }
    return { body: { created: inserted.rowCount } };
  }

  throw new HttpError(404, "not_found", "OMS endpoint was not found.");
}

async function recordMilestone({ request, db, principal, orderId }) {
  requireRole(principal, ALLOWED_ROLES.milestone);
  const body = await readJson(request);
  const key = idempotencyKey(request);
  if (typeof body.nextStatus !== "string" || (body.payload != null && (typeof body.payload !== "object" || Array.isArray(body.payload)))) {
    throw new HttpError(400, "invalid_event", "A nextStatus and optional payload object are required.");
  }
  const payload = body.payload || {};
  const requestHash = hashObject({ action: "MILESTONE", nextStatus: body.nextStatus, payload });
  const orderResult = await db.query(`SELECT id, route, status, dispatch_status AS "dispatchStatus", driver_ref AS "driverRef" FROM orders WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, [principal.tenantId, orderId]);
  if (!orderResult.rowCount) throw new HttpError(404, "order_not_found", "Order was not found.");
  const prior = await findIdempotentEvent(db, principal.tenantId, orderId, key, requestHash);
  if (prior) return { status: 200, body: { item: prior, deduplicated: true } };
  const order = orderResult.rows[0];
  if (principal.roles.includes("driver") && !principal.roles.some(role => ["admin", "operator", "dispatcher"].includes(role)) && principal.driverId !== order.driverRef) {
    throw new HttpError(403, "driver_order_mismatch", "This driver is not assigned to the order.");
  }
  validateTransition(order, body.nextStatus, payload);
  if ((body.nextStatus === "CUSTOMER_DROPPED" || body.nextStatus === "LUGGAGE_DELIVERED") && principal.roles.includes("driver") && !principal.roles.some(role => ["admin", "operator", "dispatcher"].includes(role))) {
    throw new HttpError(403, "evidence_must_be_verified", "Customer and delivery evidence must be verified through the evidence workflow before this milestone can be recorded.");
  }
  if (body.nextStatus === "CUSTOMER_DROPPED") await requireVerifiedEvidence(db, principal.tenantId, orderId, payload.tagEvidenceId, "LUGGAGE_TAG");
  if (body.nextStatus === "LUGGAGE_DELIVERED") await requireVerifiedEvidence(db, principal.tenantId, orderId, payload.deliveryEvidenceId, "DELIVERY");

  const updated = await db.query(
    `UPDATE orders SET status=$3, dispatch_status=CASE WHEN $3='COMPLETED' THEN 'COMPLETED' ELSE dispatch_status END, updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING id, status, dispatch_status AS "dispatchStatus", updated_at AS "updatedAt"`,
    [principal.tenantId, orderId, body.nextStatus]
  );
  const event = await appendEvent(db, principal, orderId, { eventType: "MILESTONE_RECORDED", fromStatus: order.status, toStatus: body.nextStatus, payload: permittedMilestonePayload(body.nextStatus, payload), idempotencyKey: key, requestHash });
  return { body: { item: updated.rows[0], event } };
}

async function recordMessage({ request, db, principal, orderId }) {
  const body = await readJson(request);
  const text = validateMessage(body.text);
  const key = idempotencyKey(request);
  await getOrder(db, principal.tenantId, orderId);
  let row;
  if (principal.roles.includes("integration") && !principal.roles.some(role => ALLOWED_ROLES.operationsRead.includes(role))) {
    if (body.direction !== "INBOUND" || !["CUSTOMER", "DRIVER", "SUPPLIER"].includes(body.senderType) || !["CUSTOMER", "DRIVER", "SUPPLIER"].includes(body.audience) || typeof body.channel !== "string" || body.channel.length < 1 || body.channel.length > 80 || typeof body.providerMessageId !== "string" || body.providerMessageId.length < 1 || body.providerMessageId.length > 255) {
      throw new HttpError(400, "invalid_inbound_message", "Inbound message needs a supported sender, audience, channel, and provider message id.");
    }
    const result = await db.query(
      `INSERT INTO messages (id, tenant_id, order_id, channel, audience, direction, sender_type, sender_ref, body, provider_message_id, idempotency_key) VALUES ($1,$2,$3,$4,$5,'INBOUND',$6,$7,$8,$9,$10) ON CONFLICT (tenant_id, channel, provider_message_id) WHERE provider_message_id IS NOT NULL DO NOTHING RETURNING id, order_id AS "orderId", channel, audience, direction, sender_type AS "senderType", sender_ref AS "senderRef", body, created_at AS "createdAt"`,
      [randomUUID(), principal.tenantId, orderId, body.channel, body.audience, body.senderType, typeof body.senderRef === "string" ? body.senderRef.slice(0, 255) : null, text, body.providerMessageId, key]
    );
    if (!result.rowCount) {
      const prior = await db.query(`SELECT id, order_id AS "orderId", channel, audience, direction, sender_type AS "senderType", sender_ref AS "senderRef", body, created_at AS "createdAt" FROM messages WHERE tenant_id=$1 AND channel=$2 AND provider_message_id=$3`, [principal.tenantId, body.channel, body.providerMessageId]);
      if (!prior.rowCount || prior.rows[0].orderId !== orderId || prior.rows[0].body !== text || prior.rows[0].audience !== body.audience || prior.rows[0].senderType !== body.senderType) {
        throw new HttpError(409, "provider_message_conflict", "Provider message id was already used for a different message or order.");
      }
      return { status: 200, body: { item: prior.rows[0], deduplicated: true } };
    }
    row = result.rows[0];
  } else if ((principal.roles.includes("driver") || principal.roles.includes("supplier")) && !principal.roles.some(role => ALLOWED_ROLES.operationsRead.includes(role))) {
    const order = await getOrder(db, principal.tenantId, orderId);
    assertOrderScope(order, principal);
    const senderType = principal.roles.includes("supplier") ? "SUPPLIER" : "DRIVER";
    const channel = senderType === "SUPPLIER" ? "supplier-portal" : "driver-app";
    const senderRef = senderType === "SUPPLIER" ? principal.supplierId : principal.driverId;
    const result = await db.query(
      `INSERT INTO messages (id, tenant_id, order_id, channel, audience, direction, sender_type, sender_ref, body, idempotency_key) VALUES ($1,$2,$3,$4,'TEAM','INBOUND',$5,$6,$7,$8) ON CONFLICT (tenant_id, order_id, idempotency_key) DO NOTHING RETURNING id, order_id AS "orderId", channel, audience, direction, sender_type AS "senderType", sender_ref AS "senderRef", body, created_at AS "createdAt"`,
      [randomUUID(), principal.tenantId, orderId, channel, senderType, senderRef, text, key]
    );
    if (!result.rowCount) {
      const prior = await db.query(`SELECT id, order_id AS "orderId", channel, audience, direction, sender_type AS "senderType", sender_ref AS "senderRef", body, created_at AS "createdAt" FROM messages WHERE tenant_id=$1 AND order_id=$2 AND idempotency_key=$3`, [principal.tenantId, orderId, key]);
      if (prior.rows[0].body !== text) throw new HttpError(409, "idempotency_conflict", "Idempotency key was already used for a different message.");
      return { status: 200, body: { item: prior.rows[0], deduplicated: true } };
    }
    row = result.rows[0];
  } else {
    requireRole(principal, ALLOWED_ROLES.internalMessage);
    const result = await db.query(
      `INSERT INTO messages (id, tenant_id, order_id, channel, audience, direction, sender_type, sender_ref, body, idempotency_key) VALUES ($1,$2,$3,'operations','TEAM','INTERNAL','OPERATOR',$4,$5,$6) ON CONFLICT (tenant_id, order_id, idempotency_key) DO NOTHING RETURNING id, order_id AS "orderId", channel, audience, direction, sender_type AS "senderType", sender_ref AS "senderRef", body, created_at AS "createdAt"`,
      [randomUUID(), principal.tenantId, orderId, principal.subject, text, key]
    );
    if (!result.rowCount) {
      const prior = await db.query(`SELECT id, order_id AS "orderId", channel, audience, direction, sender_type AS "senderType", sender_ref AS "senderRef", body, created_at AS "createdAt" FROM messages WHERE tenant_id=$1 AND order_id=$2 AND idempotency_key=$3`, [principal.tenantId, orderId, key]);
      if (prior.rows[0].body !== text) throw new HttpError(409, "idempotency_conflict", "Idempotency key was already used for a different message.");
      return { status: 200, body: { item: prior.rows[0], deduplicated: true } };
    }
    row = result.rows[0];
  }
  await appendEvent(db, principal, orderId, { eventType: "MESSAGE_RECORDED", payload: { messageId: row.id, direction: row.direction, audience: row.audience }, idempotencyKey: `message:${key}`, requestHash: hashObject({ messageId: row.id }) });
  return { status: 201, body: { item: row, deduplicated: false } };
}

async function assignSupplier({ request, db, principal, orderId }) {
  requireRole(principal, ALLOWED_ROLES.assign);
  const body = await readJson(request);
  const key = idempotencyKey(request);
  if (!isUuid(body.supplierId)) throw new HttpError(400, "invalid_supplier", "supplierId must be a UUID.");
  const requestHash = hashObject({ action: "ASSIGN", supplierId: body.supplierId });
  const found = await db.query(`SELECT * FROM orders WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, [principal.tenantId, orderId]);
  if (!found.rowCount) throw new HttpError(404, "order_not_found", "Order was not found.");
  const prior = await findIdempotentEvent(db, principal.tenantId, orderId, key, requestHash);
  if (prior) return { status: 200, body: { item: prior, deduplicated: true } };
  const order = found.rows[0];
  if (!new Set(["UNASSIGNED", "DECLINED"]).has(order.dispatch_status)) throw new HttpError(409, "already_assigned", "Order already has an active supplier assignment.");
  const serviceDate = localDate(order.service_at, order.time_zone);
  const supplier = await db.query(
    `SELECT s.id, s.company_name, s.supplier_ack_sla_minutes, c.id AS capacity_id FROM suppliers s JOIN supplier_capacity c ON c.tenant_id=s.tenant_id AND c.supplier_id=s.id WHERE s.tenant_id=$1 AND s.id=$2 AND s.active=true AND $3=ANY(s.markets) AND $4=ANY(s.routes) AND c.service_date=$5::date AND c.market=$3 AND c.route=$4 FOR UPDATE OF c`,
    [principal.tenantId, body.supplierId, order.market, order.route, serviceDate]
  );
  if (!supplier.rowCount) throw new HttpError(409, "supplier_unavailable", "Supplier is inactive, unsupported for this route, or has no capacity record for the service date.");
  const reserved = await db.query(`UPDATE supplier_capacity SET reserved=reserved+1 WHERE tenant_id=$1 AND id=$2 AND reserved < capacity RETURNING id`, [principal.tenantId, supplier.rows[0].capacity_id]);
  if (!reserved.rowCount) throw new HttpError(409, "capacity_full", "Supplier has no remaining capacity for this service window.");
  const ackDue = new Date(Date.now() + supplier.rows[0].supplier_ack_sla_minutes * 60000).toISOString();
  await db.query(`UPDATE orders SET supplier_id=$3, capacity_id=$4, dispatch_status='AWAITING_SUPPLIER', assigned_at=now(), acknowledgement_due_at=$5, updated_at=now() WHERE tenant_id=$1 AND id=$2`, [principal.tenantId, orderId, body.supplierId, supplier.rows[0].capacity_id, ackDue]);
  const event = await appendEvent(db, principal, orderId, { eventType: "SUPPLIER_ASSIGNED", payload: { supplierId: body.supplierId }, idempotencyKey: key, requestHash });
  return { body: { item: { supplierId: body.supplierId, supplierCompany: supplier.rows[0].company_name, dispatchStatus: "AWAITING_SUPPLIER", acknowledgementDueAt: ackDue }, event } };
}

async function supplierResponse({ request, db, principal, orderId }) {
  requireRole(principal, ["supplier", "admin"]);
  const body = await readJson(request);
  const key = idempotencyKey(request);
  if (!["ACCEPTED", "DECLINED"].includes(body.decision)) throw new HttpError(400, "invalid_supplier_response", "decision must be ACCEPTED or DECLINED.");
  const requestHash = hashObject({ action: "SUPPLIER_RESPONSE", decision: body.decision });
  const found = await db.query(`SELECT id, supplier_id, capacity_id, dispatch_status FROM orders WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, [principal.tenantId, orderId]);
  if (!found.rowCount) throw new HttpError(404, "order_not_found", "Order was not found.");
  const prior = await findIdempotentEvent(db, principal.tenantId, orderId, key, requestHash);
  if (prior) return { status: 200, body: { item: prior, deduplicated: true } };
  const order = found.rows[0];
  if (!principal.roles.includes("admin") && (!principal.supplierId || principal.supplierId !== order.supplier_id)) throw new HttpError(403, "supplier_order_mismatch", "This supplier is not assigned to the order.");
  if (order.dispatch_status !== "AWAITING_SUPPLIER") throw new HttpError(409, "supplier_response_closed", "This order is not awaiting a supplier response.");
  if (body.decision === "DECLINED") {
    await db.query(`UPDATE supplier_capacity SET reserved=GREATEST(reserved-1,0) WHERE tenant_id=$1 AND id=$2`, [principal.tenantId, order.capacity_id]);
  }
  await db.query(`UPDATE exceptions SET status='RESOLVED', resolved_by=$3, resolved_at=now() WHERE tenant_id=$1 AND order_id=$2 AND exception_type='SUPPLIER_ACK_OVERDUE' AND status='OPEN'`, [principal.tenantId, orderId, principal.subject]);
  await db.query(`UPDATE orders SET dispatch_status=$3, updated_at=now() WHERE tenant_id=$1 AND id=$2`, [principal.tenantId, orderId, body.decision]);
  const event = await appendEvent(db, principal, orderId, { eventType: `SUPPLIER_${body.decision}`, payload: { supplierId: order.supplier_id }, idempotencyKey: key, requestHash });
  return { body: { item: { orderId, dispatchStatus: body.decision }, event } };
}

async function requireVerifiedEvidence(db, tenantId, orderId, evidenceId, kind) {
  const result = await db.query(`SELECT 1 FROM evidence_objects WHERE tenant_id=$1 AND order_id=$2 AND id=$3 AND evidence_kind=$4 AND verified_at IS NOT NULL`, [tenantId, orderId, evidenceId, kind]);
  if (!result.rowCount) throw new HttpError(422, "evidence_unverified", "Evidence must be uploaded, verified, and linked to this order before recording the milestone.");
}

async function getOrder(db, tenantId, orderId) {
  const result = await db.query(
    `SELECT id, display_id AS "displayId", external_reference AS "externalReference", booking_source AS "bookingSource", booking_channel AS "bookingChannel", route, market, time_zone AS "timeZone", service_date AS "serviceDate", service_at AS "serviceAt", customer_display_name AS "customerName", customer_channel AS "customerChannel", pickup, delivery, status, dispatch_status AS "dispatchStatus", supplier_id AS "supplierId", driver_ref AS "driverRef", owner_sub AS "ownerSub", created_at AS "createdAt", updated_at AS "updatedAt" FROM orders WHERE tenant_id=$1 AND id=$2`,
    [tenantId, orderId]
  );
  if (!result.rowCount) throw new HttpError(404, "order_not_found", "Order was not found.");
  return result.rows[0];
}

function recordScope(principal) {
  if (principal.roles.some(role => ALLOWED_ROLES.operationsRead.includes(role))) return { column: null, value: null };
  const externalRoles = principal.roles.filter(role => role === "driver" || role === "supplier");
  if (externalRoles.length !== 1) throw new HttpError(403, "forbidden", "This identity cannot read the requested records.");
  if (externalRoles[0] === "driver" && principal.driverId) return { column: "driver_ref", value: principal.driverId };
  if (externalRoles[0] === "supplier" && principal.supplierId) return { column: "supplier_id", value: principal.supplierId };
  throw new HttpError(403, "invalid_identity", "This identity is missing its assigned driver or supplier id.");
}

function assertOrderScope(order, principal) {
  if (principal.roles.some(role => ALLOWED_ROLES.operationsRead.includes(role))) return;
  const scope = recordScope(principal);
  const allowed = scope.column === "driver_ref" ? order.driverRef === scope.value : order.supplierId === scope.value;
  if (!allowed) throw new HttpError(404, "order_not_found", "Order was not found.");
}

async function appendEvent(db, principal, orderId, event) {
  const sequence = await db.query(`UPDATE orders SET event_sequence=event_sequence+1, updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING event_sequence`, [principal.tenantId, orderId]);
  if (!sequence.rowCount) throw new HttpError(404, "order_not_found", "Order was not found.");
  const actorRole = ["admin", "dispatcher", "operator", "driver", "supplier", "integration", "scheduler"].find(role => principal.roles.includes(role)) || "unknown";
  const result = await db.query(
    `INSERT INTO order_events (id, tenant_id, order_id, sequence, event_type, from_status, to_status, actor_sub, actor_role, actor_source, payload, idempotency_key, request_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13) RETURNING id, order_id AS "orderId", sequence, event_type AS "eventType", from_status AS "fromStatus", to_status AS "toStatus", actor_sub AS "actorSub", actor_role AS "actorRole", payload, occurred_at AS "occurredAt"`,
    [randomUUID(), principal.tenantId, orderId, sequence.rows[0].event_sequence, event.eventType, event.fromStatus || null, event.toStatus || null, principal.subject, actorRole, actorRole, JSON.stringify(event.payload || {}), event.idempotencyKey || `system:${randomUUID()}`, event.requestHash || hashObject(event)]
  );
  return result.rows[0];
}

async function findIdempotentEvent(db, tenantId, orderId, key, requestHash) {
  const result = await db.query(`SELECT id, order_id AS "orderId", sequence, event_type AS "eventType", payload, occurred_at AS "occurredAt", request_hash AS "requestHash" FROM order_events WHERE tenant_id=$1 AND order_id=$2 AND idempotency_key=$3`, [tenantId, orderId, key]);
  if (!result.rowCount) return null;
  if (result.rows[0].requestHash !== requestHash) throw new HttpError(409, "idempotency_conflict", "Idempotency key was already used for a different request.");
  return result.rows[0];
}

async function withTenant(pool, tenantId, task) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await task(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function orderFilters(searchParams) {
  const status = searchParams.get("status") || "";
  const route = searchParams.get("route") || "";
  const dispatchStatus = searchParams.get("dispatchStatus") || "";
  const supportedStatuses = new Set(["SCHEDULED", "AWAITING_CUSTOMER_DROP", "CUSTOMER_DROPPED", "DRIVER_COLLECTED", "ARRIVED_AT_AIRPORT", "ARRIVED_AT_DESTINATION", "LUGGAGE_COLLECTED", "LUGGAGE_DELIVERED", "COMPLETED"]);
  const supportedDispatch = new Set(["UNASSIGNED", "AWAITING_SUPPLIER", "ACCEPTED", "DECLINED", "COMPLETED"]);
  if (status && !supportedStatuses.has(status)) throw new HttpError(400, "invalid_status", "Status filter is not supported.");
  if (route) validateRoute(route);
  if (dispatchStatus && !supportedDispatch.has(dispatchStatus)) throw new HttpError(400, "invalid_dispatch_status", "Dispatch status filter is not supported.");
  return { status, route, dispatchStatus };
}

function validateOrderInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "invalid_order", "Order fields are required.");
  const route = validateRoute(body.route);
  const fields = ["externalReference", "bookingSource", "bookingChannel", "market", "timeZone", "serviceAt", "customerName", "customerChannel", "pickup", "delivery"];
  const order = {};
  for (const field of fields) order[field] = requiredText(body[field], field, field === "customerName" ? 180 : 255);
  if (!Number.isFinite(Date.parse(order.serviceAt))) throw new HttpError(400, "invalid_service_time", "serviceAt must be a valid ISO 8601 date-time.");
  try { new Intl.DateTimeFormat("en", { timeZone: order.timeZone }); } catch { throw new HttpError(400, "invalid_time_zone", "timeZone must be a valid IANA time zone."); }
  order.serviceAt = new Date(order.serviceAt).toISOString();
  order.serviceDate = localDate(order.serviceAt, order.timeZone);
  order.route = route;
  order.driverRef = typeof body.driverRef === "string" && body.driverRef.length <= 255 ? body.driverRef : null;
  return order;
}

function permittedMilestonePayload(nextStatus, payload) {
  if (nextStatus === "CUSTOMER_DROPPED") return { tagEvidenceId: payload.tagEvidenceId };
  if (nextStatus === "LUGGAGE_DELIVERED") return { deliveryEvidenceId: payload.deliveryEvidenceId };
  return {};
}

function requiredText(value, field, max) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new HttpError(400, "invalid_order", `${field} is required and must be ${max} characters or fewer.`);
  return value.trim();
}

function idempotencyKey(request) {
  const value = request.headers["idempotency-key"];
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(value)) throw new HttpError(400, "idempotency_key_required", "Provide an Idempotency-Key header of 8 to 128 letters, numbers, or punctuation marks.");
  return value;
}

async function readJson(request) {
  const type = request.headers["content-type"] || "";
  if (!type.toLowerCase().startsWith("application/json")) throw new HttpError(415, "json_required", "Content-Type must be application/json.");
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new HttpError(413, "body_too_large", "Request body is too large.");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object");
    return value;
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be a JSON object.");
  }
}

function localDate(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function hashObject(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function writeJson(response, status, body) {
  if (response.writableEnded) return;
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function safePath(requestUrl) {
  try { return new URL(requestUrl, "http://oms.local").pathname.slice(0, 120); }
  catch { return "/invalid"; }
}

async function start() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const { Pool } = await import("pg");
  const verifyAuthorization = createJwksVerifier({
    issuer: process.env.OMS_OIDC_ISSUER,
    audience: process.env.OMS_OIDC_AUDIENCE,
    jwksUrl: process.env.OMS_OIDC_JWKS_URL
  });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: true },
    max: Number(process.env.PGPOOL_MAX || 12),
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000
  });
  const allowedOrigins = (process.env.OMS_CORS_ORIGINS || "").split(",").map(origin => origin.trim()).filter(Boolean);
  const server = createServer(createOmsHandler({ pool, verifyAuthorization, allowedOrigins }));
  const port = Number(process.env.PORT || 8080);
  server.listen(port, "0.0.0.0", () => process.stdout.write(JSON.stringify({ level: "info", event: "listening", port }) + "\n"));
  const shutdown = () => server.close(async () => { await pool.end(); process.exit(0); });
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(error => {
    process.stderr.write(JSON.stringify({ level: "fatal", name: error?.name || "Error", message: error?.message || "Startup failed." }) + "\n");
    process.exitCode = 1;
  });
}
