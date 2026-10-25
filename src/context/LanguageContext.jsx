// src/context/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const LANGUAGE_KEY = 'savatchi_language';

export const translations = {
  "uz": {
"appName": "Savatchi",
    "appSubtitle": "Sizning onlayn do‘koningiz",
    "activeStatus": "Faol",
    "loading": "Yuklanmoqda...",
    "save": "Saqlash",
    "saved": "Saqlandi!",
    "cancel": "Bekor qilish",
    "delete": "O‘chirish",
    "edit": "Tahrirlash",
    "add": "Qo‘shish",
    "search": "Qidirish...",
    "filter": "Filtr",
    "all": "Barchasi",
    "actions": "Amallar",
    "status": "Holat",
    "date": "Sana",
    "time": "Vaqt",
    "sum": "so‘m",
    "itemsUnit": "ta",
    "back": "Orqaga",
    "confirm": "Tasdiqlash",
    "close": "Yopish",
    "success": "Muvaffaqiyatli!",
    "error": "Xatolik yuz berdi",
    "navDashboard": "Bosh sahifa",
    "navSales": "Savdo",
    "navInventory": "Ombor",
    "navDebts": "Qarzlar",
    "navRentals": "Ijara",
    "navInstallments": "Muddatli to‘lov",
    "navReports": "Hisobotlar",
    "navOrders": "Buyurtmalar",
    "navOthers": "Boshqalar",
    "navStaff": "Xodimlar",
    "navHistory": "Faoliyat tarixi",
    "navTerminal": "Terminalga ulanish",
    "syncTitle": "SINXRONLASH",
    "syncOnline": "Internet mavjud",
    "syncOffline": "Internet yo‘q (offline)",
    "syncLastTime": "Oxirgi sinxronlash",
    "syncButton": "Sinxronlash",
    "syncingButton": "Sinxronlanmoqda...",
    "store": "Do‘kon",
    "switchStore": "Do‘konni almashtirish",
    "myStores": "Mavjud do‘konlar",
    "addNewStore": "+ Yangi do‘kon ochish",
    "selectStoreType": "Do‘kon turini tanlang",
    "activeStore": "Faol do‘kon",
    "quickSearchPlaceholder": "Tizim bo‘ylab qidirish...",
    "noResultsFound": "Hech narsa topilmadi",
    "noResultsSubtext": "bo‘yicha mos ma’lumot topilmadi",
    "searchCategoryProduct": "Mahsulot",
    "searchCategoryDebt": "Qarzdor",
    "searchCategoryOrder": "Buyurtma",
    "searchCategorySale": "Savdo",
    "searchCategoryStaff": "Xodim",
    "searchCategorySection": "Bo‘lim",
    "resultsCount": "ta natija",
    "activeAccount": "Faol akkaunt",
    "profileDetails": "Profil ma’lumotlari",
    "addAccount": "Akkaunt qo‘shish",
    "otherAccounts": "Boshqa akkauntlar",
    "language": "Til",
    "theme": "Mavzu",
    "themeSelect": "Mavzuni tanlang",
    "dayMode": "Kunduzgi rejim",
    "twilightMode": "Shom rejimi",
    "nightMode": "Tungi rejim",
    "themeModeDesc": "Sayt ko‘rinishini tanlang. Tanlov saqlanadi.",
    "dayModeDesc": "Yorug‘, qulay ko‘rinish",
    "twilightModeDesc": "Yumshoq shom ranglari",
    "nightModeDesc": "To‘liq qorong‘i ko‘rinish",
    "help": "Yordam va qo‘llab-quvvatlash",
    "logout": "Chiqish",
    "logoutConfirmTitle": "Haqiqatan ham akkauntdan chiqmoqchimisiz?",
    "logoutConfirmDesc": "Tizimdan chiqsangiz, qayta kirish uchun Google yoki telefon raqamingizdan foydalanishingiz kerak bo‘ladi.",
    "greetingMorning": "Xayrli kun",
    "greetingEvening": "Xayrli oqshom",
    "todaySales": "BUGUNGI SAVDO",
    "inventoryStatus": "OMBOR HOLATI",
    "totalDebts": "JAMI QARZ",
    "ordersTitle": "BUYURTMALAR",
    "productsWord": "mahsulot",
    "waitingOrders": "kutilmoqda",
    "activeClients": "ta faol mijoz",
    "viewInventory": "Omborni ko‘rish →",
    "viewDebts": "Qarzlarni ko‘rish →",
    "viewOrders": "Buyurtmalarni ko‘rish →",
    "importantProducts": "MUHIM MAHSULOTLAR",
    "needsAttention": "E’TIBOR BERISH KERAK",
    "todaySalesChart": "BUGUNGI SAVDO GRAFIKASI",
    "quickActions": "TEZKOR AMALLAR",
    "newSaleAction": "Yangi savdo",
    "newSaleSubtitle": "Savdo qilish",
    "addDebtAction": "Qarz qo‘shish",
    "addDebtSubtitle": "Qarz kiritish",
    "addProductAction": "Mahsulot qo‘shish",
    "addProductSubtitle": "Yangi mahsulot",
    "addOrderAction": "Buyurtma qo‘shish",
    "addOrderSubtitle": "Yangi buyurtma",
    "recentActions": "SO‘NGGI HARAKATLAR",
    "topProducts": "TOP MAHSULOTLAR",
    "today": "Bugun",
    "yesterday": "Kecha",
    "thisWeek": "Hafta",
    "thisMonth": "Oy",
    "thisYear": "Yil",
    "moreThanYesterday": "kechagidan ko‘p",
    "lessThanYesterday": "kechagidan kam",
    "debtsTitle": "QARZLAR",
    "debtsSubtitle": "Nasiya daftari, to‘lovlar nazorati va qarzlar auditi",
    "btnAddDebt": "Qarz qo‘shish",
    "statTotalActiveDebt": "Jami faol qarz",
    "statTotalActiveDebtSub": "qaytarilishi kutilmoqda",
    "statActiveDebtors": "Faol qarzdorlar",
    "statActiveDebtorsSub": "ta qarzdor mijoz",
    "statPaidDebts": "To‘langan qarzlar",
    "statPaidDebtsSub": "to‘liq yopilgan",
    "statOverdueDebts": "Kechikkan qarz",
    "statOverdueDebtsSub": "shoshilinch talab qilinadi",
    "tabActiveDebts": "Faol qarzlar",
    "tabPaidDebts": "To‘langan qarzlar",
    "tabAllDebts": "Barcha qarzlar",
    "searchDebtorPlaceholder": "Ism, telefon yoki mahsulot bo‘yicha qidirish...",
    "suggestionsLabel": "Tavsiyalar:",
    "tableDebtorName": "Qarzdor shaxs",
    "tableDebtAmount": "Qarz miqdori",
    "tableGivenDate": "Berilgan sana",
    "tableDueDate": "To‘lov muddati",
    "tableDebtStatus": "Holati",
    "tableDebtNote": "Izoh / Tovar",
    "statusPaid": "Qarz to‘landi",
    "statusPartial": "Qisman to‘langan",
    "statusOverdue": "Kechikkan",
    "statusDueToday": "Bugun to‘lanishi kerak",
    "statusPending": "Kutilmoqda",
    "btnPay": "To‘lash",
    "payModalTitle": "Qarz to‘lovini qabul qilish",
    "payAmountLabel": "To‘lov summasi (so‘m)",
    "payAmountPlaceholder": "Masalan: 50 000",
    "remainingDebtLabel": "To‘lovdan keyin qoladigan qarz:",
    "paySuccessFull": "Qarz to‘liq yopiladi!",
    "paySuccessPartial": "Qisman to‘lanadi",
    "btnConfirmPayment": "To‘lovni tasdiqlash",
    "deleteDebtConfirmTitle": "Qarzni o‘chirmoqchimisiz?",
    "deleteDebtConfirmDesc": "Ushbu amal qarzdorlik yozuvini doimiy o‘chiradi.",
    "newDebtModalTitle": "Yangi qarz yozuvi kiritish",
    "debtorNameLabel": "Qarzdorning to‘liq ismi",
    "debtorPhoneLabel": "Telefon raqami",
    "debtAmountInputLabel": "Qarz miqdori (so‘m)",
    "dueDateLabel": "Qaytarish muddati",
    "debtNoteLabel": "Qarz sababi / Mahsulot",
    "salesTitle": "SAVDO TAHLILI",
    "salesSubtitle": "Real vaqt kassa hisoboti va moliyaviy oqimlar",
    "periodToday": "Bugun",
    "periodYesterday": "Kecha",
    "period7Days": "Oxirgi 7 kun",
    "period30Days": "Oxirgi 30 kun",
    "periodYear": "Yil",
    "kpiTotalSales": "Jami savdo",
    "kpiSoldProducts": "Sotilgan tovarlar",
    "kpiSalesCount": "Savdolar soni",
    "kpiAverageCheck": "O‘rtacha chek",
    "kpiCash": "Naqd to‘lov",
    "kpiCard": "Karta to‘lov",
    "comparisonVsPrevious": "oldingi davrga nisbatan",
    "salesDynamics": "Savdo dinamikasi grafigi",
    "todayVsPrev": "Bugun va oldingi savdo",
    "currentSalesLabel": "Joriy savdo",
    "previousSalesLabel": "Oldingi savdo",
    "differenceLabel": "Farq",
    "changePctLabel": "O‘zgarish",
    "paymentTypesTitle": "To‘lov turlari taqsimoti",
    "topSellingProductsTitle": "Eng ko‘p sotilgan tovarlar",
    "sellerPerformanceTitle": "Sotuvchilar bo‘yicha savdo",
    "colEmployee": "Xodim",
    "colSalesCount": "Savdolar",
    "colTotalSales": "Jami savdo",
    "colItemsSold": "Sotilgan tovarlar",
    "inventoryTitle": "OMBOR VA ZAXIRALAR",
    "inventorySubtitle": "Zaxiralar nazorati, narxlar va tovar kartochkalari",
    "btnAddProduct": "Mahsulot qo‘shish",
    "statTotalProducts": "Jami mahsulotlar",
    "statLowStock": "Kam qolgan",
    "statOutOfStock": "Tugagan",
    "statInventoryValue": "Ombor umumiy qiymati",
    "filterCategory": "Kategoriya",
    "filterAllCategories": "Barcha kategoriyalar",
    "filterStatus": "Holat",
    "filterAllStatuses": "Barcha holatlar",
    "filterSort": "Narx saralash",
    "sortDefault": "Standart tartib",
    "sortPriceAsc": "Avval arzonlari",
    "sortPriceDesc": "Avval qimmatlari",
    "colProduct": "Mahsulot",
    "colCategory": "Kategoriya",
    "colStock": "Qoldiq miqdori",
    "colPrice": "Sotish narxi",
    "colCostPrice": "Tannarx",
    "colStatus": "Holat",
    "statusInStock": "Yetarli",
    "statusLow": "Kam",
    "statusOut": "Tugagan",
    "unitPiece": "dona",
    "quickStockIncrease": "Zaxirani oshirish",
    "quickStockDecrease": "Zaxirani kamaytirish",
    "editProductModalTitle": "Mahsulotni tahrirlash",
    "deleteProductConfirmTitle": "Mahsulotni o‘chirishni tasdiqlaysizmi?",
    "ordersPageTitle": "BUYURTMALAR",
    "ordersPageSubtitle": "Yetkazib beruvchilar va buyurtmalar nazorati",
    "btnAddOrder": "Buyurtma qo‘shish",
    "statTotalOrders": "Jami buyurtmalar",
    "statOnTheWay": "Hali yo‘lda",
    "statDelivered": "Yetkazildi",
    "statTotalOrderSum": "Jami buyurtma summasi",
    "filterAllOrders": "Barcha buyurtmalar",
    "filterOnTheWay": "Faqat yo‘ldagilar",
    "filterDelivered": "Faqat yetkazilganlar",
    "colOrderId": "Buyurtma ID",
    "colOrderProduct": "Mahsulot",
    "colOrderSupplier": "Yetkazib beruvchi",
    "colOrderQty": "Miqdor",
    "colOrderTotal": "Summa",
    "colOrderStatus": "Holat",
    "orderStatusOnTheWay": "Hali yo‘lda",
    "orderStatusDelivered": "Yetkazildi",
    "orderStatusPending": "Kutilmoqda",
    "reportsPageTitle": "HISOBOTLAR VA ANALITIKA",
    "reportsPageSubtitle": "Foyda, xarajatlar va rentabellik tahlili",
    "btnExportExcel": "Eksport (Excel)",
    "tabSalesReport": "Savdo hisoboti",
    "tabProfitReport": "Foyda va zarar",
    "tabInventoryReport": "Ombor hisoboti",
    "tabDebtsReport": "Qarzlar hisoboti",
    "revenueTitle": "Jami tushum",
    "netProfitTitle": "Sof foyda",
    "profitMarginTitle": "Rentabellik",
    "totalExpensesTitle": "Xarajatlar",
    "profitExpenseChart": "Tushum va xarajatlar taqqoslashi",
    "staffTitle": "XODIMLAR VA ROLLARI",
    "staffSubtitle": "Do‘kon xodimlari ro‘yxati, ruxsatlar va faollik darajasi",
    "btnAddStaff": "Xodim qo‘shish",
    "slotsCapacityText": "xodim o‘rni band",
    "availableSlotsText": "ta bo‘sh o‘rin mavjud",
    "roleOwner": "Do‘kon egasi",
    "roleSeniorSeller": "Katta sotuvchi",
    "roleCashier": "Kassir",
    "roleStockManager": "Ombor mudiri",
    "roleSeller": "Sotuvchi",
    "staffNameLabel": "Xodimning to‘liq ismi",
    "staffEmailLabel": "Email manzili",
    "staffPhoneLabel": "Telefon raqami",
    "staffRoleLabel": "Lavozimi / Roli",
    "deleteStaffConfirmTitle": "Xodimni tizimdan o‘chirmoqchimisiz?",
    "historyTitle": "FAOLIYAT TARIXI",
    "historySubtitle": "Do‘konda bajarilgan amallar tarixini ko‘ring.",
    "totalAuditLogs": "Jami qaydlar",
    "filterByUser": "Xodim bo‘yicha",
    "filterByCategory": "Bo‘lim bo‘yicha",
    "catSales": "Savdo",
    "catInventory": "Ombor",
    "catDebt": "Qarz",
    "catOrder": "Buyurtma",
    "catStaff": "Xodimlar",
    "settingsModalTitle": "Tizim Sozlamalari",
    "tabProfile": "Profil",
    "tabStoreInfo": "Do‘kon",
    "tabLanguage": "Til va Hudud",
    "tabTheme": "Ko‘rinish",
    "tabNotifications": "Xabarnomalar",
    "tabAccounts": "Akkauntlar",
    "firstNameLabel": "Ism",
    "lastNameLabel": "Familiya",
    "phoneLabel": "Telefon raqam",
    "emailLabel": "Email",
    "storeNameLabel": "Do‘kon nomi",
    "selectLanguageText": "Interfeys tilini tanlang",
    "themeLight": "Yorug‘ rejim",
    "themeDark": "Qorong‘i rejim",
    "themeSystem": "Tizim standarti",
    "notifyOrders": "Yangi buyurtmalar haqida bildirishnoma",
    "notifyDebts": "Qarz to‘lovi muddati eslatmalari",
    "notifyStock": "Tugayotgan tovarlar haqida tezkor ogohlantirish",
    "loginTitle": "Savatchi tizimiga kirish",
    "loginSubtitle": "Do‘kon boshqaruv paneliga xush kelibsiz",
    "phoneTab": "Telefon orqali",
    "googleTab": "Google hisob",
    "emailTab": "Email va parol",
    "btnSendCode": "Tasdiqlash kodini olish",
    "btnVerifyAndLogin": "Kodni tasdiqlash va kirish",
    "resendCode": "Kodni qayta yuborish",
    "demoCodeHint": "Demo tasdiqlash kodi",
    "passwordLabel": "Parol",
    "btnLogin": "Kirish",
    "forgotPassword": "Parolni unutdingizmi?",
    "rememberMe": "Meni eslab qol",
    "orContinueWith": "yoki quyidagilar bilan davom eting",
    "storeFood": "Oziq-ovqat do‘koni",
    "storeFoodDesc": "Oziq-ovqat, ichimliklar, sabzavot-mevalar va bakkaliya",
    "storePhone": "Telefon do‘koni",
    "storePhoneDesc": "Smartfonlar, planshetlar, gadjetlar va IMEI hisobi",
    "storeClothing": "Kiyim-kechak do‘koni",
    "storeClothingDesc": "Kiyimlar, oyoq kiyimlar, razmerlar va ranglar",
    "storeCosmetics": "Kosmetika do‘koni",
    "storeCosmeticsDesc": "Pardoz, parfyum va go‘zallik parvarishi",
    "storeConstruction": "Qurilish mollari do‘koni",
    "storeConstructionDesc": "Sement, bo‘yoqlar, santexnika va asbob-uskunalar",
    "storeHousehold": "Uy-ro‘zg‘or do‘koni",
    "storeHouseholdDesc": "Idish-tovoqlar, tozalash vositalari va oshxona anjomlari",
    "storeSport": "Sport jihozlari do‘koni",
    "storeSportDesc": "Futbol, fitnes, boks va trenajyor jihozlari",
    "storeAccessories": "Aksessuarlar do‘koni",
    "storeAccessoriesDesc": "Powerbanklar, quloqchinlar, simsiz zaryadkalar va kabellar",
    "storeFlower": "Gul do‘koni",
    "storeFlowerDesc": "Tirik gullar, bayramona buketlar va sovg‘alar",
    "fieldBrand": "Brend / Ishlab chiqaruvchi",
    "fieldModel": "Model",
    "fieldStorage": "Xotira hajmi",
    "fieldRam": "RAM operativ xotira",
    "fieldColor": "Rangi",
    "fieldImei": "IMEI / Serial raqami",
    "fieldWarranty": "Kafolat muddati (oy)",
    "fieldSize": "Razmer / O‘lcham",
    "fieldGender": "Jins",
    "fieldMaterial": "Materiali",
    "fieldExpiryDate": "Yaroqlilik muddati",
    "fieldVolume": "Hajmi / Og‘irligi",
    "fieldUnit": "O‘lchov birligi",
    "fieldSportType": "Sport turi",
    "fieldFlowerType": "Gul turi",
    "fieldDelivery": "Yetkazib berish xizmati",
    "terminalTitle": "TERMINALGA ULANISH",
    "terminalSubtitle": "POS to‘lov terminallari integratsiyasi va sozlamalari",
    "terminalStatus": "Terminal holati",
    "terminalConnected": "Ulangan",
    "terminalConnecting": "Ulanmoqda...",
    "terminalDisconnected": "Ulanmagan",
    "terminalError": "Aloqa xatosi",
    "terminalConfig": "Terminal konfiguratsiyasi",
    "terminalModel": "Terminal modeli",
    "terminalConnection": "Ulanish turi",
    "terminalIp": "IP Manzil va Port",
    "terminalId": "Terminal ID (TID)",
    "merchantId": "Savdogar ID (MID)",
    "btnConnectTerminal": "Terminalga ulanish",
    "btnDisconnectTerminal": "Aloqani uzish",
    "btnTestTerminal": "Diagnostika testi",
    "btnSyncTerminal": "Kalitlarni sinxronlash",
    "terminalLogs": "Terminal operatsiyalari jurnali",
    "testPayment": "Test to‘lovi",
    "testAmount": "Test summasi",
    "btnRunTest": "Test to‘lovini yuborish",
    "terminalNotConfigured": "Terminal integratsiyasi hali sozlanmagan",
    "terminalNotConfiguredDesc": "To‘lovlarni to‘g‘ridan-to‘g‘ri qabul qilish uchun POS terminalingizni (PAX, Ingenico, Sunmi, Uzcard, Humo) sozlang.",
    "terminalName": "Terminal nomi",
    "terminalClearLogs": "Jurnalni tozalash",
    "terminalDeviceReady": "Qurilma to‘lovga tayyor",
    "editDebtModalTitle": "Qarz ma’lumotlarini tahrirlash",
    "btnSaveDebt": "O‘zgarishlarni saqlash",
    "debtEditedTitle": "Qarz tahrirlandi!",
    "debtEditedDesc": "Qarz ma’lumotlari muvaffaqiyatli saqlandi.",
    "profileCompletionTitle": "Profil ma’lumotlarini tasdiqlash",
    "profileCompletionSubtitle": "Savatchi tizimidan foydalanish uchun profilingizni to‘ldiring",
    "firstNamePlaceholder": "Ismingizni kiriting",
    "firstNameRequiredError": "Ismni kiriting",
    "lastNamePlaceholder": "Familiyangiz (ixtiyoriy)",
    "phoneOptionalLabel": "Telefon raqam",
    "phoneOptionalHint": "Ixtiyoriy, keyin kiritish mumkin",
    "emailFromGoogleLabel": "Email manzil (Google hisob)",
    "btnCompleteProfile": "Saqlash va davom etish",
    "googleClientIdMissingTitle": "Google Client ID sozlanmagan",
    "googleClientIdMissingDesc": "Haqiqiy Google hisob orqali kirish uchun .env faylida VITE_GOOGLE_CLIENT_ID sozlanishi zarur.",
    "googleClientIdHowTo": "Google Cloud Console -> APIs & Services -> Credentials bo‘limidan Web Application Client ID oling.",
    "googleAccountBtn": "Google hisobi orqali kirish",
    "googleOneUserPerAccount": "Bir Google hisob doimiy yagona Savatchi foydalanuvchisi bilan bog‘lanadi.",
    "allSales": "BARCHA SAVDO",
    "lightMode": "Kunduzgi rejim",
    "dayModeOn": "Kunduzgi rejim yoqildi.",
    "twilightModeOn": "Shom rejimi yoqildi.",
    "nightModeOn": "Tungi rejim yoqildi.",
    "themeUpdated": "Mavzu yangilandi",
    "loginTab": "Kirish",
    "registerTab": "Ro‘yxatdan o‘tish",
    "registerTitle": "Ro‘yxatdan o‘tish",
    "registerSubtitle": "Yangi do‘kon egasi sifatida ro‘yxatdan o‘ting",
    "confirmPassword": "Parolni tasdiqlang",
    "passwordMinChars": "(kamida 6 ta belgi)",
    "fullName": "Ismingiz",
    "fullNamePlaceholder": "To‘liq ismingiz",
    "btnRegister": "Hisob yaratish",
    "noAccount": "Hisobingiz yo‘qmi?",
    "hasAccount": "Allaqachon hisobingiz bormi?",
    "registerLink": "Ro‘yxatdan o‘ting",
    "loginLink": "Kirish",
    "passwordMismatchError": "Parollar mos kelmadi!",
    "passwordTooShortError": "Parol kamida 6 ta belgidan iborat bo‘lishi kerak!",
    "loginSuccessTitle": "Xush kelibsiz!",
    "loginSuccessDesc": "Tizimga muvaffaqiyatli kirdingiz.",
    "registerSuccessDesc": "Ro‘yxatdan muvaffaqiyatli o‘tdingiz va kirdingiz!",
    "accountNotFoundStaff": "Bunday akkaunt mavjud emas. Avval foydalanuvchi akkaunt yaratishi kerak.",
    "accountAlreadyStaff": "Bu akkaunt allaqachon xodimlar ro‘yxatida.",
    "searchStaffAccountLabel": "Akkauntni qidirish (Email, telefon yoki ID)",
    "searchStaffAccountPlaceholder": "Masalan: jasur@savatchi.uz yoki +998 93 111 22 33",
    "btnCheckAccount": "Tekshirish",
    "verifiedAccountBadge": "Tizimda mavjud akkaunt",
    "btnAssignStaff": "Xodim sifatida biriktirish",
    "copyright": "© 2025 Savatchi · Barcha huquqlar himoyalangan",
    "helpSubtitle": "Savatchi qo‘llanmasi va bevosita aloqa",
    "aboutTitle": "Savatchi haqida",
    "aboutDesc": "“Savatchi — kichik do‘konlarni boshqarishni osonlashtiruvchi zamonaviy web-sayt. U mahsulotlar va ombor qoldig‘ini nazorat qilish, savdolarni hisobga olish, qarzlarni boshqarish, buyurtmalarni kuzatish hamda hisobotlarni ko‘rishga yordam beradi.”",
    "featuresTitle": "Sayt imkoniyatlari",
    "featuresSubtitle": "Asosiy imkoniyatlar",
    "featInventoryTitle": "Mahsulotlar va omborni boshqarish",
    "featInventoryDesc": "Mahsulotlar qoldig‘i, yangi tovarlar kiritish va narxlarni nazorat qilish.",
    "featSalesTitle": "Savdo va tushumlarni hisobga olish",
    "featSalesDesc": "Tezkor kassa savdolari, naqd va karta tushumlarini aniq hisoblab borish.",
    "featDebtsTitle": "Mijozlar qarzlarini kuzatish",
    "featDebtsDesc": "Nasiya savdolar, to‘lov muddatlari va qarzdorlik hisobini yuritish.",
    "featOrdersTitle": "Buyurtmalarni boshqarish",
    "featOrdersDesc": "Yangi, yo‘ldagi va yetkazib berilgan mijoz buyurtmalarini boshqarish.",
    "featReportsTitle": "Hisobotlar orqali do‘kon faoliyatini kuzatish",
    "featReportsDesc": "Savdo aylanmasi, daromad va do‘kon ko‘rsatkichlarini chuqur tahlil qilish.",
    "featStaffTitle": "Xodimlar va ularning rollarini boshqarish",
    "featStaffDesc": "Do‘kon xodimlari ro‘yxati va ularning tizimdagi vazifa rollarini sozlash.",
    "contactTitle": "Men bilan bog‘lanish",
    "contactSubtitle": "Savol, taklif yoki yordam uchun bevosita Telegram orqali yozishingiz mumkin",
    "contactBtn": "Telegram orqali bog‘lanish",
    "contactDirectNote": "Telefon raqam orqali to‘g‘ridan-to‘g‘ri Telegram chat ochiladi",
    "copyBtn": "Nusxalash",
    "copied": "Nusxa olindi!",
    "copyPhoneTitle": "Raqamdan nusxa olish",
    "loggedOut": "Tizimdan chiqildi",
    "loggedOutDesc": "Xayr! Do‘kon boshqaruv panelidan xavfsiz chiqdingiz.",
    "mailboxTitle": "Pochta & Xabarlar",
    "mailbox": "Pochta",
    "storeSwitched": "Do‘kon almashtirildi",
    "invitationAcceptedTitle": "Taklif qabul qilindi!",
    "invitationRejectedTitle": "Taklif rad etildi",
    "saleSuccessTitle": "Savdo saqlandi!",
    "debtSuccessTitle": "Qarz qo‘shildi!",
    "prodSuccessTitle": "Mahsulot qo‘shildi!",
    "orderSuccessTitle": "Buyurtma saqlandi!",
    "profileSavedDesc": "Profil ma’lumotlari muvaffaqiyatli yangilandi.",
    "profileSaveError": "Profil ma’lumotlarini saqlashda xatolik yuz berdi.",
    "saving": "Saqlanmoqda...",
    "debtPaidTitle": "To‘lov qabul qilindi!",
    "debtDeletedTitle": "Qarz o‘chirildi",
    "accountFoundTitle": "Mavjud akkaunt ma’lumotlari",
    "staffDeletedTitle": "Xodim o‘chirildi",
    "prodUpdated": "Mahsulot yangilandi",
    "prodDeleted": "Mahsulot o‘chirildi",
    "invalidEmailError": "Haqiqiy email manzilini kiriting",
    "invalidCredentialsError": "Email yoki parol noto‘g‘ri",
    "nameRequiredError": "Ismingizni kiriting (kamida 2 ta harf)",
    "confirmEmailMessage": "Ro‘yxatdan o‘tdingiz! Email manzilingizga tasdiqlash xati yuborildi. Iltimos emailingizni tekshiring va tasdiqlang, so‘ng kiring.",
    "registerError": "Ro‘yxatdan o‘tishda xatolik yuz berdi",
    "email": "Email",
    "password": "Parol",
    "orderStatusCancelled": "Bekor qilindi",
    "orderStatusUpdated": "Holat yangilandi",
    "orderDeleted": "Buyurtma o‘chirildi",
    "comparisonVsYesterday": "kechagiga nisbatan",
    "comparisonVsPreviousMonth": "oldingi 30 kunga nisbatan",
    "comparisonVsPreviousYear": "o‘tgan yilga nisbatan",
    "comparisonVsPrevDay": "undan oldingi kunga nisbatan",
    "storeCreated": "Do‘kon ochildi!",
    "receiptTitle": "Xarid Cheki",
    "receiptFieldStore": "Soha",
    "receiptNumber": "Chek raqami",
    "receiptDateTime": "Sana / Vaqt",
    "receiptCashier": "Kassir / Sotuvchi",
    "receiptPaymentType": "To‘lov turi",
    "receiptUnitPrice": "Dona narxi",
    "receiptTotalPaid": "JAMI TO‘LANDI",
    "receiptThankYou": "Xaridingiz uchun rahmat!",
    "receiptPrintBtn": "Chekni chop etish",
    "dashboardOverviewSubtext": "Do‘koningizning asosiy ko‘rsatkichlarini bir joyda kuzating.",
    "stockRemaining": "Qoldiq",
    "paid": "To‘langan",
    "activeDebtStatus": "Faol qarz",
    "allSalesChartTitle": "BARCHA SAVDOLAR GRAFIKASI",
    "collapseAction": "Qisqartirish",
    "expandAction": "Kengaytirish",
    "periodWeek": "Hafta",
    "periodMonth": "Oy",
    "paymentCash": "Naqd",
    "paymentCard": "Karta",
    "paymentDebt": "Nasiya",
    "debtStatusOverdue": "Kechikkan",
    "debtStatusPending": "Kutilmoqda",
    "debtStatusDueToday": "Bugun to‘lanishi kerak",
    "debtStatusPaid": "Qarz to‘landi",
    "settings": "Sozlamalar",
    "nineBusinessTypes": "9 xil biznes sohasi",
    "selectStoreSubtitle": "Har bir magazin turi uchun moslashtirilgan tovar parametrlari, ombor jadvali va kassa tizimi avtomatik faollashadi.",
    "goToStore": "Do‘konga o‘tish",
    "openNewStore": "Yangi do‘kon ochish",
    "categorySphere": "sohasi",
    "btnCreateStore": "Do‘konni yaratish",
    "deliveryLabel": "Yetkazib berish:",
    "selectCity": "Shaharni tanlang",
    "appTagline": "Eko Bozor & Express",
    "searchStorePlaceholder": "10 000+ mahsulot, meva va maishiy texnika izlang...",
    "topSearchResults": "Top qidiruv natijalari",
    "navAnalytics": "Tahlil",
    "navSeller": "Sotuvchi",
    "navWishlist": "Saralanganlar",
    "cart": "Savatcha",
    "heroSearchByCategory": "Kategoriyalar bo‘yicha qidiruv",
    "quickDeliveryBadge": "Tezkor yetkazish ~ 15 daqiqa",
    "featFastDelivery": "Tezkor Yetkazib Berish",
    "featFastDeliverySub": "15 daqiqada eshigingizda",
    "featOrganic": "100% Organik & Kafolat",
    "featOrganicSub": "Sertifikatlangan toza mahsulot",
    "featAffordable": "Hamyonbop Narxlar",
    "featAffordableSub": "Doimiy mega chegirmalar",
    "featEasyPayment": "Qulay To‘lov",
    "featEasyPaymentSub": "Click, Payme, Naqd & Karta",
    "banner1Title": "Sarxil Mevalar va Organik Mahsulotlar",
    "banner1Subtitle": "To‘g‘ridan-to‘g‘ri bog‘lardan xonadoningizga 15 minutda!",
    "banner1Badge": "SUPER CHEGIRMA",
    "banner1Tag": "30% gacha tejab qoling",
    "banner1Btn": "Xarid qilish",
    "banner2Title": "Apple & Samsung Premium Gadjetlar",
    "banner2Subtitle": "Rasmiy kafolat va Toshkent bo‘ylab tekin va tezkor yetkazish",
    "banner2Badge": "YANGI KOLLEKSIYA",
    "banner2Tag": "0% Muddatli to‘lov",
    "banner2Btn": "Texnikani ko‘rish",
    "banner3Title": "Eko Uy-Ro‘zg‘or & Texnika",
    "banner3Subtitle": "Shinam va zamonaviy xonadon uchun eng saralangan brendlar",
    "banner3Badge": "TOP BRENDLAR",
    "banner3Tag": "Keshbek 5%",
    "banner3Btn": "Tanlash",
    "quickView": "Tezkor ko‘rish",
    "addToCart": "Savatchaga qo‘shish",
    "unitFor": "uchun",
    "removeFromWishlist": "Saralanganlardan o‘chirish",
    "addToWishlist": "Saralanganlarga saqlash",
    "specifications": "Xususiyatlari",
    "quantity": "Miqdor",
    "qualityGuarantee": "100% Sifat kafolati",
    "reviews": "sharh",
    "yourCart": "Sizning Savatchangiz",
    "cartItemsSelected": "xil mahsulot tanlandi",
    "freeShippingReached": "Siz Bepul yetkazib berishga ega bo‘ldingiz! 🎉",
    "addMorePrefix": "Yana",
    "addMoreForFreeShipping": "qo‘shing va Bepul yetkazishga ega bo‘ling!",
    "cartEmpty": "Savatchangiz bo‘sh",
    "cartEmptyDesc": "Katalogdan o‘zingizga yoqqan meva, oziq-ovqat yoki texnika vositalarini qo‘shing!",
    "startShopping": "Xarid qilishni boshlash",
    "promoCodePlaceholder": "Promo kod (masalan: SAVATCHI2026)",
    "apply": "Qo‘llash",
    "productsTotal": "Mahsulotlar qiymati:",
    "discount": "Chegirma:",
    "delivery": "Yetkazib berish:",
    "free": "BEPUL",
    "totalToPay": "Jami to‘lov:",
    "proceedCheckout": "Buyurtmani Rasmiylashtirish",
    "orderAcceptedTitle": "Buyurtma Qabul Qilindi! 🎉",
    "orderContactSoon": "Kuryerimiz tez orada siz bilan bog‘lanadi",
    "enterAddressPayment": "Manzil va to‘lov turini kiriting",
    "thankYouOrder": "Rahmat, buyurtmangiz rasmiylashtirildi!",
    "deliveryAddressLabel": "Yetkazib berish manzili:",
    "orderStatusOnTheWayExpress": "Express Kuryer Yo‘lda",
    "totalAmount": "Jami summangiz:",
    "fullNameLabel": "To‘liq ismingiz",
    "cityLabel": "Shahar / Viloyat",
    "addressLabel": "Aniq yetkazish manzili",
    "commentLabel": "Kuryer uchun izoh (ixtiyoriy)",
    "paymentMethodLabel": "To‘lov usulini tanlang",
    "fillRequiredFields": "Iltimos, ismingiz va manzilingizni to‘liq kiriting.",
    "productsCatalog": "Mahsulotlar Katalogi",
    "searchResultsFor": "bo‘yicha qidiruv natijalari",
    "sorting": "Saralash:",
    "sortPopular": "Ommabopligi bo‘yicha",
    "sortRating": "Reytingi yuqorilar",
    "sortPriceLow": "Narxi: Arzondan qimmatga",
    "sortPriceHigh": "Narxi: Qimmatdan arsonga",
    "noProductsFound": "Mahsulot topilmadi",
    "noProductsFoundSub": "Qidiruv sozlamalarini o‘zgartiring yoki filtrlarni tozalang.",
    "viewAllProducts": "Barcha mahsulotlarni ko‘rish",
    "wishlistTitle": "Saralangan Mahsulotlar",
    "addAllToCart": "Barchasini Savatchaga Qo‘shish",
    "wishlistEmpty": "Saralangan mahsulotlar hozircha yo‘q",
    "wishlistEmptyDesc": "Mahsulot kartochkasidagi yurakcha tugmasini bosib, sevimli narsalaringizni shu yerda saqlab qo‘ying.",
    "goToCatalog": "Katalogga o‘tish",
    "backToCatalog": "Katalogga qaytish",
    "ordersHistoryTitle": "Buyurtmalar Tarixi va Statusi",
    "ordersCountSuffix": "ta buyurtma",
    "noOrders": "Sizda hali buyurtmalar yo‘q",
    "noOrdersDesc": "Savatchani to‘ldiring va express yetkazib berish xizmatimizdan foydalaning.",
    "makeOrder": "Buyurtma berish",
    "orderNumber": "Buyurtma",
    "deliveryStages": "Yetkazib Berish Bosqichlari",
    "stageReceived": "Qabul qilindi",
    "stagePreparing": "Tayyorlanmoqda",
    "stageOnTheWay": "Kuryer Yo‘lda",
    "stageDelivered": "Yetkazildi",
    "reorder": "Qaytadan buyurtma berish",
    "orderItemsCount": "ta mahsulot bor",
    "analyticsTitle": "Xarajatlar & Shaxsiy Tahlillar",
    "analyticsSubtitle": "Savatchi platformasidagi barcha xaridlaringiz va tejab qolgan mablag‘laringiz tahlili",
    "totalExpenses": "Jami Xarajatlar",
    "avgMonthlyExpense": "O‘rtacha oylik 1.2 mln so‘m",
    "totalSavedAmount": "Tejab Qolindi",
    "savedByPromo": "Promo-kodlar & Chegirmalar hisobiga",
    "statusLevel": "Status darajasi",
    "goldClient": "GOLD Mijoz 👑",
    "nextLevelPrompt": "Keyingi darajaga o‘tish uchun yana 2 ta buyurtma bering va Bepul Yetkazish VIP ga ega bo‘ling.",
    "monthlyTrend": "Oylar bo‘yicha dinamika (So‘m)",
    "categoryShare": "Kategoriyalar Ulushi (%)",
    "reportsFinancialAnalytics": "Moliya & Analytics Hisobotlari",
    "reportsFinancialSubtitle": "Savdo va do‘kon faoliyati bo‘yicha hisobotlarni ko‘ring.",
    "monthlyTotalRevenue": "Oylik Umumiy Tushum",
    "currentMonthMetric": "Joriy oy ko‘rsatkichi",
    "netProfit": "Sof Foyda",
    "marginRate": "marja darajasi",
    "avgCheckAmount": "O‘rtacha Chek Summasi",
    "transactionsExecuted": "ta tranzaksiya o‘tkazildi",
    "yearDynamics": "YIL DINAMIKASI",
    "debtorsList": "Qarzdorlar Ro‘yxati",
    "debtorsSubtitle": "Mijozlar qarzi va to‘lovlarini boshqaring.",
    "searchDebtorByName": "Mijoz ismi bo‘yicha...",
    "addDebt": "Qarz Qo‘shish",
    "debtorNameCol": "Mijoz Ismi",
    "debtAmountCol": "Qarz Summasi",
    "dueDateCol": "Muddati",
    "daysAgo": "kundan beri",
    "addNewDebt": "Yangi Qarz Kiritish",
    "inventoryManagementTitle": "Ombor & Zaxiralar Boshqaruvi",
    "inventoryManagementSubtitle": "Mahsulot qoldig‘i va ombor qiymatini nazorat qiling.",
    "searchProductPlaceholder": "Mahsulot qidirish...",
    "addProductBtn": "Mahsulot Qo‘shish",
    "productCol": "Mahsulot",
    "categoryCol": "Kategoriya",
    "priceCol": "Narxi",
    "stockCol": "Zaxira (Stock)",
    "addNewProductTitle": "Yangi Mahsulot Qo‘shish",
    "productNameField": "Nomi",
    "priceField": "Narxi (So‘m)",
    "stockField": "Miqdori (Stock)",
    "posTitle": "Savdo Paneli / Kassa",
    "posSubtitle": "Savdolar, tushum va sotilgan mahsulotlarni kuzating.",
    "emptyCartPos": "Savat hozircha bo‘sh",
    "totalAmountLabel": "Jami Summa:",
    "checkoutSuccess": "To‘lov qabul qilindi!",
    "confirmSale": "Xaridni Tasdiqlash",
    "staffManagementTitle": "Xodimlar & Huquqlar Boshqaruvi",
    "staffManagementSubtitle": "Xodimlar va ularning faoliyatini boshqaring.",
    "searchStaffPlaceholder": "Xodim ismi...",
    "addStaffBtn": "Xodim Qo‘shish",
    "addNewStaffTitle": "Yangi Xodim Qo‘shish",
    "staffFullNameField": "Xodim Ismi Familiyasi",
    "roleField": "Roli",
    "mailboxSubtitle": "Xodimlik takliflari va do‘kon xabarlari markazi",
    "noStaffInvitations": "Yangi xodimlik takliflari yo‘q",
    "noStaffInvitationsDesc": "Admin sizning akkauntingizga taklif yuborganida, bu yerda ko‘rinadi va siz uni qabul qilishingiz mumkin bo‘ladi.",
    "storeOwner": "Do‘kon egasi",
    "initialAssignedRole": "Boshlang‘ich biriktiriladigan rol:",
    "roleChangeNotice": "Taklif qabul qilingach admin rolni o‘zgartirishi mumkin",
    "joinedAsEmployee": "Siz ushbu do‘konga xodim sifatida qo‘shilgansiz.",
    "noMessages": "Xabarlar yo‘q",
    "staffInvitationType": "Xodimlik taklifi",
    "generalMessageType": "Xabar",
    "acceptInvitation": "Taklifni qabul qilish",
    "rejectInvitation": "Rad etish",
    "footerAbout": "O‘zbekistondagi eng tezkor onlayn bozor. Sifatli oziq-ovqat, sarxil mevalar va zamonaviy maishiy texnikalar 15 daqiqada xonadoningizda!",
    "footerSubscribeTitle": "Haftalik eksklyuziv promo-kodlar va aksiyalardan birinchilardan bo‘lib xabardor bo‘ling:",
    "subscribeSuccess": "✓ Rahmat! Yangiliklarimizga obuna bo‘ldingiz.",
    "subscribeBtn": "Obuna bo‘lish",
    "footerCategoriesTitle": "Kategoriyalar",
    "footerSupportTitle": "Mijozlarga Yordam",
    "footerNewsTitle": "Yangiliklar va Chegirmalar",
    "footerHowToOrder": "Qanday buyurtma beriladi?",
    "footerDeliveryTerms": "Yetkazib berish shartlari",
    "footerPaymentMethods": "To‘lov usullari (Click, Payme)",
    "footerReturnPolicy": "Mahsulotni qaytarish siyosati",
    "footerWarrantyService": "Kafolat va Servis xizmati",
    "incomingInvitationsTab": "Kiruvchi takliflar",
    "allMessagesTab": "Barcha xabarlar",
    "invitationFromAccount": "Taklif yuborgan akkaunt:",
    "staffAutoAssigned": "Xodim (avtomatik tayinlanadi)",
    "joinedAsStaffNotice": "Siz ushbu do‘konga xodim sifatida qo‘shilgansiz.",
    "invitationRejectedNotice": "Siz ushbu taklifni rad qilgansiz.",
    "noAllMessages": "Xabarlar yo‘q",
    "newNotificationsCount": "yangi",
    "activityAuditTitle": "Faoliyat & Audit Tarixi",
    "activityAuditSubtitle": "Do‘konda bajarilgan amallar tarixini ko‘ring.",
    "sellerDashboardTitle": "Sotuvchi Paneli",
    "debtPaidAction": "To‘landi",
    "statusOnLeave": "Ta’tilda",
    "roleStockman": "Omborchi",
    "roleManager": "Menejer",
    "unknownProduct": "Noma’lum mahsulot",
    "notifications": "Xabar",
    "dateTime": "Sana / Vaqt",
    "cashierSeller": "Kassir / Sotuvchi",
    "totalPaid": "JAMI TO‘LANDI",
    "thankYouForPurchase": "Xaridingiz uchun rahmat!",
    "printReceipt": "Chekni chop etish",
    "fieldCategory": "Soha",
    "unitPrice": "Dona narxi",
    "changePhoto": "Rasmni o‘zgartirish",
    "phoneStoreParams": "Telefon do‘koni parametrlari",
    "clothingParams": "Kiyim-kechak parametrlari",
    "cosmeticsParams": "Kosmetika maxsus parametrlari",
    "flowerStoreParams": "Gul do‘koni parametrlari",
    "genderMen": "Erkaklar",
    "genderWomen": "Ayollar",
    "genderKids": "Bolalar",
    "genderUnisex": "Uniseks",
    "deliveryAvailable": "Mavjud",
    "pickupOnly": "Faqat do‘kondan olib ketish",
    "orderQtyPlaceholder": "50 dona / 10 qop",
    "reportsSubtitle": "Savdo va do‘kon faoliyati bo‘yicha hisobotlarni ko‘ring.",
    "basedOnPurchasePrice": "Xarid narxi asosida",
    "netOperatingProfit": "Sof Operatsion Foyda",
    "grossProfitability": "Yalpi daromadlilik",
    "profitabilityRate": "Rentabellik Ko‘rsatkichi",
    "netMarginPct": "Sof marja foizi",
    "productProfitabilityTitle": "Mahsulotlar Bo‘yicha Daromadlilik va Marja Tahlili",
    "productProfitabilitySubtitle": "Do‘kondagi mavjud tovarlarning sotish va tannarx nisbati",
    "productsCountSuffix": "ta mahsulot",
    "unitProfit": "Birlik foydasi",
    "marginCol": "Rentabellik (Marja)",
    "totalProductTypes": "Jami Tovar Turlari",
    "activePositions": "Faol pozitsiyalar",
    "totalStockQuantity": "Umumiy Zaxira Miqdori",
    "totalPhysicalStock": "Umumiy fizik zaxira",
    "totalInventoryValue": "Ombor Umumiy Qiymati",
    "byRetailPrice": "Sotish narxi bo‘yicha",
    "expectedGrossProfit": "Kutilayotgan Yalpi Foyda",
    "ifFullyRealized": "To‘liq realizatsiya qilinsa",
    "inventoryStockListTitle": "Ombor Qoldig‘i va Tovar Zaxiralari Ro‘yxati",
    "inventoryStockListSubtitle": "Mavjud ombor menyusi bilan to‘liq integratsiyalashgan hisobot",
    "colTotalValue": "Jami qiymati",
    "totalActiveDebts": "Jami Faol Qarzlar",
    "customerOutstandingDebt": "Mijozlar zimmasidagi qarz",
    "recoveredDebts": "Qaytarilgan Qarzlar",
    "successfullyRecovered": "Muvaffaqiyatli undirilgan",
    "activeDebtorsCount": "Faol Qarzdorlar Soni",
    "clientUnit": "mijoz",
    "activeAccounts": "Faol hisoblar",
    "overdueDebts": "Muddati O‘tgan Qarzlar",
    "requiresUrgentAttention": "Tezkor e'tibor talab",
    "debtorsRegistryTitle": "Mijozlar Qarzdorlik Reestri va Holati",
    "debtorsRegistrySubtitle": "Mavjud Qarzlar menyusi bilan bir xil shared state asosida",
    "colDebtorName": "Mijoz ismi",
    "colDebtorPhone": "Telefon",
    "colDebtorGivenDate": "Berilgan sana",
    "colDebtorDueDate": "To‘lov muddati",
    "colDebtorAmount": "Qarz summasi",
    "relativeToSalesTurnover": "Savdo aylanmasiga nisbatan",
    "costAndOperatingExpenses": "Tannarx va operatsion xarajatlar",
    "selectedPeriod": "Tanlangan davr",
    "inviteAlreadyPending": "Ushbu akkauntga allaqachon taklif yuborilgan. Foydalanuvchi tasdiqlashi kutilmoqda.",
    "staffLimitReached": "Do‘konda maksimal 7 ta xodim sig‘imi to‘lgan!",
    "staffInviteSentTitle": "Xodimlik taklifi yuborildi!",
    "staffInviteSentDesc": "Akkauntning Pochta bo‘limiga taklif yuborildi. U qabul qilgach, avtomatik ravishda jamoaga qo‘shiladi.",
    "inviteSendError": "Taklif yuborishda xatolik yuz berdi",
    "onlineStoreBadge": "Onlayn Do‘kon",
    "supplierOrCustomer": "Ta’minotchi / Xaridor",
    "typesCountSuffix": "xil",
  }
};

export const PRODUCT_TRANSLATIONS = {
  "ekologik toza namangan olmasi (red delicious)": {
    "uz": "Ekologik Toza Namangan Olmasi (Red Delicious)"
  },
  "apple iphone 15 pro max 256gb natural titanium": {
    "uz": "Apple iPhone 15 Pro Max 256GB Natural Titanium"
  },
  "qo'y go'shti (qobirg'a & lahm, yangi)": {
    "uz": "Qo‘y Go‘shti (Qobirg‘a & Lahm, Yangi)"
  },
  "qo‘y go‘shti (qobirg‘a & lahm, yangi)": {
    "uz": "Qo‘y Go‘shti (Qobirg‘a & Lahm, Yangi)"
  },
  "sony wh-1000xm5 shovqin so'ndiruvchi quloqchin": {
    "uz": "Sony WH-1000XM5 Shovqin So‘ndiruvchi Quloqchin"
  },
  "sony wh-1000xm5 shovqin so‘ndiruvchi quloqchin": {
    "uz": "Sony WH-1000XM5 Shovqin So‘ndiruvchi Quloqchin"
  },
  "tabiiy asal (zomin tog' asali, pure wild honey)": {
    "uz": "Tabiiy Asal (Zomin Tog‘ Asali, Pure Wild Honey)"
  },
  "tabiiy asal (zomin tog‘ asali, pure wild honey)": {
    "uz": "Tabiiy Asal (Zomin Tog‘ Asali, Pure Wild Honey)"
  },
  "dyson v15 detect absolute simiz changyutgich": {
    "uz": "Dyson V15 Detect Absolute Simsiz Changyutgich"
  },
  "samarqand uzumi (katta qora kishmish)": {
    "uz": "Samarqand Uzumi (Katta Qora Kishmish)"
  },
  "nike air max 270 sport poyabzali (unisex)": {
    "uz": "Nike Air Max 270 Sport Poyabzali (Unisex)"
  },
  "nespresso vertuo pop kofe mashinasi": {
    "uz": "Nespresso Vertuo Pop Kofe Mashinasi"
  },
  "ergonomik geymer & ofis kreslosi pro": {
    "uz": "Ergonomik Geymer & Ofis Kreslosi Pro"
  },
  "samsung 65\" neo qled 4k smart tv 2026": {
    "uz": "Samsung 65\" Neo QLED 4K Smart TV 2026"
  },
  "eko zamonaviy bambuk idish-tovoq to'plami": {
    "uz": "Eko Zamonaviy Bambuk Idish-Tovoq To‘plami"
  },
  "eko zamonaviy bambuk idish-tovoq to‘plami": {
    "uz": "Eko Zamonaviy Bambuk Idish-Tovoq To‘plami"
  },
  "pomidor": {
    "uz": "Pomidor"
  },
  "sut": {
    "uz": "Sut"
  },
  "non": {
    "uz": "Non"
  },
  "olma": {
    "uz": "Olma"
  },
  "kartoshka": {
    "uz": "Kartoshka"
  },
  "piyoz": {
    "uz": "Piyoz"
  },
  "guruch": {
    "uz": "Guruch"
  },
  "shakar": {
    "uz": "Shakar"
  },
  "tuxum": {
    "uz": "Tuxum"
  },
  "go‘sht": {
    "uz": "Go‘sht"
  },
  "gosht": {
    "uz": "Go‘sht"
  },
  "un": {
    "uz": "Un"
  },
  "suv": {
    "uz": "Suv"
  },
  "sut (2l)": {
    "uz": "Sut (2L)"
  },
  "yog‘ (1l)": {
    "uz": "Yog‘ (1L)"
  },
  "yog (1l)": {
    "uz": "Yog‘ (1L)"
  },
  "yog‘": {
    "uz": "Yog‘"
  },
  "coca-cola (1.5l)": {
    "uz": "Coca-Cola (1.5L)"
  },
  "coca-cola": {
    "uz": "Coca-Cola"
  },
  "qizil olma": {
    "uz": "Qizil olma"
  },
  "pishloq": {
    "uz": "Pishloq"
  },
  "tuxum (30 talik)": {
    "uz": "Tuxum (30 talik)"
  },
  "smartfon": {
    "uz": "Smartfon"
  },
  "zaryadlovchi": {
    "uz": "Zaryadlovchi"
  },
  "iphone 15 pro max (256gb)": {
    "uz": "iPhone 15 Pro Max (256GB)"
  },
  "iphone 15 pro": {
    "uz": "iPhone 15 Pro"
  },
  "samsung galaxy s24 ultra": {
    "uz": "Samsung Galaxy S24 Ultra"
  },
  "galaxy s24": {
    "uz": "Galaxy S24"
  },
  "redmi note 13 pro (8/256gb)": {
    "uz": "Redmi Note 13 Pro (8/256GB)"
  },
  "redmi note 13": {
    "uz": "Redmi Note 13"
  },
  "airpods pro 2 (usb-c)": {
    "uz": "AirPods Pro 2 (USB-C)"
  },
  "airpods pro 2": {
    "uz": "AirPods Pro 2"
  },
  "apple watch series 9": {
    "uz": "Apple Watch Series 9"
  },
  "apple watch": {
    "uz": "Apple Watch"
  },
  "20w usb-c adapter": {
    "uz": "20W USB-C Adapter"
  },
  "20w adapter": {
    "uz": "20W Adapter"
  },
  "ko‘ylak": {
    "uz": "Ko‘ylak"
  },
  "shim": {
    "uz": "Shim"
  },
  "erkaklar polo futbolkasi (l)": {
    "uz": "Erkaklar polo futbolkasi (L)"
  },
  "polo futbolka": {
    "uz": "Polo futbolka"
  },
  "erkaklar jinsi shimi (32)": {
    "uz": "Erkaklar jinsi shimi (32)"
  },
  "jinsi shim": {
    "uz": "Jinsi shim"
  },
  "jinsi shimi": {
    "uz": "Jinsi shimi"
  },
  "qishki kurtka zara (xl)": {
    "uz": "Qishki kurtka Zara (XL)"
  },
  "zara kurtka": {
    "uz": "Zara Kurtka"
  },
  "nike air force 1 (42)": {
    "uz": "Nike Air Force 1 (42)"
  },
  "nike air force": {
    "uz": "Nike Air Force"
  },
  "ayollar kechki ko‘ylagi (m)": {
    "uz": "Ayollar kechki ko‘ylagi (M)"
  },
  "kechki ko‘ylak": {
    "uz": "Kechki ko‘ylak"
  },
  "shampun": {
    "uz": "Shampun"
  },
  "atir": {
    "uz": "Atir"
  },
  "maybelline matte lab bo‘yog‘i": {
    "uz": "Maybelline Matte Lab bo‘yog‘i"
  },
  "maybelline lab": {
    "uz": "Maybelline Lab bo‘yog‘i"
  },
  "the ordinary niacinamide serum": {
    "uz": "The Ordinary Niacinamide Serum"
  },
  "the ordinary": {
    "uz": "The Ordinary Serum"
  },
  "chanel chance eau tendre 50ml": {
    "uz": "Chanel Chance Eau Tendre 50ml"
  },
  "chanel chance": {
    "uz": "Chanel Chance"
  },
  "cerave yuz yuvish geli (473ml)": {
    "uz": "CeraVe Yuz yuvish geli (473ml)"
  },
  "cerave gel": {
    "uz": "CeraVe Gel"
  },
  "gel lak to‘plami (opi)": {
    "uz": "Gel lak to‘plami (OPI)"
  },
  "gel lak": {
    "uz": "Gel lak"
  },
  "bo‘yoq": {
    "uz": "Bo‘yoq"
  },
  "sement": {
    "uz": "Sement"
  },
  "sement m-500 (50 kg)": {
    "uz": "Sement M-500 (50 kg)"
  },
  "sement m-500": {
    "uz": "Sement M-500"
  },
  "oq emulsiya marshall (20 kg)": {
    "uz": "Oq emulsiya Marshall (20 kg)"
  },
  "oq emulsiya": {
    "uz": "Oq emulsiya"
  },
  "samorez 3.5x25 (1000 dona)": {
    "uz": "Samorez 3.5x25 (1000 dona)"
  },
  "samorez 3.5x25": {
    "uz": "Samorez 3.5x25"
  },
  "bolg‘a (yato 500g)": {
    "uz": "Bolg‘a (Yato 500g)"
  },
  "bolg‘a yato": {
    "uz": "Bolg‘a Yato"
  },
  "alyumin narvon 3x7": {
    "uz": "Alyumin narvon 3x7"
  },
  "idish": {
    "uz": "Idish"
  },
  "choynak": {
    "uz": "Choynak"
  },
  "granit tovasi 26cm (tefal)": {
    "uz": "Granit tovasi 26cm (Tefal)"
  },
  "granit tovasi": {
    "uz": "Granit tovasi"
  },
  "luminarc choy to‘plami (12 kishilik)": {
    "uz": "Luminarc choy to‘plami (12 kishilik)"
  },
  "luminarc to‘plami": {
    "uz": "Luminarc to‘plami"
  },
  "pol yuvish shvabrasi (spin mop)": {
    "uz": "Pol yuvish shvabrasi (Spin Mop)"
  },
  "spin mop shvabra": {
    "uz": "Spin Mop shvabra"
  },
  "kir yuvish geli ariel (4.5l)": {
    "uz": "Kir yuvish geli Ariel (4.5L)"
  },
  "ariel gel": {
    "uz": "Ariel Gel"
  },
  "elektr choynak tefal": {
    "uz": "Elektr choynak Tefal"
  },
  "elektr choynak": {
    "uz": "Elektr choynak"
  },
  "to‘p": {
    "uz": "To‘p"
  },
  "sport sumkasi": {
    "uz": "Sport sumkasi"
  },
  "adidas ucl futbol to‘pi": {
    "uz": "Adidas UCL futbol to‘pi"
  },
  "adidas to‘p": {
    "uz": "Adidas to‘p"
  },
  "everlast boks qo‘lqopi (12oz)": {
    "uz": "Everlast boks qo‘lqopi (12oz)"
  },
  "everlast qo‘lqop": {
    "uz": "Everlast qo‘lqop"
  },
  "gantellar to‘plami (2x10kg)": {
    "uz": "Gantellar to‘plami (2x10kg)"
  },
  "gantellar 2x10kg": {
    "uz": "Gantellar 2x10kg"
  },
  "skeytbord pro street": {
    "uz": "Skeytbord Pro Street"
  },
  "skeytbord pro": {
    "uz": "Skeytbord Pro"
  },
  "sport formasi nike dri-fit": {
    "uz": "Sport formasi Nike Dri-FIT"
  },
  "nike dri-fit": {
    "uz": "Nike Dri-FIT"
  },
  "soat": {
    "uz": "Soat"
  },
  "sumka": {
    "uz": "Sumka"
  },
  "powerbank baseus 20000mah 65w": {
    "uz": "Powerbank Baseus 20000mAh 65W"
  },
  "baseus 20000mah": {
    "uz": "Baseus 20000mAh"
  },
  "simsiz quloqchin hoco w35": {
    "uz": "Simsiz quloqchin Hoco W35"
  },
  "hoco w35": {
    "uz": "Hoco W35"
  },
  "type-c fast charge kabeli (2m)": {
    "uz": "Type-C Fast Charge kabeli (2m)"
  },
  "type-c kabel": {
    "uz": "Type-C kabel"
  },
  "smartwatch mibro gs pro": {
    "uz": "Smartwatch Mibro GS Pro"
  },
  "mibro watch": {
    "uz": "Mibro Watch"
  },
  "noutbuk ryukzaki mark ryden": {
    "uz": "Noutbuk ryukzaki Mark Ryden"
  },
  "atirgul": {
    "uz": "Atirgul"
  },
  "lola": {
    "uz": "Lola"
  },
  "gollandiya qizil atirguli (80cm)": {
    "uz": "Gollandiya Qizil Atirguli (80cm)"
  },
  "qizil atirgul": {
    "uz": "Qizil Atirgul"
  },
  "premium 51 atirgul buketi": {
    "uz": "Premium 51 Atirgul buketi"
  },
  "51 atirgul buketi": {
    "uz": "51 Atirgul buketi"
  },
  "bahor lolalari dastasi (25 dona)": {
    "uz": "Bahor Lolalari dastasi (25 dona)"
  },
  "bahor lolalari": {
    "uz": "Bahor Lolalari"
  },
  "orxideya falanopsis tuvakda": {
    "uz": "Orxideya Falanopsis tuvakda"
  },
  "orxideya tuvakda": {
    "uz": "Orxideya tuvakda"
  },
  "kungaboqar dekorativ guldastasi": {
    "uz": "Kungaboqar dekorativ guldastasi"
  },
  "kungaboqar buketi": {
    "uz": "Kungaboqar buketi"
  },
  "boshqalar": {
    "uz": "Boshqalar"
  }
};

export const CATEGORY_TRANSLATIONS = {
  "uy-ro'zg'or": {
    "uz": "Uy-ro‘zg‘or"
  },
  "uy-ro‘zg‘or": {
    "uz": "Uy-ro‘zg‘or"
  },
  "oziq-ovqat & go'sht": {
    "uz": "Oziq-ovqat & Go‘sht"
  },
  "oziq-ovqat & go‘sht": {
    "uz": "Oziq-ovqat & Go‘sht"
  },
  "non va non mahsulotlari": {
    "uz": "Non va non mahsulotlari"
  },
  "sut mahsulotlari": {
    "uz": "Sut mahsulotlari"
  },
  "sabzavot va mevalar": {
    "uz": "Sabzavot va mevalar"
  },
  "ichimliklar": {
    "uz": "Ichimliklar"
  },
  "yog‘ va bakkaliya": {
    "uz": "Yog‘ va bakkaliya"
  },
  "shirinliklar": {
    "uz": "Shirinliklar"
  },
  "go‘sht mahsulotlari": {
    "uz": "Go‘sht mahsulotlari"
  },
  "smartfonlar": {
    "uz": "Smartfonlar"
  },
  "tugmali telefonlar": {
    "uz": "Tugmali telefonlar"
  },
  "planshetlar": {
    "uz": "Planshetlar"
  },
  "smart soatlar": {
    "uz": "Smart soatlar"
  },
  "quloqchinlar": {
    "uz": "Quloqchinlar"
  },
  "g‘ilof va himoya oynalari": {
    "uz": "G‘ilof va himoya oynalari"
  },
  "zaryadlovchi qurilmalar": {
    "uz": "Zaryadlovchi qurilmalar"
  },
  "erkaklar kiyimi": {
    "uz": "Erkaklar kiyimi"
  },
  "ayollar kiyimi": {
    "uz": "Ayollar kiyimi"
  },
  "bolalar kiyimi": {
    "uz": "Bolalar kiyimi"
  },
  "oyoq kiyimlar": {
    "uz": "Oyoq kiyimlar"
  },
  "ustki kiyimlar": {
    "uz": "Ustki kiyimlar"
  },
  "sport kiyimlari": {
    "uz": "Sport kiyimlari"
  },
  "bosh kiyimlar va aksessuarlar": {
    "uz": "Bosh kiyimlar va aksessuarlar"
  },
  "yuz parvarishi": {
    "uz": "Yuz parvarishi"
  },
  "makiyaj & pardoz": {
    "uz": "Makiyaj & Pardoz"
  },
  "soch parvarishi": {
    "uz": "Soch parvarishi"
  },
  "parfyumeriya": {
    "uz": "Parfyumeriya"
  },
  "tana parvarishi": {
    "uz": "Tana parvarishi"
  },
  "gigiyena vositalari": {
    "uz": "Gigiyena vositalari"
  },
  "sement va quruq qorishmalar": {
    "uz": "Sement va quruq qorishmalar"
  },
  "bo‘yoq va laklar": {
    "uz": "Bo‘yoq va laklar"
  },
  "santexnika": {
    "uz": "Santexnika"
  },
  "elektr mollari": {
    "uz": "Elektr mollari"
  },
  "asbob-uskunalar": {
    "uz": "Asbob-uskunalar"
  },
  "gipsokarton va profillar": {
    "uz": "Gipsokarton va profillar"
  },
  "metiz va mahkamlagichlar": {
    "uz": "Metiz va mahkamlagichlar"
  },
  "idish-tovoqlar": {
    "uz": "Idish-tovoqlar"
  },
  "tozalash va yuvish vositalari": {
    "uz": "Tozalash va yuvish vositalari"
  },
  "uy to‘qimachiligi": {
    "uz": "Uy to‘qimachiligi"
  },
  "oshxona anjomlari": {
    "uz": "Oshxona anjomlari"
  },
  "plastik idishlar": {
    "uz": "Plastik idishlar"
  },
  "kichik maishiy jihozlar": {
    "uz": "Kichik maishiy jihozlar"
  },
  "futbol jihozlari": {
    "uz": "Futbol jihozlari"
  },
  "fitness va trenajyorlar": {
    "uz": "Fitness va trenajyorlar"
  },
  "boks va yakkakurash": {
    "uz": "Boks va yakkakurash"
  },
  "suv sporti": {
    "uz": "Suv sporti"
  },
  "velosiped va samokatlar": {
    "uz": "Velosiped va samokatlar"
  },
  "kabel va adapterlar": {
    "uz": "Kabel va adapterlar"
  },
  "zaryadlovchilar": {
    "uz": "Zaryadlovchilar"
  },
  "smartwatch va brasletlar": {
    "uz": "Smartwatch va brasletlar"
  },
  "powerbanklar": {
    "uz": "Powerbanklar"
  },
  "g‘ilof va sumkalar": {
    "uz": "G‘ilof va sumkalar"
  },
  "avto aksessuarlar": {
    "uz": "Avto aksessuarlar"
  },
  "tirik gullar": {
    "uz": "Tirik gullar"
  },
  "tayyor buketlar": {
    "uz": "Tayyor buketlar"
  },
  "katta savatdagi gullar": {
    "uz": "Katta savatdagi gullar"
  },
  "xona gullari va tuvaklar": {
    "uz": "Xona gullari va tuvaklar"
  },
  "sovg‘a qutilari": {
    "uz": "Sovg‘a qutilari"
  },
  "sharlar va tabriknomalar": {
    "uz": "Sharlar va tabriknomalar"
  },
  "all": {
    "uz": "Barchasi"
  },
  "groceries": {
    "uz": "Oziq-ovqat"
  },
  "fresh": {
    "uz": "Sarxil Mevalar"
  },
  "electronics": {
    "uz": "Elektronika"
  },
  "appliances": {
    "uz": "Maishiy Texnika"
  },
  "fashion": {
    "uz": "Kiyim & Poyabzal"
  },
  "home": {
    "uz": "Uy-ro‘zg‘or"
  }
};

export const UNIT_TRANSLATIONS = {
  "1 kg": {
    "uz": "1 kg"
  },
  "1 dona": {
    "uz": "1 dona"
  },
  "1 juft": {
    "uz": "1 juft"
  },
  "12 dona to'plam": {
    "uz": "12 dona to‘plam"
  },
  "12 dona to‘plam": {
    "uz": "12 dona to‘plam"
  },
  "dona": {
    "uz": "dona"
  },
  "kg": {
    "uz": "kg"
  },
  "gramm": {
    "uz": "gramm"
  },
  "litr": {
    "uz": "litr"
  },
  "ml": {
    "uz": "ml"
  },
  "quti": {
    "uz": "quti"
  },
  "blok": {
    "uz": "blok"
  },
  "komplekt": {
    "uz": "komplekt"
  },
  "juft": {
    "uz": "juft"
  },
  "to‘plam": {
    "uz": "to‘plam"
  },
  "toplam": {
    "uz": "to‘plam"
  },
  "metr": {
    "uz": "metr"
  },
  "m²": {
    "uz": "m²"
  },
  "rulon": {
    "uz": "rulon"
  },
  "qop": {
    "uz": "qop"
  },
  "buket": {
    "uz": "buket"
  },
  "dasta": {
    "uz": "dasta"
  },
  "savat": {
    "uz": "savat"
  }
};

export const STORE_TYPE_TRANSLATIONS = {
  "food": {
    "name": {
      "uz": "Oziq-ovqat do‘koni"
    },
    "desc": {
      "uz": "Oziq-ovqat, ichimliklar, sabzavot-mevalar va bakkaliya"
    }
  },
  "phone": {
    "name": {
      "uz": "Telefon do‘koni"
    },
    "desc": {
      "uz": "Smartfonlar, planshetlar, gadjetlar va IMEI hisobi"
    }
  },
  "clothing": {
    "name": {
      "uz": "Kiyim-kechak do‘koni"
    },
    "desc": {
      "uz": "Kiyimlar, oyoq kiyimlar, razmerlar va ranglar"
    }
  },
  "cosmetics": {
    "name": {
      "uz": "Kosmetika do‘koni"
    },
    "desc": {
      "uz": "Pardoz, parfyum va go‘zallik parvarishi"
    }
  },
  "construction": {
    "name": {
      "uz": "Qurilish mollari do‘koni"
    },
    "desc": {
      "uz": "Sement, bo‘yoqlar, santexnika va asbob-uskunalar"
    }
  },
  "household": {
    "name": {
      "uz": "Uy-ro‘zg‘or do‘koni"
    },
    "desc": {
      "uz": "Idish-tovoqlar, tozalash vositalari va oshxona anjomlari"
    }
  },
  "sport": {
    "name": {
      "uz": "Sport jihozlari do‘koni"
    },
    "desc": {
      "uz": "Futbol, fitnes, boks va trenajyor jihozlari"
    }
  },
  "accessories": {
    "name": {
      "uz": "Aksessuarlar do‘koni"
    },
    "desc": {
      "uz": "Powerbanklar, quloqchinlar, simsiz zaryadkalar va kabellar"
    }
  },
  "flower": {
    "name": {
      "uz": "Gul do‘koni"
    },
    "desc": {
      "uz": "Tirik gullar, bayramona buketlar va sovg‘alar"
    }
  }
};

export const DEFAULT_STORE_NAMES = {
  "Savatchi Oziq-ovqat": {
    "uz": "Savatchi Oziq-ovqat"
  },
  "Savatchi Telefon & Gadjet": {
    "uz": "Savatchi Telefon & Gadjet"
  },
  "Savatchi Kiyim-kechak": {
    "uz": "Savatchi Kiyim-kechak"
  },
  "Savatchi Kosmetika & Parfyum": {
    "uz": "Savatchi Kosmetika & Parfyum"
  },
  "Savatchi Qurilish Mollari": {
    "uz": "Savatchi Qurilish Mollari"
  },
  "Savatchi Uy-ro‘zg‘or": {
    "uz": "Savatchi Uy-ro‘zg‘or"
  },
  "Savatchi Sport Jihozlari": {
    "uz": "Savatchi Sport Jihozlari"
  },
  "Savatchi Aksessuarlar": {
    "uz": "Savatchi Aksessuarlar"
  },
  "Savatchi Gul Do‘koni": {
    "uz": "Savatchi Gul Do‘koni"
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState('uz');

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, 'uz');
    document.documentElement.lang = 'uz';
  }, []);

  const setLang = () => {
    setLangState('uz');
    localStorage.setItem(LANGUAGE_KEY, 'uz');
    document.documentElement.lang = 'uz';
    window.dispatchEvent(new CustomEvent('savatchi_language_changed', { detail: 'uz' }));
  };

  const t = (key, fallback = '') => {
    if (translations.uz && translations.uz[key] !== undefined) {
      return translations.uz[key];
    }
    return fallback || key;
  };

  const tProduct = (name) => {
    if (!name) return '';
    const raw = String(name).trim().toLowerCase();
    const normStraight = raw.replace(/[‘'ʻ`’]/g, "'");
    const normCurly = raw.replace(/[‘'ʻ`’]/g, "‘");
    if (PRODUCT_TRANSLATIONS[raw]?.uz) {
      return PRODUCT_TRANSLATIONS[raw].uz;
    }
    if (PRODUCT_TRANSLATIONS[normStraight]?.uz) {
      return PRODUCT_TRANSLATIONS[normStraight].uz;
    }
    if (PRODUCT_TRANSLATIONS[normCurly]?.uz) {
      return PRODUCT_TRANSLATIONS[normCurly].uz;
    }
    return name;
  };

  const tCategory = (cat) => {
    if (!cat) return '';
    const raw = String(cat).trim().toLowerCase();
    const normStraight = raw.replace(/[‘'ʻ`’]/g, "'");
    const normCurly = raw.replace(/[‘'ʻ`’]/g, "‘");
    if (CATEGORY_TRANSLATIONS[raw]?.uz) {
      return CATEGORY_TRANSLATIONS[raw].uz;
    }
    if (CATEGORY_TRANSLATIONS[normStraight]?.uz) {
      return CATEGORY_TRANSLATIONS[normStraight].uz;
    }
    if (CATEGORY_TRANSLATIONS[normCurly]?.uz) {
      return CATEGORY_TRANSLATIONS[normCurly].uz;
    }
    return cat;
  };

  const tUnit = (unit) => {
    if (!unit) return '';
    const raw = String(unit).trim().toLowerCase();
    const normStraight = raw.replace(/[‘'ʻ`’]/g, "'");
    const normCurly = raw.replace(/[‘'ʻ`’]/g, "‘");
    if (UNIT_TRANSLATIONS[raw]?.uz) {
      return UNIT_TRANSLATIONS[raw].uz;
    }
    if (UNIT_TRANSLATIONS[normStraight]?.uz) {
      return UNIT_TRANSLATIONS[normStraight].uz;
    }
    if (UNIT_TRANSLATIONS[normCurly]?.uz) {
      return UNIT_TRANSLATIONS[normCurly].uz;
    }
    return unit;
  };

  const tStoreType = (typeId) => {
    if (!typeId) return '';
    const id = String(typeId).toLowerCase();
    if (STORE_TYPE_TRANSLATIONS[id]?.name?.uz) {
      return STORE_TYPE_TRANSLATIONS[id].name.uz;
    }
    return typeId;
  };

  const tStoreTypeDesc = (typeId) => {
    if (!typeId) return '';
    const id = String(typeId).toLowerCase();
    if (STORE_TYPE_TRANSLATIONS[id]?.desc?.uz) {
      return STORE_TYPE_TRANSLATIONS[id].desc.uz;
    }
    return '';
  };

  const tStoreName = (name) => {
    if (!name) return '';
    if (DEFAULT_STORE_NAMES[name]?.uz) {
      return DEFAULT_STORE_NAMES[name].uz;
    }
    return name;
  };

  const formatDate = (date, options) => {
    if (!date) return '';
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString('uz-UZ', options || { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    const formatted = num.toLocaleString();
    const currencyStr = translations.uz?.sum || 'so‘m';
    return `${formatted} ${currencyStr}`;
  };

  const searchMatchesProduct = (prod, query) => {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    const name = String(prod.name || '').toLowerCase();
    const cat = String(prod.category || '').toLowerCase();
    const brand = String(prod.brand || '').toLowerCase();
    const imei = String(prod.imei || '').toLowerCase();
    const nameUz = tProduct(prod.name).toLowerCase();

    return (
      name.includes(q) ||
      nameUz.includes(q) ||
      cat.includes(q) ||
      brand.includes(q) ||
      imei.includes(q)
    );
  };

  return (
    <LanguageContext.Provider
      value={{
        lang: 'uz',
        setLang,
        t,
        tProduct,
        tCategory,
        tUnit,
        tStoreType,
        tStoreTypeDesc,
        tStoreName,
        formatDate,
        formatCurrency,
        searchMatchesProduct,
        availableLanguages: ['uz']
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      lang: 'uz',
      setLang: () => {},
      t: (k, fb = '') => (translations.uz && translations.uz[k]) || fb || k,
      tProduct: (n) => n || '',
      tCategory: (c) => c || '',
      tUnit: (u) => u || '',
      tStoreType: (s) => s || '',
      tStoreTypeDesc: () => '',
      tStoreName: (n) => n || '',
      formatDate: (d) => String(d || ''),
      formatCurrency: (a) => `${Number(a || 0).toLocaleString()} so‘m`,
      searchMatchesProduct: () => true,
      availableLanguages: ['uz']
    };
  }
  return context;
};
