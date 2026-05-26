
REVOKE EXECUTE ON FUNCTION public.claim_role_with_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_role_with_invite(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
