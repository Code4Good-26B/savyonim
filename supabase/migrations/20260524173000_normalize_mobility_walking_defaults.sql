-- Follow-up migration: apply walking normalization after enum value commit
-- This must run in a later migration to avoid PostgreSQL 55P04

UPDATE public.passengers
SET mobility_need = 'walking'
WHERE mobility_need = 'none';

ALTER TABLE public.passengers
  ALTER COLUMN mobility_need SET DEFAULT 'walking';
