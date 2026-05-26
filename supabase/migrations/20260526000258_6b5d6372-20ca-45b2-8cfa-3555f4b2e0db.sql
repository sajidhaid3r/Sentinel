
-- 1. Remove insecure insert policy
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- 2. Update signup trigger to auto-assign citizen role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citizen'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate auth trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Role invites table for elevated roles
CREATE TABLE IF NOT EXISTS public.role_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  role app_role NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_by uuid,
  used_at timestamptz,
  expires_at timestamptz
);

ALTER TABLE public.role_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invites" ON public.role_invites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'government'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'government'));

-- 4. Secure role-claim function
CREATE OR REPLACE FUNCTION public.claim_role_with_invite(_code text)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite public.role_invites%ROWTYPE;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _invite FROM public.role_invites
    WHERE code = _code AND used_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _invite.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.role_invites
    SET used_by = _uid, used_at = now()
    WHERE id = _invite.id;

  RETURN _invite.role;
END;
$$;

-- 5. Seed bootstrap admin invite (one-time use) for initial setup
INSERT INTO public.role_invites (code, role, expires_at)
VALUES ('SENTINEL-BOOTSTRAP-ADMIN', 'admin', now() + interval '30 days')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_invites (code, role, expires_at)
VALUES ('SENTINEL-BOOTSTRAP-GOV', 'government', now() + interval '30 days')
ON CONFLICT (code) DO NOTHING;

-- 6. Add unique constraint on user_roles to support ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_role_unique'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role);
  END IF;
END $$;
