/**
 * Savatchi POS — Sana va Vaqt Yordamchisi (dateUtils.js)
 * 
 * Ushbu modul foydalanuvchining mahalliy vaqt zonasi (Timezone) bo'yicha
 * to'g'ri sanalarni hisoblash, taqqoslash va formatlashni ta'minlaydi.
 * UTC offset sababli bugungi savdolar kecha yoki ertaga tushib qolishini oldini oladi.
 */

/**
 * Mahalliy vaqt bo'yicha YYYY-MM-DD formatidagi sanani qaytaradi.
 * @param {Date|string|number} d 
 * @returns {string} Masalan: '2026-10-02'
 */
export const getLocalDateString = (d = new Date()) => {
  const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Bugungi sanadan offsetDays kun oldingi/keyingi sanani YYYY-MM-DD formatida beradi.
 * @param {number} offsetDays Masalan: -1 (kecha), -7 (bir hafta oldin)
 * @param {Date|string|number} baseDate 
 * @returns {string}
 */
export const getOffsetDateString = (offsetDays = 0, baseDate = new Date()) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return getLocalDateString(d);
};

/**
 * Berilgan sana bugungi sana bilan mosligini tekshiradi (mahalliy vaqt bo'yicha).
 * Agar sana berilmagan bo'lsa (default bugungi savdolar), true qaytaradi.
 * @param {string} dateStr 
 * @returns {boolean}
 */
export const isToday = (dateStr) => {
  if (!dateStr) return true;
  return dateStr === getLocalDateString();
};

/**
 * Berilgan sana kechagi sana bilan mosligini tekshiradi.
 * @param {string} dateStr 
 * @returns {boolean}
 */
export const isYesterday = (dateStr) => {
  if (!dateStr) return false;
  return dateStr === getOffsetDateString(-1);
};

/**
 * Sanani o'zbek tilidagi qisqa formatda ko'rsatish (masalan: "02-oktabr 2026")
 * @param {Date|string|number} d 
 * @returns {string}
 */
export const formatDisplayDate = (d = new Date()) => {
  const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const MONTHS_UZ = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
  ];
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = MONTHS_UZ[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day}-${month} ${year}`;
};
