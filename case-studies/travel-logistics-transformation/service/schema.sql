CREATE TABLE IF NOT EXISTS oms_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  company_name text NOT NULL CHECK (length(trim(company_name)) BETWEEN 2 AND 180),
  active boolean NOT NULL DEFAULT true,
  markets text[] NOT NULL DEFAULT '{}',
  routes text[] NOT NULL DEFAULT '{}',
  supplier_ack_sla_minutes integer NOT NULL DEFAULT 15 CHECK (supplier_ack_sla_minutes BETWEEN 1 AND 1440),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, company_name)
);

CREATE TABLE supplier_capacity (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  service_date date NOT NULL,
  market text NOT NULL,
  route text NOT NULL CHECK (route IN ('HOTEL_TO_AIRPORT', 'AIRPORT_TO_HOTEL', 'HOTEL_TO_HOTEL')),
  capacity integer NOT NULL CHECK (capacity >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= capacity),
  UNIQUE (tenant_id, supplier_id, service_date, market, route),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, supplier_id) REFERENCES suppliers (tenant_id, id)
);

CREATE TABLE orders (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  display_id text NOT NULL,
  external_reference text NOT NULL,
  booking_source text NOT NULL,
  booking_channel text NOT NULL,
  route text NOT NULL CHECK (route IN ('HOTEL_TO_AIRPORT', 'AIRPORT_TO_HOTEL', 'HOTEL_TO_HOTEL')),
  market text NOT NULL,
  time_zone text NOT NULL,
  service_date date NOT NULL,
  service_at timestamptz NOT NULL,
  customer_display_name text NOT NULL,
  customer_channel text NOT NULL,
  pickup text NOT NULL,
  delivery text NOT NULL,
  status text NOT NULL CHECK (status IN ('SCHEDULED', 'AWAITING_CUSTOMER_DROP', 'CUSTOMER_DROPPED', 'DRIVER_COLLECTED', 'ARRIVED_AT_AIRPORT', 'ARRIVED_AT_DESTINATION', 'LUGGAGE_COLLECTED', 'LUGGAGE_DELIVERED', 'COMPLETED')),
  dispatch_status text NOT NULL DEFAULT 'UNASSIGNED' CHECK (dispatch_status IN ('UNASSIGNED', 'AWAITING_SUPPLIER', 'ACCEPTED', 'DECLINED', 'COMPLETED')),
  supplier_id uuid,
  capacity_id uuid,
  driver_ref text,
  owner_sub text,
  assigned_at timestamptz,
  acknowledgement_due_at timestamptz,
  event_sequence integer NOT NULL DEFAULT 0 CHECK (event_sequence >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, display_id),
  UNIQUE (tenant_id, booking_source, external_reference),
  FOREIGN KEY (tenant_id, supplier_id) REFERENCES suppliers (tenant_id, id),
  FOREIGN KEY (tenant_id, capacity_id) REFERENCES supplier_capacity (tenant_id, id)
);

CREATE INDEX orders_tenant_service_idx ON orders (tenant_id, service_date, service_at, id);
CREATE INDEX orders_tenant_status_idx ON orders (tenant_id, status, service_date, service_at);
CREATE INDEX orders_tenant_dispatch_idx ON orders (tenant_id, dispatch_status, service_date, service_at);

CREATE TABLE order_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  sequence integer NOT NULL,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor_sub text NOT NULL,
  actor_role text NOT NULL,
  actor_source text NOT NULL DEFAULT 'operator',
  payload jsonb NOT NULL DEFAULT '{}',
  idempotency_key text NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, order_id, sequence),
  UNIQUE (tenant_id, order_id, idempotency_key),
  FOREIGN KEY (tenant_id, order_id) REFERENCES orders (tenant_id, id)
);

CREATE INDEX order_events_order_time_idx ON order_events (tenant_id, order_id, occurred_at DESC);

CREATE TABLE evidence_objects (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('LUGGAGE_TAG', 'DELIVERY')),
  object_key text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by text NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, object_key),
  FOREIGN KEY (tenant_id, order_id) REFERENCES orders (tenant_id, id)
);

CREATE TABLE exceptions (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  exception_type text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  owner_sub text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, order_id) REFERENCES orders (tenant_id, id)
);

CREATE UNIQUE INDEX exceptions_one_open_type_per_order ON exceptions (tenant_id, order_id, exception_type) WHERE status = 'OPEN';
CREATE INDEX exceptions_queue_idx ON exceptions (tenant_id, status, priority, due_at);

CREATE TABLE messages (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  channel text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('CUSTOMER', 'DRIVER', 'TEAM', 'SUPPLIER')),
  direction text NOT NULL CHECK (direction IN ('INBOUND', 'INTERNAL')),
  sender_type text NOT NULL CHECK (sender_type IN ('CUSTOMER', 'DRIVER', 'OPERATOR', 'SUPPLIER', 'SYSTEM')),
  sender_ref text,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  provider_message_id text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, order_id) REFERENCES orders (tenant_id, id),
  UNIQUE (tenant_id, order_id, idempotency_key),
  CHECK ((direction = 'INTERNAL' AND audience = 'TEAM' AND sender_type = 'OPERATOR') OR (direction = 'INBOUND' AND ((audience = 'TEAM' AND sender_type IN ('DRIVER', 'SUPPLIER')) OR (audience IN ('CUSTOMER', 'DRIVER', 'SUPPLIER') AND sender_type = audience)))
);

CREATE UNIQUE INDEX messages_provider_dedupe_idx ON messages (tenant_id, channel, provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX messages_order_time_idx ON messages (tenant_id, order_id, created_at);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['suppliers', 'supplier_capacity', 'orders', 'order_events', 'evidence_objects', 'exceptions', 'messages']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_boundary ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;
