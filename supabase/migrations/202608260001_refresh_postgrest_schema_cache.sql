-- Ensure PostgREST immediately refreshes its schema cache after the semantic graph
-- migration history is applied. This is intentionally idempotent and contains no data changes.
select pg_notify('pgrst', 'reload schema');
