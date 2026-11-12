-- ============================================================================
-- Savatchi POS — Owner-Wide Unified Staffing (Phase 2.0 & 2.2 Security Hardened)
-- Migration: 20261111_owner_wide_unified_staffing.sql
-- Description:
--   1. store_employees.owner_id ustunini qo'shadi (Owner-wide membership)
--   2. Xavfsiz backfill: 1-prioritet stores.owner_id, 2-prioritet staff_invitations (Qabul qilindi)
--   3. is_store_member() ga Owner-wide qat'iy tekshiruv qo'shadi
--   4. accept_staff_invitation_rpc: stores.owner_id va from_user_id mosligini qat'iy tekshiradi
--   5. remove_store_employee_rpc: Owner'ning barcha do'konlaridan kaskadli o'chiradi
--   6. staff_invitations INSERT RLS: Faqat do'kon egasi taklif yubora oladi (begonalar bloklanadi)
--   7. store_employees BEFORE UPDATE TRIGGER: owner_id, user_id, store_id, role, status himoyasi
--   8. store_employees SELECT va UPDATE RLS siyosatlarini yangilaydi
-- Idempotent: Bir necha marta xavfsiz bajarilishi mumkin.
-- ============================================================================

-- ============================================================================
-- 1. store_employees GA owner_id USTUNI QO'SHISH
-- ============================================================================

ALTER TABLE public.store_employees
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_store_employees_owner
  ON public.store_employees(owner_id);

CREATE INDEX IF NOT EXISTS idx_store_employees_owner_user
  ON public.store_employees(owner_id, user_id)
  WHERE owner_id IS NOT NULL;


-- ============================================================================
-- 2. MAVJUD YOZUVLARNI XAVFSIZ BACKFILL QILISH (XAVFSIZ PRIORITET)
-- ============================================================================

-- 2a. 1-PRIORITET: stores.owner_id orqali to'ldirish (Eng ishonchli rasmiy manba)
UPDATE public.store_employees se
SET owner_id = s.owner_id
FROM public.stores s
WHERE se.store_id = s.id
  AND se.owner_id IS NULL
  AND s.owner_id IS NOT NULL;

-- 2b. 2-PRIORITET (FALLBACK): Faqat stores da topilmagan eski holatlar uchun,
--     faqat 'Qabul qilindi' holatidagi haqiqiy taklifnomalardan olinadi
UPDATE public.store_employees se
SET owner_id = (
  SELECT si.from_user_id
  FROM public.staff_invitations si
  WHERE si.store_id = se.store_id
    AND si.from_user_id IS NOT NULL
    AND si.status = 'Qabul qilindi'
  ORDER BY si.responded_at DESC NULLS LAST, si.created_at DESC
  LIMIT 1
)
WHERE se.owner_id IS NULL;

-- 2c. Tekshiruv va hisobot
DO $$
DECLARE
  v_null_count INT;
  v_total_count INT;
  v_assigned_count INT;
BEGIN
  SELECT COUNT(*) INTO v_total_count FROM public.store_employees;
  SELECT COUNT(*) INTO v_null_count FROM public.store_employees WHERE owner_id IS NULL;
  v_assigned_count := v_total_count - v_null_count;

  RAISE NOTICE '[Owner-Wide Staffing Backfill] Jami: % ta xodim. To''ldirildi: % ta. NULL qolgan: % ta.',
    v_total_count, v_assigned_count, v_null_count;

  IF v_null_count > 0 THEN
    RAISE WARNING '[Owner-Wide Staffing Backfill] DIQQAT: % ta xodimning do''kon egasi aniqlanmadi (stores va invitations da do''kon topilmadi). Taxminiy bog''lanish qilinmadi.', v_null_count;
  END IF;
END $$;


-- ============================================================================
-- 3. is_store_member() FUNKSIYASINI OWNER-WIDE MODELGA YANGILASH
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_store_member(check_store_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid            UUID := auth.uid();
  v_email          TEXT := lower(coalesce(auth.jwt()->>'email', ''));
  v_store_owner_id UUID;
BEGIN
  -- Autentifikatsiya tekshiruvi
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Do'kon egasini aniqlash
  SELECT owner_id INTO v_store_owner_id
  FROM public.stores
  WHERE id = check_store_id;

  -- 1. Do'kon egasining o'zi (stores.owner_id bo'yicha)
  IF v_store_owner_id IS NOT NULL AND v_store_owner_id = v_uid THEN
    RETURN TRUE;
  END IF;

  -- 2. staff_invitations orqali eski mos kelish (backward compatibility)
  IF EXISTS (
    SELECT 1 FROM public.staff_invitations
    WHERE store_id = check_store_id AND from_user_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. OWNER-WIDE MEMBERSHIP:
  --    Agar do'kon stores jadvalida mavjud bo'lsa, xodim aynan shu Owner'ning
  --    boshqa do'konida faol xodim bo'lsa — ruxsat berish.
  IF v_store_owner_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.store_employees
      WHERE owner_id = v_store_owner_id
        AND (user_id = v_uid OR lower(email) = v_email)
        AND status = 'Faol'
    ) THEN
      RETURN TRUE;
    END IF;
  ELSE
    -- 4. stores jadvalida topilmagan eski do'konlar uchun to'g'ridan-to'g'ri store_id bo'yicha
    IF EXISTS (
      SELECT 1 FROM public.store_employees
      WHERE store_id = check_store_id
        AND (user_id = v_uid OR lower(email) = v_email)
        AND status = 'Faol'
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_store_member(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.is_store_member(TEXT) TO authenticated;


-- ============================================================================
-- 4. staff_invitations INSERT RLS SIYOSATINI MUSTAHKAMLASH
--    Faqat do'konning haqiqiy egasi (stores.owner_id = auth.uid()) taklif yubora oladi!
-- ============================================================================

DROP POLICY IF EXISTS "Store owners can send invitations" ON public.staff_invitations;

CREATE POLICY "Store owners can send invitations"
  ON public.staff_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = from_user_id
    AND
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = store_id AND owner_id = auth.uid()
    )
  );


-- ============================================================================
-- 5. accept_staff_invitation_rpc NI YANGILASH (XAVFSIZLIK TEKSHIRUVI BILAN)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_staff_invitation_rpc(p_invitation_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_invitation         RECORD;
  v_current_user_id    UUID := auth.uid();
  v_current_user_email TEXT := lower(coalesce(auth.jwt()->>'email', ''));
  v_store_owner_id     UUID;
  v_new_emp_id         UUID;
BEGIN
  -- 1. Autentifikatsiya tekshiruvi
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Avtorizatsiya talab etiladi!';
  END IF;

  -- 2. Taklifni olish
  SELECT * INTO v_invitation
  FROM public.staff_invitations
  WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Taklif topilmadi!';
  END IF;

  -- 3. Taklif holatini tekshirish
  IF v_invitation.status != 'Kutilmoqda' THEN
    RAISE EXCEPTION 'Ushbu taklif allaqachon ko''rib chiqilgan (Holati: %)', v_invitation.status;
  END IF;

  -- 4. Qabul qiluvchi tekshiruvi (faqat tegishli foydalanuvchi qabul qilsin)
  IF lower(v_invitation.to_email) != v_current_user_email
     AND (v_invitation.to_user_id IS NULL OR v_invitation.to_user_id != v_current_user_id)
  THEN
    RAISE EXCEPTION 'Siz ushbu taklifning qabul qiluvchisi emassiz!';
  END IF;

  -- 5. DO'KONNING HAQIQIY EGASINI TEKSHIRISH (HIGH VULNERABILITY FIX)
  SELECT owner_id INTO v_store_owner_id
  FROM public.stores
  WHERE id = v_invitation.store_id;

  IF v_store_owner_id IS NULL THEN
    RAISE EXCEPTION 'Do''kon topilmadi yoki uning egasi aniqlanmagan!';
  END IF;

  IF v_store_owner_id != v_invitation.from_user_id THEN
    RAISE EXCEPTION 'Xavfsizlik xatosi: Taklif yuborgan foydalanuvchi ushbu do''konning haqiqiy egasi emas!';
  END IF;

  -- 6. RPC ichidagi INSERT/UPDATE uchun guard bypass flagini yoqish
  PERFORM set_config('savatchi.bypass_employee_guard', 'on', true);

  -- 7. store_employees ga qo'shish yoki yangilash (stores.owner_id bilan)
  INSERT INTO public.store_employees (
    store_id,
    owner_id,
    user_id,
    name,
    email,
    role,
    status,
    joined_at
  ) VALUES (
    v_invitation.store_id,
    v_store_owner_id,     -- Ishonchli stores.owner_id
    v_current_user_id,
    coalesce(auth.jwt()->>'name', split_part(v_current_user_email, '@', 1)),
    v_current_user_email,
    'Xodim',
    'Faol',
    now()
  )
  ON CONFLICT (store_id, email) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    role     = 'Xodim',
    status   = 'Faol',
    user_id  = EXCLUDED.user_id
  RETURNING id INTO v_new_emp_id;

  -- 8. Taklif holatini yangilash
  UPDATE public.staff_invitations
  SET
    status       = 'Qabul qilindi',
    to_user_id   = v_current_user_id,
    responded_at = now()
  WHERE id = p_invitation_id;

  -- 9. Profil rolini yangilash
  UPDATE public.profiles
  SET role = 'Xodim', updated_at = now()
  WHERE id = v_current_user_id;

  -- 10. Guard bypass flagini qayta o'chirish
  PERFORM set_config('savatchi.bypass_employee_guard', 'off', true);

  RETURN jsonb_build_object(
    'success',    true,
    'storeId',    v_invitation.store_id,
    'ownerId',    v_store_owner_id,
    'employeeId', v_new_emp_id,
    'role',       'Xodim'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.accept_staff_invitation_rpc(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_staff_invitation_rpc(UUID) TO authenticated;


-- ============================================================================
-- 6. remove_store_employee_rpc NI OWNER-WIDE MODELGA YANGILASH
-- ============================================================================

CREATE OR REPLACE FUNCTION public.remove_store_employee_rpc(
  p_store_id       TEXT,
  p_employee_id    UUID DEFAULT NULL,
  p_employee_email TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_caller_id     UUID := auth.uid();
  v_caller_email  TEXT := lower(coalesce(auth.jwt()->>'email', ''));
  v_employee      RECORD;
  v_is_owner      BOOLEAN := false;
  v_deleted_count INT := 0;
BEGIN
  -- 1. Autentifikatsiya tekshiruvi
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Avtorizatsiya talab etiladi!';
  END IF;

  -- 2. Owner ekanligini tekshirish
  IF EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND owner_id = v_caller_id
  ) THEN
    v_is_owner := true;
  END IF;

  IF NOT v_is_owner AND EXISTS (
    SELECT 1 FROM public.staff_invitations
    WHERE store_id = p_store_id AND from_user_id = v_caller_id
  ) THEN
    v_is_owner := true;
  END IF;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Faqat do''kon egasi xodimlarni o''chirish huquqiga ega!';
  END IF;

  -- 3. O'chiriladigan xodimni aniqlash
  SELECT * INTO v_employee
  FROM public.store_employees
  WHERE store_id = p_store_id
    AND (
      (p_employee_id    IS NOT NULL AND user_id = p_employee_id) OR
      (p_employee_id    IS NOT NULL AND id      = p_employee_id) OR
      (p_employee_email IS NOT NULL AND lower(email) = lower(p_employee_email))
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Xodim topilmadi!';
  END IF;

  -- 4. Do'kon egasini o'chirishdan himoya
  IF (v_employee.user_id = v_caller_id) OR (lower(v_employee.email) = v_caller_email) THEN
    RAISE EXCEPTION 'Do''kon egasini xodimlar ro''yxatidan o''chirib bo''lmaydi!';
  END IF;

  -- 5. Guard bypass flagini yoqish
  PERFORM set_config('savatchi.bypass_employee_guard', 'on', true);

  -- 6. OWNER-WIDE O'CHIRISH:
  --    Owner'ga (v_caller_id) tegishli barcha do'konlardagi ushbu xodim yozuvlarini o'chirish
  DELETE FROM public.store_employees
  WHERE owner_id = v_caller_id
    AND (
      (v_employee.user_id IS NOT NULL AND user_id = v_employee.user_id) OR
      (lower(email) = lower(v_employee.email))
    );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- 7. Barcha tegishli takliflarni 'Bekor qilindi' holatiga o'tkazish
  UPDATE public.staff_invitations
  SET
    status       = 'Bekor qilindi',
    responded_at = now()
  WHERE from_user_id = v_caller_id
    AND status IN ('Kutilmoqda', 'Qabul qilindi')
    AND (
      (v_employee.user_id IS NOT NULL AND to_user_id = v_employee.user_id) OR
      lower(to_email) = lower(v_employee.email)
    );

  -- 8. Agar bu xodim boshqa hech qaysi do'konda qolmagan bo'lsa, rolini 'Foydalanuvchi'ga qaytarish
  IF v_employee.user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.store_employees
      WHERE user_id = v_employee.user_id
        AND status  = 'Faol'
    ) THEN
      UPDATE public.profiles
      SET role = 'Foydalanuvchi', updated_at = now()
      WHERE id = v_employee.user_id AND role = 'Xodim';
    END IF;
  END IF;

  -- 9. Guard bypass flagini qayta o'chirish
  PERFORM set_config('savatchi.bypass_employee_guard', 'off', true);

  RETURN jsonb_build_object(
    'success',       true,
    'message',       format('Xodim muvaffaqiyatli o''chirildi (%s ta yozuv)', v_deleted_count),
    'employeeEmail', v_employee.email,
    'deletedCount',  v_deleted_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.remove_store_employee_rpc(TEXT, UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.remove_store_employee_rpc(TEXT, UUID, TEXT) TO authenticated;


-- ============================================================================
-- 7. store_employees MAYDONLARINI HIMOYA QILUVCHI TRIGGER (CRITICAL FIX)
--    Xodim owner_id, user_id, store_id, role, status qiymatlarini o'zgartira olmaydi.
--    Faqat name, phone kabi ruxsat etilgan maydonlarni yangilay oladi.
--    Owner esa xodim roli va statusini boshqara oladi.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_protect_store_employee_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_owner  BOOLEAN := false;
BEGIN
  -- 1. Server RPC maxsus tranzaksiyalari uchun bypass
  IF current_setting('savatchi.bypass_employee_guard', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- 2. Agar huquqiy va kalit maydonlar o'zgarmagan bo'lsa (faqat name, phone va h.k.) -> Ruxsat
  IF (NEW.owner_id IS NOT DISTINCT FROM OLD.owner_id)
     AND (NEW.user_id IS NOT DISTINCT FROM OLD.user_id)
     AND (NEW.store_id IS NOT DISTINCT FROM OLD.store_id)
     AND (NEW.role IS NOT DISTINCT FROM OLD.role)
     AND (NEW.status IS NOT DISTINCT FROM OLD.status) THEN
    RETURN NEW;
  END IF;

  -- 3. owner_id maydonini himoyalash
  IF (NEW.owner_id IS DISTINCT FROM OLD.owner_id) THEN
    -- Agar OLD.owner_id allaqachon mavjud bo'lsa, uni mutlaqo o'zgartirib bo'lmaydi
    IF OLD.owner_id IS NOT NULL THEN
      RAISE EXCEPTION 'Xavfsizlik cheklovi: store_employees.owner_id maydonini o''zgartirish qat''iyan taqiqlangan!';
    END IF;

    -- Agar OLD.owner_id NULL bo'lsa (eski ma'lumotlar):
    -- Oddiy xodim o'zboshimchalik bilan o'rnatolmaydi, faqat do'kon egasi o'rnatishi mumkin
    IF v_caller_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.stores WHERE id = OLD.store_id AND owner_id = v_caller_id
    ) THEN
      RAISE EXCEPTION 'Xavfsizlik cheklovi: store_employees.owner_id maydonini o''rnatish huquqi faqat do''kon egasiga berilgan!';
    END IF;

    IF v_caller_id IS NOT NULL AND NEW.owner_id != v_caller_id THEN
      RAISE EXCEPTION 'Xavfsizlik cheklovi: Do''kon egasi faqat o''z ID sini tayinlashi mumkin!';
    END IF;
  END IF;

  IF (NEW.user_id IS DISTINCT FROM OLD.user_id) OR (NEW.store_id IS DISTINCT FROM OLD.store_id) THEN
    RAISE EXCEPTION 'Xavfsizlik cheklovi: user_id yoki store_id maydonini o''zgartirish taqiqlangan!';
  END IF;

  -- 4. role yoki status o'zgarishi faqat vakolatli Owner tomonidan ruxsat etiladi
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    IF v_caller_id IS NOT NULL THEN
      IF (OLD.owner_id IS NOT NULL AND OLD.owner_id = v_caller_id)
         OR EXISTS (SELECT 1 FROM public.stores WHERE id = OLD.store_id AND owner_id = v_caller_id) THEN
        v_is_owner := true;
      END IF;
    END IF;

    IF NOT v_is_owner THEN
      RAISE EXCEPTION 'Xavfsizlik cheklovi: Xodim o''z roli yoki statusini o''zgartira olmaydi!';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_store_employee_fields ON public.store_employees;

CREATE TRIGGER trg_check_store_employee_fields
  BEFORE UPDATE ON public.store_employees
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_store_employee_fields();


-- ============================================================================
-- 8. store_employees RLS SIYOSATLARINI QAYTA QURISH
-- ============================================================================

DROP POLICY IF EXISTS "Store members and owners can view store employees" ON public.store_employees;
DROP POLICY IF EXISTS "Employees can update own record" ON public.store_employees;
DROP POLICY IF EXISTS "Store staff and owners can update employees" ON public.store_employees;

CREATE POLICY "Store members and owners can view store employees"
  ON public.store_employees
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR
    public.is_store_member(store_id)
  );

CREATE POLICY "Store staff and owners can update employees"
  ON public.store_employees
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR owner_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid() OR owner_id = auth.uid()
  );
