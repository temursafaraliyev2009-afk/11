-- ============================================================================
-- Savatchi POS — Stores & Products Integrity Hardening (Phase 3.0.4)
-- Migration: 20261104_stores_products_integrity_hardening.sql
-- Description: Hardens and decouples PK and FK integrity checks using native
--              PostgreSQL system catalogs (pg_constraint, pg_class, pg_attribute):
--   1. Prerequisite verification: checks public.stores and public.products.
--   2. Primary Key Hardening:
--      - Accurately checks public.products PK column order (store_id, id).
--      - Validates no duplicate (store_id, id) exists before altering.
--      - Replaces legacy single-column PK without CASCADE.
--   3. Foreign Key Hardening:
--      - Completely decoupled from Primary Key status.
--      - Verifies products.store_id -> public.stores(id).
--      - Ensures ON DELETE RESTRICT (confdeltype = 'r').
--      - Replaces CASCADE FK or missing FK safely without touching other FKs.
--   4. Zero destructive commands (No DROP TABLE, TRUNCATE, DROP SCHEMA, CASCADE).
-- Idempotent: 100% safe to execute repeatedly across any existing schema state.
-- ============================================================================

DO $$
DECLARE
  v_dup_count INT := 0;
  v_null_count INT := 0;
  v_pk_name TEXT;
  v_pk_columns TEXT[];
  v_fk_count INT := 0;
  v_fk_name TEXT;
  v_confdeltype "char";
  v_ref_schema TEXT;
  v_ref_table TEXT;
  v_ref_col TEXT;
BEGIN
  -- ==========================================================================
  -- 1. PREREQUISITE TEKSHIRUVI
  -- ==========================================================================
  IF to_regclass('public.stores') IS NULL THEN
    RAISE EXCEPTION 'Integrity hardening to''xtatildi: public.stores jadvali mavjud emas. Avval 20261102 yoki 20261103 migratsiyasini qo''llang.';
  END IF;

  IF to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION 'Integrity hardening to''xtatildi: public.products jadvali mavjud emas. Avval 20261102 yoki 20261103 migratsiyasini qo''llang.';
  END IF;

  -- ==========================================================================
  -- 2. PRIMARY KEY XAVFSIZLIGI VA KOMPOZIT KALIT TEKSHIRUVI
  -- ==========================================================================

  -- A) Takroriy (store_id, id) juftliklari mavjud emasligini tekshirish
  SELECT count(*) INTO v_dup_count
  FROM (
    SELECT store_id, id
    FROM public.products
    GROUP BY store_id, id
    HAVING count(*) > 1
  ) dup;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Integrity hardening to''xtatildi: public.products jadvalida takroriy (store_id, id) juftliklari mavjud (jami % ta guruh). Ma''lumotlar o''chirilmadi.', v_dup_count;
  END IF;

  -- B) store_id yoki id NULL bo'lgan qatorlar yo'qligini tekshirish
  SELECT count(*) INTO v_null_count
  FROM public.products
  WHERE store_id IS NULL OR id IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Integrity hardening to''xtatildi: public.products jadvalida store_id yoki id NULL bo''lgan % ta qator mavjud.', v_null_count;
  END IF;

  -- C) products jadvalining amaldagi PRIMARY KEY constraintini va ustunlar tartibini aniqlash
  SELECT
    c.conname,
    array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum))
  INTO v_pk_name, v_pk_columns
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE n.nspname = 'public'
    AND t.relname = 'products'
    AND c.contype = 'p'
  GROUP BY c.conname, c.conkey;

  -- D) PK holatiga ko'ra xavfsiz boshqarish:
  IF v_pk_columns = ARRAY['store_id', 'id'] THEN
    -- PK allaqachon to'g'ri kompozit holatda: o'zgartirish shart emas
    RAISE NOTICE 'public.products PRIMARY KEY allaqachon (store_id, id) kompozit holatida: %', v_pk_name;
  ELSE
    -- Agar eski PK mavjud bo'lsa (masalan faqat id), uni CASCADE ishlatmasdan olib tashlaymiz
    IF v_pk_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.products DROP CONSTRAINT ' || quote_ident(v_pk_name);
      RAISE NOTICE 'Eski PRIMARY KEY (%) olib tashlandi.', v_pk_name;
    END IF;

    -- Yangi kompozit PK (store_id, id) qo'shish
    ALTER TABLE public.products ADD CONSTRAINT products_pkey PRIMARY KEY (store_id, id);
    RAISE NOTICE 'Yangi kompozit PRIMARY KEY (store_id, id) muvaffaqiyatli o''rnatildi.';
  END IF;

  -- ==========================================================================
  -- 3. FOREIGN KEY XAVFSIZLIGI (PK DAN BUTUNLAY AJRATILGAN HOLDA)
  -- ==========================================================================

  -- A) products.store_id ustunidagi FK lar sonini aniqlash
  SELECT count(DISTINCT c.conname) INTO v_fk_count
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE n.nspname = 'public'
    AND t.relname = 'products'
    AND c.contype = 'f'
    AND a.attname = 'store_id';

  -- B) Agar 1 tadan ko'p noaniq FK topilsa, ko'r-ko'rona o'chirmasdan to'xtatish
  IF v_fk_count > 1 THEN
    RAISE EXCEPTION 'Integrity hardening to''xtatildi: public.products.store_id ustunida bir nechta (%) FK constraint mavjud. Migratsiyani davom ettirishdan oldin qo''lda tekshiring.', v_fk_count;
  END IF;

  -- C) Agar aynan 1 ta FK mavjud bo'lsa, uning bog'lanish va qoidalarini tekshirish
  IF v_fk_count = 1 THEN
    SELECT
      c.conname,
      c.confdeltype,
      fn.nspname,
      ft.relname,
      fa.attname
    INTO
      v_fk_name,
      v_confdeltype,
      v_ref_schema,
      v_ref_table,
      v_ref_col
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    JOIN pg_class ft ON c.confrelid = ft.oid
    JOIN pg_namespace fn ON ft.relnamespace = fn.oid
    JOIN pg_attribute fa ON fa.attrelid = ft.oid AND fa.attnum = ANY(c.confkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'products'
      AND c.contype = 'f'
      AND a.attname = 'store_id'
    LIMIT 1;

    -- FK aynan public.stores(id) ga bog'langanligini tekshirish
    IF v_ref_schema <> 'public' OR v_ref_table <> 'stores' OR v_ref_col <> 'id' THEN
      RAISE EXCEPTION 'Integrity hardening to''xtatildi: products.store_id ustunidagi FK public.stores(id) ga emas, %.%(%) ga bog''langan.', v_ref_schema, v_ref_table, v_ref_col;
    END IF;

    -- ON DELETE qoidasi RESTRICT ('r') ekanligini tekshirish
    IF v_confdeltype = 'r' THEN
      RAISE NOTICE 'products.store_id -> public.stores(id) FK allaqachon ON DELETE RESTRICT holatida: %', v_fk_name;
    ELSE
      -- Agar qoida RESTRICT bo'lmasa (masalan CASCADE 'c'), eski FK ni almashtiramiz
      EXECUTE 'ALTER TABLE public.products DROP CONSTRAINT ' || quote_ident(v_fk_name);
      ALTER TABLE public.products
        ADD CONSTRAINT fk_products_store
        FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;
      RAISE NOTICE 'Eski FK (%) almashtirildi -> fk_products_store (ON DELETE RESTRICT).', v_fk_name;
    END IF;

  ELSIF v_fk_count = 0 THEN
    -- FK umuman yo'q bo'lsa, xavfsiz qo'shish
    ALTER TABLE public.products
      ADD CONSTRAINT fk_products_store
      FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;
    RAISE NOTICE 'Yangi fk_products_store (ON DELETE RESTRICT) qo''shildi.';
  END IF;

END $$;

