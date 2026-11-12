// src/services/accountService.js
/**
 * Savatchi Account Directory Service
 * 
 * Ushbu xizmat tizimda mavjud barcha ro'yxatdan o'tgan foydalanuvchi akkauntlarini
 * boshqaradi va "Xodim qo'shish" moduli uchun qidiruv va verifikatsiyani ta'minlaydi.
 */

import { supabase } from '../lib/supabase.js';

export const REGISTERED_ACCOUNTS_KEY = 'savatchi_registered_accounts';

// Cross-tab / cross-window synchronization via BroadcastChannel
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    const syncChannel = new BroadcastChannel('savatchi_accounts_sync');
    syncChannel.onmessage = (event) => {
      if (event.data?.type === 'ACCOUNT_REGISTERED' && event.data?.account) {
        window.dispatchEvent(
          new CustomEvent('savatchi_account_registered', {
            detail: event.data.account
          })
        );
      }
    };
  } catch (e) {}
}

// Tizimda oldindan mavjud bo'lgan asosiy foydalanuvchi akkauntlari
const INITIAL_ACCOUNTS = [
  {
    id: 'usr-101',
    uid: 'usr-101',
    displayName: 'Jasur Toshmatov',
    firstName: 'Jasur',
    lastName: 'Toshmatov',
    email: 'jasur@savatchi.uz',
    phone: '+998 93 111 22 33',
    photoURL: null,
    avatar: 'JT',
    bg: 'bg-emerald-600',
    role: null,
    createdAt: '2024-05-10T10:00:00Z'
  },
  {
    id: 'usr-102',
    uid: 'usr-102',
    displayName: 'Nodira Karimova',
    firstName: 'Nodira',
    lastName: 'Karimova',
    email: 'nodira@savatchi.uz',
    phone: '+998 94 222 33 44',
    photoURL: null,
    avatar: 'NK',
    bg: 'bg-purple-600',
    role: null,
    createdAt: '2024-06-15T12:00:00Z'
  },
  {
    id: 'usr-103',
    uid: 'usr-103',
    displayName: 'Dilshod Aliyev',
    firstName: 'Dilshod',
    lastName: 'Aliyev',
    email: 'dilshod@savatchi.uz',
    phone: '+998 91 333 44 55',
    photoURL: null,
    avatar: 'DA',
    bg: 'bg-indigo-600',
    role: null,
    createdAt: '2024-07-20T08:30:00Z'
  },
  {
    id: 'usr-104',
    uid: 'usr-104',
    displayName: 'Malika Umarova',
    firstName: 'Malika',
    lastName: 'Umarova',
    email: 'malika@savatchi.uz',
    phone: '+998 97 444 55 66',
    photoURL: null,
    avatar: 'MU',
    bg: 'bg-pink-600',
    role: null,
    createdAt: '2024-08-01T09:15:00Z'
  },
  {
    id: 'usr-105',
    uid: 'usr-105',
    displayName: 'Sanjar Yusupov',
    firstName: 'Sanjar',
    lastName: 'Yusupov',
    email: 'sanjar@savatchi.uz',
    phone: '+998 99 555 66 77',
    photoURL: null,
    avatar: 'SY',
    bg: 'bg-teal-600',
    role: null,
    createdAt: '2024-08-10T14:40:00Z'
  },
  {
    id: 'usr-001',
    uid: 'usr-001',
    displayName: 'Azizbek Rahimov',
    firstName: 'Azizbek',
    lastName: 'Rahimov',
    email: 'azizbek@savatchi.uz',
    phone: '+998 90 123 45 67',
    photoURL: null,
    avatar: 'AR',
    bg: 'bg-blue-600',
    role: null,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'usr-002',
    uid: 'usr-002',
    displayName: 'Ali Valiyev',
    firstName: 'Ali',
    lastName: 'Valiyev',
    email: 'ali@savatchi.uz',
    phone: '+998 90 234 56 78',
    photoURL: null,
    avatar: 'AV',
    bg: 'bg-blue-500',
    role: null,
    createdAt: '2024-02-15T00:00:00Z'
  },
  {
    id: 'usr-003',
    uid: 'usr-003',
    displayName: 'Anvar Karimov',
    firstName: 'Anvar',
    lastName: 'Karimov',
    email: 'anvar@savatchi.uz',
    phone: '+998 90 345 67 89',
    photoURL: null,
    avatar: 'AK',
    bg: 'bg-emerald-500',
    role: null,
    createdAt: '2024-03-01T00:00:00Z'
  },
  {
    id: 'usr-004',
    uid: 'usr-004',
    displayName: 'Bobur Salimov',
    firstName: 'Bobur',
    lastName: 'Salimov',
    email: 'bobur@savatchi.uz',
    phone: '+998 90 456 78 90',
    photoURL: null,
    avatar: 'BS',
    bg: 'bg-purple-500',
    role: null,
    createdAt: '2024-04-12T00:00:00Z'
  },
  {
    id: 'usr-005',
    uid: 'usr-005',
    displayName: 'Sardor Rahimov',
    firstName: 'Sardor',
    lastName: 'Rahimov',
    email: 'sardor@savatchi.uz',
    phone: '+998 90 567 89 01',
    photoURL: null,
    avatar: 'SR',
    bg: 'bg-amber-500',
    role: null,
    createdAt: '2024-05-01T00:00:00Z'
  }
];

/**
 * Telefon raqamidan faqat raqamlarni ajratib olish (normalizatsiya)
 */
export const normalizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '');
};

/**
 * Tizimda mavjud barcha ro'yxatdan o'tgan akkauntlarni olish.
 * localStorage, profil kalitlari va avval yaratilgan akkauntlarni birlashtiradi.
 */
export const getAllRegisteredAccounts = () => {
  let accounts = [];

  try {
    const saved = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    if (saved) {
      accounts = JSON.parse(saved);
    }
  } catch (e) {
    accounts = [];
  }

  // Agar baza hali saqlanmagan bo'lsa, default ro'yxat bilan boshlaymiz
  if (!Array.isArray(accounts) || accounts.length === 0) {
    accounts = [...INITIAL_ACCOUNTS];
    try {
      localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {}
  } else {
    // Demo akkaunt usr-001 ning noto'g'ri egasi rolini tozalash
    let sanitized = false;
    accounts = accounts.map(a => {
      if (a.id === 'usr-001' && (a.role === 'Magazin egasi' || a.role === "Do'kon egasi" || a.role === "Do‘kon egasi")) {
        sanitized = true;
        return { ...a, role: null };
      }
      return a;
    });
    if (sanitized) {
      try {
        localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts));
      } catch (e) {}
    }
  }

  // localStorage dagi mavjud barcha `savatchi_profile_*` larni ham birlashtiramiz
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('savatchi_profile_')) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const p = JSON.parse(val);
            if (p && (p.email || p.phone)) {
              const existingIdx = accounts.findIndex(
                a => (p.email && a.email && a.email.toLowerCase() === p.email.toLowerCase()) ||
                     (p.phone && a.phone && normalizePhone(a.phone) === normalizePhone(p.phone))
              );
              const keySuffix = key.replace('savatchi_profile_', '');
              const inferredId = p.id || p.uid || (!keySuffix.includes('@') ? keySuffix : `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`);

              if (existingIdx >= 0) {
                // Mavjudini eng so'nggi profil ma'lumotlari bilan yangilaymiz
                accounts[existingIdx] = {
                  ...accounts[existingIdx],
                  ...p,
                  id: accounts[existingIdx].id || inferredId,
                  uid: accounts[existingIdx].uid || inferredId,
                  displayName: p.displayName || accounts[existingIdx].displayName,
                  firstName: p.firstName !== undefined ? p.firstName : accounts[existingIdx].firstName,
                  lastName: p.lastName !== undefined ? p.lastName : accounts[existingIdx].lastName,
                  phone: p.phone || accounts[existingIdx].phone,
                  photoURL: p.photoURL !== undefined ? p.photoURL : accounts[existingIdx].photoURL
                };
              } else {
                accounts.push({
                  id: inferredId,
                  uid: inferredId,
                  displayName: p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email?.split('@')[0] || 'Foydalanuvchi',
                  firstName: p.firstName || '',
                  lastName: p.lastName || '',
                  email: p.email || (keySuffix.includes('@') ? keySuffix : ''),
                  phone: p.phone || '',
                  photoURL: p.photoURL || null,
                  avatar: (p.displayName || p.firstName || p.email || 'U').charAt(0).toUpperCase(),
                  bg: 'bg-blue-600',
                  role: p.role !== undefined ? p.role : null,
                  createdAt: new Date().toISOString()
                });
              }
            }
          } catch (pe) {}
        }
      }
    }
  } catch (e) {}

  // Google Users DB dagi foydalanuvchilarni ham birlashtiramiz
  try {
    const googleDbRaw = localStorage.getItem('savatchi_users_db_v1');
    if (googleDbRaw) {
      const googleDb = JSON.parse(googleDbRaw);
      Object.values(googleDb).forEach(gUser => {
        if (gUser && (gUser.email || gUser.phone)) {
          const exists = accounts.some(
            a => (gUser.email && a.email && a.email.toLowerCase() === gUser.email.toLowerCase()) ||
                 (gUser.sub && a.id === gUser.sub)
          );
          if (!exists) {
            accounts.push({
              id: gUser.sub || gUser.uid,
              uid: gUser.sub || gUser.uid,
              displayName: gUser.displayName || `${gUser.givenName || ''} ${gUser.familyName || ''}`.trim() || gUser.email?.split('@')[0],
              firstName: gUser.givenName || '',
              lastName: gUser.familyName || '',
              email: gUser.email || '',
              phone: gUser.phone || '',
              photoURL: gUser.photoURL || gUser.picture || null,
              avatar: (gUser.displayName || gUser.givenName || 'G').charAt(0).toUpperCase(),
              bg: 'bg-emerald-600',
              role: gUser.role !== undefined ? gUser.role : null,
              createdAt: gUser.createdAt || new Date().toISOString()
            });
          }
        }
      });
    }
  } catch (e) {}

  try {
    localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {}

  return accounts;
};

/**
 * Yangi ro'yxatdan o'tgan yoki yangilangan akkauntni bazaga yozish
 */
export const registerSystemAccount = (accountData) => {
  if (!accountData) return null;
  const accounts = getAllRegisteredAccounts();

  const email = (accountData.email || '').trim().toLowerCase();
  const phone = (accountData.phone || '').trim();
  const normPhone = normalizePhone(phone);

  const idx = accounts.findIndex(a => 
    (email && a.email && a.email.toLowerCase() === email) ||
    (normPhone && a.phone && normalizePhone(a.phone) === normPhone) ||
    (accountData.id && (a.id === accountData.id || a.uid === accountData.id))
  );

  const firstName = accountData.firstName !== undefined ? accountData.firstName : (accountData.displayName?.split(' ')[0] || '');
  const lastName = accountData.lastName !== undefined ? accountData.lastName : (accountData.displayName?.split(' ').slice(1).join(' ') || '');
  const displayName = accountData.displayName || `${firstName} ${lastName}`.trim() || (email ? email.split('@')[0] : 'Foydalanuvchi');

  const autoId = `usr-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const normalized = {
    id: accountData.id || accountData.uid || (idx >= 0 ? accounts[idx].id : autoId),
    uid: accountData.uid || accountData.id || (idx >= 0 ? accounts[idx].uid : autoId),
    displayName,
    firstName,
    lastName,
    email: email || (idx >= 0 ? accounts[idx].email : ''),
    phone: phone || (idx >= 0 ? accounts[idx].phone : ''),
    photoURL: accountData.photoURL !== undefined ? accountData.photoURL : (idx >= 0 ? accounts[idx].photoURL : null),
    avatar: (displayName || 'U').charAt(0).toUpperCase(),
    bg: accountData.bg || (idx >= 0 ? accounts[idx].bg : 'bg-blue-600'),
    role: accountData.role !== undefined ? accountData.role : (idx >= 0 ? accounts[idx].role : null),
    createdAt: (idx >= 0 ? accounts[idx].createdAt : null) || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...normalized };
  } else {
    accounts.push(normalized);
  }

  try {
    localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts));
    window.dispatchEvent(
      new CustomEvent('savatchi_account_registered', {
        detail: normalized
      })
    );
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('savatchi_accounts_sync');
        bc.postMessage({ type: 'ACCOUNT_REGISTERED', account: normalized });
        bc.close();
      } catch (bcErr) {}
    }
  } catch (e) {}

  return normalized;
};

/**
 * Rol do'kon egasi ekanligini tekshirish
 */
export const isStoreOwnerRole = (role) => {
  if (!role || typeof role !== 'string') return false;
  const r = role.trim().toLowerCase();
  return (
    r === "do'kon egasi" ||
    r === "do‘kon egasi" ||
    r === "magazin egasi" ||
    r === "admin"
  );
};

/**
 * Akkaunt hozir do'kon egasi ekanligini barcha manbalardan tekshirish
 */
export const isAccountStoreOwner = (account) => {
  if (!account) return false;
  if (isStoreOwnerRole(account.role)) return true;

  const email = (account.email || '').trim().toLowerCase();
  const id = account.id || account.uid;

  try {
    if (id) {
      const pId = localStorage.getItem(`savatchi_profile_${id}`);
      if (pId) {
        const parsed = JSON.parse(pId);
        if (isStoreOwnerRole(parsed.role)) return true;
      }
    }
    if (email) {
      const pEmail = localStorage.getItem(`savatchi_profile_${email}`);
      if (pEmail) {
        const parsed = JSON.parse(pEmail);
        if (isStoreOwnerRole(parsed.role)) return true;
      }
    }
  } catch (e) {}

  try {
    const raw = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    if (raw) {
      const accounts = JSON.parse(raw);
      if (Array.isArray(accounts)) {
        const found = accounts.find(a => 
          (email && a.email && a.email.toLowerCase() === email) ||
          (id && (a.id === id || a.uid === id))
        );
        if (found && isStoreOwnerRole(found.role)) return true;
      }
    }
  } catch (e) {}

  return false;
};

/**
 * Foydalanuvchining rolini barcha tizim ro'yxatlari va profillarida yangilash
 */
export const updateUserRoleInSystem = (userIdOrEmail, newRole) => {
  if (!userIdOrEmail) return null;
  const target = String(userIdOrEmail).trim().toLowerCase();

  // 1. REGISTERED_ACCOUNTS_KEY dagi rolni yangilash
  try {
    const raw = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    let accounts = raw ? JSON.parse(raw) : [];
    let updated = false;

    accounts = accounts.map(a => {
      const aEmail = (a.email || '').trim().toLowerCase();
      const aId = String(a.id || a.uid || '').toLowerCase();
      if (aEmail === target || aId === target) {
        updated = true;
        return { ...a, role: newRole, updatedAt: new Date().toISOString() };
      }
      return a;
    });

    if (updated) {
      localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts));
    }
  } catch (e) {}

  // 2. savatchi_profile_* profillaridagi rolni yangilash
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('savatchi_profile_')) {
        const keySuffix = key.replace('savatchi_profile_', '').toLowerCase();
        if (keySuffix === target) {
          const val = localStorage.getItem(key);
          if (val) {
            const p = JSON.parse(val);
            p.role = newRole;
            p.updatedAt = new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(p));
          }
        }
      }
    }
  } catch (e) {}

  // 3. savatchi_current_user sessiyasidagi rolni yangilash
  try {
    const currentSessionRaw = localStorage.getItem('savatchi_current_user');
    if (currentSessionRaw) {
      const cUser = JSON.parse(currentSessionRaw);
      const cEmail = (cUser.email || '').trim().toLowerCase();
      const cId = String(cUser.id || cUser.uid || '').toLowerCase();
      if (cEmail === target || cId === target) {
        cUser.role = newRole;
        localStorage.setItem('savatchi_current_user', JSON.stringify(cUser));
      }
    }
  } catch (e) {}

  // 4. Global hodisa yuborish
  window.dispatchEvent(
    new CustomEvent('savatchi_user_role_changed', {
      detail: { identifier: userIdOrEmail, role: newRole }
    })
  );
};

/**
 * Email, telefon yoki akkaunt ID orqali mavjud akkauntni qidirish
 * 
 * @param {string} identifier - Foydalanuvchi kiritgan qidiruv so'zi
 * @returns {object|null} Topilgan akkaunt yoki null
 */
export const findAccountByIdentifier = (identifier) => {
  if (!identifier || typeof identifier !== 'string') return null;

  const query = identifier.trim().toLowerCase();
  if (!query) return null;

  const accounts = getAllRegisteredAccounts();
  const queryPhoneDigits = normalizePhone(identifier);

  // 1. Email bo'yicha aniq moslik
  let found = accounts.find(a => a.email && a.email.toLowerCase().trim() === query);
  if (found) return found;

  // 2. Telefon raqami bo'yicha moslik (agar raqamlar soni kamida 7 ta bo'lsa)
  if (queryPhoneDigits.length >= 7) {
    found = accounts.find(a => {
      const aDigits = normalizePhone(a.phone);
      if (!aDigits) return false;
      return aDigits === queryPhoneDigits || aDigits.endsWith(queryPhoneDigits) || queryPhoneDigits.endsWith(aDigits);
    });
    if (found) return found;
  }

  // 3. Akkaunt ID yoki UID bo'yicha moslik
  found = accounts.find(a => 
    (a.id && a.id.toLowerCase() === query) ||
    (a.uid && a.uid.toLowerCase() === query)
  );
  if (found) return found;

  // 4. Email prefiksi (username) bo'yicha aniq moslik (agar foydalanuvchi @ belgisisiz kiritgan bo'lsa)
  found = accounts.find(a => a.email && a.email.split('@')[0].toLowerCase() === query);
  if (found) return found;

  // 5. To'g'ridan-to'g'ri profil saqlash kalitlaridan qidirish (fallback)
  try {
    const rawDirect = localStorage.getItem(`savatchi_profile_${query}`);
    if (rawDirect) {
      const parsed = JSON.parse(rawDirect);
      if (parsed && (parsed.email || parsed.displayName)) {
        return registerSystemAccount({
          id: parsed.id || parsed.uid || `usr-${Date.now()}`,
          uid: parsed.uid || parsed.id || `usr-${Date.now()}`,
          email: parsed.email || (query.includes('@') ? query : ''),
          displayName: parsed.displayName || `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim() || query.split('@')[0],
          firstName: parsed.firstName || '',
          lastName: parsed.lastName || '',
          phone: parsed.phone || '',
          photoURL: parsed.photoURL || null,
          role: parsed.role || 'Foydalanuvchi'
        });
      }
    }
  } catch (e) {}

  return null;
};

export const getRegisteredAccountByIdentifier = findAccountByIdentifier;

/**
 * Foydalanuvchi profilini Supabase 'profiles' jadvaliga sinxronlashtirish.
 * Multi-device va qurilmalararo profil ma'lumotlarini markazlashtiradi.
 */
export const syncProfileToCloud = async (profile) => {
  if (!profile || !profile.id) return null;
  try {
    const email = (profile.email || '').trim().toLowerCase();
    if (!email) return null;

    const payload = {
      id: profile.id,
      email: email,
      display_name: profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || email.split('@')[0],
      first_name: profile.firstName || '',
      last_name: profile.lastName || '',
      phone: profile.phone || '',
      photo_url: profile.photoURL || null,
      role: profile.role || 'Foydalanuvchi',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      // Offline yoki jadval hali yaratilmagan (PGRST205)
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
};

/**
 * Qurilmalararo (Multi-Device) Asinxron Qidiruv:
 * Avval Supabase cloud 'profiles' jadvalidan qidiradi (cross-device/multi-device),
 * agar topilsa mahalliy keshga saqlaydi va qaytaradi.
 * Agar Supabase offline bo'lsa yoki jadval hali yaratilmagan bo'lsa (PGRST205),
 * xatoliksiz darhol mahalliy ro'yxatdan (localStorage) qidirib topadi.
 */
export const findAccountByIdentifierAsync = async (identifier) => {
  if (!identifier || typeof identifier !== 'string') return null;
  const query = identifier.trim().toLowerCase();
  if (!query) return null;

  // 1. Mahalliy keshdan tekshirish
  const localAccount = findAccountByIdentifier(query);

  // 2. Supabase Cloud orqali qidirish (Multi-device va boshqa brauzer/qurilmalar uchun)
  try {
    const queryPhoneDigits = normalizePhone(identifier);

    let queryBuilder = supabase.from('profiles').select('*');
    if (query.includes('@')) {
      queryBuilder = queryBuilder.ilike('email', query);
    } else if (queryPhoneDigits.length >= 7) {
      queryBuilder = queryBuilder.or(`phone.eq.${identifier.trim()},phone.ilike.%${queryPhoneDigits}%`);
    } else {
      queryBuilder = queryBuilder.or(`id.eq.${query},email.ilike.${query}%`);
    }

    const { data, error } = await queryBuilder.maybeSingle();

    if (!error && data) {
      const cloudAccount = {
        id: data.id,
        uid: data.id,
        displayName: data.display_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email?.split('@')[0],
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email,
        phone: data.phone || '',
        photoURL: data.photo_url || null,
        avatar: (data.display_name || data.first_name || data.email || 'U').charAt(0).toUpperCase(),
        bg: 'bg-blue-600',
        role: data.role || 'Foydalanuvchi',
        emailVerified: data.email_verified || false,
        createdAt: data.created_at || new Date().toISOString()
      };

      // Mahalliy tizim ro'yxatiga ham keshlaymiz
      registerSystemAccount(cloudAccount);
      return cloudAccount;
    }
  } catch (cloudErr) {
    // Supabase jadvali hali yaratilmagan bo'lsa yoki offline bo'lsa, xatolik chiqarmasdan local keshga o'tamiz
  }

  // 3. Fallback: Mahalliy ro'yxatdagi mavjud akkaunt
  return localAccount;
};

/**
 * Akkaunt joriy do'konda allaqachon xodim bo'lib ishlayotganligini tekshirish (dublikatdan himoya)
 * 
 * @param {object} account - Topilgan mavjud akkaunt
 * @param {Array} employees - Joriy do'kon xodimlari ro'yxati
 * @returns {boolean} Agar allaqachon xodim bo'lsa true
 */
export const isAccountAlreadyEmployee = (account, employees = []) => {
  if (!account || !Array.isArray(employees)) return false;

  const targetEmail = (account.email || '').trim().toLowerCase();
  const targetPhoneDigits = normalizePhone(account.phone);
  const targetId = account.id || account.uid;

  return employees.some(emp => {
    // Email orqali tekshirish
    if (targetEmail && emp.email && emp.email.trim().toLowerCase() === targetEmail) {
      return true;
    }

    // Telefon orqali tekshirish
    if (targetPhoneDigits && targetPhoneDigits.length >= 7 && emp.phone) {
      const empPhoneDigits = normalizePhone(emp.phone);
      if (empPhoneDigits && (empPhoneDigits === targetPhoneDigits || empPhoneDigits.endsWith(targetPhoneDigits) || targetPhoneDigits.endsWith(empPhoneDigits))) {
        return true;
      }
    }

    // Akkaunt ID orqali tekshirish
    if (targetId && (emp.accountId === targetId || emp.userId === targetId)) {
      return true;
    }

    return false;
  });
};
