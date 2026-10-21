# Travel Operations Control Tower Service

This folder adds a PostgreSQL-backed API foundation for the Travel Operations Control Tower. The public GitHub Pages demo still uses browser-local example data. This service has not been deployed or connected to the demo, a booking provider, a chat provider, a driver app, an identity provider, or an object-storage account.

## What the service enforces

- Tenant-scoped reads and writes, with PostgreSQL row-level security on operational tables.
- Signed bearer-token validation against a configured RS256 JWKS endpoint, including issuer, audience, expiry, tenant, and role checks.
- Route-specific milestone order. Hotel-origin orders require a verified luggage-tag evidence record before customer drop. Airport-to-hotel delivery requires a verified delivery evidence record.
- Append-only order events with actor, role, sequence, timestamp, request hash, and idempotency key.
- Supplier assignment that locks the selected capacity row and reserves a slot only when capacity remains.
- Supplier acknowledgement deadlines and an idempotent SLA sweep that opens overdue exceptions.
- Per-order message history for operator notes and inbound messages. The service does not send outbound messages.
- Date-bounded order queries and a maximum two-day dispatch query.
- Request-size limits, exact CORS allow-listing, no-store responses, generic error messages, and logs that omit order payloads and message text.

## API

All endpoints except `GET /healthz` require an `Authorization: Bearer <token>` header. User initiated writes require an `Idempotency-Key` header. The SLA sweep is idempotent through a database uniqueness rule.

| Route | Purpose |
|---|---|
| `GET /v1/orders?from=YYYY-MM-DD&to=YYYY-MM-DD` | Search orders by local service date, with optional `status`, `route`, `dispatchStatus`, `limit`, and `offset` filters |
| `GET /v1/dispatch?from=YYYY-MM-DD&to=YYYY-MM-DD` | Return a maximum of two service dates for the dispatch plan |
| `POST /v1/orders` | Accept a deduplicated booking intake record for the tenant |
| `GET /v1/orders/{id}` | Read one order |
| `GET /v1/orders/{id}/events` | Read its event history |
| `POST /v1/orders/{id}/events` | Record the next valid service milestone |
| `GET /v1/orders/{id}/messages` | Read customer, driver, supplier, and team messages |
| `POST /v1/orders/{id}/messages` | Add an internal note, or accept an inbound message from a trusted integration identity |
| `POST /v1/orders/{id}/assign` | Reserve supplier capacity and start the acknowledgement SLA |
| `POST /v1/orders/{id}/supplier-response` | Accept or decline an assigned supplier job |
| `GET /v1/exceptions?status=OPEN` | Read the exception queue |
| `POST /v1/exceptions/{id}/resolve` | Resolve an exception with an actor record |
| `POST /v1/operations/sla-sweep` | Create exceptions for overdue supplier acknowledgements |

Order ids in the API are UUIDs. `displayId` is the human-readable reference shown to operators.

## Identity contract

The identity provider must issue an RS256 access token with these claims:

```json
{
  "iss": "https://identity.example/",
  "aud": "oms-api",
  "sub": "stable-user-id",
  "tenant_id": "6cfa78c4-cc28-49a8-aaf8-0bc02d767e78",
  "roles": ["dispatcher"],
  "exp": 1900000000
}
```

The `supplier` role also needs `supplier_id`. The `driver` role also needs `driver_id`. Supported roles are `admin`, `dispatcher`, `operator`, `driver`, `supplier`, `integration`, and `scheduler`. Role provisioning, user login, token issuance, and account recovery belong to the selected identity provider and have not been implemented in the static site.

## Local setup

Node.js 22 or later and PostgreSQL 14 or later are required. Install the `pg` runtime dependency, create an empty database, then apply the schema:

```sh
cd case-studies/travel-logistics-transformation/service
npm ci
psql -d postgres -c "CREATE ROLE oms_migrator LOGIN PASSWORD 'replace-this-local-password'"
psql -d postgres -c "CREATE ROLE oms_runtime LOGIN PASSWORD 'replace-this-local-password' NOSUPERUSER NOBYPASSRLS"
psql -d postgres -c "CREATE DATABASE oms OWNER oms_migrator"
DATABASE_URL='postgres://oms_migrator:replace-this-local-password@localhost:5432/oms' PGSSL=disable npm run migrate
psql -d oms -U oms_migrator -f runtime-grants.sql
```

Run the API with a separate database account that does not own the tables and does not have `BYPASSRLS`:

```sh
DATABASE_URL='postgres://oms_runtime:replace-this-local-password@localhost:5432/oms' \
OMS_OIDC_ISSUER='https://identity.example/' \
OMS_OIDC_AUDIENCE='oms-api' \
OMS_OIDC_JWKS_URL='https://identity.example/.well-known/jwks.json' \
OMS_CORS_ORIGINS='https://your-oms-frontend.example' \
PGSSL=disable npm start
```

`PGSSL=disable` is for a local database only. For deployment, use TLS with certificate verification and keep secrets in the hosting platform's secret manager. Leave `OMS_CORS_ORIGINS` empty when the frontend and API use the same origin. For cross-origin use, set only the exact frontend origins.

The service starts on port `8080` by default. A deployment platform or reverse proxy must terminate HTTPS, enforce request rate limits, and expose only the intended routes.

## Database roles and tenant isolation

Apply migrations using a dedicated owner account. The server uses a separate runtime account. Every request starts a database transaction and sets `app.tenant_id` from the verified token. RLS policies reject tenant rows unless that setting matches the row. Do not use a superuser, table owner, or `BYPASSRLS` account for the API.

Grant the runtime account only what this API needs. Apply these grants as the migration owner and replace `public` if you use a dedicated schema:

```sql
\i runtime-grants.sql
```

`order_events` is append-only by application behavior. The runtime account should receive `SELECT` and `INSERT` on that table, but not `UPDATE` or `DELETE`. Apply the same least-privilege approach to migrations and operational access.

## Integration work still required

These are explicit deployment gates, not active connections:

1. Select an identity provider and issue the documented tenant and role claims.
2. Provision managed PostgreSQL, separate migration/runtime accounts, backups, restore tests, monitoring, and a secret manager.
3. Add signed booking-source adapters for direct website, airline, hotel, online travel agency, and travel-agent orders. Each adapter must map provider references and replay safely.
4. Add an object-storage upload flow that writes verified `evidence_objects` rows. The service currently has no image upload or download endpoint. Do not store luggage-tag or delivery images in PostgreSQL or browser local storage.
5. Add signed webhook verification and a connector for the chosen customer messaging platform, driver channel, and supplier channel. The current API can store messages but cannot send them.
6. Issue a scheduler identity and call `/v1/operations/sla-sweep` on a short interval.
7. Connect the frontend to the API after its identity SDK is selected. Until then, the demo continues to use local browser state.
8. Run deployment-specific security, load, backup/restore, and operational acceptance tests with the real providers and data rules.

The integration identity is trusted to submit already-verified inbound messages. Put provider-specific webhook signature checks in the adapter or gateway before it calls this API. Do not expose the integration token to a browser.

## Red-team review before deployment

| Attack or failure | Control in this service | Remaining verification or work |
|---|---|---|
| Cross-tenant order access | Tenant claim, tenant-filtered SQL, transaction-scoped RLS, and assigned driver or supplier filters | Prove the role grants and RLS policies in staging with two tenants and adversarial queries |
| Forged or replayed API calls | RS256 JWKS verification, issuer, audience, and time checks, route roles, request hashes, and idempotency keys | Test the selected identity provider's claim mapping, key rotation, token expiry, and service identities |
| Double booking a supplier | Capacity row lock, conditional reservation, transaction rollback, supplier decline release | Load-test competing assignments against the managed PostgreSQL version |
| False luggage or delivery confirmation | Milestone order checks and reference to a verified evidence record | Build private object storage, upload authorization, malware scanning, image validation, retention, and verified-row creation |
| Forged booking or chat webhook | Deduplication by provider references and provider message id | Add provider signature verification and secret rotation in each trusted adapter or gateway |
| Lost customer, driver, or supplier reply | Message rows plus an order event for each accepted message | Connect channels, reconcile provider delivery receipts, and test retries and outages |
| Supplier fails to acknowledge | Stored acknowledgement deadline and repeatable SLA sweep | Schedule the sweep, define escalation ownership, and test delayed or duplicate runs |
| Personal data exposed in logs | Request bodies and message text are not logged; responses disable caching | Set retention, deletion, export, encryption, and production observability rules for the actual markets |
| API overload or outage | Bounded queries and bodies, database pool limits, health endpoint | Add edge rate limits, alerting, load tests, backup restore drills, failover, and an incident runbook |

The API does not provide booking amendments, order cancellation, refunds, outbound chat, or a customer-facing upload flow. Those need explicit rules and separate event types before they are added.

## Validation

Run the domain, JWT, HTTP, query-scope, and schema contract checks:

```sh
npm test
```

After applying the schema to a disposable PostgreSQL database, run the database checks with a database owner account. The test creates and grants the `oms_runtime` test role:

```sh
OMS_TEST_DATABASE_URL='postgres://postgres:password@localhost:5432/oms_test' npm run test:db
```

The `test:db` suite uses `OMS_TEST_DATABASE_URL` to verify the migration, row-level security, event immutability, and competing capacity reservations. The GitHub Actions workflow starts PostgreSQL 16 and runs both suites. Backup restore, staging credentials, and provider webhooks still need verification in an environment that has the selected integrations.
