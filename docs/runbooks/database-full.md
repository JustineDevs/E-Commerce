# Runbook: Database Full / Near Capacity

## Severity: P0
## Owner: Platform / Infrastructure team

## Symptoms
- Write operations failing with "disk full" or "storage exceeded" errors
- Supabase dashboard shows storage near limit
- Application errors during order creation or audit logging

## Diagnosis Steps

1. Check Supabase storage usage in dashboard
2. Identify largest tables:
   ```sql
   SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
   FROM pg_catalog.pg_statio_user_tables
   ORDER BY pg_total_relation_size(relid) DESC
   LIMIT 20;
   ```
3. Check for runaway data (logs, audit entries, abandoned carts)
4. Check outbox_events for unprocessed backlog

## Resolution Steps

### Immediate
1. Archive or purge old audit_logs entries (older than 90 days)
2. Clean processed outbox_events:
   ```sql
   DELETE FROM public.outbox_events
   WHERE processed_at IS NOT NULL
   AND created_at < now() - interval '7 days';
   ```
3. Clean completed background_jobs:
   ```sql
   DELETE FROM public.background_jobs
   WHERE status IN ('completed', 'cancelled')
   AND completed_at < now() - interval '30 days';
   ```
4. Vacuum tables to reclaim space:
   ```sql
   VACUUM FULL public.audit_logs;
   VACUUM FULL public.outbox_events;
   ```

### Long-term
1. Set up automated data retention policies
2. Increase database storage tier if needed
3. Implement data archival to warehouse
4. Add monitoring alerts at 80% capacity

## Prevention
- Monitor database size as a weekly metric
- Set alerts at 70% and 85% capacity
- Implement TTL-based cleanup for temporary tables
