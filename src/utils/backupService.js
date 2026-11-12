// src/utils/backupService.js
// Savatchi POS — Safe, Non-Destructive LocalStorage Backup & Verification Service
//
// QAT'IY XAVFSIZLIK VA DAXLSIZLIK QOIDALARI:
// 1. Asl LocalStorage ma'lumotlari HECH QACHON o'zgartirilmaydi yoki o'chirilmaydi (faqat getItem).
// 2. Barcha biznes ma'lumotlari (ichki payments[], schedule[], tarixlari bilan) 100% to'liq saqlanadi.
// 3. registered_accounts, parollar, Supabase auth tokenlari (sb-*-auth-token), sessiyalar
//    va vaqtinchalik keshlar (cart, theme) QAT'IYAN chiqarib tashlanadi.
// 4. Har bir brauzer profilidan alohida export qilinishi mumkin.
// 5. Yaratilgan JSON backup butunligi va o'qilishini tekshirish uchun o'rnatilgan validator mavjud.

const EXCLUDE_PREFIXES = [
  'sb-',              // Supabase auth sessiya va refresh tokenlari
  'supabase.auth.',   // Supabase auth kesh
  'savatchi_profile_' // Shaxsiy profilingiz (agar parol/auth qismi bo'lsa)
];

const EXCLUDE_EXACT_KEYS = [
  'savatchi_registered_accounts', // Parollar saqlanadigan lokal akkauntlar
  'savatchi_current_user',        // Foydalanuvchi joriy sessiyasi
  'savatchi_saved_email',         // Login eslab qolish
  'savatchi_remember_me',         // Remember me bayrog'i
  'savatchi_users_db_v1',         // Google Auth lokal kesh
  'savatchi_cart',                // Xaridorning vaqtinchalik savatchasi
  'savatchi_wishlist',            // Tanlanganlar ro'yxati
  'savatchi_theme'                // UI mavzusi
];

/**
 * Kalit xavfsiz biznes ma'lumotiga tegishlimi yoki yo'qligini aniqlash
 */
export function isBusinessStorageKey(key) {
  if (!key || typeof key !== 'string') return false;
  if (!key.startsWith('savatchi_')) return false;

  // Taqiq ro'yxatini tekshirish
  if (EXCLUDE_PREFIXES.some(prefix => key.startsWith(prefix))) return false;
  if (EXCLUDE_EXACT_KEYS.includes(key)) return false;

  // Maxfiy so'zlardan himoya
  const lower = key.toLowerCase();
  if (lower.includes('token') || lower.includes('password') || lower.includes('secret')) {
    return false;
  }

  return true;
}

/**
 * LocalStorage dagi barcha biznes ma'lumotlaridan xavfsiz JSON snapshot olish (Read-Only)
 *
 * @param {Storage} storage - window.localStorage yoki test muhiti uchun mock storage
 * @param {string} profileLabel - 'owner', 'employee' yoki brauzer profili belgisi
 * @returns {object} - To'liq zaxira nusxasi obyekti
 */
export function generateBackupSnapshot(storage = (typeof window !== 'undefined' ? window.localStorage : null), profileLabel = 'default') {
  if (!storage) {
    throw new Error('[BackupService] localStorage xotirasi aniqlanmadi.');
  }

  const snapshot = {
    app: 'Savatchi POS',
    schemaVersion: '1.1',
    profileLabel: String(profileLabel).trim(),
    exportedAt: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Environment',
    summary: {
      storesCount: 0,
      productsCount: 0,
      salesCount: 0,
      debtsCount: 0,
      ordersCount: 0,
      rentalsCount: 0,
      installmentsCount: 0,
      employeesCount: 0,
      activitiesCount: 0,
      mailMessagesCount: 0,
      totalKeys: 0
    },
    data: {}
  };

  // Faqat o'qish (READ-ONLY) sikli
  const totalItems = storage.length || 0;
  for (let i = 0; i < totalItems; i++) {
    const key = storage.key(i);
    if (!key || !isBusinessStorageKey(key)) continue;

    const rawValue = storage.getItem(key);
    if (rawValue === null || rawValue === undefined) continue;

    try {
      const parsed = JSON.parse(rawValue);
      snapshot.data[key] = parsed;
      snapshot.summary.totalKeys++;

      // Hisoblagichlarni yangilash
      if (Array.isArray(parsed)) {
        const count = parsed.length;
        if (key.includes('user_stores')) snapshot.summary.storesCount += count;
        else if (key.includes('products_')) snapshot.summary.productsCount += count;
        else if (key.includes('sales_')) snapshot.summary.salesCount += count;
        else if (key.includes('debts_')) snapshot.summary.debtsCount += count;
        else if (key.includes('orders_') || key === 'savatchi_orders') snapshot.summary.ordersCount += count;
        else if (key.includes('rentals_')) snapshot.summary.rentalsCount += count;
        else if (key.includes('installments_')) snapshot.summary.installmentsCount += count;
        else if (key.includes('employees_') && !key.includes('deleted_employees')) snapshot.summary.employeesCount += count;
        else if (key.includes('activities_')) snapshot.summary.activitiesCount += count;
        else if (key === 'savatchi_mail_messages') snapshot.summary.mailMessagesCount += count;
      }
    } catch (err) {
      // JSON bo'lmagan oddiy satrlar (masalan, tanlangan do'kon ID-si)
      snapshot.data[key] = rawValue;
      snapshot.summary.totalKeys++;
    }
  }

  return snapshot;
}

/**
 * Yaratilgan zaxira nusxasini (JSON matn yoki obyekt) to'liqlik va xavfsizlikka tekshirish
 *
 * @param {string|object} backupPayload - JSON satr yoki obyekt
 * @returns {object} - Tekshiruv natijasi
 */
export function validateBackupData(backupPayload) {
  const result = {
    isValid: false,
    schemaVersion: null,
    exportedAt: null,
    profileLabel: null,
    summary: {},
    keysVerified: [],
    violations: [],
    warnings: []
  };

  let obj = null;
  if (typeof backupPayload === 'string') {
    try {
      obj = JSON.parse(backupPayload);
    } catch (e) {
      result.violations.push('JSON sintaktik jihatdan buzilgan: ' + e.message);
      return result;
    }
  } else if (typeof backupPayload === 'object' && backupPayload !== null) {
    obj = backupPayload;
  } else {
    result.violations.push('Zaxira ma\'lumoti obyekt yoki JSON satr emas');
    return result;
  }

  // 1. Asosiy tuzilma tekshiruvi
  if (obj.app !== 'Savatchi POS') {
    result.violations.push('Ilova identifikatori mos emas: ' + obj.app);
  }
  result.schemaVersion = obj.schemaVersion;
  result.exportedAt = obj.exportedAt;
  result.profileLabel = obj.profileLabel;
  result.summary = obj.summary || {};

  if (!obj.data || typeof obj.data !== 'object') {
    result.violations.push('Ma\'lumotlar containeri ("data") topilmadi');
    return result;
  }

  // 2. Xavfsizlik qoidalariga rioya qilinganligini tekshirish
  const keys = Object.keys(obj.data);
  for (const k of keys) {
    if (!isBusinessStorageKey(k)) {
      result.violations.push(`Taqiqlangan kalit aniqlandi: ${k}`);
    } else {
      result.keysVerified.push(k);
    }

    // Ichki ma'lumotlarda parollar yo'qligini tasdiqlash
    const val = obj.data[k];
    if (typeof val === 'string' && (val.includes('sb-') || val.includes('access_token'))) {
      result.violations.push(`Kalit ichida auth token aniqlandi: ${k}`);
    }
  }

  // 3. Ichki strukturalar (payments[], schedule[]) tekshiruvi
  for (const [k, v] of Object.entries(obj.data)) {
    if (k.includes('debts_') && Array.isArray(v)) {
      v.forEach((debt, idx) => {
        if (debt.payments && !Array.isArray(debt.payments)) {
          result.warnings.push(`Qarz #${debt.id || idx} dagi payments massiv emas`);
        }
      });
    }
    if (k.includes('installments_') && Array.isArray(v)) {
      v.forEach((ins, idx) => {
        if (ins.schedule && !Array.isArray(ins.schedule)) {
          result.warnings.push(`Muddatli to'lov #${ins.id || idx} dagi schedule massiv emas`);
        }
      });
    }
  }

  result.isValid = result.violations.length === 0;
  return result;
}

/**
 * Brauzerda JSON faylni xavfsiz yuklab berish funksiyasi
 *
 * @param {string} profileLabel - Masalan: 'owner-kassa', 'employee-telefon'
 * @returns {object} - Export natijasi
 */
export function downloadBackupJSON(profileLabel = 'profile') {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { success: false, reason: 'Brauzer oynasi (DOM) mavjud emas' };
  }

  try {
    const snapshot = generateBackupSnapshot(window.localStorage, profileLabel);
    const validation = validateBackupData(snapshot);

    if (!validation.isValid) {
      return { success: false, reason: 'Zaxira tekshiruvdan o‘tmadi', violations: validation.violations };
    }

    const cleanDate = new Date().toISOString().replace(/[:.]/g, '-');
    const safeLabel = String(profileLabel).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `savatchi_backup_${safeLabel}_${cleanDate}.json`;

    const jsonString = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      fileName,
      totalKeys: snapshot.summary.totalKeys,
      summary: snapshot.summary
    };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

export default {
  isBusinessStorageKey,
  generateBackupSnapshot,
  validateBackupData,
  downloadBackupJSON
};

