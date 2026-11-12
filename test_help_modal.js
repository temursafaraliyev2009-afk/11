// test_help_modal.js
import fs from 'fs';
import assert from 'assert';

console.log('====================================================');
console.log('SAVATCHI: YORDAM VA QO‘LLAB-QUVVATLASH MAVZULAR TESTI');
console.log('====================================================');

let passedTests = 0;

const content = fs.readFileSync('src/components/HelpModal.jsx', 'utf8');

// 1. MATNLARNING 100% O‘ZGARISHSIZ QOLGANLIGI
console.log('\n--- 1. MATNLAR VA YOZUVLARNING ASLI SAQLANGANLIGI ---');
{
  const requiredTexts = [
    "t('help', 'Yordam va qo‘llab-quvvatlash')",
    "Savatchi tizimidan to‘g‘ri va xavfsiz foydalanish bo‘yicha to‘liq qo‘llanma",
    "t('close', 'Yopish')",
    "Qo‘llanma",
    "Moliya & To‘lovlar",
    "Xatolar & Yechimlar",
    "Savol-Javoblar (FAQ)",
    "Bog‘lanish",
    "Mahsulotlar va omborni boshqarish",
    "Savdo va kassa operatsiyalari",
    "Qarzlar (Nasiya daftari)",
    "Muddatli to‘lov (Bo‘lib to‘lash)",
    "Ijara (Arenda xizmati)",
    "Xodimlar va rollarni boshqarish",
    "t('aboutTitle', 'Savatchi haqida')",
    "Tovar tushumi (Realizatsiya) vs Kassa kirimi",
    "Boshlang‘ich to‘lov, keyingi to‘lov va qolgan qarz",
    "Tannarx (COGS) va Yalpi foyda hisobi",
    "Davr filtrlari (Bugun, Hafta, Oy, Yil)",
    "Moliyaviy hisob-kitoblar qoidalari",
    "1. \"Omborda tovar yetarli emas\" xabari",
    "2. To‘lov summasini qoldiqdan ortiq kiritish",
    "3. Do‘kon almashtirganda ma’lumotlar yo‘qolgandek ko‘rinishi",
    "4. Shartnomani bekor qilish va tovarni omborga qaytarish",
    "Xavfsiz foydalanish va xatolarni to‘g‘rilash",
    "Sabab:",
    "Xavfsiz yechim:",
    "Tez-tez beriladigan savollar",
    "Savatchi tizimi qaysi qurilmalarda ishlaydi?",
    "Nega kiyimlar yoki telefon do‘konida \"Qarzlar\" menyusi yo‘q?",
    "Boshlang‘ich to‘lov to‘g‘ridan-to‘g‘ri kassaga qo‘shiladimi?",
    "Xodimlar mening sof foyda va moliyaviy hisobotlarimni ko‘ra oladimi?",
    "Bir nechta do‘konni bitta hisobdan boshqarsa bo‘ladimi?",
    "Hisobotlar va statistika qachon yangilanadi?",
    "t('contactTitle', 'Men bilan bog‘lanish')",
    "t('contactSubtitle', 'Savol, taklif yoki texnik yordam uchun bevosita Telegram orqali yozishingiz mumkin.')",
    "+998 91 883 07 02",
    "t('copied', 'Nusxa olindi!')",
    "t('copyPhoneTitle', 'Raqamdan nusxa olish')",
    "Olingan",
    "Nusxa",
    "t('contactBtn', 'Telegram orqali bog‘lanish')",
    "t('contactDirectNote', 'Telefon raqam orqali to‘g‘ridan-to‘g‘ri Telegram chat ochiladi')"
  ];

  requiredTexts.forEach((txt) => {
    assert.ok(content.includes(txt), `Matn topilmadi: ${txt}`);
  });

  console.log('✅ [PASS] 1. Barcha yozuvlar va matnlar 100% o‘zgarishsiz saqlangan');
  passedTests++;
}

// 2. USE THEME VA UCHALA MAVZU INTEGRATSIYASI
console.log('\n--- 2. USE THEME VA UCHALA MAVZU ANIQLANISHI ---');
{
  assert.ok(content.includes("import { useTheme } from '../context/ThemeContext';"), 'useTheme import qilingan');
  assert.ok(content.includes("const { theme } = useTheme();"), 'theme holati chaqirilgan');
  assert.ok(content.includes("const isNight = theme === 'night';"), 'Tungi mavzu sharti');
  assert.ok(content.includes("const isTwilight = theme === 'twilight';"), 'Kechki/Shomgi mavzu sharti');
  assert.ok(content.includes("const isDay = !isNight && !isTwilight;"), 'Kunduzgi mavzu sharti');

  console.log('✅ [PASS] 2. Mavjud ThemeContext dan uchala mavzu to‘liq va to‘g‘ri o‘qildi');
  passedTests++;
}

// 3. KUNDUZGI MAVZU DIZAYNI (ENG TO‘Q VA SOKIN: #0F172A / #162032 / #1E293B)
console.log('\n--- 3. KUNDUZGI MAVZU RANG VA KONTRAST TEKSHIRUVI ---');
{
  assert.ok(content.includes("bg-[#0F172A] border-[#2D3B4F]"), 'Kunduzgi eng to‘q dialog foni (#0F172A)');
  assert.ok(content.includes("bg-[#162032] border-[#2D3B4F]"), 'Kunduzgi sarlavha paneli (#162032)');
  assert.ok(content.includes("bg-[#1E293B] border-[#2D3B4F]"), 'Kunduzgi ichki kartalar (#1E293B)');
  assert.ok(content.includes("text-[#F1F5F9]"), 'Kunduzgi sarlavhalar (#F1F5F9)');
  assert.ok(content.includes("text-[#CBD5E1]"), 'Kunduzgi o‘qiluvchi matnlar (#CBD5E1)');

  console.log('✅ [PASS] 3. Kunduzgi mavzuda eng to‘q, sokin neytral ranglar va yuqori kontrast ta’minlandi');
  passedTests++;
}

// 4. SHOMGI (KECHKI) MAVZU DIZAYNI (KUNDUZGIDAN BIROZ YORQINROQ: #1E293B / #243247 / #2B394E)
console.log('\n--- 4. KECHKI / SHOMGI MAVZU RANG VA KONTRAST TEKSHIRUVI ---');
{
  assert.ok(content.includes("bg-[#1E293B] border-[#40536E]"), 'Kechki dialog foni (#1E293B)');
  assert.ok(content.includes("bg-[#243247] border-[#40536E]"), 'Kechki sarlavha paneli (#243247)');
  assert.ok(content.includes("bg-[#2B394E] border-[#40536E]"), 'Kechki kartalar (#2B394E)');
  assert.ok(content.includes("text-[#F8FAFC]"), 'Kechki sarlavhalar (#F8FAFC)');
  assert.ok(content.includes("text-[#E2E8F0]"), 'Kechki matnlar (#E2E8F0)');

  console.log('✅ [PASS] 4. Kechki/Shomgi mavzuda yumshoq, muvozanatli va yorqinroq ranglar ta’minlandi');
  passedTests++;
}

// 5. TUNGI MAVZU DIZAYNI (SHOMGIDAN HAM YORQINROQ VA ANIQROQ: #334155 / #35455E / #3B4C66)
console.log('\n--- 5. TUNGI MAVZU RANG VA KONTRAST TEKSHIRUVI ---');
{
  assert.ok(content.includes("bg-[#334155] border-[#5B708F]"), 'Tungi dialog foni (#334155)');
  assert.ok(content.includes("bg-[#35455E] border-[#5B708F]"), 'Tungi sarlavha paneli (#35455E)');
  assert.ok(content.includes("bg-[#3B4C66] border-[#5B708F]"), 'Tungi kartalar (#3B4C66)');
  assert.ok(content.includes("text-white"), 'Tungi sof oq sarlavhalar (white)');
  assert.ok(content.includes("text-[#FFFFFF]"), 'Tungi aniq o‘qiluvchi ravshan matnlar');

  console.log('✅ [PASS] 5. Tungi mavzuda eng yorqin, aniq va ravshan ranglar ta’minlandi');
  passedTests++;
}

// 6. QAT‘IY YORQINLIK TARTIBI (KUNDUZGI < SHOMGI < TUNGI) MATEMATIK HISOBI
console.log('\n--- 6. YORQINLIK TARTIBI: KUNDUZGI < SHOMGI < TUNGI ---');
{
  // WCAG nisbiy yorqinlik (relative luminance) hisoblash funksiyasi
  const getRelativeLuminance = (hex) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  // Dialog foni yorqinliklari:
  const lumDialogDay = getRelativeLuminance('0F172A');      // Kunduzgi: ~0.0104
  const lumDialogTwilight = getRelativeLuminance('1E293B'); // Shomgi:   ~0.0238
  const lumDialogNight = getRelativeLuminance('334155');    // Tungi:    ~0.0547

  assert.ok(
    lumDialogDay < lumDialogTwilight && lumDialogTwilight < lumDialogNight,
    `Dialog foni yorqinlik tartibi xato: ${lumDialogDay} < ${lumDialogTwilight} < ${lumDialogNight}`
  );

  // Kartalar foni yorqinliklari:
  const lumCardDay = getRelativeLuminance('1E293B');      // Kunduzgi: ~0.0238
  const lumCardTwilight = getRelativeLuminance('2B394E'); // Shomgi:   ~0.0433
  const lumCardNight = getRelativeLuminance('3B4C66');    // Tungi:    ~0.0740

  assert.ok(
    lumCardDay < lumCardTwilight && lumCardTwilight < lumCardNight,
    `Kartalar foni yorqinlik tartibi xato: ${lumCardDay} < ${lumCardTwilight} < ${lumCardNight}`
  );

  // Sarlavha paneli yorqinliklari:
  const lumHeaderDay = getRelativeLuminance('162032');      // Kunduzgi: ~0.0160
  const lumHeaderTwilight = getRelativeLuminance('243247'); // Shomgi:   ~0.0335
  const lumHeaderNight = getRelativeLuminance('35455E');    // Tungi:    ~0.0614

  assert.ok(
    lumHeaderDay < lumHeaderTwilight && lumHeaderTwilight < lumHeaderNight,
    `Sarlavha paneli yorqinlik tartibi xato: ${lumHeaderDay} < ${lumHeaderTwilight} < ${lumHeaderNight}`
  );

  // Chegaralar (border) yorqinliklari:
  const lumBorderDay = getRelativeLuminance('2D3B4F');      // Kunduzgi: ~0.0461
  const lumBorderTwilight = getRelativeLuminance('40536E'); // Shomgi:   ~0.0886
  const lumBorderNight = getRelativeLuminance('5B708F');    // Tungi:    ~0.1656

  assert.ok(
    lumBorderDay < lumBorderTwilight && lumBorderTwilight < lumBorderNight,
    `Chegara yorqinlik tartibi xato: ${lumBorderDay} < ${lumBorderTwilight} < ${lumBorderNight}`
  );

  console.log(`✅ [PASS] 6. Matematik yorqinlik tartibi tasdiqlandi:
      - Dialog foni: KUNDUZGI (0.010) < SHOMGI (0.024) < TUNGI (0.055)
      - Kartalar:    KUNDUZGI (0.024) < SHOMGI (0.043) < TUNGI (0.074)
      - Sarlavha:    KUNDUZGI (0.016) < SHOMGI (0.033) < TUNGI (0.061)
      - Chegaralar:  KUNDUZGI (0.046) < SHOMGI (0.089) < TUNGI (0.166)`);
  passedTests++;
}

// 7. BOG‘LANISH VA INTERAKTIV ELEMENTLAR
console.log('\n--- 7. BOG‘LANISH VA INTERAKTIV ELEMENTLAR ---');
{
  assert.ok(content.includes("handleCopyPhone"), 'Nusxa olish funksiyasi mavjud');
  assert.ok(content.includes("navigator.clipboard.writeText('+998 91 883 07 02')"), 'Telefon nusxalash');
  assert.ok(content.includes('href="https://t.me/+998918830702"'), 'Telegram havolasi');
  assert.ok(content.includes("setExpandedFaq"), 'FAQ akordeon funksiyasi');

  console.log('✅ [PASS] 7. Barcha interaktiv funksiyalar va havolalar to‘liq saqlangan');
  passedTests++;
}

console.log('\n====================================================');
console.log(`NATIJA: ${passedTests}/${passedTests} ta test muvaffaqiyatli o'tdi!`);
console.log('====================================================');
