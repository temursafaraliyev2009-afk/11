// src/services/supabaseDataService.js
// Savatchi — Supabase Cloud Data Service (Enterprise Grade)
// Owner va Employee bitta store_id doirasida umumiy ma'lumotlar bilan ishlaydi.
// Dual-write: Tezkor UI + Supabase Cloud doimiylik.
// QOIDALAR:
// 1. localStorage HECH QACHON o'chirilmaydi yoki tozalanmaydi.
// 2. Barcha operatsiyalar idempotent va xavfsiz.
// 3. Demo IDlar (usr-101) UUID emas — safeUUID orqali NULL qilinadi.
// 4. Xatolar yashirilmaydi: xato bo'lsa xabar bildiriladi, lokal ma'lumot saqlanadi.

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

// ═══════════════════════════════════════════════════════════════════
// UUID VA XAVFSIZLIK YORDAMCHILARI
// ═══════════════════════════════════════════════════════════════════
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUUID = (id) => typeof id === 'string' && UUID_RE.test(id);
export const safeUUID = (id) => isUUID(id) ? id : null;

/** Supabase ulanishi va konfiguratsiyasini tekshirish */
function checkReady() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('[supabaseDataService] Supabase konfiguratsiya qilinmagan.');
  }
}

/** Tizim xatoliklarini qayd etish va UI ga xabar berish */
export function notifySyncEvent(type, detail) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('savatchi_cloud_event', {
        detail: { type, timestamp: Date.now(), ...detail }
      }));
    } catch (e) {}
  }
}

// ═══════════════════════════════════════════════════════════════════
// STATUS MAPPERLAR (UZBEK ↔ SYSTEM CODES)
// ═══════════════════════════════════════════════════════════════════

export const StatusMappers = {
  order: {
    toDB: (s) => {
      if (!s) return 'pending';
      const map = {
        'Hali yo‘lda': 'Hali yo‘lda',
        'Yetkazildi': 'Yetkazildi',
        'Bekor qilindi': 'Bekor qilindi',
        'Qabul qilindi': 'Qabul qilindi',
        'pending': 'pending',
        'processing': 'processing',
        'completed': 'completed',
        'cancelled': 'cancelled'
      };
      return map[s] || 'pending';
    },
    fromDB: (s) => s || 'Hali yo‘lda'
  },
  rental: {
    toDB: (s) => {
      if (!s) return 'active';
      const map = {
        'Faol': 'Faol',
        'Qaytarilgan': 'Qaytarilgan',
        'Muddati o‘tgan': 'Muddati o‘tgan',
        'Bekor qilingan': 'Bekor qilingan',
        'active': 'active',
        'completed': 'completed',
        'overdue': 'overdue',
        'cancelled': 'cancelled'
      };
      return map[s] || 'Faol';
    },
    fromDB: (s) => {
      const map = { 'active': 'Faol', 'completed': 'Qaytarilgan', 'overdue': 'Muddati o‘tgan', 'cancelled': 'Bekor qilingan' };
      return map[s] || s || 'Faol';
    }
  },
  installment: {
    toDB: (s) => {
      if (!s) return 'active';
      const map = {
        'Faol': 'Faol',
        'Tugallangan': 'Tugallangan',
        'Muddati o‘tgan': 'Muddati o‘tgan',
        'Bekor qilingan': 'Bekor qilingan',
        'active': 'active',
        'completed': 'completed',
        'overdue': 'overdue',
        'cancelled': 'cancelled'
      };
      return map[s] || 'active';
    },
    fromDB: (s) => {
      const map = { 'active': 'Faol', 'completed': 'Tugallangan', 'overdue': 'Muddati o‘tgan', 'cancelled': 'Bekor qilingan' };
      return map[s] || s || 'active';
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// FIELD MAPPING: camelCase (localStorage) ↔ snake_case (Supabase)
// ═══════════════════════════════════════════════════════════════════

// 1. PRODUCTS
function toDBProduct(p, storeId) {
  return {
    store_id: storeId,
    id: p.id,
    name: p.name || '',
    category: p.category || 'Umumiy',
    unit: p.unit || 'dona',
    stock: Number(p.stock) || 0,
    price: Number(p.price) || 0,
    cost_price: p.costPrice !== undefined && p.costPrice !== null ? Number(p.costPrice) : 0,
    status: p.status || (Number(p.stock) > 10 ? 'Yetarli' : Number(p.stock) > 0 ? 'Kam' : 'Tugagan'),
    emoji: p.emoji || '📦',
    store_type: p.storeType || null,
    updated_at: new Date().toISOString()
  };
}

function fromDBProduct(row) {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    category: row.category || 'Umumiy',
    unit: row.unit || 'dona',
    stock: Number(row.stock) || 0,
    price: Number(row.price) || 0,
    costPrice: row.cost_price !== null && row.cost_price !== undefined ? Number(row.cost_price) : undefined,
    status: row.status || (Number(row.stock) > 10 ? 'Yetarli' : Number(row.stock) > 0 ? 'Kam' : 'Tugagan'),
    emoji: row.emoji || '📦',
    storeType: row.store_type || null,
    updatedAt: row.updated_at
  };
}

// 2. SALES
function toDBSale(s, storeId) {
  return {
    store_id: storeId,
    id: s.id,
    seller_id: safeUUID(s.sellerId),
    seller_name: s.seller || s.sellerName || null,
    product_id: s.productId || null,
    product_name: s.product || s.productName || '',
    emoji: s.emoji || '📦',
    quantity: Number(s.qty) !== undefined ? Number(s.qty) : 1,
    unit: s.unit || 'dona',
    unit_price: Number(s.price) || 0,
    total: Number(s.total) || 0,
    cost_price: s.costPrice !== undefined && s.costPrice !== null ? Number(s.costPrice) : null,
    cost_status: s.costStatus || null,
    cost_snapshot_date: s.costSnapshotDate || null,
    payment_type: s.paymentType || 'Naqd',
    sale_type: s.saleType || 'retail',
    is_debt_collection: s.isDebtCollection === true,
    contract_id: s.contractId || null,
    date: s.date || new Date().toISOString().split('T')[0],
    time: s.time || new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    note: s.note || null,
    updated_at: new Date().toISOString()
  };
}

function fromDBSale(row) {
  return {
    id: row.id,
    storeId: row.store_id,
    sellerId: row.seller_id,
    seller: row.seller_name,
    productId: row.product_id,
    product: row.product_name,
    emoji: row.emoji || '📦',
    qty: Number(row.quantity) || 1,
    unit: row.unit || 'dona',
    price: Number(row.unit_price) || 0,
    total: Number(row.total) || 0,
    costPrice: row.cost_price !== null ? Number(row.cost_price) : null,
    costStatus: row.cost_status,
    costSnapshotDate: row.cost_snapshot_date,
    paymentType: row.payment_type || 'Naqd',
    saleType: row.sale_type || 'retail',
    isDebtCollection: row.is_debt_collection === true,
    contractId: row.contract_id,
    date: row.date,
    time: row.time,
    note: row.note,
    updatedAt: row.updated_at
  };
}

// 3. DEBTS
function toDBDebt(d, storeId) {
  return {
    store_id: storeId,
    id: d.id,
    name: d.name || '',
    phone: d.phone || null,
    amount: Number(d.amount) || 0,
    original_amount: Number(d.originalAmount || d.amount) || 0,
    paid_amount: Number(d.paidAmount) || 0,
    given_date: d.givenDate || new Date().toISOString().split('T')[0],
    due_date: d.dueDate || null,
    closed_date: d.closedDate || null,
    status: d.status || (d.isPaid ? 'Qarz to‘landi' : 'Kutilmoqda'),
    is_paid: d.isPaid === true,
    note: d.note || null,
    updated_at: new Date().toISOString()
  };
}

function fromDBDebt(row) {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    phone: row.phone || '+998 90 000 00 00',
    amount: Number(row.amount) || 0,
    originalAmount: Number(row.original_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    givenDate: row.given_date,
    dueDate: row.due_date,
    closedDate: row.closed_date,
    status: row.status || (row.is_paid ? 'Qarz to‘landi' : 'Kutilmoqda'),
    isPaid: row.is_paid === true,
    note: row.note || '',
    daysOverdue: 0,
    updatedAt: row.updated_at
  };
}

// 4. ORDERS
function toDBOrder(o, storeId) {
  return {
    store_id: storeId,
    id: o.id,
    product: o.product || '',
    supplier: o.supplier || null,
    customer_name: o.customerName || o.supplier || 'Noma\'lum',
    customer_phone: o.customerPhone || null,
    date: o.date || new Date().toISOString().split('T')[0],
    qty: typeof o.qty === 'string' ? o.qty : (o.qty ? `${o.qty} dona` : null),
    total: Number(o.total) || 0,
    paid_amount: Number(o.paidAmount) || 0,
    status: StatusMappers.order.toDB(o.status),
    note: o.note || null,
    updated_at: new Date().toISOString()
  };
}

function fromDBOrder(row) {
  return {
    id: row.id,
    storeId: row.store_id,
    product: row.product,
    supplier: row.supplier,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    date: row.date,
    qty: row.qty,
    total: Number(row.total) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    status: StatusMappers.order.fromDB(row.status),
    note: row.note,
    updatedAt: row.updated_at
  };
}

// 5. RENTALS
function toDBRental(r, storeId) {
  return {
    store_id: storeId,
    id: r.id,
    store_type: r.storeType || null,
    customer_id: r.customerId || null,
    customer_name: r.customerName || '',
    customer_phone: r.customerPhone || null,
    product_id: r.productId || null,
    product_name: r.productName || r.itemName || '',
    item_name: r.productName || r.itemName || 'Buyum',
    product_emoji: r.productEmoji || '📦',
    qty: Number(r.qty) || 1,
    unit: r.unit || 'dona',
    start_date: r.startDate || new Date().toISOString().split('T')[0],
    end_date: r.endDate || null,
    rental_fee: Number(r.rentalFee) || Number(r.totalAmount) || 0,
    total_amount: Number(r.rentalFee) || Number(r.totalAmount) || 0,
    paid_amount: Number(r.paidAmount) || 0,
    remaining_amount: Number(r.remainingAmount) || 0,
    status: StatusMappers.rental.toDB(r.status),
    notes: r.notes || r.note || null,
    note: r.notes || r.note || null,
    payments: JSON.stringify(r.payments || []),
    created_at: r.createdAt || new Date().toISOString(),
    creator_id: safeUUID(r.userId),
    creator_name: r.creatorName || null,
    returned_date: r.returnedDate || null,
    updated_at: new Date().toISOString()
  };
}

function fromDBRental(row) {
  let payments = [];
  try {
    payments = typeof row.payments === 'string' ? JSON.parse(row.payments) : (row.payments || []);
  } catch (e) { payments = []; }
  return {
    id: row.id,
    storeId: row.store_id,
    storeType: row.store_type,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    productId: row.product_id,
    productName: row.product_name || row.item_name,
    productEmoji: row.product_emoji || '📦',
    qty: Number(row.qty) || 1,
    unit: row.unit || 'dona',
    startDate: row.start_date,
    endDate: row.end_date,
    rentalFee: Number(row.rental_fee) || Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    remainingAmount: Number(row.remaining_amount) || 0,
    status: StatusMappers.rental.fromDB(row.status),
    notes: row.notes || row.note || '',
    payments,
    createdAt: row.created_at,
    userId: row.creator_id,
    creatorName: row.creator_name,
    returnedDate: row.returned_date,
    updatedAt: row.updated_at
  };
}

// 6. INSTALLMENTS
function toDBInstallment(c, storeId) {
  return {
    store_id: storeId,
    id: c.id,
    contract_number: c.contractNumber || c.id,
    store_type: c.storeType || null,
    customer_id: c.customerId || null,
    customer_name: c.customerName || '',
    customer_phone: c.customerPhone || null,
    items: JSON.stringify(c.items || []),
    products_summary: c.productsSummary || '',
    subtotal: Number(c.subtotal) || 0,
    discount: Number(c.discount) || 0,
    total_amount: Number(c.totalAmount) || 0,
    down_payment: Number(c.downPayment) || 0,
    total_paid: Number(c.totalPaid) || 0,
    remaining_amount: Number(c.remainingAmount) || 0,
    payment_count: Number(c.paymentCount) || 3,
    frequency: c.frequency || 'monthly',
    first_payment_date: c.firstPaymentDate || null,
    start_date: c.firstPaymentDate || new Date().toISOString().split('T')[0],
    schedule: JSON.stringify(c.schedule || []),
    payments: JSON.stringify(c.payments || []),
    notes: c.notes || c.note || null,
    note: c.notes || c.note || null,
    status: StatusMappers.installment.toDB(c.status),
    created_by_name: c.createdByName || null,
    created_by_id: safeUUID(c.createdById),
    created_at: c.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function fromDBInstallment(row) {
  let items = [], schedule = [], payments = [];
  try { items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []); } catch (e) { items = []; }
  try { schedule = typeof row.schedule === 'string' ? JSON.parse(row.schedule) : (row.schedule || []); } catch (e) { schedule = []; }
  try { payments = typeof row.payments === 'string' ? JSON.parse(row.payments) : (row.payments || []); } catch (e) { payments = []; }
  return {
    id: row.id,
    contractNumber: row.contract_number,
    storeId: row.store_id,
    storeType: row.store_type,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    items,
    productsSummary: row.products_summary,
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    downPayment: Number(row.down_payment) || 0,
    totalPaid: Number(row.total_paid) || 0,
    remainingAmount: Number(row.remaining_amount) || 0,
    paymentCount: Number(row.payment_count) || 3,
    frequency: row.frequency || 'monthly',
    firstPaymentDate: row.first_payment_date,
    schedule,
    payments,
    notes: row.notes || row.note || '',
    status: StatusMappers.installment.fromDB(row.status),
    createdByName: row.created_by_name,
    createdById: row.created_by_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ═══════════════════════════════════════════════════════════════════
// ASOSIY BAZA BILAN ALOQA (GENERIC DB OPERATIONS)
// ═══════════════════════════════════════════════════════════════════

async function upsertRow(table, row) {
  checkReady();
  const { data, error } = await supabase
    .from(table)
    .upsert(row, { onConflict: 'store_id,id' })
    .select();
  if (error) {
    notifySyncEvent('error', { table, action: 'upsert', id: row.id, message: error.message });
    throw error;
  }
  return data;
}

async function deleteRow(table, storeId, id) {
  checkReady();
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('store_id', storeId)
    .eq('id', id);
  if (error) {
    notifySyncEvent('error', { table, action: 'delete', id, message: error.message });
    throw error;
  }
}

async function readRows(table, storeId) {
  checkReady();
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('store_id', storeId)
    .order('updated_at', { ascending: false });
  if (error) {
    notifySyncEvent('error', { table, action: 'read', message: error.message });
    throw error;
  }
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════

function subscribeToTable(table, storeId, callback) {
  if (!isSupabaseConfigured || !supabase || !storeId) return () => {};

  const channelName = `${table}_${storeId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `store_id=eq.${storeId}`
      },
      (payload) => {
        try {
          callback(payload.eventType, payload.new || payload.old, payload);
        } catch (e) {
          console.warn(`[Realtime callback error] ${table}:`, e?.message || e);
        }
      }
    )
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch (e) {}
  };
}

// ═══════════════════════════════════════════════════════════════════
// ENTITY MODULES
// ═══════════════════════════════════════════════════════════════════

export const stores = {
  async upsert(store, ownerAuthId) {
    checkReady();
    if (!isUUID(ownerAuthId)) {
      console.warn('[stores.upsert] ownerAuthId UUID emas, o\'tkazildi:', ownerAuthId);
      return;
    }
    const row = {
      id: store.id,
      name: (store.name || '').trim() || 'Savatchi Do‘koni',
      type: store.type || 'food',
      owner_id: ownerAuthId,
      owner_email: store.ownerEmail || null,
      owner_name: store.ownerName || null,
      location: store.location || null,
      phone: store.phone || null,
      description: store.description || null,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('stores').upsert(row, { onConflict: 'id' });
    if (error) {
      notifySyncEvent('error', { table: 'stores', action: 'upsert', id: store.id, message: error.message });
      throw error;
    }
  },

  async ensureStore(store, ownerAuthId) {
    checkReady();
    if (!isUUID(ownerAuthId) || !store || !store.id) {
      return false;
    }
    try {
      const { data: existing, error: checkError } = await supabase
        .from('stores')
        .select('id, owner_id')
        .eq('id', store.id)
        .maybeSingle();

      if (checkError) {
        console.warn('[stores.ensureStore] Tekshirish xatosi:', checkError.message);
      }

      if (!existing) {
        await stores.upsert(store, ownerAuthId);
        return true;
      }
      if (existing.owner_id === ownerAuthId) {
        return true;
      }
      console.warn(`[stores.ensureStore] Do'kon ${store.id} boshqa egaga tegishli (${existing.owner_id})`);
      return false;
    } catch (err) {
      console.error('[stores.ensureStore] Xatolik:', err?.message || err);
      return false;
    }
  },

  async readOwnerStores(ownerAuthId) {
    checkReady();
    if (!isUUID(ownerAuthId)) return [];
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', ownerAuthId);
    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      ownerId: row.owner_id,
      ownerEmail: row.owner_email,
      ownerName: row.owner_name,
      location: row.location,
      phone: row.phone,
      description: row.description
    }));
  },

  async readEmployeeStore(storeId) {
    checkReady();
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      ownerId: data.owner_id,
      ownerEmail: data.owner_email,
      ownerName: data.owner_name
    };
  }
};

export const products = {
  async upsert(storeId, product) {
    await upsertRow('products', toDBProduct(product, storeId));
  },
  async updateStock(storeId, id, newStock) {
    checkReady();
    const status = Number(newStock) > 10 ? 'Yetarli' : Number(newStock) > 0 ? 'Kam' : 'Tugagan';
    const { error } = await supabase
      .from('products')
      .update({ stock: Number(newStock), status, updated_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', id);
    if (error) throw error;
  },
  async delete(storeId, id) {
    await deleteRow('products', storeId, id);
  },
  async read(storeId) {
    const rows = await readRows('products', storeId);
    return rows.map(fromDBProduct);
  },
  subscribe(storeId, callback) {
    return subscribeToTable('products', storeId, (event, row) => {
      callback(event, row ? fromDBProduct(row) : null);
    });
  }
};

export const sales = {
  async upsert(storeId, sale) {
    await upsertRow('sales', toDBSale(sale, storeId));
  },
  async delete(storeId, id) {
    await deleteRow('sales', storeId, id);
  },
  async read(storeId) {
    const rows = await readRows('sales', storeId);
    return rows.map(fromDBSale);
  },
  subscribe(storeId, callback) {
    return subscribeToTable('sales', storeId, (event, row) => {
      callback(event, row ? fromDBSale(row) : null);
    });
  }
};

export const debts = {
  async upsert(storeId, debt) {
    await upsertRow('debts', toDBDebt(debt, storeId));
  },
  async delete(storeId, id) {
    await deleteRow('debts', storeId, id);
  },
  async addPayment(storeId, debtId, paymentData) {
    checkReady();
    // 1. debt_payments jadvaliga kiritish
    const paymentRow = {
      store_id: storeId,
      debt_id: debtId,
      amount: Number(paymentData.amount) || 0,
      payment_method: paymentData.paymentMethod || 'cash',
      date: paymentData.date || new Date().toISOString().split('T')[0],
      note: paymentData.note || null,
      collector_id: safeUUID(paymentData.collectorId),
      collector_name: paymentData.collectorName || null
    };
    const { error: payErr } = await supabase.from('debt_payments').insert(paymentRow);
    if (payErr) console.warn('[debts.addPayment] debt_payments xatosi:', payErr.message);

    // 2. debts jadvalidagi qoldiqni yangilash
    if (paymentData.updatedDebt) {
      await debts.upsert(storeId, paymentData.updatedDebt);
    }
  },
  async read(storeId) {
    const rows = await readRows('debts', storeId);
    return rows.map(fromDBDebt);
  },
  subscribe(storeId, callback) {
    return subscribeToTable('debts', storeId, (event, row) => {
      callback(event, row ? fromDBDebt(row) : null);
    });
  }
};

export const orders = {
  async upsert(storeId, order) {
    await upsertRow('orders', toDBOrder(order, storeId));
  },
  async updateStatus(storeId, id, status) {
    checkReady();
    const { error } = await supabase
      .from('orders')
      .update({ status: StatusMappers.order.toDB(status), updated_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', id);
    if (error) throw error;
  },
  async delete(storeId, id) {
    await deleteRow('orders', storeId, id);
  },
  async read(storeId) {
    const rows = await readRows('orders', storeId);
    return rows.map(fromDBOrder);
  },
  subscribe(storeId, callback) {
    return subscribeToTable('orders', storeId, (event, row) => {
      callback(event, row ? fromDBOrder(row) : null);
    });
  }
};

export const rentals = {
  async upsert(storeId, rental) {
    await upsertRow('rentals', toDBRental(rental, storeId));
  },
  async updateStatus(storeId, id, status, returnedDate = null) {
    checkReady();
    const updateData = {
      status: StatusMappers.rental.toDB(status),
      updated_at: new Date().toISOString()
    };
    if (returnedDate) updateData.returned_date = returnedDate;
    const { error } = await supabase
      .from('rentals')
      .update(updateData)
      .eq('store_id', storeId)
      .eq('id', id);
    if (error) throw error;
  },
  async delete(storeId, id) {
    await deleteRow('rentals', storeId, id);
  },
  async read(storeId) {
    const rows = await readRows('rentals', storeId);
    return rows.map(fromDBRental);
  },
  subscribe(storeId, callback) {
    return subscribeToTable('rentals', storeId, (event, row) => {
      callback(event, row ? fromDBRental(row) : null);
    });
  }
};

export const installmentContracts = {
  async upsert(storeId, contract) {
    await upsertRow('installment_contracts', toDBInstallment(contract, storeId));
  },
  async addPayment(storeId, contractId, paymentData) {
    checkReady();
    // 1. installment_payments jadvaliga yozish
    const payRow = {
      store_id: storeId,
      contract_id: contractId,
      amount: Number(paymentData.amount) || 0,
      payment_method: paymentData.paymentMethod || 'cash',
      payment_date: paymentData.date || new Date().toISOString().split('T')[0],
      note: paymentData.note || null,
      collector_id: safeUUID(paymentData.collectedById),
      collector_name: paymentData.collectedBy || null
    };
    const { error: payErr } = await supabase.from('installment_payments').insert(payRow);
    if (payErr) console.warn('[installmentContracts.addPayment] error:', payErr.message);

    // 2. Shartnomani yangilash
    if (paymentData.updatedContract) {
      await installmentContracts.upsert(storeId, paymentData.updatedContract);
    }
  },
  async updateStatus(storeId, id, status) {
    checkReady();
    const { error } = await supabase
      .from('installment_contracts')
      .update({ status: StatusMappers.installment.toDB(status), updated_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', id);
    if (error) throw error;
  },
  async delete(storeId, id) {
    await deleteRow('installment_contracts', storeId, id);
  },
  async read(storeId) {
    const rows = await readRows('installment_contracts', storeId);
    return rows.map(fromDBInstallment);
  },
  subscribe(storeId, callback) {
    return subscribeToTable('installment_contracts', storeId, (event, row) => {
      callback(event, row ? fromDBInstallment(row) : null);
    });
  }
};

export const activities = {
  async insert(storeId, activity) {
    checkReady();
    const row = {
      store_id: storeId,
      id: activity.id || ('act-' + Date.now()),
      user_id: safeUUID(activity.userId),
      user_name: activity.user || activity.userName || null,
      title: activity.action || 'Amal',
      description: activity.detail || null,
      action: activity.action || '',
      detail: activity.detail || null,
      category: activity.category || null,
      type: 'general',
      bg: activity.bg || null,
      time: activity.time || null,
      date: activity.date || null,
      timestamp_ms: Number(activity.timestamp) || Date.now(),
      created_at: new Date().toISOString()
    };
    const { error } = await supabase
      .from('activities')
      .upsert(row, { onConflict: 'store_id,id' });
    if (error) throw error;
  },
  async read(storeId) {
    checkReady();
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('store_id', storeId)
      .order('timestamp_ms', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      storeId: row.store_id,
      user: row.user_name,
      action: row.action || row.title,
      detail: row.detail || row.description,
      category: row.category,
      bg: row.bg || 'bg-blue-500',
      time: row.time,
      date: row.date,
      timestamp: Number(row.timestamp_ms) || Date.now()
    }));
  }
};

// ═══════════════════════════════════════════════════════════════════
// BULK LOAD (Owner va Employee uchun yagona kirish nuqtasi)
// ═══════════════════════════════════════════════════════════════════
export async function loadStoreData(storeId) {
  checkReady();
  const [
    cloudProducts,
    cloudSales,
    cloudDebts,
    cloudOrders,
    cloudRentals,
    cloudInstallments,
    cloudActivities
  ] = await Promise.allSettled([
    products.read(storeId),
    sales.read(storeId),
    debts.read(storeId),
    orders.read(storeId),
    rentals.read(storeId),
    installmentContracts.read(storeId),
    activities.read(storeId)
  ]);

  return {
    products: cloudProducts.status === 'fulfilled' ? cloudProducts.value : null,
    sales: cloudSales.status === 'fulfilled' ? cloudSales.value : null,
    debts: cloudDebts.status === 'fulfilled' ? cloudDebts.value : null,
    orders: cloudOrders.status === 'fulfilled' ? cloudOrders.value : null,
    rentals: cloudRentals.status === 'fulfilled' ? cloudRentals.value : null,
    installments: cloudInstallments.status === 'fulfilled' ? cloudInstallments.value : null,
    activities: cloudActivities.status === 'fulfilled' ? cloudActivities.value : null,
    errors: {
      products: cloudProducts.status === 'rejected' ? cloudProducts.reason?.message : null,
      sales: cloudSales.status === 'rejected' ? cloudSales.reason?.message : null,
      debts: cloudDebts.status === 'rejected' ? cloudDebts.reason?.message : null,
      orders: cloudOrders.status === 'rejected' ? cloudOrders.reason?.message : null,
      rentals: cloudRentals.status === 'rejected' ? cloudRentals.reason?.message : null,
      installments: cloudInstallments.status === 'rejected' ? cloudInstallments.reason?.message : null,
      activities: cloudActivities.status === 'rejected' ? cloudActivities.reason?.message : null
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// REALTIME: Barcha asosiy va child jadvallarga bir vaqtda obuna
// ═══════════════════════════════════════════════════════════════════
export function subscribeToStoreData(storeId, onUpdate) {
  if (!isSupabaseConfigured || !supabase || !storeId) return () => {};

  const cleanups = [
    products.subscribe(storeId, (ev, row) => onUpdate('products', ev, row)),
    sales.subscribe(storeId, (ev, row) => onUpdate('sales', ev, row)),
    debts.subscribe(storeId, (ev, row) => onUpdate('debts', ev, row)),
    orders.subscribe(storeId, (ev, row) => onUpdate('orders', ev, row)),
    rentals.subscribe(storeId, (ev, row) => onUpdate('rentals', ev, row)),
    installmentContracts.subscribe(storeId, (ev, row) => onUpdate('installments', ev, row))
  ];

  return () => cleanups.forEach(fn => { try { fn(); } catch (e) {} });
}

export default {
  isUUID,
  safeUUID,
  StatusMappers,
  notifySyncEvent,
  stores,
  products,
  sales,
  debts,
  orders,
  rentals,
  installmentContracts,
  activities,
  loadStoreData,
  subscribeToStoreData
};
