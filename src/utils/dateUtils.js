/**
 * Savatchi POS — Sana va Vaqt Yordamchisi (dateUtils.js)
 * 
 * Ushbu modul Asia/Tashkent vaqt zonasi bo'yicha to'g'ri sanalarni hisoblash,
 * taqqoslash va formatlashni ta'minlaydi. UTC offset sababli bugungi savdolar
 * kecha yoki ertaga o'tib ketishining oldini oladi.
 */

export const TASHKENT_TIMEZONE = 'Asia/Tashkent';

/**
 * Asia/Tashkent vaqti bo'yicha YYYY-MM-DD formatidagi sanani qaytaradi.
 * @param {Date|string|number} d 
 * @returns {string} Masalan: '2026-11-01'
 */
export const getLocalDateString = (d = new Date()) => {
  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  try {
    const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: TASHKENT_TIMEZONE }).format(dateObj);
  } catch (e) {
    const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

/**
 * Asia/Tashkent vaqti bo'yicha joriy soatni (0-23) qaytaradi.
 * @param {Date|string|number} d 
 * @returns {number} 0-23
 */
export const getTashkentHour = (d = new Date()) => {
  try {
    const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    if (!dateObj || isNaN(dateObj.getTime())) return new Date().getHours();
    const str = new Intl.DateTimeFormat('en-US', {
      timeZone: TASHKENT_TIMEZONE,
      hour: 'numeric',
      hour12: false
    }).format(dateObj);
    const h = parseInt(str, 10);
    return isNaN(h) ? new Date().getHours() : h;
  } catch (e) {
    return new Date().getHours();
  }
};

/**
 * Asia/Tashkent sanasidan offsetDays kun oldingi/keyingi sanani YYYY-MM-DD formatida beradi.
 * @param {number} offsetDays Masalan: -1 (kecha), -7 (bir hafta oldin)
 * @param {Date|string|number} baseDate 
 * @returns {string}
 */
export const getOffsetDateString = (offsetDays = 0, baseDate = new Date()) => {
  const baseStr = getLocalDateString(baseDate);
  if (!baseStr) return '';
  const parts = baseStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return baseStr;
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  const yr = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(dt.getUTCDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
};

/**
 * Berilgan sana bugungi sana bilan mosligini tekshiradi (Asia/Tashkent bo'yicha).
 * Agar sana berilmagan bo'lsa (default bugungi savdolar), true qaytaradi.
 * @param {string} dateStr 
 * @returns {boolean}
 */
export const isToday = (dateStr) => {
  if (!dateStr) return true;
  return getLocalDateString(dateStr) === getLocalDateString();
};

/**
 * Berilgan sana kechagi sana bilan mosligini tekshiradi (Asia/Tashkent bo'yicha).
 * @param {string} dateStr 
 * @returns {boolean}
 */
export const isYesterday = (dateStr) => {
  if (!dateStr) return false;
  return getLocalDateString(dateStr) === getOffsetDateString(-1);
};

/**
 * Sanani o'zbek tilidagi qisqa formatda ko'rsatish (masalan: "01-noyabr 2026")
 * @param {Date|string|number} d 
 * @returns {string}
 */
export const formatDisplayDate = (d = new Date()) => {
  const dStr = getLocalDateString(d);
  if (!dStr) return '';
  const parts = dStr.split('-').map(Number);
  if (parts.length !== 3) return dStr;
  const [year, monthNum, dayNum] = parts;
  const MONTHS_UZ = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
  ];
  const day = String(dayNum).padStart(2, '0');
  const month = MONTHS_UZ[monthNum - 1] || '';
  return `${day}-${month} ${year}`;
};

/**
 * Oldingi haftaning ayni shunday davrini (like-for-like) hisoblash.
 * Masalan: agar bugun chorshanba bo'lsa, o'tgan haftaning dushanbasidan chorshanbasigacha bo'lgan oralig'ini beradi.
 * @param {Date|string|number} baseDate 
 * @returns {{ prevWeekStartStr: string, prevWeekEndStr: string, prevWeekLikeEndStr: string }}
 */
export const getPreviousWeekLikeForLikeRange = (baseDate = new Date()) => {
  const todayStr = getLocalDateString(baseDate);
  const [y, m, d] = todayStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const currentDayOfWeek = (dt.getUTCDay() + 6) % 7; // 0=Mon, 6=Sun

  const prevWeekStartStr = getOffsetDateString(-currentDayOfWeek - 7, todayStr);
  const prevWeekEndStr = getOffsetDateString(-currentDayOfWeek - 1, todayStr);
  const prevWeekLikeEndStr = getOffsetDateString(-7, todayStr);

  return { prevWeekStartStr, prevWeekEndStr, prevWeekLikeEndStr };
};

/**
 * Oldingi oyning ayni shunday davrini (like-for-like) hisoblash.
 * Masalan: agar bugun oyning 5-kuni bo'lsa, o'tgan oyning 1-kunidan 5-kunigacha bo'lgan oralig'ini beradi.
 * Kabisa yillari va oylar uzunligi farqini to'liq hisobga oladi (masalan: 31-mart vs 28/29-fevral).
 * @param {Date|string|number} baseDate 
 * @returns {{ prevMonthStartStr: string, prevMonthEndStr: string, prevMonthLikeEndStr: string, prevYearMonth: string }}
 */
export const getPreviousMonthLikeForLikeRange = (baseDate = new Date()) => {
  const todayStr = getLocalDateString(baseDate);
  const [y, m, d] = todayStr.split('-').map(Number);

  let prevY = y;
  let prevM = m - 1;
  if (prevM <= 0) {
    prevM = 12;
    prevY -= 1;
  }

  // Oldingi oydagi kunlar soni
  const maxDaysInPrevMonth = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
  const clampedDay = Math.min(d, maxDaysInPrevMonth);

  const prevYStr = String(prevY).padStart(4, '0');
  const prevMStr = String(prevM).padStart(2, '0');
  const maxDayStr = String(maxDaysInPrevMonth).padStart(2, '0');
  const clampedDayStr = String(clampedDay).padStart(2, '0');

  return {
    prevMonthStartStr: `${prevYStr}-${prevMStr}-01`,
    prevMonthEndStr: `${prevYStr}-${prevMStr}-${maxDayStr}`,
    prevMonthLikeEndStr: `${prevYStr}-${prevMStr}-${clampedDayStr}`,
    prevYearMonth: `${prevYStr}-${prevMStr}`
  };
};

/**
 * Oldingi yilning ayni shunday davrini (YTD like-for-like) hisoblash.
 * Masalan: agar bugun 2-noyabr bo'lsa, o'tgan yilning 1-yanvaridan 2-noyabriga qadar bo'lgan oralig'ini beradi.
 * Kabisa yili (29-fevral -> 28-fevral) to'g'ri cheklanadi.
 * @param {Date|string|number} baseDate 
 * @returns {{ prevYearStartStr: string, prevYearEndStr: string, prevYearLikeEndStr: string, prevYear: string }}
 */
export const getPreviousYearLikeForLikeRange = (baseDate = new Date()) => {
  const todayStr = getLocalDateString(baseDate);
  const [y, m, d] = todayStr.split('-').map(Number);
  const prevY = y - 1;

  // 29-fevral kabisa yili chegarasi
  const maxDaysInPrevSameMonth = new Date(Date.UTC(prevY, m, 0)).getUTCDate();
  const clampedDay = Math.min(d, maxDaysInPrevSameMonth);

  const prevYStr = String(prevY).padStart(4, '0');
  const mStr = String(m).padStart(2, '0');
  const clampedDayStr = String(clampedDay).padStart(2, '0');

  return {
    prevYearStartStr: `${prevYStr}-01-01`,
    prevYearEndStr: `${prevYStr}-12-31`,
    prevYearLikeEndStr: `${prevYStr}-${mStr}-${clampedDayStr}`,
    prevYear: prevYStr
  };
};
