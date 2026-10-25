// server/authServer.js
/**
 * Savatchi POS — Production-Ready Backend Authentication Server
 * 
 * Ushbu server Google Identity Services orqali olingan haqiqiy Google ID tokenni (JWT)
 * rasmiy Google Tokeninfo API orqali server darajasida tekshiradi.
 * 
 * Foydalanuvchi ma'lumotlar bazasida UNIQUE GOOGLE 'sub' (Subject ID) bo'yicha
 * saqlanadi va identifikatsiya qilinadi. Email asosiy ID sifatida ISHLATILMAYDI.
 */

import express from 'express';
import cors from 'cors';
import https from 'https';

const app = express();
const PORT = process.env.PORT || 5000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ============================================================================
// DATABASE MODEL & ARCHITECTURE
// ============================================================================
/**
 * Foydalanuvchi ma'lumotlar bazasi sxemasi (MongoDB / PostgreSQL / SQL):
 * 
 * Schema: User
 * - id: UUID / ObjectId
 * - googleSub: String (UNIQUE, INDEXED) -> Asosiy unikal identifikator!
 * - email: String (INDEXED)
 * - emailVerified: Boolean
 * - name: String (To'liq ism)
 * - givenName: String (Ism, MAJBURIY)
 * - familyName: String (Familiya, IXTIYORIY)
 * - picture: String (Google profil rasmi URL)
 * - phone: String (Ixtiyoriy)
 * - role: String ('store_owner' | 'cashier' | 'admin')
 * - isProfileComplete: Boolean (Profil to'ldirilganligi)
 * - storeIds: Array[String] (Foydalanuvchiga tegishli do'konlar)
 * - createdAt: Timestamp
 * - updatedAt: Timestamp
 */

// Xotiradagi doimiy repository (Productionda MongoDB / PostgreSQL ga ulanadi)
const usersDatabase = new Map();

/**
 * Google ID tokenni rasmiy Google Tokeninfo API orqali tekshirish
 * @param {string} idToken 
 * @returns {Promise<object>} Google tomonidan tasdiqlangan foydalanuvchi ma'lumotlari
 */
const verifyGoogleIdToken = (idToken) => {
  return new Promise((resolve, reject) => {
    if (!idToken || typeof idToken !== 'string') {
      return reject(new Error('ID token berilmadi yoki formati noto‘g‘ri'));
    }

    const tokenUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;

    https.get(tokenUrl, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const payload = JSON.parse(data);

          if (payload.error || payload.error_description) {
            return reject(new Error(payload.error_description || payload.error || 'Google token haqiqiy emas'));
          }

          // Auditoriya (Client ID) tekshiruvi agar serverda Client ID sozlangan bo'lsa
          if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
            return reject(new Error('Google Client ID mos kelmadi (aud mismatch)'));
          }

          // Token muddati tekshiruvi (exp soniyalarda)
          const nowInSeconds = Math.floor(Date.now() / 1000);
          if (payload.exp && Number(payload.exp) < nowInSeconds) {
            return reject(new Error('Google token muddati tugagan (token expired)'));
          }

          // Unikal 'sub' mavjudligini tasdiqlash
          if (!payload.sub) {
            return reject(new Error('Google tokenida unikal sub (Subject ID) topilmadi'));
          }

          resolve(payload);
        } catch (e) {
          reject(new Error('Google tokenini tahlil qilishda xatolik: ' + e.message));
        }
      });
    }).on('error', (err) => {
      reject(new Error('Google OAuth serveri bilan bog‘lanishda xatolik: ' + err.message));
    });
  });
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/auth/google/verify
 * Google ID tokenni tekshiradi, sub bo'yicha user topadi yoki yaratadi
 */
app.post('/api/auth/google/verify', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'idToken talab qilinadi'
      });
    }

    // 1. Google ID tokenni server darajasida rasmiy tekshirish
    const googlePayload = await verifyGoogleIdToken(idToken);

    const googleSub = googlePayload.sub; // Unique identifier!
    const email = googlePayload.email;
    const emailVerified = googlePayload.email_verified === 'true' || googlePayload.email_verified === true;
    const name = googlePayload.name || '';
    const givenName = googlePayload.given_name || (name ? name.split(' ')[0] : '');
    const familyName = googlePayload.family_name || (name ? name.split(' ').slice(1).join(' ') : '');
    const picture = googlePayload.picture || null;

    let isNewUser = false;
    let user = usersDatabase.get(googleSub);

    if (!user) {
      // Yangi foydalanuvchi yaratish
      isNewUser = true;
      user = {
        sub: googleSub,
        email,
        emailVerified,
        name,
        givenName,
        familyName,
        picture,
        phone: '',
        role: 'store_owner',
        isProfileComplete: Boolean(givenName && givenName.trim().length > 0),
        stores: ['store_food'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      usersDatabase.set(googleSub, user);
    } else {
      // Mavjud foydalanuvchi ma'lumotlarini yangilash (agar Google'da rasm yoki email o'zgargan bo'lsa)
      user.updatedAt = new Date().toISOString();
      if (picture && !user.picture) user.picture = picture;
      usersDatabase.set(googleSub, user);
    }

    return res.json({
      success: true,
      isNewUser,
      user: {
        sub: user.sub,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        givenName: user.givenName,
        familyName: user.familyName,
        picture: user.picture,
        phone: user.phone,
        isProfileComplete: user.isProfileComplete,
        role: user.role
      }
    });

  } catch (error) {
    console.error('[AuthServer] Google verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: error.message || 'Google autentifikatsiyasini tekshirish muvaffaqiyatsiz bo‘ldi'
    });
  }
});

/**
 * POST /api/auth/profile/complete
 * Profil ma'lumotlarini (Ism, Familiya, Telefon) to'ldirish va tasdiqlash
 */
app.post('/api/auth/profile/complete', (req, res) => {
  try {
    const { sub, givenName, familyName, phone } = req.body;

    if (!sub) {
      return res.status(400).json({ success: false, error: 'User sub talab qilinadi' });
    }

    if (!givenName || !givenName.trim()) {
      return res.status(400).json({ success: false, error: 'Ismni kiriting' });
    }

    let user = usersDatabase.get(sub);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Foydalanuvchi topilmadi' });
    }

    const cleanGiven = givenName.trim();
    const cleanFamily = (familyName || '').trim();
    const fullName = cleanFamily ? `${cleanGiven} ${cleanFamily}` : cleanGiven;

    user.givenName = cleanGiven;
    user.familyName = cleanFamily;
    user.name = fullName;
    user.phone = (phone || '').trim();
    user.isProfileComplete = true;
    user.updatedAt = new Date().toISOString();

    usersDatabase.set(sub, user);

    return res.json({
      success: true,
      user: {
        sub: user.sub,
        email: user.email,
        name: user.name,
        givenName: user.givenName,
        familyName: user.familyName,
        picture: user.picture,
        phone: user.phone,
        isProfileComplete: true
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Savatchi Auth Backend', time: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Savatchi AuthServer] Running on port ${PORT}`);
  });
}

export default app;
