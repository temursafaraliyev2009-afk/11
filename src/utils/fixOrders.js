/**
 * Savatchi POS — Buyurtmalarni Tozalash va Tuzatish Yordamchisi (fixOrders.js)
 * 
 * Ushbu modul brauzer localStorage'idagi barcha buyurtmalarni tekshiradi,
 * xatoliklarni bartaraf etadi va to'liq normallashtiradi:
 * 1. 'product' bo'lmagan holatlarda items ro'yxatidan nomlarini yig'ib beradi.
 * 2. 'supplier' / 'customerName' xavfsiz matnga o'giriladi.
 * 3. Dublikat ID'larni bartaraf etadi.
 * 4. Narx va miqdorlarni to'g'ri son va matn formatiga keltiradi.
 * 5. Barcha 9 ta do'kon uchun alohida kalitlarni normallashtiradi.
 */

export function fixAllOrders(storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  if (!storage) {
    return { success: false, message: 'localStorage mavjud emas' };
  }

  let totalInspected = 0;
  let totalFixed = 0;
  let totalRemovedDuplicates = 0;

  // 1. localStorage'dagi barcha buyurtma kalitlarini topish
  const orderKeys = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && (key === 'savatchi_orders' || key.startsWith('savatchi_orders_') || (key.startsWith('savatchi_') && key.includes('_orders_')))) {
        orderKeys.push(key);
      }
    }
  } catch (e) {
    console.warn('Storage kalitlarini o‘qishda xatolik:', e);
  }

  // Standart do'kon kalitlari ro'yxati
  const defaultStoreTypes = ['food', 'phone', 'clothing', 'cosmetics', 'construction', 'household', 'sport', 'accessories', 'flower'];
  defaultStoreTypes.forEach(type => {
    const key = `savatchi_orders_store_${type}`;
    if (!orderKeys.includes(key)) {
      orderKeys.push(key);
    }
  });

  orderKeys.forEach(key => {
    try {
      const raw = storage.getItem(key);
      if (!raw) return;

      const orders = JSON.parse(raw);
      if (!Array.isArray(orders)) return;

      const seenIds = new Set();
      const cleanedOrders = [];

      orders.forEach((o, index) => {
        totalInspected++;

        if (!o || typeof o !== 'object') {
          totalFixed++;
          return;
        }

        // 1. Unikal ID
        let id = o.id ? String(o.id).trim() : `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
        if (seenIds.has(id)) {
          id = `${id}-${index + 1}`;
          totalRemovedDuplicates++;
        }
        seenIds.add(id);

        // 2. Mahsulot nomi (product)
        let product = o.product ? String(o.product).trim() : '';
        if (!product && Array.isArray(o.items) && o.items.length > 0) {
          product = o.items.map(item => `${item.name || 'Tovar'} (x${item.quantity || 1})`).join(', ');
          totalFixed++;
        }
        if (!product) {
          product = 'Buyurtma tovarlari';
          totalFixed++;
        }

        // 3. Yetkazib beruvchi / Mijoz nomi
        let customerName = o.supplier || o.customerName || (o.type === 'customer' ? 'Onlayn Xaridor' : 'Ta’minotchi');
        customerName = String(customerName).trim();

        // 4. Miqdor (qty)
        let qty = o.qty ? String(o.qty).trim() : '';
        if (!qty && Array.isArray(o.items)) {
          qty = `${o.items.reduce((s, i) => s + (Number(i.quantity) || 1), 0)} dona`;
          totalFixed++;
        }
        if (!qty) {
          qty = '1 dona';
          totalFixed++;
        }

        // 5. Jami summa (total)
        let total = Number(o.total);
        if (isNaN(total) || total < 0) {
          total = 0;
          totalFixed++;
        }

        // 6. Holat (status)
        let status = o.status ? String(o.status).trim() : 'Hali yo‘lda';
        if (status === 'Jarayonda' || status === 'Kuryer yo‘lda') {
          status = 'Hali yo‘lda';
        }

        // 7. Sana
        const date = o.date ? String(o.date) : new Date().toISOString().split('T')[0];

        // 8. Do‘konga egalik (storeId)
        let keyStoreId = '';
        if (key.includes('_orders_')) {
          keyStoreId = key.split('_orders_')[1] || '';
        }
        const storeId = o.storeId || keyStoreId || '';

        const cleanedOrder = {
          ...o,
          id,
          product,
          supplier: customerName,
          customerName,
          qty,
          total,
          status,
          date,
          storeId
        };

        cleanedOrders.push(cleanedOrder);
      });

      storage.setItem(key, JSON.stringify(cleanedOrders));
    } catch (err) {
      console.error(`[${key}] ni tozalashda xatolik:`, err);
    }
  });

  return {
    success: true,
    totalInspected,
    totalFixed,
    totalRemovedDuplicates,
    processedKeysCount: orderKeys.length
  };
}

export default fixAllOrders;
