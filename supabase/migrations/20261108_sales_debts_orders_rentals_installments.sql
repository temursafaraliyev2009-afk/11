-- ============================================================================
-- Savatchi POS — Sales, Debts, Orders, Rentals, Installments & Activities
-- Migration: 20261108_sales_debts_orders_rentals_installments.sql
-- Description:
--   Creates all remaining business data tables missing from previous migrations.
--   Each table uses composite PK (store_id, id), ON DELETE RESTRICT FK to stores,
--   and RLS policy using is_store_member(store_id) for Owner+Employee shared access.
-- Prerequisites:
--   - 20261028_staff_and_invitations.sql (is_store_member function, store_employees)
--   - 20261102_stores_and_products.sql (stores table)
--   - 20261103_stores_and_products_foundation.sql (RESTRICT FK pattern)
-- Idempotent: Can be executed multiple times safely without data loss.
-- ============================================================================

-- ============================================================================
-- 1. SALES (Savdolar tarixi)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
  store_id    TEXT        NOT NULL,
  id          TEXT        NOT NULL,
  seller_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_name TEXT,
  product_id  TEXT,
  product_name TEXT,
  quantity    INTEGER     NOT NULL DEFAULT 1,
  unit_price  NUMERIC(14,2) NOT NULL DEFAULT 0,
  total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_type TEXT       NOT NULL DEFAULT 'cash',
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  time        TIME        NOT NULL DEFAULT CURRENT_TIME,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_sales PRIMARY KEY (store_id, id),
  CONSTRAINT fk_sales_store FOREIGN KEY (store_id)
    REFERENCES public.stores(id) ON DELETE RESTRICT
);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON public.sales(store_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_seller     ON public.sales(seller_id);

-- RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_select_store_members" ON public.sales;
CREATE POLICY "sales_select_store_members" ON public.sales
  FOR SELECT USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "sales_insert_store_members" ON public.sales;
CREATE POLICY "sales_insert_store_members" ON public.sales
  FOR INSERT WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "sales_update_store_members" ON public.sales;
CREATE POLICY "sales_update_store_members" ON public.sales
  FOR UPDATE USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "sales_delete_store_members" ON public.sales;
CREATE POLICY "sales_delete_store_members" ON public.sales
  FOR DELETE USING (public.is_store_member(store_id));

-- Realtime (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. DEBTS (Qarzlar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.debts (
  store_id        TEXT        NOT NULL,
  id              TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  phone           TEXT,
  amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  original_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_paid         BOOLEAN     NOT NULL DEFAULT false,
  due_date        DATE,
  note            TEXT,
  created_by_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_debts PRIMARY KEY (store_id, id),
  CONSTRAINT fk_debts_store FOREIGN KEY (store_id)
    REFERENCES public.stores(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_debts_store_paid  ON public.debts(store_id, is_paid);
CREATE INDEX IF NOT EXISTS idx_debts_due_date    ON public.debts(store_id, due_date);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debts_select_store_members" ON public.debts;
CREATE POLICY "debts_select_store_members" ON public.debts
  FOR SELECT USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "debts_insert_store_members" ON public.debts;
CREATE POLICY "debts_insert_store_members" ON public.debts
  FOR INSERT WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "debts_update_store_members" ON public.debts;
CREATE POLICY "debts_update_store_members" ON public.debts
  FOR UPDATE USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "debts_delete_store_members" ON public.debts;
CREATE POLICY "debts_delete_store_members" ON public.debts
  FOR DELETE USING (public.is_store_member(store_id));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. DEBT PAYMENTS (Qarz to'lovlari)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       TEXT        NOT NULL,
  debt_id        TEXT        NOT NULL,
  amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method TEXT        NOT NULL DEFAULT 'cash',
  date           DATE        NOT NULL DEFAULT CURRENT_DATE,
  note           TEXT,
  collector_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  collector_name TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_debt_payments_store FOREIGN KEY (store_id)
    REFERENCES public.stores(id) ON DELETE RESTRICT,
  CONSTRAINT fk_debt_payments_debt FOREIGN KEY (store_id, debt_id)
    REFERENCES public.debts(store_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON public.debt_payments(store_id, debt_id);

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_payments_select" ON public.debt_payments;
CREATE POLICY "debt_payments_select" ON public.debt_payments
  FOR SELECT USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "debt_payments_insert" ON public.debt_payments;
CREATE POLICY "debt_payments_insert" ON public.debt_payments
  FOR INSERT WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "debt_payments_delete" ON public.debt_payments;
CREATE POLICY "debt_payments_delete" ON public.debt_payments
  FOR DELETE USING (public.is_store_member(store_id));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_payments;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. ORDERS (Buyurtmalar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  store_id        TEXT        NOT NULL,
  id              TEXT        NOT NULL,
  customer_name   TEXT        NOT NULL,
  customer_phone  TEXT,
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  items           JSONB       NOT NULL DEFAULT '[]',
  note            TEXT,
  created_by_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_orders PRIMARY KEY (store_id, id),
  CONSTRAINT fk_orders_store FOREIGN KEY (store_id)
    REFERENCES public.stores(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_orders_store_status ON public.orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_date         ON public.orders(store_id, date DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_store_members" ON public.orders;
CREATE POLICY "orders_select_store_members" ON public.orders
  FOR SELECT USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "orders_insert_store_members" ON public.orders;
CREATE POLICY "orders_insert_store_members" ON public.orders
  FOR INSERT WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "orders_update_store_members" ON public.orders;
CREATE POLICY "orders_update_store_members" ON public.orders
  FOR UPDATE USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "orders_delete_store_members" ON public.orders;
CREATE POLICY "orders_delete_store_members" ON public.orders
  FOR DELETE USING (public.is_store_member(store_id));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. RENTALS (Ijara shartnomalari)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rentals (
  store_id        TEXT        NOT NULL,
  id              TEXT        NOT NULL,
  customer_name   TEXT        NOT NULL,
  customer_phone  TEXT,
  item_name       TEXT        NOT NULL,
  item_description TEXT,
  price_per_day   NUMERIC(14,2) NOT NULL DEFAULT 0,
  deposit         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  start_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  actual_end_date DATE,
  status          TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
  note            TEXT,
  created_by_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_rentals PRIMARY KEY (store_id, id),
  CONSTRAINT fk_rentals_store FOREIGN KEY (store_id)
    REFERENCES public.stores(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_rentals_store_status ON public.rentals(store_id, status);
CREATE INDEX IF NOT EXISTS idx_rentals_end_date     ON public.rentals(store_id, end_date);

ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rentals_select_store_members" ON public.rentals;
CREATE POLICY "rentals_select_store_members" ON public.rentals
  FOR SELECT USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "rentals_insert_store_members" ON public.rentals;
CREATE POLICY "rentals_insert_store_members" ON public.rentals
  FOR INSERT WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "rentals_update_store_members" ON public.rentals;
CREATE POLICY "rentals_update_store_members" ON public.rentals
  FOR UPDATE USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "rentals_delete_store_members" ON public.rentals;
CREATE POLICY "rentals_delete_store_members" ON public.rentals
  FOR DELETE USING (public.is_store_member(store_id));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rentals;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 6. INSTALLMENT CONTRACTS (Muddatli to'lov shartnomalari)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.installment_contracts (
  store_id          TEXT        NOT NULL,
  id                TEXT        NOT NULL,
  customer_name     TEXT        NOT NULL,
  customer_phone    TEXT,
  customer_address  TEXT,
  total_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  down_payment      NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  monthly_payment   NUMERIC(14,2) NOT NULL DEFAULT 0,
  duration_months   INTEGER     NOT NULL DEFAULT 1,
  interest_rate     NUMERIC(5,2) NOT NULL DEFAULT 0,
  items             JSONB       NOT NULL DEFAULT '[]',
  status            TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
  start_date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date          DATE,
  note              TEXT,
  created_by_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_installment_contracts PRIMARY KEY (store_id, id),
  CONSTRAINT fk_installment_contracts_store FOREIGN KEY (store_id)
    REFERENCES public.stores(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_installments_store_status ON public.installment_contracts(store_id, status);

ALTER TABLE public.installment_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "installments_select_store_members" ON public.installment_contracts;
CREATE POLICY "installments_select_store_members" ON public.installment_contracts
  FOR SELECT USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "installments_insert_store_members" ON public.installment_contracts;
CREATE POLICY "installments_insert_store_members" ON public.installment_contracts
  FOR INSERT WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "installments_update_store_members" ON public.installment_contracts;
CREATE POLICY "installments_update_store_members" ON public.installment_contracts
  FOR UPDATE USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "installments_delete_store_members" ON public.installment_contracts;
CREATE POLICY "installments_delete_store_members" ON public.installment_contracts
  FOR DELETE USING (public.is_store_member(store_id));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.installment_contracts;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 7. INSTALLMENT PAYMENTS (Muddatli to'lov to'lovlari)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.installment_payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        TEXT        NOT NULL,
  contract_id     TEXT        NOT NULL,
  amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method  TEXT        NOT NULL DEFAULT 'cash',
  payment_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  month_number    INTEGER,
  note            TEXT,
  collector_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  collector_name  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_installment_payments_store FOREIGN KEY (store_id)
    REFERENCES public.stores(id) ON DELETE RESTRICT,
  CONSTRAINT fk_installment_payments_contract FOREIGN KEY (store_id, contract_id)
    REFERENCES public.installment_contracts(store_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_installment_payments_contract
  ON public.installment_payments(store_id, contract_id);

ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inst_payments_select" ON public.installment_payments;
CREATE POLICY "inst_payments_select" ON public.installment_payments
  FOR SELECT USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "inst_payments_insert" ON public.installment_payments;
CREATE POLICY "inst_payments_insert" ON public.installment_payments
  FOR INSERT WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "inst_payments_delete" ON public.installment_payments;
CREATE POLICY "inst_payments_delete" ON public.installment_payments
  FOR DELETE USING (public.is_store_member(store_id));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.installment_payments;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 8. ACTIVITIES (Faoliyat logi)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    TEXT        NOT NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   TEXT,
  title       TEXT        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL DEFAULT 'general'
              CHECK (type IN ('sale','debt','order','rental','installment','product','employee','general')),
  entity_id   TEXT,
  entity_type TEXT,
  meta        JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_activities_store FOREIGN KEY (store_id)
    REFERENCES public.stores(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_activities_store_created
  ON public.activities(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type
  ON public.activities(store_id, type, created_at DESC);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_select_store_members" ON public.activities;
CREATE POLICY "activities_select_store_members" ON public.activities
  FOR SELECT USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "activities_insert_store_members" ON public.activities;
CREATE POLICY "activities_insert_store_members" ON public.activities
  FOR INSERT WITH CHECK (public.is_store_member(store_id));

-- Activities intentionally NOT deletable (audit log)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- GRANT permissions to authenticated role (required for Supabase RLS)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales                  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debts                  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_payments          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders                 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rentals                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installment_contracts  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installment_payments   TO authenticated;
GRANT SELECT, INSERT               ON public.activities              TO authenticated;

GRANT SELECT ON public.sales                 TO anon;
GRANT SELECT ON public.debts                 TO anon;
GRANT SELECT ON public.orders                TO anon;
GRANT SELECT ON public.rentals               TO anon;
GRANT SELECT ON public.installment_contracts TO anon;

