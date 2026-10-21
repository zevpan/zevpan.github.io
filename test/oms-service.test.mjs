import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import { createJwksVerifier } from "../case-studies/travel-logistics-transformation/service/auth.mjs";
import {
  HttpError,
  parseDateRange,
  parsePagination,
  requireRole,
  validateMessage,
  validateTransition
} from "../case-studies/travel-logistics-transformation/service/domain.mjs";
import { createOmsHandler } from "../case-studies/travel-logistics-transformation/service/server.mjs";

const tenantId = "6cfa78c4-cc28-49a8-aaf8-0bc02d767e78";
const tagEvidenceId = "a3e5bcbe-628f-4bb2-9de1-2a9391ee9a15";
const deliveryEvidenceId = "4e227cb9-8a1b-4b17-a3ef-ff1d7c17e6a5";

test("route-specific milestone paths only allow the next status", () => {
  assert.doesNotThrow(() => validateTransition({ route: "HOTEL_TO_AIRPORT", status: "DRIVER_COLLECTED" }, "ARRIVED_AT_AIRPORT"));
  assert.doesNotThrow(() => validateTransition({ route: "HOTEL_TO_HOTEL", status: "DRIVER_COLLECTED" }, "ARRIVED_AT_DESTINATION"));
  assert.doesNotThrow(() => validateTransition({ route: "AIRPORT_TO_HOTEL", status: "LUGGAGE_COLLECTED" }, "LUGGAGE_DELIVERED", { deliveryEvidenceId }));
  assert.throws(() => validateTransition({ route: "HOTEL_TO_AIRPORT", status: "AWAITING_CUSTOMER_DROP" }, "DRIVER_COLLECTED"), { code: "invalid_transition" });
  assert.throws(() => validateTransition({ route: "AIRPORT_TO_HOTEL", status: "SCHEDULED" }, "CUSTOMER_DROPPED"), { code: "invalid_transition" });
});

test("customer drop and delivery require evidence references", () => {
  assert.throws(() => validateTransition({ route: "HOTEL_TO_AIRPORT", status: "AWAITING_CUSTOMER_DROP" }, "CUSTOMER_DROPPED"), { code: "tag_evidence_required" });
  assert.doesNotThrow(() => validateTransition({ route: "HOTEL_TO_AIRPORT", status: "AWAITING_CUSTOMER_DROP" }, "CUSTOMER_DROPPED", { tagEvidenceId }));
  assert.throws(() => validateTransition({ route: "AIRPORT_TO_HOTEL", status: "LUGGAGE_COLLECTED" }, "LUGGAGE_DELIVERED"), { code: "delivery_evidence_required" });
});

test("date windows and pagination reject unbounded queries", () => {
  assert.equal(parseDateRange("2026-10-20", "2026-10-21", 2).days, 2);
  assert.throws(() => parseDateRange("2026-10-20", "2026-10-22", 2), { code: "invalid_date_range" });
  assert.throws(() => parseDateRange("2026-02-30", "2026-03-01", 2), { code: "invalid_date_range" });
  assert.deepEqual(parsePagination(new URLSearchParams("limit=50&offset=20")), { limit: 50, offset: 20 });
  assert.throws(() => parsePagination(new URLSearchParams("limit=1000")), { code: "invalid_pagination" });
});

test("roles and message size are checked before persistence", () => {
  assert.doesNotThrow(() => requireRole({ roles: ["dispatcher"] }, ["dispatcher", "admin"]));
  assert.throws(() => requireRole({ roles: ["driver"] }, ["dispatcher", "admin"]), { code: "forbidden" });
  assert.equal(validateMessage("  Driver is at the pickup point.  "), "Driver is at the pickup point.");
  assert.throws(() => validateMessage(" "), { code: "invalid_message" });
  assert.throws(() => validateMessage("x".repeat(4001)), { code: "message_too_large" });
});

test("JWKS verifier checks signature, issuer, audience, time, tenant, and role claims", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };
  const now = 1_800_000_000_000;
  const claims = { iss: "https://id.example.test/", aud: "oms-api", sub: "user-42", tenant_id: tenantId, roles: ["operator"], exp: now / 1000 + 300 };
  const token = signJwt(privateKey, claims);
  const verify = createJwksVerifier({
    issuer: "https://id.example.test/",
    audience: "oms-api",
    jwksUrl: "https://id.example.test/keys",
    now: () => now,
    fetchImpl: async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "content-type": "application/json" } })
  });
  const principal = await verify(`Bearer ${token}`);
  assert.deepEqual(principal, { subject: "user-42", tenantId, roles: ["operator"], supplierId: null, driverId: null });

  const wrongAudience = signJwt(privateKey, { ...claims, aud: "another-api" });
  await assert.rejects(verify(`Bearer ${wrongAudience}`), { code: "unauthorized" });
  const expired = signJwt(privateKey, { ...claims, exp: now / 1000 - 300 });
  await assert.rejects(verify(`Bearer ${expired}`), { code: "unauthorized" });
  await assert.rejects(verify("Bearer not.a.jwt"), { code: "unauthorized" });
});

test("orders endpoint applies tenant filters and returns bounded service windows", async t => {
  const queryCalls = [];
  const client = {
    async query(sql, values = []) {
      queryCalls.push({ sql, values });
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK" || sql.startsWith("SELECT set_config")) return { rows: [], rowCount: 0 };
      if (sql.includes("count(*)::int AS total")) return { rows: [{ total: 61 }], rowCount: 1 };
      if (sql.includes("FROM orders WHERE")) return { rows: [{ displayId: "OMS-20261020-TEST00001", status: "SCHEDULED" }], rowCount: 1 };
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {}
  };
  const pool = { async connect() { return client; }, async query() { return { rows: [{ ok: 1 }], rowCount: 1 }; } };
  const verifyAuthorization = async value => {
    if (value === "Bearer trusted-test-token") return { subject: "dispatcher-1", tenantId, roles: ["dispatcher"], supplierId: null, driverId: null };
    if (value === "Bearer driver-test-token") return { subject: "driver-1", tenantId, roles: ["driver"], supplierId: null, driverId: "driver-9" };
    if (value === "Bearer integration-test-token") return { subject: "booking-adapter", tenantId, roles: ["integration"], supplierId: null, driverId: null };
    throw new HttpError(401, "unauthorized", "A valid bearer token is required.");
  };
  const app = createServer(createOmsHandler({ pool, verifyAuthorization, allowedOrigins: ["https://portfolio.example"] }));
  await new Promise(resolve => app.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  const url = `http://127.0.0.1:${app.address().port}/v1/orders?from=2026-10-20&to=2026-10-21&limit=100`;
  const response = await fetch(url, { headers: { authorization: "Bearer trusted-test-token" } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).total, 61);
  const orderQuery = queryCalls.find(call => call.sql.includes("FROM orders WHERE") && call.sql.includes("ORDER BY service_date"));
  assert.ok(orderQuery);
  assert.equal(orderQuery.values[0], tenantId);
  assert.equal(orderQuery.values[1], "2026-10-20");
  assert.equal(orderQuery.values[2], "2026-10-21");

  const driverResponse = await fetch(url, { headers: { authorization: "Bearer driver-test-token" } });
  assert.equal(driverResponse.status, 200);
  const driverOrderQuery = queryCalls.findLast(call => call.sql.includes("ORDER BY service_date"));
  assert.match(driverOrderQuery.sql, /driver_ref = \$4/);
  assert.equal(driverOrderQuery.values[3], "driver-9");

  const integrationRead = await fetch(url, { headers: { authorization: "Bearer integration-test-token" } });
  assert.equal(integrationRead.status, 403);

  const tooWide = await fetch(`http://127.0.0.1:${app.address().port}/v1/dispatch?from=2026-10-20&to=2026-10-22`, { headers: { authorization: "Bearer trusted-test-token" } });
  assert.equal(tooWide.status, 400);

  const blockedOrigin = await fetch(url, { headers: { authorization: "Bearer trusted-test-token", origin: "https://attacker.example" } });
  assert.equal(blockedOrigin.status, 403);
});

test("service schema keeps tenant tables behind row security and preserves the event log", async () => {
  const { readFile } = await import("node:fs/promises");
  const schema = await readFile(new URL("../case-studies/travel-logistics-transformation/service/schema.sql", import.meta.url), "utf8");
  assert.match(schema, /FORCE ROW LEVEL SECURITY/);
  assert.match(schema, /current_setting\(''app\.tenant_id''/);
  assert.match(schema, /UNIQUE \(tenant_id, order_id, sequence\)/);
  assert.match(schema, /request_hash text NOT NULL/);
  assert.match(schema, /reserved <= capacity/);
  assert.match(schema, /provider_message_id/);
});

function signJwt(privateKey, claims) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "test-key" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const input = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url");
  return `${input}.${signature}`;
}
