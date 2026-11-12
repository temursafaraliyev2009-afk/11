-- supabase/migrations/20261028_staff_and_invitations.sql
-- Savatchi POS — Multi-Device Real-Time Staff & Invitations Architecture
-- This migration establishes secure, cross-device staff invitations and profiles.

-- ============================================================================
-- 1. PROFILES TABLE & AUTH TRIGGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  photo_url TEXT,
  role TEXT DEFAULT 'Foydalanuvchi',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for rapid, case-insensitive email searches
CREATE INDEX IF NOT EXISTS idx_profiles_lower_email ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Idempotentlik: avvalgi siyosatlarni tozalash (qayta ishga tushirilganda xavfsiz)
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Profiles Policies:
-- Authenticated users can search/view profiles (to invite staff by exact email/phone)
CREATE POLICY "Authenticated users can search profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert/update their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Automatic Auth Trigger: Sync auth.users to public.profiles upon signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    first_name,
    last_name,
    role,
    email_verified,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    coalesce(nullif(lower(trim(new.email)), ''), new.id::text || '@placeholder.savatchi.uz'),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Foydalanuvchi'
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
      nullif(split_part(coalesce(trim(new.raw_user_meta_data->>'display_name'), ''), ' ', 1), ''),
      'Foydalanuvchi'
    ),
    coalesce(nullif(trim(new.raw_user_meta_data->>'last_name'), ''), ''),
    'Foydalanuvchi',
    (new.email_confirmed_at IS NOT NULL),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = coalesce(nullif(lower(trim(excluded.email)), ''), public.profiles.email),
    email_verified = (new.email_confirmed_at IS NOT NULL),
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Safe Backfill: Populate public.profiles for pre-existing auth.users (e.g. existing accounts)
-- Reads from auth.users (NO writes or deletes to auth.users or auth.identities)
-- Uses ON CONFLICT (id) DO NOTHING to preserve any existing profile data without overwriting.
-- Hardcodes safest least-privilege role ('Foydalanuvchi') and never trusts raw_user_meta_data role.
INSERT INTO public.profiles (
  id,
  email,
  display_name,
  first_name,
  last_name,
  role,
  email_verified,
  created_at,
  updated_at
)
SELECT
  u.id,
  coalesce(nullif(lower(trim(u.email)), ''), u.id::text || '@placeholder.savatchi.uz'),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Foydalanuvchi'
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'first_name'), ''),
    nullif(split_part(coalesce(trim(u.raw_user_meta_data->>'display_name'), ''), ' ', 1), ''),
    'Foydalanuvchi'
  ),
  coalesce(nullif(trim(u.raw_user_meta_data->>'last_name'), ''), ''),
  'Foydalanuvchi',
  (u.email_confirmed_at IS NOT NULL),
  coalesce(u.created_at, now()),
  coalesce(u.updated_at, now())
FROM auth.users u
WHERE u.id IS NOT NULL
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 2. STAFF INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  store_type TEXT NOT NULL,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_name TEXT,
  from_user_email TEXT,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  initial_role TEXT DEFAULT 'Xodim',
  status TEXT DEFAULT 'Kutilmoqda' CHECK (status IN ('Kutilmoqda', 'Qabul qilindi', 'Rad etildi', 'Bekor qilindi')),
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_store ON public.staff_invitations(store_id);
CREATE INDEX IF NOT EXISTS idx_invitations_to_email ON public.staff_invitations(lower(to_email));
CREATE INDEX IF NOT EXISTS idx_invitations_to_user ON public.staff_invitations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_from_user ON public.staff_invitations(from_user_id);

-- Enable RLS on staff_invitations
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Idempotentlik: avvalgi siyosatlarni tozalash
DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.staff_invitations;
DROP POLICY IF EXISTS "Store owners can send invitations" ON public.staff_invitations;
DROP POLICY IF EXISTS "Participants can respond to invitations" ON public.staff_invitations;

-- Invitations Policies:
-- 1. SELECT: Sender can view invitations they sent; Recipient can view invitations sent to their email or user_id
CREATE POLICY "Users can view relevant invitations"
  ON public.staff_invitations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = from_user_id OR
    auth.uid() = to_user_id OR
    lower(to_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

-- 2. INSERT: Only store owner/sender can insert their own invitation
CREATE POLICY "Store owners can send invitations"
  ON public.staff_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = from_user_id
  );

-- 3. UPDATE: Recipient can update status to 'Qabul qilindi' or 'Rad etildi'; Sender can cancel ('Bekor qilindi')
CREATE POLICY "Participants can respond to invitations"
  ON public.staff_invitations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = from_user_id OR
    auth.uid() = to_user_id OR
    lower(to_email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
  WITH CHECK (
    auth.uid() = from_user_id OR
    auth.uid() = to_user_id OR
    lower(to_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );


-- ============================================================================
-- 3. STORE EMPLOYEES TABLE (Cloud Multi-Device Staff Registry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.store_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'Xodim',
  status TEXT DEFAULT 'Faol',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (store_id, email)
);

CREATE INDEX IF NOT EXISTS idx_store_employees_store ON public.store_employees(store_id);
CREATE INDEX IF NOT EXISTS idx_store_employees_user ON public.store_employees(user_id);

ALTER TABLE public.store_employees ENABLE ROW LEVEL SECURITY;

-- Helper: Do'kon a'zoligi yoki egaligini xavfsiz tekshirish (RLS recursion oldini olish uchun)
CREATE OR REPLACE FUNCTION public.is_store_member(check_store_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := lower(coalesce(auth.jwt()->>'email', ''));
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Taklif yuborgan do'kon egasi ekanligini tekshirish
  IF EXISTS (
    SELECT 1 FROM public.staff_invitations
    WHERE store_id = check_store_id AND from_user_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Ushbu do'konda xodim ekanligini tekshirish
  IF EXISTS (
    SELECT 1 FROM public.store_employees
    WHERE store_id = check_store_id
      AND (user_id = v_uid OR lower(email) = v_email)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_store_member(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.is_store_member(TEXT) TO authenticated;

-- Idempotentlik: avvalgi siyosatlarni tozalash (eski USING(true) yoki FOR ALL siyosatlarini olib tashlash)
DROP POLICY IF EXISTS "Store staff and owners can view store employees" ON public.store_employees;
DROP POLICY IF EXISTS "Store owners and servers can manage employees" ON public.store_employees;
DROP POLICY IF EXISTS "Authenticated users can view store employees" ON public.store_employees;
DROP POLICY IF EXISTS "Store members and owners can view store employees" ON public.store_employees;
DROP POLICY IF EXISTS "Users can be added as employees via RPC" ON public.store_employees;
DROP POLICY IF EXISTS "Employees can update own record" ON public.store_employees;

-- Store Employees Policies:
-- SELECT: Faqat tegishli do'kon egasi yoki xodimlari ko'ra oladi (begonalar ko'ra olmaydi)
CREATE POLICY "Store members and owners can view store employees"
  ON public.store_employees
  FOR SELECT
  TO authenticated
  USING (
    public.is_store_member(store_id)
  );

-- INSERT: To'g'ridan-to'g'ri INSERT taqiqlanadi.
-- Xodim qo'shish FAQAT accept_staff_invitation_rpc (SECURITY DEFINER) orqali amalga oshadi.
-- SECURITY DEFINER RLS ni chetlab o'tadi, shuning uchun INSERT siyosati kerak emas.
-- INSERT siyosati yo'qligi = RLS yoqilgan holda har qanday to'g'ridan-to'g'ri INSERT rad etiladi.

-- UPDATE: Faqat o'z yozuvini o'zgartirish mumkin
CREATE POLICY "Employees can update own record"
  ON public.store_employees
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: To'g'ridan-to'g'ri o'chirish taqiqlanadi.
-- Do'kon egasi xodimni faqat xavfsiz remove_store_employee_rpc orqali o'chirishi mumkin.
-- DELETE siyosati yo'q = to'g'ridan-to'g'ri DELETE rad etiladi.


-- ============================================================================
-- 4. SECURE RPC: ACCEPT INVITATION SERVER TRANSACTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_staff_invitation_rpc(p_invitation_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_invitation RECORD;
  v_current_user_id UUID := auth.uid();
  v_current_user_email TEXT := lower(coalesce(auth.jwt()->>'email', ''));
  v_new_emp_id UUID;
BEGIN
  -- 1. Ensure user is authenticated
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Avtorizatsiya talab etiladi!';
  END IF;

  -- 2. Fetch invitation
  SELECT * INTO v_invitation
  FROM public.staff_invitations
  WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Taklif topilmadi!';
  END IF;

  -- 3. Check invitation status
  IF v_invitation.status != 'Kutilmoqda' THEN
    RAISE EXCEPTION 'Ushbu taklif allaqachon ko‘rib chiqilgan (Holati: %)', v_invitation.status;
  END IF;

  -- 4. Verify that the authenticated user is the intended recipient
  --    Mantiq: agar email MOS KELMASA VA (user_id berilmagan YOKI user_id ham mos kelmasa) → rad etish
  IF lower(v_invitation.to_email) != v_current_user_email AND (v_invitation.to_user_id IS NULL OR v_invitation.to_user_id != v_current_user_id) THEN
    RAISE EXCEPTION 'Siz ushbu taklifning qabul qiluvchisi emassiz!';
  END IF;

  -- 5. Add to store_employees
  INSERT INTO public.store_employees (
    store_id,
    user_id,
    name,
    email,
    role,
    status,
    joined_at
  ) VALUES (
    v_invitation.store_id,
    v_current_user_id,
    coalesce(auth.jwt()->>'name', split_part(v_current_user_email, '@', 1)),
    v_current_user_email,
    'Xodim',
    'Faol',
    now()
  )
  ON CONFLICT (store_id, email) DO UPDATE SET
    role = 'Xodim',
    status = 'Faol'
  RETURNING id INTO v_new_emp_id;

  -- 6. Update invitation status
  UPDATE public.staff_invitations
  SET
    status = 'Qabul qilindi',
    to_user_id = v_current_user_id,
    responded_at = now()
  WHERE id = p_invitation_id;

  -- 7. Update user profile role in profiles
  UPDATE public.profiles
  SET role = 'Xodim', updated_at = now()
  WHERE id = v_current_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'storeId', v_invitation.store_id,
    'employeeId', v_new_emp_id,
    'role', 'Xodim'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.accept_staff_invitation_rpc(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_staff_invitation_rpc(UUID) TO authenticated;


-- ============================================================================
-- 5. SECURE RPC: REMOVE STORE EMPLOYEE (DO'KON EGASI TOMONIDAN XODIMNI O'CHIRISH)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.remove_store_employee_rpc(
  p_store_id TEXT,
  p_employee_id UUID DEFAULT NULL,
  p_employee_email TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_email TEXT := lower(coalesce(auth.jwt()->>'email', ''));
  v_employee RECORD;
  v_is_owner BOOLEAN := false;
BEGIN
  -- 1. Avtorizatsiya tekshiruvi
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Avtorizatsiya talab etiladi!';
  END IF;

  -- 2. Do'kon egasini tekshirish (ushbu do'konga taklif yuborgan egasi)
  IF EXISTS (
    SELECT 1 FROM public.staff_invitations
    WHERE store_id = p_store_id AND from_user_id = v_caller_id
  ) THEN
    v_is_owner := true;
  END IF;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Faqat do‘kon egasi xodimlarni o‘chirish huquqiga ega!';
  END IF;

  -- 3. O'chiriladigan xodimni qidirish
  SELECT * INTO v_employee
  FROM public.store_employees
  WHERE store_id = p_store_id
    AND (
      (p_employee_id IS NOT NULL AND id = p_employee_id) OR
      (p_employee_email IS NOT NULL AND lower(email) = lower(p_employee_email))
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Xodim topilmadi!';
  END IF;

  -- 4. Do'kon egasini xodimlar ro'yxatidan o'chirib yuborishdan himoya
  IF (v_employee.user_id = v_caller_id) OR (lower(v_employee.email) = v_caller_email) THEN
    RAISE EXCEPTION 'Do‘kon egasini xodimlar ro‘yxatidan o‘chirib bo‘lmaydi!';
  END IF;

  -- 5. store_employees jadvalidan xavfsiz o'chirish
  DELETE FROM public.store_employees
  WHERE id = v_employee.id;

  -- 6. Tegishli takliflarni 'Bekor qilindi' holatiga o'tkazish
  UPDATE public.staff_invitations
  SET
    status = 'Bekor qilindi',
    responded_at = now()
  WHERE store_id = p_store_id
    AND (
      (v_employee.user_id IS NOT NULL AND to_user_id = v_employee.user_id) OR
      lower(to_email) = lower(v_employee.email)
    );

  -- 7. Agar ushbu foydalanuvchi boshqa biron do'konda xodim bo'lmasa,
  -- uning tizimdagi rolini 'Foydalanuvchi'ga qaytarish
  IF v_employee.user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.store_employees
      WHERE user_id = v_employee.user_id
    ) THEN
      UPDATE public.profiles
      SET role = 'Foydalanuvchi', updated_at = now()
      WHERE id = v_employee.user_id AND role = 'Xodim';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Xodim muvaffaqiyatli o‘chirildi',
    'employeeId', v_employee.id,
    'storeId', p_store_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.remove_store_employee_rpc(TEXT, UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.remove_store_employee_rpc(TEXT, UUID, TEXT) TO authenticated;


