GRANT CONNECT ON DATABASE oms TO oms_runtime;
GRANT USAGE ON SCHEMA public TO oms_runtime;
GRANT SELECT ON suppliers TO oms_runtime;
GRANT SELECT, UPDATE ON supplier_capacity TO oms_runtime;
GRANT SELECT, INSERT, UPDATE ON orders TO oms_runtime;
GRANT SELECT, INSERT ON order_events TO oms_runtime;
GRANT SELECT ON evidence_objects TO oms_runtime;
GRANT SELECT, INSERT, UPDATE ON exceptions TO oms_runtime;
GRANT SELECT, INSERT ON messages TO oms_runtime;
