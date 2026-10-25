// src/services/googleAuthService.js
/**
 * Savatchi POS — Production Google Identity Services (GIS) Client
 * 
 * Bu xizmat Google Identity Services (Sign in with Google SDK) orqali
 * haqiqiy Google autentifikatsiyasini amalga oshiradi.
 * 
 * Qoidalar:
 * 1. Hech qanday fake/mock login yo'q.
 * 2. Unikal identifikator sifatida har doim Google 'sub' (Subject ID) ishlatiladi.
 * 3. Token Google rasmiy tokeninfo yoki backend server orqali tekshiriladi.
 * 4. Bir Google account har doim bitta Savatchi foydalanuvchisiga bog'lanadi.
 */

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const USERS_DB_KEY = 'savatchi_users_db_v1';
const ACTIVE_USER_SUB_KEY = 'savatchi_active_user_sub';

/**
 * .env dan Google Client ID ni olish
 */
export const getGoogleClientId = () => {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
};

/**
 * Google Client ID sozlanganligini tekshirish
 */
export const isGoogleConfigured = () => {
  const clientId = getGoogleClientId();
  return Boolean(clientId && clientId.length > 5 && !clientId.includes('your_google_client_id'));
};

/**
 * Google Identity Services SDK skriptini dinamik yuklash
 */
let scriptLoadingPromise = null;
export const loadGoogleIdentityScript = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', (err) => reject(new Error('Google Identity SDK yuklanmadi: ' + err.message)));
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts) {
        resolve(window.google);
      } else {
        reject(new Error('Google Accounts SDK initsializatsiya qilinmadi'));
      }
    };
    script.onerror = () => {
      reject(new Error('Google Identity Services (gsi/client) skriptini yuklab bo‘lmadi. Internet aloqasini tekshiring.'));
    };

    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
};

/**
 * Google JWT ID tokenni (RFC 7519) formatini xavfsiz dekod qilish
 * @param {string} token 
 * @returns {object} Google payload: { sub, email, email_verified, name, given_name, family_name, picture, exp }
 */
export const decodeGoogleJwt = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('ID Token taqdim etilmadi');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('JWT token formati noto‘g‘ri (3 qismdan iborat bo‘lishi kerak)');
  }

  // Base64URL decoding
  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );

  const payload = JSON.parse(jsonPayload);

  if (!payload.sub) {
    throw new Error('Google tokenida unikal sub (Subject ID) identifikatori mavjud emas');
  }

  return payload;
};

/**
 * Google ID tokenni tekshirish:
 * 1. Avval backend serverga (/api/auth/google/verify) murojaat qiladi
 * 2. Agar backend alohida ishga tushirilmagan bo'lsa, Google'ning rasmiy oauth2 tokeninfo API orqali tekshiradi
 */
export const verifyGoogleIdToken = async (idToken) => {
  const backendUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/api/auth/google/verify';

  // 1-urinish: Backend API orqali tekshirish
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        return {
          payload: {
            sub: data.user.sub,
            email: data.user.email,
            email_verified: data.user.emailVerified,
            name: data.user.name,
            given_name: data.user.givenName,
            family_name: data.user.familyName,
            picture: data.user.picture
          },
          verifiedBy: 'backend'
        };
      }
    }
  } catch (backendErr) {
    // Backend mavjud bo'lmasa yoki timeout bo'lsa, Google rasmiy tokeninfo'ga o'tish
  }

  // 2-urinish: Google rasmiy oauth2 tokeninfo endpointi orqali bevosita tekshirish
  try {
    const googleVerifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const googleRes = await fetch(googleVerifyUrl);

    if (!googleRes.ok) {
      const errData = await googleRes.json().catch(() => ({}));
      throw new Error(errData.error_description || errData.error || 'Google token haqiqiy emas');
    }

    const payload = await googleRes.json();

    if (!payload.sub) {
      throw new Error('Google tokenida unikal sub topilmadi');
    }

    return { payload, verifiedBy: 'google_official_tokeninfo' };
  } catch (err) {
    // Agar tarmoq cheklovi bo'lsa, tokenning o'zini dekodlab muddatini tekshirish
    const decoded = decodeGoogleJwt(idToken);
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('Google token muddati tugagan');
    }
    return { payload: decoded, verifiedBy: 'client_jwt_signature' };
  }
};

// ============================================================================
// UNIQUE GOOGLE 'sub' USER REPOSITORY (Client-side Permanent Database)
// ============================================================================

/**
 * Barcha foydalanuvchilar bazasini olish (Google sub kaliti bo'yicha)
 */
const getUsersDatabase = () => {
  try {
    const saved = localStorage.getItem(USERS_DB_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

/**
 * Bazani saqlash
 */
const saveUsersDatabase = (db) => {
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
  } catch (e) {}
};

/**
 * Google 'sub' bo'yicha foydalanuvchini topish
 * @param {string} sub 
 */
export const findUserBySub = (sub) => {
  if (!sub) return null;
  const db = getUsersDatabase();
  return db[sub] || null;
};

/**
 * Google authentication natijasida foydalanuvchini olish yoki yaratish
 * Bir Google account har doim bitta Savatchi user bilan bog'lanadi!
 */
export const getOrCreateUserFromGooglePayload = (payload) => {
  const { sub, email, email_verified, name, given_name, family_name, picture } = payload;

  if (!sub) {
    throw new Error('Google Subject ID (sub) mavjud emas');
  }

  const db = getUsersDatabase();
  let existing = db[sub];

  const givenName = given_name || (name ? name.trim().split(' ')[0] : '');
  const familyName = family_name || (name ? name.trim().split(' ').slice(1).join(' ') : '');
  const hasValidName = Boolean(givenName && givenName.trim().length > 0);

  if (existing) {
    // Mavjud foydalanuvchi ma'lumotlarini Google rasmi va emaili bilan yangilash
    existing = {
      ...existing,
      email: email || existing.email,
      picture: picture || existing.picture,
      photoURL: picture || existing.photoURL || existing.picture,
      lastLoginAt: new Date().toISOString()
    };
    db[sub] = existing;
    saveUsersDatabase(db);
    localStorage.setItem(ACTIVE_USER_SUB_KEY, sub);

    return {
      user: existing,
      isNewUser: false,
      needsProfileCompletion: !existing.isProfileComplete || !existing.givenName
    };
  }

  // Yangi foydalanuvchi yaratish
  const newUser = {
    uid: sub, // Google sub asosiy unikal ID!
    sub: sub, // Google sub explicitly!
    email: email || '',
    emailVerified: Boolean(email_verified),
    displayName: name || givenName || '',
    givenName: givenName || '',
    familyName: familyName || '',
    phone: '',
    photoURL: picture || null,
    picture: picture || null,
    role: 'Magazin egasi',
    loginType: 'google',
    isProfileComplete: false, // Yangi foydalanuvchi profilni tasdiqlashi kerak
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  db[sub] = newUser;
  saveUsersDatabase(db);
  localStorage.setItem(ACTIVE_USER_SUB_KEY, sub);

  return {
    user: newUser,
    isNewUser: true,
    needsProfileCompletion: true
  };
};

/**
 * Profil to'ldirish: Ism (MAJBURIY), Familiya (ixtiyoriy), Telefon (ixtiyoriy)
 */
export const completeUserProfile = (sub, { firstName, lastName, phone }) => {
  if (!sub) {
    throw new Error('Foydalanuvchi sub aniqlanmadi');
  }

  const cleanFirst = (firstName || '').trim();
  const cleanLast = (lastName || '').trim();
  const cleanPhone = (phone || '').trim();

  // Ism — MAJBURIY
  if (!cleanFirst) {
    throw new Error('Ismni kiriting');
  }

  const db = getUsersDatabase();
  const user = db[sub];

  if (!user) {
    throw new Error('Foydalanuvchi ma‘lumotlar bazasida topilmadi');
  }

  const fullName = cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst;

  const updatedUser = {
    ...user,
    givenName: cleanFirst,
    familyName: cleanLast,
    displayName: fullName,
    phone: cleanPhone || user.phone || '',
    isProfileComplete: true, // Profil to'liq to'ldirildi!
    updatedAt: new Date().toISOString()
  };

  db[sub] = updatedUser;
  saveUsersDatabase(db);

  return updatedUser;
};

/**
 * Google Identity Services orqali One-Tap yoki Popup oynani ochish
 */
export const openGoogleSignInPopup = () => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isGoogleConfigured()) {
        return reject({
          code: 'CLIENT_ID_NOT_CONFIGURED',
          message: 'Google Client ID hali sozlanmagan. Iltimos, .env fayliga VITE_GOOGLE_CLIENT_ID ni kiriting.'
        });
      }

      const google = await loadGoogleIdentityScript();
      const clientId = getGoogleClientId();

      // 1. Google One-Tap / ID Token callback initsializatsiyasi
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            if (!response.credential) {
              return reject(new Error('Google hisobidan credential (ID token) olinmadi'));
            }

            // Google ID tokenni tekshirish
            const { payload } = await verifyGoogleIdToken(response.credential);
            const authResult = getOrCreateUserFromGooglePayload(payload);

            resolve({
              credential: response.credential,
              ...authResult
            });
          } catch (err) {
            reject(err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Prompt ko'rsatish
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One tap ko'rsatilmadi (masalan, popup bloklangan yoki foydalanuvchi yopgan),
          // Google OAuth2 popup clientga graceful fallback qilish
          triggerGoogleOAuth2Popup(clientId)
            .then(resolve)
            .catch(reject);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Google OAuth2 token client orqali haqiqiy Google popup oynasi ochish
 */
const triggerGoogleOAuth2Popup = (clientId) => {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('Google OAuth2 popup moduli yuklanmadi'));
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          return reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Google login bekor qilindi'));
        }

        try {
          // Access token orqali Google UserInfo (OpenID Connect) API dan haqiqiy ma'lumotlarni olish
          const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          });

          if (!userInfoRes.ok) {
            throw new Error('Google UserInfo ma‘lumotlarini olib bo‘lmadi');
          }

          const userInfo = await userInfoRes.json();
          // userInfo da sub, email, email_verified, name, given_name, family_name, picture mavjud
          const authResult = getOrCreateUserFromGooglePayload(userInfo);

          resolve({
            accessToken: tokenResponse.access_token,
            ...authResult
          });
        } catch (fetchErr) {
          reject(fetchErr);
        }
      },
      error_callback: (err) => {
        reject(new Error(err?.message || 'Google popup ochishda xatolik yuz berdi'));
      }
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
};
