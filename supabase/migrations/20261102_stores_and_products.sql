-- ============================================================================
-- Savatchi POS — Core Stores & Products Migration
-- Migration: 20261102_stores_and_products.sql
-- Description: Establishes secure multi-store and inventory catalog architecture
-- Idempotent: Can be executed multiple times safely without data loss.
-- ============================================================================

-- ============================================================================
-- 1. STORES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  type TEXT NOT NULL,
  emoji TEXT DEFAULT '🏪',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indekslar: Do'kon egasi va do'kon turi bo'yicha tezkor qidiruv
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_type ON public.stores(type);
CREATE INDEX IF NOT EXISTS idx_stores_active ON public.stores(is_active);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS: avvalgi siyosatlarni tozalash
DROP POLICY IF EXISTS "Store members and owner can view store" ON public.stores;
DROP POLICY IF EXISTS "Users can create their own store" ON public.stores;
DROP POLICY IF EXISTS "Only store owner can update store" ON public.stores;
DROP POLICY IF EXISTS "Only store owner can delete store" ON public.stores;

-- Stores RLS Policies:
-- 1. SELECT: Do'kon egasi yoki store_employees dagi faol xodimlar ko'ra oladi
CREATE POLICY "Store members and owner can view store"
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.store_employees
      WHERE store_employees.store_id = stores.id
        AND (store_employees.user_id = auth.uid() OR lower(store_employees.email) = lower(coalesce(auth.jwt()->>'email', '')))
        AND store_employees.status = 'Faol'
    )
  );

-- 2. INSERT: Faqat autentifikatsiyadan o'tgan foydalanuvchi, owner_id o'zining auth.uid() bo'lishi shart
CREATE POLICY "Users can create their own store"
  ON public.stores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
  );

-- 3. UPDATE: Faqat do'kon egasi o'z do'konini yangilay oladi
CREATE POLICY "Only store owner can update store"
  ON public.stores
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 4. DELETE: Faqat do'kon egasi o'z do'konini o'chira oladi
CREATE POLICY "Only store owner can delete store"
  ON public.stores
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);


-- ============================================================================
-- 2. ENHANCED STORE MEMBERSHIP HELPER FUNCTION
-- ============================================================================
-- Server tomonida do'kon egaligi yoki faol a'zoligini RLS uchun xavfsiz tekshiruvchi funksiya.
-- Foydalanuvchi taqdim etgan store_id ga ko'r-ko'rona ishonilmaydi: auth.uid() va JWT email tekshiriladi.
CREATE OR REPLACE FUNCTION public.is_store_member(check_store_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := lower(coalesce(auth.jwt()->>'email', ''));
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. stores jadvalidagi do'kon egasi ekanligini tekshirish
  IF EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = check_store_id AND owner_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. staff_invitations orqali taklif yuborgan egasi (backward compatibility)
  IF EXISTS (
    SELECT 1 FROM public.staff_invitations
    WHERE store_id = check_store_id AND from_user_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Ushbu do'konda faol xodim ekanligini tekshirish
  IF EXISTS (
    SELECT 1 FROM public.store_employees
    WHERE store_id = check_store_id
      AND (user_id = v_uid OR lower(email) = v_email)
      AND status = 'Faol'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_store_member(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.is_store_member(TEXT) TO authenticated;


-- ============================================================================
-- 3. PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  category TEXT NOT NULL DEFAULT 'Umumiy',
  unit TEXT NOT NULL DEFAULT 'dona',
  price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
  cost_price NUMERIC NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  status TEXT NOT NULL DEFAULT 'Yetarli' CHECK (status IN ('Yetarli', 'Kam', 'Tugagan', 'Nofaol')),
  emoji TEXT DEFAULT '📦',
  image_url TEXT,
  barcode TEXT,
  sku TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indekslar: Ombor va kassa tezligi uchun zarur indekslar
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_category ON public.products(store_id, category);
CREATE INDEX IF NOT EXISTS idx_products_store_status ON public.products(store_id, status);
CREATE INDEX IF NOT EXISTS idx_products_store_barcode ON public.products(store_id, barcode) WHERE barcode IS NOT NULL;

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS: avvalgi siyosatlarni tozalash
DROP POLICY IF EXISTS "Store members can view products" ON public.products;
DROP POLICY IF EXISTS "Store members can insert products" ON public.products;
DROP POLICY IF EXISTS "Store members can update products" ON public.products;
DROP POLICY IF EXISTS "Store members can delete products" ON public.products;

-- Products RLS Policies:
-- 1. SELECT: Faqat do'kon egasi yoki faol xodimlari ko'ra oladi
CREATE POLICY "Store members can view products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (
    public.is_store_member(store_id)
  );

-- 2. INSERT: Faqat server tomonidan tasdiqlangan do'kon a'zosi mahsulot qo'sha oladi
CREATE POLICY "Store members can insert products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_store_member(store_id)
  );

-- 3. UPDATE: Faqat do'kon a'zosi mahsulotni yangilay oladi
CREATE POLICY "Store members can update products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    public.is_store_member(store_id)
  )
  WITH CHECK (
    public.is_store_member(store_id)
  );

-- 4. DELETE: Faqat do'kon a'zosi mahsulotni o'chira oladi
CREATE POLICY "Store members can delete products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (
    public.is_store_member(store_id)
  );


-- ============================================================================
-- 4. TRIGGERS: AUTOMATIC UPDATED_AT & STOCK STATUS SYNC
-- ============================================================================

-- A) updated_at vaqtini avtomatik yangilash
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stores_updated_at ON public.stores;
CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- B) Qoldiq (stock) miqdoriga qarab statusni avtomatik sinxronlash
CREATE OR REPLACE FUNCTION public.sync_product_status()
RETURNS trigger AS $$
BEGIN
  IF new.status != 'Nofaol' THEN
    IF new.stock <= 0 THEN
      new.status := 'Tugagan';
    ELSIF new.stock <= coalesce(new.min_stock, 5) THEN
      new.status := 'Kam';
    ELSE
      new.status := 'Yetarli';
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_status ON public.products;
CREATE TRIGGER trg_sync_product_status
  BEFORE INSERT OR UPDATE OF stock, min_stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_status();

