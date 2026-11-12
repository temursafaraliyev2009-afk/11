-- ============================================================================
-- Savatchi POS — Stores & Products Strict FK & PK Validation (Phase 3.0.6)
-- Migration: 20261105_stores_products_fk_strict_validation.sql
-- Description: Enforces strict single-column cardinality and reference validation
--              for Foreign Key and Primary Key on public.products:
--   1. Prerequisite verification: ensures public.stores and public.products exist.
--   2. Primary Key Strict Validation:
--      - Validates no store_id or id is NULL (aborts without data loss).
--      - Validates no duplicate (store_id, id) pairs exist (aborts without data loss).
--      - Confirms exact composite order (store_id, id).
--      - Safely updates non-compliant PK without CASCADE.
--   3. Foreign Key Strict Validation:
--      - Strictly verifies single-column cardinality: cardinality(conkey) = 1.
--      - Strictly verifies conkey points strictly to products.store_id.
--      - Strictly verifies confrelid is public.stores.
--      - Strictly verifies single-column referenced cardinality: cardinality(confkey) = 1.
--      - Strictly verifies confkey points strictly to stores.id.
--      - Strictly verifies confdeltype = 'r' (ON DELETE RESTRICT).
--      - Rejects composite FKs or FKs pointing to other tables with informative RAISE EXCEPTION.
--      - Rejects multiple ambiguous FKs without blind drops.
--      - Replaces legacy non-RESTRICT FK (e.g. CASCADE) safely without touching other FKs.
--   4. Zero destructive commands (No DROP TABLE, TRUNCATE, DROP SCHEMA, CASCADE).
-- Idempotent: 100% safe to execute repeatedly across any existing schema state.
-- ============================================================================

DO $$
DECLARE
  v_dup_count INT := 0;
  v_null_count INT := 0;
  v_pk_name TEXT;
  v_pk_columns TEXT[];
  v_store_id_attnum INT2;
  v_fk_count INT := 0;
  v_fk_name TEXT;
  v_confdeltype "char";
  v_conkey_len INT;
  v_confkey_len INT;
  v_ref_schema TEXT;
  v_ref_table TEXT;
  v_col_name TEXT;
  v_ref_col_name TEXT;
BEGIN
  -- ==========================================================================
  -- 1. PREREQUISITE TEKSHIRUVI
  -- ==========================================================================
  IF to_regclass('public.stores') IS NULL THEN
    RAISE EXCEPTION 'Prerequisite tekshiruvi to''xtatildi: public.stores jadvali mavjud emas. Avvalgi migratsiyalarni qo''llang.';
  END IF;

  IF to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION 'Prerequisite tekshiruvi to''xtatildi: public.products jadvali mavjud emas. Avvalgi migratsiyalarni qo''llang.';
  END IF;

  -- ==========================================================================
  -- 2. PRIMARY KEY XAVFSIZLIGI VA KOMPOZIT KALIT TEKSHIRUVI
  -- ==========================================================================

  -- A) store_id yoki id NULL bo'lgan qatorlar yo'qligini tekshirish
  SELECT count(*) INTO v_null_count
  FROM public.products
  WHERE store_id IS NULL OR id IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Primary key validation to''xtatildi: public.products jadvalida store_id yoki id NULL bo''lgan % ta qator mavjud. Ma''lumotlar o''chirilmadi.', v_null_count;
  END IF;

  -- B) Takroriy (store_id, id) juftliklari mavjud emasligini tekshirish
  SELECT count(*) INTO v_dup_count
  FROM (
    SELECT store_id, id
    FROM public.products
    GROUP BY store_id, id
    HAVING count(*) > 1
  ) dup;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Primary key validation to''xtatildi: public.products jadvalida takroriy (store_id, id) juftliklari mavjud (% ta guruh). Ma''lumotlar o''chirilmadi.', v_dup_count;
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
  -- 3. FOREIGN KEY STRICT VALIDATION & CARDINALITY ENFORCEMENT
  -- ==========================================================================

  -- A) products.store_id ustunining attnum raqamini aniqlash
  SELECT a.attnum INTO v_store_id_attnum
  FROM pg_attribute a
  JOIN pg_class t ON a.attrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'products'
    AND a.attname = 'store_id'
    AND NOT a.attisdropped;

  IF v_store_id_attnum IS NULL THEN
    RAISE EXCEPTION 'Foreign key validation to''xtatildi: public.products jadvalida "store_id" ustuni topilmadi.';
  END IF;

  -- B) products.store_id ustuniga aloqador barcha FK lar sonini sanash
  SELECT count(DISTINCT c.conname) INTO v_fk_count
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'products'
    AND c.contype = 'f'
    AND v_store_id_attnum = ANY(c.conkey);

  -- C) Agar 1 tadan ko'p noaniq FK topilsa, ko'r-ko'rona o'chirmasdan to'xtatish
  IF v_fk_count > 1 THEN
    RAISE EXCEPTION 'Foreign key validation to''xtatildi: public.products.store_id ustunida bir nechta (%) FK constraint mavjud. Migratsiyani davom ettirishdan oldin qo''lda tekshiring.', v_fk_count;
  END IF;

  -- D) Agar aynan 1 ta FK mavjud bo'lsa, qat'iy tekshiruv:
  IF v_fk_count = 1 THEN
    SELECT
      c.conname,
      c.confdeltype,
      cardinality(c.conkey),
      cardinality(c.confkey),
      fn.nspname,
      ft.relname,
      ca.attname,
      fa.attname
    INTO
      v_fk_name,
      v_confdeltype,
      v_conkey_len,
      v_confkey_len,
      v_ref_schema,
      v_ref_table,
      v_col_name,
      v_ref_col_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    JOIN pg_class ft ON c.confrelid = ft.oid
    JOIN pg_namespace fn ON ft.relnamespace = fn.oid
    JOIN pg_attribute ca ON ca.attrelid = t.oid AND ca.attnum = c.conkey[1] AND NOT ca.attisdropped
    JOIN pg_attribute fa ON fa.attrelid = ft.oid AND fa.attnum = c.confkey[1] AND NOT fa.attisdropped
    WHERE n.nspname = 'public'
      AND t.relname = 'products'
      AND c.contype = 'f'
      AND v_store_id_attnum = ANY(c.conkey);

    -- 1. Bitta ustunli ekanligini qat'iy tekshirish (kompozit FK larni rad etish)
    IF v_conkey_len <> 1 OR v_confkey_len <> 1 THEN
      RAISE EXCEPTION 'Foreign key validation to''xtatildi: "%" constrainti kompozit FK hisoblanadi (conkey uzunligi: %, confkey uzunligi: %). Bitta ustunli (store_id) -> stores(id) bo''lishi shart.', v_fk_name, v_conkey_len, v_confkey_len;
    END IF;

    -- 2. Ustun nomi aynan store_id ekanligini tekshirish
    IF v_col_name <> 'store_id' THEN
      RAISE EXCEPTION 'Foreign key validation to''xtatildi: FK ustuni "store_id" emas, "%" bo''lib chiqdi.', v_col_name;
    END IF;

    -- 3. Nishon jadval aynan public.stores(id) ekanligini tekshirish
    IF v_ref_schema <> 'public' OR v_ref_table <> 'stores' OR v_ref_col_name <> 'id' THEN
      RAISE EXCEPTION 'Foreign key validation to''xtatildi: products.store_id ustunidagi FK "%" public.stores(id) ga emas, %.%(%) ga bog''langan.', v_fk_name, v_ref_schema, v_ref_table, v_ref_col_name;
    END IF;

    -- 4. ON DELETE qoidasi RESTRICT ('r') ekanligini tekshirish
    IF v_confdeltype = 'r' THEN
      RAISE NOTICE 'products.store_id -> public.stores(id) FK allaqachon to''liq mos (ON DELETE RESTRICT, bitta ustunli): %', v_fk_name;
    ELSE
      -- Agar qoida RESTRICT bo'lmasa (masalan eski CASCADE 'c' yoki NO ACTION 'a'), xavfsiz almashtiramiz
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

