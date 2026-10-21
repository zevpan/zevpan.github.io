import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";

const connectionString = process.env.OMS_TEST_DATABASE_URL;
const dbTest = connectionString ? test : test.skip;

dbTest("PostgreSQL tenant policy, event immutability, and capacity locking", async () => {
  const pool = new Pool({ connectionString, ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: true } });
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const supplierId = randomUUID();
  const capacityId = randomUUID();
  const orderA = randomUUID();
  const orderB = randomUUID();
  const eventA = randomUUID();

  try {
    await createRuntimeRole(pool);
    await pool.query(`INSERT INTO suppliers (id, tenant_id, company_name, markets, routes) VALUES ($1,$2,'Test Supplier A',ARRAY['Tokyo'],ARRAY['HOTEL_TO_AIRPORT']),($3,$4,'Test Supplier B',ARRAY['Tokyo'],ARRAY['HOTEL_TO_AIRPORT'])`, [supplierId, tenantA, randomUUID(), tenantB]);
    await pool.query(`INSERT INTO supplier_capacity (id, tenant_id, supplier_id, service_date, market, route, capacity) VALUES ($1,$2,$3,'2026-10-20','Tokyo','HOTEL_TO_AIRPORT',1)`, [capacityId, tenantA, supplierId]);
    await insertOrder(pool, { id: orderA, tenantId: tenantA, supplierId });
    await insertOrder(pool, { id: orderB, tenantId: tenantB, supplierId: null, suffix: "B" });
    await pool.query(`INSERT INTO order_events (id, tenant_id, order_id, sequence, event_type, actor_sub, actor_role, payload, idempotency_key, request_hash) VALUES ($1,$2,$3,1,'ORDER_CREATED','fixture','integration','{}','fixture-key',$4)`, [eventA, tenantA, orderA, "a".repeat(64)]);

    const scoped = await pool.connect();
    try {
      await beginAsRuntime(scoped, tenantA);
      const orders = await scoped.query(`SELECT id FROM orders WHERE tenant_id = ANY($1::uuid[]) ORDER BY id`, [[tenantA, tenantB]]);
      assert.deepEqual(orders.rows.map(row => row.id), [orderA]);
      const events = await scoped.query(`SELECT id FROM order_events WHERE tenant_id = ANY($1::uuid[])`, [[tenantA, tenantB]]);
      assert.deepEqual(events.rows.map(row => row.id), [eventA]);
      await scoped.query("COMMIT");

      await beginAsRuntime(scoped, tenantA);
      await assert.rejects(scoped.query(`INSERT INTO orders (id, tenant_id, display_id, external_reference, booking_source, booking_channel, route, market, time_zone, service_date, service_at, customer_display_name, customer_channel, pickup, delivery, status) VALUES ($1,$2,'OUTSIDE-TENANT','outside','Fixture','Hotel','HOTEL_TO_AIRPORT','Tokyo','Asia/Tokyo','2026-10-20','2026-10-20T10:00:00Z','Fixture','chat','Hotel','Airport','AWAITING_CUSTOMER_DROP')`, [randomUUID(), tenantB]), { code: "42501" });
      await scoped.query("ROLLBACK");

      await beginAsRuntime(scoped, tenantA);
      await assert.rejects(scoped.query(`UPDATE order_events SET payload='{}' WHERE tenant_id=$1 AND id=$2`, [tenantA, eventA]), { code: "42501" });
      await scoped.query("ROLLBACK");
    } finally {
      scoped.release();
    }

    const first = await pool.connect();
    const second = await pool.connect();
    try {
      await beginAsRuntime(first, tenantA);
      await first.query(`SELECT id FROM supplier_capacity WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, [tenantA, capacityId]);
      await beginAsRuntime(second, tenantA);
      let secondReadFinished = false;
      const secondRead = second.query(`SELECT id, reserved, capacity FROM supplier_capacity WHERE tenant_id=$1 AND id=$2 FOR UPDATE`, [tenantA, capacityId]).then(result => { secondReadFinished = true; return result; });
      await new Promise(resolve => setTimeout(resolve, 75));
      assert.equal(secondReadFinished, false, "competing reservation should wait for the first row lock");
      const firstReserve = await first.query(`UPDATE supplier_capacity SET reserved=reserved+1 WHERE tenant_id=$1 AND id=$2 AND reserved < capacity RETURNING reserved`, [tenantA, capacityId]);
      assert.equal(firstReserve.rowCount, 1);
      await first.query("COMMIT");
      const secondCapacity = await secondRead;
      assert.equal(secondCapacity.rows[0].reserved, 1);
      const secondReserve = await second.query(`UPDATE supplier_capacity SET reserved=reserved+1 WHERE tenant_id=$1 AND id=$2 AND reserved < capacity RETURNING reserved`, [tenantA, capacityId]);
      assert.equal(secondReserve.rowCount, 0);
      await second.query("COMMIT");
    } finally {
      await first.query("ROLLBACK").catch(() => {});
      await second.query("ROLLBACK").catch(() => {});
      first.release();
      second.release();
    }
  } finally {
    await pool.query(`DELETE FROM order_events WHERE tenant_id = ANY($1::uuid[])`, [[tenantA, tenantB]]);
    await pool.query(`DELETE FROM orders WHERE tenant_id = ANY($1::uuid[])`, [[tenantA, tenantB]]);
    await pool.query(`DELETE FROM supplier_capacity WHERE tenant_id = ANY($1::uuid[])`, [[tenantA, tenantB]]);
    await pool.query(`DELETE FROM suppliers WHERE tenant_id = ANY($1::uuid[])`, [[tenantA, tenantB]]);
    await pool.end();
  }
});

async function createRuntimeRole(pool) {
  await pool.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='oms_runtime') THEN EXECUTE 'CREATE ROLE oms_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS'; END IF; END $$`);
  await pool.query("ALTER ROLE oms_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS");
  await pool.query(`GRANT USAGE ON SCHEMA public TO oms_runtime`);
  await pool.query(`GRANT SELECT ON suppliers TO oms_runtime`);
  await pool.query(`GRANT SELECT, UPDATE ON supplier_capacity TO oms_runtime`);
  await pool.query(`GRANT SELECT, INSERT, UPDATE ON orders TO oms_runtime`);
  await pool.query(`GRANT SELECT, INSERT ON order_events TO oms_runtime`);
  await pool.query(`GRANT SELECT ON evidence_objects TO oms_runtime`);
  await pool.query(`GRANT SELECT, INSERT, UPDATE ON exceptions TO oms_runtime`);
  await pool.query(`GRANT SELECT, INSERT ON messages TO oms_runtime`);
}

async function beginAsRuntime(client, tenantId) {
  await client.query("BEGIN");
  await client.query("SET LOCAL ROLE oms_runtime");
  await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
}

async function insertOrder(pool, { id, tenantId, supplierId, suffix = "A" }) {
  await pool.query(
    `INSERT INTO orders (id, tenant_id, display_id, external_reference, booking_source, booking_channel, route, market, time_zone, service_date, service_at, customer_display_name, customer_channel, pickup, delivery, status, supplier_id) VALUES ($1,$2,$3,$4,'Fixture','Hotel','HOTEL_TO_AIRPORT','Tokyo','Asia/Tokyo','2026-10-20','2026-10-20T10:00:00Z',$5,'chat','Hotel','Airport','AWAITING_CUSTOMER_DROP',$6)`,
    [id, tenantId, `TEST-${suffix}`, `external-${suffix}`, `Customer ${suffix}`, supplierId]
  );
}
