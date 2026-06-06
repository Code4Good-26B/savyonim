-- Restore execution permission required by RLS policy evaluation
-- Policies reference public.get_auth_user_role(), so callers need execute.

GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated, anon;
