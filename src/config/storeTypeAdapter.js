// src/config/storeTypeAdapter.js
/**
 * Savatchi — Do‘kon turiga moslashuv arxitekturasi (Store Type Adaptation Architecture)
 * 
 * Ushbu modul kelajakda har bir do‘kon turi bo‘yicha:
 * - Mahsulotlar va ularning maydonlari (IMEI, razmer, brend, yaroqlilik muddati...)
 * - O‘lchov birliklari (kg, litr, dona, juft, qop, buket...)
 * - Kategoriyalar ro‘yxati
 * - Menyular va bo‘limlar konfiguratsiyasi
 * - Maxsus statistika va KPI ko‘rsatkichlari
 * - Ombor, Savdo va Buyurtmalar funksiyalarini
 * osonlikcha moslashtirish uchun yagona arxitektura va adapter qatlami hisoblanadi.
 */

import { STORE_TYPES, getStoreTypeById } from './storeTypes';

// 1. Mavjud 9 ta do‘kon turi identifikatorlari
export const STORE_TYPE_IDS = {
  FOOD: 'food',                   // 1. Oziq-ovqat
  PHONE: 'phone',                 // 2. Telefon
  CLOTHING: 'clothing',           // 3. Kiyim-kechak
  COSMETICS: 'cosmetics',         // 4. Kosmetika
  CONSTRUCTION: 'construction',   // 5. Qurilish mollari
  HOUSEHOLD: 'household',         // 6. Uy-ro‘zg‘or
  SPORT: 'sport',                 // 7. Sport jihozlari
  ACCESSORIES: 'accessories',     // 8. Aksessuarlar
  FLOWER: 'flower'                // 9. Gul do‘koni
};

// 2. Do‘kon turlarining kengaytirilgan arxitektura metadatalari (Kelgusi bosqichlar uchun)
export const STORE_TYPE_METADATA = {
  [STORE_TYPE_IDS.FOOD]: {
    id: 'food',
    name: 'Oziq-ovqat',
    defaultUnit: 'dona',
    availableUnits: ['dona', 'kg', 'gramm', 'litr', 'ml', 'quti', 'blok'],
    features: {
      hasExpiryDate: true,           // Yaroqlilik muddati nazorati
      hasWeightPricing: true,        // Og‘irlik/tarozi integratsiyasi
      hasSerialTracking: false,
      hasSizeColorMatrix: false,
      hasDeliveryOption: false
    },
    customProductFields: [
      { key: 'expiryDate', label: 'Yaroqlilik muddati', type: 'date', required: false },
      { key: 'originCountry', label: 'Ishlab chiqarilgan joyi', type: 'text', required: false, placeholder: 'Mahalliy / Import' }
    ],
    futureNavMenus: [
      { id: 'expiryAlerts', title: 'Yaroqlilik muddati hisoboti', icon: 'Clock' },
      { id: 'weighedItems', title: 'Tarozi mahsulotlari', icon: 'Scale' }
    ],
    futureStats: [
      { key: 'spoilageRate', title: 'Yaroqlilik muddati xavfi' },
      { key: 'topGroceries', title: 'Eng xaridorgir oziq-ovqatlar' }
    ]
  },

  [STORE_TYPE_IDS.PHONE]: {
    id: 'phone',
    name: 'Telefon',
    defaultUnit: 'dona',
    availableUnits: ['dona', 'komplekt'],
    features: {
      hasExpiryDate: false,
      hasWeightPricing: false,
      hasSerialTracking: true,       // IMEI / Serial raqamlar hisobi
      hasSizeColorMatrix: false,
      hasWarranty: true              // Kafolat muddati va chek
    },
    customProductFields: [
      { key: 'brand', label: 'Brend', type: 'text', required: true, placeholder: 'Apple, Samsung, Xiaomi...' },
      { key: 'storage', label: 'Xotira hajmi', type: 'text', required: false, placeholder: '128GB, 256GB, 512GB' },
      { key: 'color', label: 'Rangi', type: 'text', required: false, placeholder: 'Titanium, Black, Silver' },
      { key: 'imei', label: 'IMEI / Serial raqam', type: 'text', required: false, placeholder: '358972109482...' },
      { key: 'warranty', label: 'Kafolat muddati (oy)', type: 'number', required: false, placeholder: '12' }
    ],
    futureNavMenus: [
      { id: 'imeiLookup', title: 'IMEI qidiruv va kafolat', icon: 'ShieldCheck' },
      { id: 'repairService', title: 'Servis va ta\'mir', icon: 'Wrench' }
    ],
    futureStats: [
      { key: 'brandBreakdown', title: 'Brendlar bo‘yicha ulush' },
      { key: 'warrantyActive', title: 'Faol kafolatlar soni' }
    ]
  },

  [STORE_TYPE_IDS.CLOTHING]: {
    id: 'clothing',
    name: 'Kiyim-kechak',
    defaultUnit: 'dona',
    availableUnits: ['dona', 'juft', 'to‘plam'],
    features: {
      hasExpiryDate: false,
      hasWeightPricing: false,
      hasSerialTracking: false,
      hasSizeColorMatrix: true,      // Razmer va ranglar matritsasi
      hasFittingReturn: true         // Qaytarish va almashtirish
    },
    customProductFields: [
      { key: 'size', label: 'Razmer / O‘lcham', type: 'text', required: true, placeholder: 'S, M, L, XL, 38-44' },
      { key: 'color', label: 'Rangi', type: 'text', required: false, placeholder: 'Qora, Oq, To‘q ko‘k' },
      { key: 'gender', label: 'Toifa', type: 'select', options: ['Erkaklar', 'Ayollar', 'Bolalar', 'Uniseks'] },
      { key: 'season', label: 'Mavsum', type: 'select', options: ['Yozgi', 'Qishki', 'Kuz/Bahor', 'Mavsumsiz'] }
    ],
    futureNavMenus: [
      { id: 'sizeMatrix', title: 'Razmerlar bo‘yicha qoldiq', icon: 'Grid' },
      { id: 'seasonSales', title: 'Mavsumiy tozalash', icon: 'Tag' }
    ],
    futureStats: [
      { key: 'topSizes', title: 'Eng ko‘p sotilgan razmerlar' },
      { key: 'seasonalShare', title: 'Mavsumiy ulush' }
    ]
  },

  [STORE_TYPE_IDS.COSMETICS]: {
    id: 'cosmetics',
    name: 'Kosmetika',
    defaultUnit: 'dona',
    availableUnits: ['dona', 'ml', 'gramm', 'to‘plam'],
    features: {
      hasExpiryDate: true,           // PAO (Period After Opening) & yaroqlilik
      hasWeightPricing: false,
      hasSerialTracking: false,
      hasSizeColorMatrix: false,
      hasBatchNumber: true           // Partiya (batch code) nazorati
    },
    customProductFields: [
      { key: 'brand', label: 'Brend', type: 'text', required: true, placeholder: 'L\'Oréal, CeraVe, Maybelline...' },
      { key: 'volume', label: 'Hajmi / Og‘irligi', type: 'text', required: false, placeholder: '50ml, 100g, 473ml' },
      { key: 'batchCode', label: 'Partiya kodi (Batch)', type: 'text', required: false, placeholder: 'L24A91' },
      { key: 'expiryDate', label: 'Yaroqlilik muddati', type: 'date', required: false }
    ],
    futureNavMenus: [
      { id: 'testersManagement', title: 'Testerlar hisobi', icon: 'Sparkles' },
      { id: 'brandsCatalog', title: 'Brendlar katalogi', icon: 'BookOpen' }
    ],
    futureStats: [
      { key: 'beautyTrends', title: 'Go‘zallik segmentlari' },
      { key: 'skincareShare', title: 'Teri parvarishi ulushi' }
    ]
  },

  [STORE_TYPE_IDS.CONSTRUCTION]: {
    id: 'construction',
    name: 'Qurilish mollari',
    defaultUnit: 'dona',
    availableUnits: ['dona', 'kg', 'metr', 'litr', 'qop', 'm²', 'rulon', 'quti'],
    features: {
      hasExpiryDate: false,
      hasWeightPricing: true,        // Kg, metr, m² bo‘yicha hisoblash
      hasBulkWholesale: true,        // Katta ulgurji hajm va usta chegirmalari
      hasDeliveryOption: true        // Og‘ir yuk yetkazib berish
    },
    customProductFields: [
      { key: 'brand', label: 'Ishlab chiqaruvchi / Marka', type: 'text', required: false, placeholder: 'Qizilqumsement, Marshall...' },
      { key: 'spec', label: 'Xususiyati / O‘lchami', type: 'text', required: false, placeholder: 'M-500, 3.5x25, 20kg' },
      { key: 'wholesalePrice', label: 'Ulgurji narx (so‘m)', type: 'number', required: false, placeholder: 'Katta partiya uchun' }
    ],
    futureNavMenus: [
      { id: 'mastersClub', title: 'Ustalar va brigadalar hisobi', icon: 'Users' },
      { id: 'heavyLogistics', title: 'Yuk tashish va yetkazish', icon: 'Truck' }
    ],
    futureStats: [
      { key: 'volumeSold', title: 'Jami hajm (tonna/m²)' },
      { key: 'masterRevenue', title: 'Ustalar orqali tushum' }
    ]
  },

  [STORE_TYPE_IDS.HOUSEHOLD]: {
    id: 'household',
    name: 'Uy-ro‘zg‘or',
    defaultUnit: 'dona',
    availableUnits: ['dona', 'to‘plam', 'juft', 'litr', 'metr', 'quti'],
    features: {
      hasExpiryDate: false,
      hasWarranty: true,             // Kichik maishiy texnika uchun kafolat
      hasBundles: true               // To‘plam (serviz, tova to‘plami)
    },
    customProductFields: [
      { key: 'brand', label: 'Brend / Ishlab chiqaruvchi', type: 'text', required: false, placeholder: 'Tefal, Luminarc, Ariel...' },
      { key: 'material', label: 'Material', type: 'text', required: false, placeholder: 'Granit, Shisha, Paxta' },
      { key: 'piecesInSet', label: 'To‘plamdagi buyumlar soni', type: 'number', required: false, placeholder: '12' }
    ],
    futureNavMenus: [
      { id: 'bundles', title: 'To‘plamlar (Setlar)', icon: 'Layers' },
      { id: 'homeWarranty', title: 'Texnika kafolatlari', icon: 'Shield' }
    ],
    futureStats: [
      { key: 'categorySales', title: 'Oshxona va Maishiy ulush' }
    ]
  },

  [STORE_TYPE_IDS.SPORT]: {
    id: 'sport',
    name: 'Sport jihozlari',
    defaultUnit: 'dona',
    availableUnits: ['dona', 'juft', 'to‘plam', 'kg'],
    features: {
      hasSportCategory: true,
      hasSizeMatrix: true
    },
    customProductFields: [
      { key: 'brand', label: 'Brend', type: 'text', required: false, placeholder: 'Nike, Adidas, Everlast...' },
      { key: 'sportType', label: 'Sport turi', type: 'text', required: false, placeholder: 'Futbol, Boks, Fitness' },
      { key: 'weightOrSize', label: 'Vazni / Razmeri', type: 'text', required: false, placeholder: '10kg, 12oz, Size 5' }
    ],
    futureNavMenus: [
      { id: 'sportTypes', title: 'Sport turlari bo‘yicha', icon: 'Activity' },
      { id: 'clubOrders', title: 'Klub va seksiyalar buyurtmalari', icon: 'Trophy' }
    ],
    futureStats: [
      { key: 'topSports', title: 'Ommabop sport turlari' }
    ]
  },

  [STORE_TYPE_IDS.ACCESSORIES]: {
    id: 'accessories',
    name: 'Aksessuarlar',
    defaultUnit: 'dona',
    availableUnits: ['dona', 'to‘plam', 'juft'],
    features: {
      hasCompatibility: true,
      hasWarranty: true
    },
    customProductFields: [
      { key: 'brand', label: 'Brend', type: 'text', required: false, placeholder: 'Baseus, Hoco, Borofone...' },
      { key: 'compatibility', label: 'Mos kelishi', type: 'text', required: false, placeholder: 'iPhone, Type-C, Universal' },
      { key: 'powerOutput', label: 'Quvvati / Sig‘imi', type: 'text', required: false, placeholder: '20W, 65W, 20000mAh' }
    ],
    futureNavMenus: [
      { id: 'compatLookup', title: 'Telefon modeliga mos qidiruv', icon: 'CheckSquare' }
    ],
    futureStats: [
      { key: 'fastMovers', title: 'Tez aylanuvchi mayda tovarlar' }
    ]
  },

  [STORE_TYPE_IDS.FLOWER]: {
    id: 'flower',
    name: 'Gul do‘koni',
    defaultUnit: 'dona',
    availableUnits: ['dona', 'buket', 'dasta', 'to‘plam', 'savat'],
    features: {
      hasFreshnessLife: true,        // So‘lish va tiriklik muddati
      hasCustomBouquet: true,        // Buket yig‘ish (kompozitsiya)
      hasDeliverySchedule: true      // Aniq vaqtga yetkazib berish
    },
    customProductFields: [
      { key: 'flowerType', label: 'Gul navi / turi', type: 'text', required: false, placeholder: 'Gollandiya Atirguli, Lola...' },
      { key: 'color', label: 'Rangi', type: 'text', required: false, placeholder: 'Qizil, Oq, Pushti, Sariq' },
      { key: 'freshnessDays', label: 'Saqlanish muddati (kun)', type: 'number', required: false, placeholder: '7' },
      { key: 'delivery', label: 'Yetkazib berish', type: 'select', options: ['Mavjud', 'Do‘kondan olib ketish'] }
    ],
    futureNavMenus: [
      { id: 'bouquetBuilder', title: 'Buket konstruktori', icon: 'Heart' },
      { id: 'deliveryCalendar', title: 'Yetkazish taqvimi', icon: 'Calendar' }
    ],
    futureStats: [
      { key: 'eventSpikes', title: 'Bayramlar va tadbirlar tushumi' }
    ]
  }
};

// 3. Adapter yordamchi funksiyalari (Helper API)

/**
 * Do‘kon turining to‘liq konfiguratsiyasi va adapter metadatasini qaytaradi
 */
export const getStoreTypeAdapter = (storeTypeId) => {
  const baseConfig = getStoreTypeById(storeTypeId);
  const metadata = STORE_TYPE_METADATA[storeTypeId] || STORE_TYPE_METADATA[STORE_TYPE_IDS.FOOD];

  return {
    ...baseConfig,
    metadata,
    // Maxsus maydonlar birlashmasi
    allFields: [...(baseConfig.fields || []), ...(metadata.customProductFields || [])]
  };
};

/**
 * Berilgan do‘kon turi uchun barcha kategoriyalarni qaytaradi
 */
export const getStoreCategories = (storeTypeId) => {
  const store = getStoreTypeById(storeTypeId);
  return store?.categories || ['Umumiy'];
};

/**
 * Berilgan do‘kon turi uchun mos o‘lchov birliklarini qaytaradi
 */
export const getStoreUnits = (storeTypeId) => {
  const store = getStoreTypeById(storeTypeId);
  return store?.units || ['dona'];
};

/**
 * Berilgan do‘kon turi uchun mos mahsulot maydonlari (fields) ro‘yxatini qaytaradi
 */
export const getStoreProductFields = (storeTypeId) => {
  const adapter = getStoreTypeAdapter(storeTypeId);
  return adapter.allFields;
};

/**
 * Kelajakda do‘kon turiga mos navigatsiya menyularini qaytaruvchi funksiya
 */
export const getStoreNavMenus = (storeTypeId) => {
  const metadata = STORE_TYPE_METADATA[storeTypeId];
  return metadata?.futureNavMenus || [];
};

/**
 * Kelajakda do‘kon turiga mos statistika konfiguratsiyasini qaytaruvchi funksiya
 */
export const getStoreStatsConfig = (storeTypeId) => {
  const metadata = STORE_TYPE_METADATA[storeTypeId];
  return metadata?.futureStats || [];
};

/**
 * Do‘kon turiga mos ombor xususiyatlarini qaytaradi
 */
export const getStoreInventoryConfig = (storeTypeId) => {
  const metadata = STORE_TYPE_METADATA[storeTypeId];
  return {
    units: getStoreUnits(storeTypeId),
    categories: getStoreCategories(storeTypeId),
    features: metadata?.features || {}
  };
};

/**
 * Do‘kon turiga mos savdo xususiyatlarini qaytaradi
 */
export const getStoreSalesConfig = (storeTypeId) => {
  const metadata = STORE_TYPE_METADATA[storeTypeId];
  return {
    features: metadata?.features || {}
  };
};

/**
 * Do‘kon turiga mos buyurtmalar xususiyatlarini qaytaradi
 */
export const getStoreOrdersConfig = (storeTypeId) => {
  const metadata = STORE_TYPE_METADATA[storeTypeId];
  return {
    hasDeliverySchedule: !!metadata?.features?.hasDeliverySchedule,
    hasBulkWarehouse: !!metadata?.features?.hasBulkWholesale
  };
};
