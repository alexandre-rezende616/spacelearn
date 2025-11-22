-- backup_and_delete_mission_legacy.sql
-- Replace '<LEGACY_ID>' with the actual mission id.

-- 1) Export the mission row (backup)
SELECT * FROM public.missions WHERE id = '<LEGACY_ID>';

-- 2) Check child counts
SELECT
  'mission_questions' AS table_name, count(*) AS cnt
FROM public.mission_questions WHERE mission_id = '<LEGACY_ID>'
UNION ALL
SELECT 'mission_options', count(*) FROM public.mission_options mo WHERE mo.question_id IN (SELECT id FROM public.mission_questions WHERE mission_id = '<LEGACY_ID>')
UNION ALL
SELECT 'mission_category', count(*) FROM public.mission_category WHERE mission_id = '<LEGACY_ID>'
UNION ALL
SELECT 'mission_classes', count(*) FROM public.mission_classes WHERE mission_id = '<LEGACY_ID>'
UNION ALL
SELECT 'attempts', count(*) FROM public.attempts WHERE mission_id = '<LEGACY_ID>'
UNION ALL
SELECT 'progress', count(*) FROM public.progress WHERE mission_id = '<LEGACY_ID>';

-- 3) If counts are zero (or after reviewing), delete in safe order inside transaction:
BEGIN;

-- Delete children (examples; only run those that have > 0 rows)
DELETE FROM public.attempts WHERE mission_id = '<LEGACY_ID>';
DELETE FROM public.progress WHERE mission_id = '<LEGACY_ID>';
DELETE FROM public.mission_classes WHERE mission_id = '<LEGACY_ID>';
DELETE FROM public.mission_category WHERE mission_id = '<LEGACY_ID>';

-- For questions/options:
DELETE FROM public.mission_options WHERE question_id IN (SELECT id FROM public.mission_questions WHERE mission_id = '<LEGACY_ID>');
DELETE FROM public.mission_questions WHERE mission_id = '<LEGACY_ID>';

-- Finally delete mission
DELETE FROM public.missions WHERE id = '<LEGACY_ID>';

-- If you want to preview deletions only, run ROLLBACK; otherwise COMMIT to persist
COMMIT;
