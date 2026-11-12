-- ============================================================================
-- Savatchi POS — Cloud Schema Alignment & Full CRUD Compatibility
-- Migration: 20261109_cloud_schema_alignment.sql
-- Description:
--   Harmonizes PostgreSQL database schema with React frontend / JavaScript
--   business entities. Adds missing columns, aligns constraints and indexes,
--   and supports bidirectional status mapping for Sales, Debts, Orders,
--   Rentals, Installments, Activities, Products, and Stores.
-- Idempotent: Can be executed multiple times safely without data loss.
-- ============================================================================

-- ============================================================================
-- 1. STORES TABLE ENHANCEMENTS
-- ============================================================================
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS owner_name  TEXT,
  ADD COLUMN IF NOT EXISTS location    TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT;

-- ============================================================================
-- 2. PRODUCTS TABLE ENHANCEMENTS
-- ============================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS store_type TEXT;

-- ============================================================================
-- 3. SALES TABLE ENHANCEMENTS
-- ============================================================================
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS emoji               TEXT DEFAULT '📦',
  ADD COLUMN IF NOT EXISTS unit                TEXT DEFAULT 'dona',
  ADD COLUMN IF NOT EXISTS cost_price          NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS cost_status         TEXT,
  ADD COLUMN IF NOT EXISTS cost_snapshot_date  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sale_type           TEXT DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS is_debt_collection  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_id         TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_contract_id ON public.sales(store_id, contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_type ON public.sales(store_id, sale_type);

-- ============================================================================
-- 4. DEBTS TABLE ENHANCEMENTS
-- ============================================================================
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS given_date  DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS closed_date DATE,
  ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'Kutilmoqda';

CREATE INDEX IF NOT EXISTS idx_debts_status ON public.debts(store_id, status);

-- ============================================================================
-- 5. ORDERS TABLE ENHANCEMENTS & STATUS CONSTRAINT RELAXATION
-- ============================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS product       TEXT,
  ADD COLUMN IF NOT EXISTS supplier      TEXT,
  ADD COLUMN IF NOT EXISTS qty           TEXT;

-- Relax status constraint to allow both English system codes and Uzbek localized labels
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'processing', 'completed', 'cancelled',
    'Hali yo‘lda', 'Yetkazildi', 'Bekor qilindi', 'Qabul qilindi'
  ));

-- ============================================================================
-- 6. RENTALS TABLE ENHANCEMENTS & STATUS ALIGNMENT
-- ============================================================================
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS store_type       TEXT,
  ADD COLUMN IF NOT EXISTS customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS product_id       TEXT,
  ADD COLUMN IF NOT EXISTS product_name     TEXT,
  ADD COLUMN IF NOT EXISTS product_emoji    TEXT DEFAULT '📦',
  ADD COLUMN IF NOT EXISTS qty              NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit             TEXT DEFAULT 'dona',
  ADD COLUMN IF NOT EXISTS rental_fee       NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes            TEXT,
  ADD COLUMN IF NOT EXISTS payments         JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS creator_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creator_name     TEXT,
  ADD COLUMN IF NOT EXISTS returned_date    DATE;

-- Align item_name NOT NULL requirement if product_name is provided
ALTER TABLE public.rentals ALTER COLUMN item_name DROP NOT NULL;

-- Relax rentals status constraint
ALTER TABLE public.rentals DROP CONSTRAINT IF EXISTS rentals_status_check;
ALTER TABLE public.rentals ADD CONSTRAINT rentals_status_check
  CHECK (status IN (
    'active', 'completed', 'overdue', 'cancelled',
    'Faol', 'Qaytarilgan', 'Muddati o‘tgan', 'Bekor qilingan'
  ));

-- ============================================================================
-- 7. INSTALLMENT CONTRACTS ENHANCEMENTS & STATUS ALIGNMENT
-- ============================================================================
ALTER TABLE public.installment_contracts
  ADD COLUMN IF NOT EXISTS contract_number    TEXT,
  ADD COLUMN IF NOT EXISTS store_type         TEXT,
  ADD COLUMN IF NOT EXISTS customer_id        TEXT,
  ADD COLUMN IF NOT EXISTS products_summary   TEXT,
  ADD COLUMN IF NOT EXISTS subtotal           NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount           NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid         NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_count      INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS frequency          TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS first_payment_date DATE,
  ADD COLUMN IF NOT EXISTS schedule           JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payments           JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes              TEXT;

-- Relax status constraint
ALTER TABLE public.installment_contracts DROP CONSTRAINT IF EXISTS installment_contracts_status_check;
ALTER TABLE public.installment_contracts ADD CONSTRAINT installment_contracts_status_check
  CHECK (status IN (
    'active', 'completed', 'overdue', 'cancelled',
    'Faol', 'Tugallangan', 'Muddati o‘tgan', 'Bekor qilingan'
  ));

-- ============================================================================
-- 8. ACTIVITIES TABLE ALIGNMENT (TEXT ID & COMPOSITE UNIQUE FOR UPSERT)
-- ============================================================================
-- If activities table exists with UUID id, adapt it to accept flexible TEXT ids
DO $$
BEGIN
  -- Change column type to TEXT if it is UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    -- Drop default if exists
    ALTER TABLE public.activities ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.activities ALTER COLUMN id TYPE TEXT USING id::text;
    ALTER TABLE public.activities ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  END IF;
END $$;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS action       TEXT,
  ADD COLUMN IF NOT EXISTS detail       TEXT,
  ADD COLUMN IF NOT EXISTS category     TEXT,
  ADD COLUMN IF NOT EXISTS bg           TEXT,
  ADD COLUMN IF NOT EXISTS time         TEXT,
  ADD COLUMN IF NOT EXISTS date         TEXT,
  ADD COLUMN IF NOT EXISTS timestamp_ms BIGINT;

-- Allow title to be optional or fallback from action
ALTER TABLE public.activities ALTER COLUMN title DROP NOT NULL;

-- Ensure UNIQUE (store_id, id) constraint exists for ON CONFLICT (store_id, id) upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_activities_store_id'
  ) THEN
    ALTER TABLE public.activities ADD CONSTRAINT uq_activities_store_id UNIQUE (store_id, id);
  END IF;
END $$;

-- Allow DELETE on activities for store members (e.g. store cleanups)
DROP POLICY IF EXISTS "activities_delete_store_members" ON public.activities;
CREATE POLICY "activities_delete_store_members" ON public.activities
  FOR DELETE USING (public.is_store_member(store_id));

-- Realtime publication for child tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_payments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.installment_payments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

