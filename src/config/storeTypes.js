// src/config/storeTypes.js
// Complete configuration for the 9 store types supported in Savatchi

export const STORE_TYPES = [
  {
    id: 'food',
    name: 'Oziq-ovqat',
    englishName: 'Grocery & Food',
    icon: 'Apple',
    emoji: '🛒',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50 text-emerald-600',
    description: "Oziq-ovqat mahsulotlari, ichimliklar, meva-sabzavotlar va bakkaliya",
    categories: [
      'Non va non mahsulotlari',
      'Sut mahsulotlari',
      'Sabzavot va mevalar',
      'Ichimliklar',
      'Yog‘ va bakkaliya',
      'Shirinliklar',
      'Go‘sht mahsulotlari'
    ],
    units: ['dona', 'kg', 'gramm', 'litr', 'ml', 'quti', 'blok'],
    stickers: ['🍞', '🥛', '🍅', '🛢️', '🥤', '🍎', '🧀', '🥩', '🥖', '🥚', '🍉', '🥕', '🥔', '🍗', '🍫', '☕', '🧊', '🧅', '🍌', '🍇'],
    fields: [
      { key: 'name', label: 'Mahsulot nomi', type: 'text', required: true, placeholder: 'Masalan: Non' },
      { key: 'category', label: 'Kategoriya', type: 'select', required: true },
      { key: 'unit', label: 'O‘lchov birligi', type: 'select', required: true },
      { key: 'price', label: 'Sotish narxi (so‘m)', type: 'number', required: true, placeholder: '4000' },
      { key: 'costPrice', label: 'Tannarxi (so‘m)', type: 'number', required: false, placeholder: '3200' },
      { key: 'stock', label: 'Miqdor', type: 'number', required: true, placeholder: '35' },
      { key: 'expiryDate', label: 'Yaroqlilik muddati', type: 'date', required: false },
    ],
    sampleProducts: [
      { id: 'p1', emoji: '🍞', name: 'Non', category: 'Non va non mahsulotlari', unit: 'dona', stock: 35, price: 4000, costPrice: 3000, status: 'Yetarli' },
      { id: 'p2', emoji: '🥛', name: 'Sut (2L)', category: 'Sut mahsulotlari', unit: 'dona', stock: 6, price: 14000, costPrice: 11000, status: 'Kam' },
      { id: 'p3', emoji: '🍅', name: 'Pomidor', category: 'Sabzavot va mevalar', unit: 'kg', stock: 12, price: 8000, costPrice: 6000, status: 'Yetarli' },
      { id: 'p4', emoji: '🛢️', name: "Yog‘ (1L)", category: 'Yog‘ va bakkaliya', unit: 'dona', stock: 2, price: 18000, costPrice: 15000, status: 'Tugagan' },
      { id: 'p5', emoji: '🥤', name: 'Coca-Cola (1.5L)', category: 'Ichimliklar', unit: 'dona', stock: 4, price: 12000, costPrice: 9500, status: 'Kam' },
      { id: 'p6', emoji: '🍎', name: 'Qizil olma', category: 'Sabzavot va mevalar', unit: 'kg', stock: 25, price: 12000, costPrice: 9000, status: 'Yetarli' },
      { id: 'p7', emoji: '🧀', name: 'Pishloq', category: 'Sut mahsulotlari', unit: 'kg', stock: 8, price: 65000, costPrice: 52000, status: 'Yetarli' },
      { id: 'p8', emoji: '🥚', name: 'Tuxum (30 talik)', category: 'Yog‘ va bakkaliya', unit: 'blok', stock: 15, price: 38000, costPrice: 32000, status: 'Yetarli' },
    ],
    sampleAlerts: [
      { id: 'a1', dotColor: 'bg-rose-500', title: "Yog‘ — 2 dona qoldi", subtitle: "Kam miqdorda", subtitleColor: "text-rose-500" },
      { id: 'a2', dotColor: 'bg-amber-500', title: "Sut buyurtmasi bugun keladi", subtitle: "Yetkazib beruvchi: Rahimov", subtitleColor: "text-slate-400" },
      { id: 'a3', dotColor: 'bg-emerald-500', dotText: 'B', title: "Aziz — 80 000 so‘m qarz", subtitle: "10 kundan beri to‘lanmagan", subtitleColor: "text-slate-400" },
      { id: 'a4', dotColor: 'bg-blue-500', title: "Coca-Cola — 4 dona qoldi", subtitle: "Kam miqdorda", subtitleColor: "text-blue-500" },
    ],
    sampleTopProducts: [
      { name: 'Non', value: 124, percentage: '28%', color: '#10B981' },
      { name: 'Sut (2L)', value: 87, percentage: '19%', color: '#3B82F6' },
      { name: 'Coca-Cola (1.5L)', value: 63, percentage: '14%', color: '#06B6D4' },
      { name: 'Pomidor', value: 51, percentage: '11%', color: '#8B5CF6' },
      { name: 'Boshqalar', value: 120, percentage: '28%', color: '#CBD5E1' },
    ]
  },
  {
    id: 'phone',
    name: 'Telefon',
    englishName: 'Phones & Tech',
    icon: 'Smartphone',
    emoji: '📱',
    color: 'from-blue-600 to-indigo-600',
    bgColor: 'bg-blue-50 text-blue-600',
    description: "Smartfonlar, planshetlar, gadjetlar, IMEI ro‘yxati va kafolat xizmati",
    categories: [
      'Smartfonlar',
      'Tugmali telefonlar',
      'Planshetlar',
      'Smart soatlar',
      'Quloqchinlar',
      'G‘ilof va himoya oynalari',
      'Zaryadlovchi qurilmalar'
    ],
    units: ['dona', 'komplekt'],
    stickers: ['📱', '💻', '🎧', '🔌', '⌚', '🔋', '📷', '🖥️', '🖱️', '🎮', '📶', '💾'],
    fields: [
      { key: 'name', label: 'Model nomi', type: 'text', required: true, placeholder: 'iPhone 15 Pro Max' },
      { key: 'category', label: 'Kategoriya', type: 'select', required: true },
      { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Apple, Samsung...' },
      { key: 'storage', label: 'Xotira', type: 'text', placeholder: '128GB / 256GB / 512GB' },
      { key: 'color', label: 'Rang', type: 'text', placeholder: 'Titanium, Black, Blue' },
      { key: 'imei', label: 'IMEI / Serial', type: 'text', placeholder: '358972109482...' },
      { key: 'warranty', label: 'Kafolat (oy)', type: 'number', placeholder: '12' },
      { key: 'unit', label: 'Birlik', type: 'select', required: true },
      { key: 'price', label: 'Sotish narxi (so‘m)', type: 'number', required: true, placeholder: '14500000' },
      { key: 'stock', label: 'Soni', type: 'number', required: true, placeholder: '4' },
    ],
    sampleProducts: [
      { id: 'p1', emoji: '📱', name: 'iPhone 15 Pro Max (256GB)', category: 'Smartfonlar', unit: 'dona', stock: 4, price: 14500000, costPrice: 13200000, status: 'Yetarli' },
      { id: 'p2', emoji: '📱', name: 'Samsung Galaxy S24 Ultra', category: 'Smartfonlar', unit: 'dona', stock: 2, price: 13200000, costPrice: 12000000, status: 'Kam' },
      { id: 'p3', emoji: '📱', name: 'Redmi Note 13 Pro (8/256GB)', category: 'Smartfonlar', unit: 'dona', stock: 8, price: 2800000, costPrice: 2400000, status: 'Yetarli' },
      { id: 'p4', emoji: '🎧', name: 'AirPods Pro 2 (USB-C)', category: 'Quloqchinlar', unit: 'dona', stock: 6, price: 2600000, costPrice: 2100000, status: 'Yetarli' },
      { id: 'p5', emoji: '⌚', name: 'Apple Watch Series 9', category: 'Smart soatlar', unit: 'dona', stock: 1, price: 4800000, costPrice: 4200000, status: 'Tugagan' },
      { id: 'p6', emoji: '🔌', name: '20W USB-C Adapter', category: 'Zaryadlovchi qurilmalar', unit: 'dona', stock: 20, price: 250000, costPrice: 160000, status: 'Yetarli' },
    ],
    sampleAlerts: [
      { id: 'a1', dotColor: 'bg-rose-500', title: "Apple Watch — 1 dona qoldi", subtitle: "Zaxira tugamoqda", subtitleColor: "text-rose-500" },
      { id: 'a2', dotColor: 'bg-amber-500', title: "iPhone 15 partiyasi kelishi kutilmoqda", subtitle: "Yetkazib beruvchi: iStore", subtitleColor: "text-slate-400" },
      { id: 'a3', dotColor: 'bg-emerald-500', dotText: 'B', title: "Jasur — 3 200 000 so‘m qarz", subtitle: "Telefon sotib olgan", subtitleColor: "text-slate-400" },
      { id: 'a4', dotColor: 'bg-blue-500', title: "Galaxy S24 — 2 dona qoldi", subtitle: "Kam miqdorda", subtitleColor: "text-blue-500" },
    ],
    sampleTopProducts: [
      { name: 'iPhone 15 Pro', value: 34, percentage: '32%', color: '#3B82F6' },
      { name: 'Redmi Note 13', value: 28, percentage: '26%', color: '#10B981' },
      { name: 'AirPods Pro 2', value: 19, percentage: '18%', color: '#8B5CF6' },
      { name: '20W Adapter', value: 15, percentage: '14%', color: '#F59E0B' },
      { name: 'Boshqalar', value: 11, percentage: '10%', color: '#CBD5E1' },
    ]
  },
  {
    id: 'clothing',
    name: 'Kiyim-kechak',
    englishName: 'Fashion & Clothing',
    icon: 'Shirt',
    emoji: '👕',
    color: 'from-purple-600 to-pink-600',
    bgColor: 'bg-purple-50 text-purple-600',
    description: "Erkaklar, ayollar va bolalar kiyimlari, poyabzal, o‘lchamlar va ranglar",
    categories: [
      'Erkaklar kiyimi',
      'Ayollar kiyimi',
      'Bolalar kiyimi',
      'Oyoq kiyimlar',
      'Ustki kiyimlar',
      'Sport kiyimlari',
      'Bosh kiyimlar va aksessuarlar'
    ],
    units: ['dona', 'juft', 'to‘plam'],
    stickers: ['👕', '👖', '👟', '🧥', '👗', '👔', '🧦', '🧢', '🧤', '👜', '🥾', '🩳', '🩱', '🥿', '👠'],
    fields: [
      { key: 'name', label: 'Kiyim modeli / Nomi', type: 'text', required: true, placeholder: 'Erkaklar polo futbolkasi' },
      { key: 'category', label: 'Kategoriya', type: 'select', required: true },
      { key: 'size', label: 'Razmer / O‘lcham', type: 'text', placeholder: 'S, M, L, XL, XXL, 38-46' },
      { key: 'color', label: 'Rangi', type: 'text', placeholder: 'Qora, Oq, Ko‘k...' },
      { key: 'gender', label: 'Jins', type: 'select', options: ['Erkaklar', 'Ayollar', 'Bolalar', 'Uniseks'] },
      { key: 'unit', label: 'Birlik', type: 'select', required: true },
      { key: 'price', label: 'Sotish narxi (so‘m)', type: 'number', required: true, placeholder: '180000' },
      { key: 'stock', label: 'Miqdor', type: 'number', required: true, placeholder: '15' },
    ],
    sampleProducts: [
      { id: 'p1', emoji: '👕', name: 'Erkaklar polo futbolkasi', category: 'Erkaklar kiyimi', unit: 'dona', stock: 15, price: 180000, costPrice: 120000, status: 'Yetarli', size: 'L', color: 'Ko‘k', gender: 'Erkaklar' },
      { id: 'p2', emoji: '👖', name: 'Erkaklar jinsi shimi', category: 'Erkaklar kiyimi', unit: 'dona', stock: 3, price: 320000, costPrice: 220000, status: 'Kam', size: '32', color: 'To‘q ko‘k', gender: 'Erkaklar' },
      { id: 'p3', emoji: '🧥', name: 'Qishki kurtka Zara', category: 'Ustki kiyimlar', unit: 'dona', stock: 1, price: 850000, costPrice: 600000, status: 'Tugagan', size: 'XL', color: 'Qora', gender: 'Erkaklar' },
      { id: 'p4', emoji: '👟', name: 'Nike Air Force 1', category: 'Oyoq kiyimlar', unit: 'juft', stock: 8, price: 650000, costPrice: 450000, status: 'Yetarli', size: '42', color: 'Oq', gender: 'Uniseks' },
      { id: 'p5', emoji: '👗', name: 'Ayollar kechki ko‘ylagi', category: 'Ayollar kiyimi', unit: 'dona', stock: 5, price: 450000, costPrice: 300000, status: 'Yetarli', size: 'M', color: 'Qizil', gender: 'Ayollar' },
    ],
    sampleAlerts: [
      { id: 'a1', dotColor: 'bg-rose-500', title: "Zara Kurtka — 1 dona qoldi", subtitle: "Mavsumiy tovar", subtitleColor: "text-rose-500" },
      { id: 'a2', dotColor: 'bg-amber-500', title: "Kuzgi kolleksiya buyurtmasi kutilmoqda", subtitle: "Yetkazib beruvchi: TextilePro", subtitleColor: "text-slate-400" },
      { id: 'a3', dotColor: 'bg-emerald-500', dotText: 'B', title: "Malika — 450 000 so‘m qarz", subtitle: "Ko‘ylak olgan", subtitleColor: "text-slate-400" },
      { id: 'a4', dotColor: 'bg-blue-500', title: "Jinsi shimi — 3 dona qoldi", subtitle: "Kam miqdorda", subtitleColor: "text-blue-500" },
    ],
    sampleTopProducts: [
      { name: 'Polo futbolka', value: 68, percentage: '35%', color: '#8B5CF6' },
      { name: 'Nike Air Force', value: 42, percentage: '22%', color: '#3B82F6' },
      { name: 'Jinsi shim', value: 36, percentage: '19%', color: '#10B981' },
      { name: 'Kechki ko‘ylak', value: 25, percentage: '13%', color: '#EC4899' },
      { name: 'Boshqalar', value: 21, percentage: '11%', color: '#CBD5E1' },
    ]
  },
  {
    id: 'cosmetics',
    name: 'Kosmetika',
    englishName: 'Beauty & Cosmetics',
    icon: 'Sparkles',
    emoji: '💄',
    color: 'from-rose-500 to-pink-600',
    bgColor: 'bg-rose-50 text-rose-600',
    description: "Pardoz buyumlari, teri parvarishi, parfyumeriya va go‘zallik vositalari",
    categories: [
      'Yuz parvarishi',
      'Makiyaj & Pardoz',
      'Soch parvarishi',
      'Parfyumeriya',
      'Tana parvarishi',
      'Gigiyena vositalari'
    ],
    units: ['dona', 'ml', 'gramm', 'to‘plam'],
    stickers: ['💄', '💅', '🧴', '🧼', '🪞', '🌸', '💋', '💆', '🫧', '👄', '✨', '💐'],
    fields: [
      { key: 'name', label: 'Mahsulot nomi', type: 'text', required: true, placeholder: 'Maybelline Lab bo‘yog‘i' },
      { key: 'category', label: 'Kategoriya', type: 'select', required: true },
      { key: 'brand', label: 'Brend', type: 'text', placeholder: 'L’Oréal, CeraVe, Dior...' },
      { key: 'volume', label: 'Hajmi / Og‘irligi', type: 'text', placeholder: '50ml, 100g, 473ml' },
      { key: 'expiryDate', label: 'Yaroqlilik muddati', type: 'date' },
      { key: 'unit', label: 'Birlik', type: 'select', required: true },
      { key: 'price', label: 'Sotish narxi (so‘m)', type: 'number', required: true, placeholder: '85000' },
      { key: 'stock', label: 'Miqdor', type: 'number', required: true, placeholder: '12' },
    ],
    sampleProducts: [
      { id: 'p1', emoji: '💄', name: 'Maybelline Matte Lab bo‘yog‘i', category: 'Makiyaj & Pardoz', unit: 'dona', stock: 12, price: 85000, costPrice: 60000, status: 'Yetarli' },
      { id: 'p2', emoji: '🧴', name: 'The Ordinary Niacinamide Serum', category: 'Yuz parvarishi', unit: 'dona', stock: 2, price: 160000, costPrice: 120000, status: 'Tugagan' },
      { id: 'p3', emoji: '🌸', name: 'Chanel Chance Eau Tendre 50ml', category: 'Parfyumeriya', unit: 'dona', stock: 3, price: 1450000, costPrice: 1150000, status: 'Kam' },
      { id: 'p4', emoji: '🧴', name: 'CeraVe Yuz yuvish geli (473ml)', category: 'Yuz parvarishi', unit: 'dona', stock: 8, price: 220000, costPrice: 170000, status: 'Yetarli' },
      { id: 'p5', emoji: '💅', name: 'Gel lak to‘plami (OPI)', category: 'Makiyaj & Pardoz', unit: 'to‘plam', stock: 24, price: 45000, costPrice: 30000, status: 'Yetarli' },
    ],
    sampleAlerts: [
      { id: 'a1', dotColor: 'bg-rose-500', title: "The Ordinary Serum — 2 dona qoldi", subtitle: "Tugash arafasida", subtitleColor: "text-rose-500" },
      { id: 'a2', dotColor: 'bg-amber-500', title: "Parfyum partiyasi bojxonadan chiqmoqda", subtitle: "Yetkazib beruvchi: DubaiPerfumes", subtitleColor: "text-slate-400" },
      { id: 'a3', dotColor: 'bg-emerald-500', dotText: 'B', title: "Zarina — 380 000 so‘m qarz", subtitle: "Parfyum olgan", subtitleColor: "text-slate-400" },
      { id: 'a4', dotColor: 'bg-blue-500', title: "Chanel Chance — 3 dona qoldi", subtitle: "Kam miqdorda", subtitleColor: "text-blue-500" },
    ],
    sampleTopProducts: [
      { name: 'Maybelline Lab', value: 92, percentage: '36%', color: '#EC4899' },
      { name: 'CeraVe Gel', value: 58, percentage: '23%', color: '#3B82F6' },
      { name: 'The Ordinary', value: 45, percentage: '18%', color: '#8B5CF6' },
      { name: 'Gel lak', value: 34, percentage: '13%', color: '#F59E0B' },
      { name: 'Boshqalar', value: 26, percentage: '10%', color: '#CBD5E1' },
    ]
  },
  {
    id: 'construction',
    name: 'Qurilish mollari',
    englishName: 'Building & Construction',
    icon: 'Hammer',
    emoji: '🧱',
    color: 'from-amber-600 to-orange-600',
    bgColor: 'bg-amber-50 text-amber-600',
    description: "Sement, bo‘yoqlar, santexnika, elektr jihozlari, asboblar va mahkamlagichlar",
    categories: [
      'Sement va quruq qorishmalar',
      'Bo‘yoq va laklar',
      'Santexnika',
      'Elektr mollari',
      'Asbob-uskunalar',
      'Gipsokarton va profillar',
      'Metiz va mahkamlagichlar'
    ],
    units: ['kg', 'metr', 'litr', 'qop', 'dona', 'm²', 'rulon', 'quti'],
    stickers: ['🧱', '🪵', '🔨', '🪚', '🪜', '🔧', '🔩', '🎨', '📐', '🪛', '🧰', '💡', '🔌', '🪓'],
    fields: [
      { key: 'name', label: 'Material / Mahsulot nomi', type: 'text', required: true, placeholder: 'Sement M-500 (50kg)' },
      { key: 'category', label: 'Kategoriya', type: 'select', required: true },
      { key: 'brand', label: 'Ishlab chiqaruvchi / Marka', type: 'text', placeholder: 'Qizilqumsement, Marshall...' },
      { key: 'unit', label: 'O‘lchov birligi', type: 'select', required: true },
      { key: 'price', label: 'Sotish narxi (so‘m)', type: 'number', required: true, placeholder: '65000' },
      { key: 'stock', label: 'Miqdor', type: 'number', required: true, placeholder: '120' },
    ],
    sampleProducts: [
      { id: 'p1', emoji: '🧱', name: 'Sement M-500 (50 kg)', category: 'Sement va quruq qorishmalar', unit: 'qop', stock: 120, price: 65000, costPrice: 54000, status: 'Yetarli' },
      { id: 'p2', emoji: '🎨', name: 'Oq emulsiya Marshall (20 kg)', category: 'Bo‘yoq va laklar', unit: 'dona', stock: 4, price: 280000, costPrice: 230000, status: 'Kam' },
      { id: 'p3', emoji: '🔩', name: 'Samorez 3.5x25 (1000 dona)', category: 'Metiz va mahkamlagichlar', unit: 'quti', stock: 18, price: 45000, costPrice: 32000, status: 'Yetarli' },
      { id: 'p4', emoji: '🔨', name: 'Bolg‘a (Yato 500g)', category: 'Asbob-uskunalar', unit: 'dona', stock: 8, price: 85000, costPrice: 62000, status: 'Yetarli' },
      { id: 'p5', emoji: '🪜', name: 'Alyumin narvon 3x7', category: 'Asbob-uskunalar', unit: 'dona', stock: 0, price: 750000, costPrice: 600000, status: 'Tugagan' },
    ],
    sampleAlerts: [
      { id: 'a1', dotColor: 'bg-rose-500', title: "Alyumin narvon — 0 dona", subtitle: "Zaxirada qolmagan", subtitleColor: "text-rose-500" },
      { id: 'a2', dotColor: 'bg-amber-500', title: "Sement yuk mashinasi soat 18:00 da keladi", subtitle: "Yetkazib beruvchi: Qizilqum", subtitleColor: "text-slate-400" },
      { id: 'a3', dotColor: 'bg-emerald-500', dotText: 'B', title: "Rustam usta — 1 450 000 so‘m qarz", subtitle: "Qurilish mollari olgan", subtitleColor: "text-slate-400" },
      { id: 'a4', dotColor: 'bg-blue-500', title: "Oq emulsiya — 4 dona qoldi", subtitle: "Kam miqdorda", subtitleColor: "text-blue-500" },
    ],
    sampleTopProducts: [
      { name: 'Sement M-500', value: 240, percentage: '45%', color: '#F59E0B' },
      { name: 'Samorez 3.5x25', value: 85, percentage: '22%', color: '#10B981' },
      { name: 'Oq emulsiya', value: 38, percentage: '14%', color: '#3B82F6' },
      { name: 'Bolg‘a Yato', value: 24, percentage: '10%', color: '#8B5CF6' },
      { name: 'Boshqalar', value: 22, percentage: '9%', color: '#CBD5E1' },
    ]
  },
  {
    id: 'household',
    name: 'Uy-ro‘zg‘or',
    englishName: 'Home & Living',
    icon: 'Home',
    emoji: '🏠',
    color: 'from-cyan-600 to-blue-600',
    bgColor: 'bg-cyan-50 text-cyan-600',
    description: "Idish-tovoqlar, tozalash vositalari, to‘qimachilik va oshxona anjomlari",
    categories: [
      'Idish-tovoqlar',
      'Tozalash va yuvish vositalari',
      'Uy to‘qimachiligi',
      'Oshxona anjomlari',
      'Plastik idishlar',
      'Kichik maishiy jihozlar'
    ],
    units: ['dona', 'to‘plam', 'juft', 'litr', 'metr', 'quti'],
    stickers: ['🏠', '🛋️', '🍽️', '🧹', '🧼', '🛏️', '🪑', '🧺', '🧽', '🕯️', '🍳', '🫖', '🔪', '🛁'],
    fields: [
      { key: 'name', label: 'Buyum nomi', type: 'text', required: true, placeholder: 'Granit tovasi 26cm' },
      { key: 'category', label: 'Kategoriya', type: 'select', required: true },
      { key: 'brand', label: 'Brend / Ishlab chiqaruvchi', type: 'text', placeholder: 'Tefal, Luminarc, Ariel...' },
      { key: 'unit', label: 'O‘lchov birligi', type: 'select', required: true },
      { key: 'price', label: 'Sotish narxi (so‘m)', type: 'number', required: true, placeholder: '290000' },
      { key: 'stock', label: 'Miqdor', type: 'number', required: true, placeholder: '7' },
    ],
    sampleProducts: [
      { id: 'p1', emoji: '🍳', name: 'Granit tovasi 26cm (Tefal)', category: 'Idish-tovoqlar', unit: 'dona', stock: 7, price: 290000, costPrice: 220000, status: 'Yetarli' },
      { id: 'p2', emoji: '🍽️', name: 'Luminarc choy to‘plami (12 kishilik)', category: 'Idish-tovoqlar', unit: 'to‘plam', stock: 3, price: 420000, costPrice: 330000, status: 'Kam' },
      { id: 'p3', emoji: '🧹', name: 'Pol yuvish shvabrasi (Spin Mop)', category: 'Tozalash va yuvish vositalari', unit: 'dona', stock: 6, price: 180000, costPrice: 130000, status: 'Yetarli' },
      { id: 'p4', emoji: '🧺', name: 'Kir yuvish geli Ariel (4.5L)', category: 'Tozalash va yuvish vositalari', unit: 'dona', stock: 1, price: 175000, costPrice: 140000, status: 'Tugagan' },
      { id: 'p5', emoji: '🫖', name: 'Elektr choynak Tefal', category: 'Kichik maishiy jihozlar', unit: 'dona', stock: 9, price: 350000, costPrice: 270000, status: 'Yetarli' },
    ],
    sampleAlerts: [
      { id: 'a1', dotColor: 'bg-rose-500', title: "Ariel Gel — 1 dona qoldi", subtitle: "Zaxira tugamoqda", subtitleColor: "text-rose-500" },
      { id: 'a2', dotColor: 'bg-amber-500', title: "Tefal idishlar partiyasi kutilmoqda", subtitle: "Yetkazib beruvchi: PosudaOptom", subtitleColor: "text-slate-400" },
      { id: 'a3', dotColor: 'bg-emerald-500', dotText: 'B', title: "Dilnoza — 650 000 so‘m qarz", subtitle: "Choy to‘plami olgan", subtitleColor: "text-slate-400" },
      { id: 'a4', dotColor: 'bg-blue-500', title: "Luminarc to‘plami — 3 dona qoldi", subtitle: "Kam miqdorda", subtitleColor: "text-blue-500" },
    ],
    sampleTopProducts: [
      { name: 'Granit tovasi', value: 45, percentage: '30%', color: '#06B6D4' },
      { name: 'Elektr choynak', value: 38, percentage: '25%', color: '#3B82F6' },
      { name: 'Spin Mop shvabra', value: 32, percentage: '21%', color: '#10B981' },
      { name: 'Luminarc to‘plami', value: 20, percentage: '13%', color: '#8B5CF6' },
      { name: 'Boshqalar', value: 16, percentage: '11%', color: '#CBD5E1' },
    ]
  },
  {
    id: 'sport',
    name: 'Sport jihozlari',
    englishName: 'Sport & Fitness',
    icon: 'Activity',
    emoji: '⚽',
    color: 'from-green-600 to-emerald-600',
    bgColor: 'bg-green-50 text-green-600',
    description: "Futbol, trenajyorlar, boks jihozlari, fitnes anjomlari va sport liboslari",
    categories: [
      'Futbol jihozlari',
      'Fitness va trenajyorlar',
      'Boks va yakkakurash',
      'Suv sporti',
      'Sport kiyimlari',
      'Velosiped va samokatlar'
    ],
    units: ['dona', 'juft', 'to‘plam', 'kg'],
    stickers: ['⚽', '🏀', '🎾', '🥊', '🏋️', '🛹', '🚴', '🎽', '🏸', '🏊', '🥋', '🏓', '🏐', '⛳', '🎯'],
    fields: [
      { key: 'name', label: 'Sport jihozi nomi', type: 'text', required: true, placeholder: 'Adidas Champions League to‘pi' },
      { key: 'category', label: 'Kategoriya', type: 'select', required: true },
      { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Nike, Adidas, Everlast...' },
      { key: 'sportType', label: 'Sport turi', type: 'text', placeholder: 'Futbol, Boks, Fitness' },
      { key: 'unit', label: 'Birlik', type: 'select', required: true },
      { key: 'price', label: 'Sotish narxi (so‘m)', type: 'number', required: true, placeholder: '380000' },
      { key: 'stock', label: 'Miqdor', type: 'number', required: true, placeholder: '10' },
    ],
    sampleProducts: [
      { id: 'p1', emoji: '⚽', name: 'Adidas UCL futbol to‘pi', category: 'Futbol jihozlari', unit: 'dona', stock: 10, price: 380000, costPrice: 280000, status: 'Yetarli' },
      { id: 'p2', emoji: '🥊', name: 'Everlast boks qo‘lqopi (12oz)', category: 'Boks va yakkakurash', unit: 'juft', stock: 2, price: 340000, costPrice: 250000, status: 'Kam' },
      { id: 'p3', emoji: '🏋️', name: 'Gantellar to‘plami (2x10kg)', category: 'Fitness va trenajyorlar', unit: 'to‘plam', stock: 5, price: 450000, costPrice: 340000, status: 'Yetarli' },
      { id: 'p4', emoji: '🛹', name: 'Skeytbord Pro Street', category: 'Velosiped va samokatlar', unit: 'dona', stock: 1, price: 520000, costPrice: 390000, status: 'Tugagan' },
      { id: 'p5', emoji: '🎽', name: 'Sport formasi Nike Dri-FIT', category: 'Sport kiyimlari', unit: 'to‘plam', stock: 14, price: 240000, costPrice: 170000, status: 'Yetarli' },
    ],
    sampleAlerts: [
      { id: 'a1', dotColor: 'bg-rose-500', title: "Skeytbord Pro — 1 dona qoldi", subtitle: "Tugagan", subtitleColor: "text-rose-500" },
      { id: 'a2', dotColor: 'bg-amber-500', title: "Boks jihozlari yetkazib berilishi kutilmoqda", subtitle: "Yetkazib beruvchi: SportMaster", subtitleColor: "text-slate-400" },
      { id: 'a3', dotColor: 'bg-emerald-500', dotText: 'B', title: "Sherzod — 720 000 so‘m qarz", subtitle: "Gantel to‘plami olgan", subtitleColor: "text-slate-400" },
      { id: 'a4', dotColor: 'bg-blue-500', title: "Everlast qo‘lqop — 2 juft qoldi", subtitle: "Kam miqdorda", subtitleColor: "text-blue-500" },
    ],
    sampleTopProducts: [
      { name: 'Adidas To‘p', value: 52, percentage: '33%', color: '#10B981' },
      { name: 'Nike Dri-FIT', value: 41, percentage: '26%', color: '#3B82F6' },
      { name: 'Gantellar 2x10kg', value: 30, percentage: '19%', color: '#8B5CF6' },
      { name: 'Everlast qo‘lqop', value: 20, percentage: '13%', color: '#F59E0B' },
      { name: 'Boshqalar', value: 14, percentage: '9%', color: '#CBD5E1' },
    ]
  },
  {
    id: 'accessories',
    name: 'Aksessuarlar',
    englishName: 'Tech Accessories',
    icon: 'Headphones',
    emoji: '🎧',
    color: 'from-violet-600 to-indigo-600',
    bgColor: 'bg-violet-50 text-violet-600',
    description: "Powerbanklar, quloqchinlar, simsiz zaryadkalar, kabel va avto-uskunalar",
    categories: [
      'Quloqchinlar',
      'Kabel va adapterlar',
      'Zaryadlovchilar',
      'Smartwatch va brasletlar',
      'Powerbanklar',
      'G‘ilof va sumkalar',
      'Avto aksessuarlar'
    ],
    units: ['dona', 'to‘plam', 'juft'],
    stickers: ['🎧', '🔌', '⌚', '🔋', '📱', '💼', '🕶️', '🎒', '💍', '🛡️', '💳', '🔊', '🕹️'],
    fields: [
      { key: 'name', label: 'Aksessuar nomi', type: 'text', required: true, placeholder: 'Powerbank Baseus 20000mAh' },
      { key: 'category', label: 'Kategoriya', type: 'select', required: true },
      { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Baseus, Hoco, Borofone...' },
      { key: 'compatibility', label: 'Mos kelishi', type: 'text', placeholder: 'iPhone, Type-C, Universal' },
      { key: 'unit', label: 'Birlik', type: 'select', required: true },
      { key: 'price', label: 'Sotish narxi (so‘m)', type: 'number', required: true, placeholder: '420000' },
      { key: 'stock', label: 'Miqdor', type: 'number', required: true, placeholder: '6' },
    ],
    sampleProducts: [
      { id: 'p1', emoji: '🔋', name: 'Powerbank Baseus 20000mAh 65W', category: 'Powerbanklar', unit: 'dona', stock: 6, price: 420000, costPrice: 320000, status: 'Yetarli' },
      { id: 'p2', emoji: '🎧', name: 'Simsiz quloqchin Hoco W35', category: 'Quloqchinlar', unit: 'dona', stock: 12, price: 160000, costPrice: 110000, status: 'Yetarli' },
      { id: 'p3', emoji: '🔌', name: 'Type-C Fast Charge kabeli (2m)', category: 'Kabel va adapterlar', unit: 'dona', stock: 35, price: 45000, costPrice: 25000, status: 'Yetarli' },
      { id: 'p4', emoji: '⌚', name: 'Smartwatch Mibro GS Pro', category: 'Smartwatch va brasletlar', unit: 'dona', stock: 2, price: 780000, costPrice: 620000, status: 'Kam' },
      { id: 'p5', emoji: '💼', name: 'Noutbuk ryukzaki Mark Ryden', category: 'G‘ilof va sumkalar', unit: 'dona', stock: 0, price: 390000, costPrice: 280000, status: 'Tugagan' },
    ],
    sampleAlerts: [
      { id: 'a1', dotColor: 'bg-rose-500', title: "Mark Ryden Ryukzak — 0 dona", subtitle: "Tugagan", subtitleColor: "text-rose-500" },
      { id: 'a2', dotColor: 'bg-amber-500', title: "Baseus yangi partiyasi yo‘lda", subtitle: "Yetkazib beruvchi: ChinaDirect", subtitleColor: "text-slate-400" },
      { id: 'a3', dotColor: 'bg-emerald-500', dotText: 'B', title: "Shoxrux — 420 000 so‘m qarz", subtitle: "Powerbank olgan", subtitleColor: "text-slate-400" },
      { id: 'a4', dotColor: 'bg-blue-500', title: "Mibro Smartwatch — 2 dona qoldi", subtitle: "Kam miqdorda", subtitleColor: "text-blue-500" },
    ],
    sampleTopProducts: [
      { name: 'Baseus 20000mAh', value: 75, percentage: '38%', color: '#6366F1' },
      { name: 'Type-C Kabel', value: 55, percentage: '28%', color: '#10B981' },
      { name: 'Hoco W35', value: 34, percentage: '17%', color: '#3B82F6' },
      { name: 'Mibro Watch', value: 20, percentage: '10%', color: '#8B5CF6' },
      { name: 'Boshqalar', value: 14, percentage: '7%', color: '#CBD5E1' },
    ]
  },
  {
    id: 'flower',
    name: 'Gul do‘koni',
    englishName: 'Flowers & Bouquets',
    icon: 'Flower2',
    emoji: '🌹',
    color: 'from-rose-500 to-red-600',
    bgColor: 'bg-rose-50 text-rose-600',
    description: "Tirik gullar, bayramona buketlar, xona gullari, savatlar va sovg‘alar",
    categories: [
      'Tirik gullar',
      'Tayyor buketlar',
      'Katta savatdagi gullar',
      'Xona gullari va tuvaklar',
      'Sovg‘a qutilari',
      'Sharlar va tabriknomalar'
    ],
    units: ['dona', 'buket', 'dasta', 'to‘plam', 'savat'],
    stickers: ['🌹', '🌷', '🌻', '💐', '🌺', '🌸', '🌼', '🪴', '🎁', '🎋', '🌿', '🥀', '🎈', '🎀'],
    fields: [
      { key: 'name', label: 'Gul / Buket nomi', type: 'text', required: true, placeholder: 'Gollandiya Qizil Atirguli' },
      { key: 'category', label: 'Kategoriya', type: 'select', required: true },
      { key: 'flowerType', label: 'Gul turi', type: 'text', placeholder: 'Atirgul, Lola, Xrizantema...' },
      { key: 'color', label: 'Rangi', type: 'text', placeholder: 'Qizil, Oq, Pushti, Sariq' },
      { key: 'delivery', label: 'Yetkazib berish xizmati', type: 'select', options: ['Mavjud', 'Do‘kondan olib ketish'] },
      { key: 'unit', label: 'Birlik', type: 'select', required: true },
      { key: 'price', label: 'Sotish narxi (so‘m)', type: 'number', required: true, placeholder: '25000' },
      { key: 'stock', label: 'Soni', type: 'number', required: true, placeholder: '150' },
    ],
    sampleProducts: [
      { id: 'p1', emoji: '🌹', name: 'Gollandiya Qizil Atirguli (80cm)', category: 'Tirik gullar', unit: 'dona', stock: 150, price: 25000, costPrice: 16000, status: 'Yetarli' },
      { id: 'p2', emoji: '💐', name: 'Premium 51 Atirgul buketi', category: 'Tayyor buketlar', unit: 'buket', stock: 3, price: 1200000, costPrice: 850000, status: 'Kam' },
      { id: 'p3', emoji: '🌷', name: 'Bahor Lolalari dastasi (25 dona)', category: 'Tayyor buketlar', unit: 'dasta', stock: 8, price: 350000, costPrice: 240000, status: 'Yetarli' },
      { id: 'p4', emoji: '🪴', name: 'Orxideya Falanopsis tuvakda', category: 'Xona gullari va tuvaklar', unit: 'dona', stock: 4, price: 280000, costPrice: 200000, status: 'Yetarli' },
      { id: 'p5', emoji: '🌻', name: 'Kungaboqar dekorativ guldastasi', category: 'Tayyor buketlar', unit: 'buket', stock: 1, price: 190000, costPrice: 130000, status: 'Tugagan' },
    ],
    sampleAlerts: [
      { id: 'a1', dotColor: 'bg-rose-500', title: "Kungaboqar buketi — 1 dona qoldi", subtitle: "Tugash arafasida", subtitleColor: "text-rose-500" },
      { id: 'a2', dotColor: 'bg-amber-500', title: "Gollandiya yangi partiyasi soat 15:00 da keladi", subtitle: "Yetkazib beruvchi: FloraHolland", subtitleColor: "text-slate-400" },
      { id: 'a3', dotColor: 'bg-emerald-500', dotText: 'B', title: "Bekzod — 1 200 000 so‘m qarz", subtitle: "51 atirgul buketi olgan", subtitleColor: "text-slate-400" },
      { id: 'a4', dotColor: 'bg-blue-500', title: "51 Atirgul buketi — 3 dona qoldi", subtitle: "Kam miqdorda", subtitleColor: "text-blue-500" },
    ],
    sampleTopProducts: [
      { name: 'Qizil Atirgul', value: 210, percentage: '48%', color: '#E11D48' },
      { name: '51 Atirgul Buketi', value: 85, percentage: '20%', color: '#F43F5E' },
      { name: 'Bahor Lolalari', value: 65, percentage: '15%', color: '#FB7185' },
      { name: 'Orxideya Tuvakda', value: 40, percentage: '9%', color: '#8B5CF6' },
      { name: 'Boshqalar', value: 35, percentage: '8%', color: '#CBD5E1' },
    ]
  }
];

export const getStoreTypeById = (id) => {
  return STORE_TYPES.find(t => t.id === id) || STORE_TYPES[0];
};

export const RENTAL_ALLOWED_STORE_TYPES = ['household', 'sport', 'accessories', 'phone'];

export const isRentalSupportedStoreType = (type) => {
  if (!type) return false;
  const normalized = String(type).trim().toLowerCase();
  if (
    normalized === 'household' ||
    normalized.includes('ro‘zg‘or') ||
    normalized.includes('rozgor') ||
    normalized.includes('uy-ro') ||
    normalized.includes('uy ro')
  ) return true;
  if (
    normalized === 'sport' ||
    normalized.includes('sport')
  ) return true;
  if (
    normalized === 'accessories' ||
    normalized.includes('aksessuar') ||
    normalized.includes('aksesuar')
  ) return true;
  if (
    normalized === 'phone' ||
    normalized.includes('telefon') ||
    normalized.includes('smartfon')
  ) return true;
  return false;
};

// 6 ta do'kon turida "Qarzlar" menyusi butunlay taqiqlangan
export const DEBTS_RESTRICTED_STORE_TYPES = [
  'phone',        // Telefon do'koni
  'cosmetics',    // Kosmetika do'koni
  'construction', // Qurilish mollari do'koni
  'household',    // Uy-ro'zg'or buyumlari do'koni
  'sport',        // Sport jihozlari do'koni
  'accessories'   // Aksessuarlar do'koni
];

export const isDebtsSupportedStoreType = (type) => {
  if (!type) return true;
  const normalized = String(type).trim().toLowerCase();

  // 1. Telefon do'koni
  if (normalized === 'phone' || normalized.includes('telefon') || normalized.includes('smartfon')) {
    return false;
  }
  // 2. Kosmetika do'koni
  if (normalized === 'cosmetics' || normalized.includes('kosmetika') || normalized.includes('beauty')) {
    return false;
  }
  // 3. Qurilish mollari do'koni
  if (normalized === 'construction' || normalized.includes('qurilish') || normalized.includes('building')) {
    return false;
  }
  // 4. Uy-ro'zg'or buyumlari do'koni
  if (
    normalized === 'household' ||
    normalized.includes('ro‘zg‘or') ||
    normalized.includes('rozgor') ||
    normalized.includes('uy-ro') ||
    normalized.includes('uy ro')
  ) {
    return false;
  }
  // 5. Sport jihozlari do'koni
  if (normalized === 'sport' || normalized.includes('sport')) {
    return false;
  }
  // 6. Aksessuarlar do'koni
  if (normalized === 'accessories' || normalized.includes('aksessuar') || normalized.includes('aksesuar')) {
    return false;
  }

  return true;
};

// Muddatli to‘lov (Installments) faqat 4 ta do'kon turida ruxsat etilgan:
// 1. Telefon do'koni
// 2. Qurilish mollari do'koni
// 3. Uy-ro'zg'or buyumlari do'koni
// 4. Sport jihozlari do'koni
export const INSTALLMENT_ALLOWED_STORE_TYPES = [
  'phone',        // Telefon do'koni
  'construction', // Qurilish mollari do'koni
  'household',    // Uy-ro'zg'or buyumlari do'koni
  'sport'         // Sport jihozlari do'koni
];

export const isInstallmentSupportedStoreType = (type) => {
  if (!type) return false;
  const normalized = String(type).trim().toLowerCase();

  // 1. Telefon do'koni
  if (normalized === 'phone' || normalized.includes('telefon') || normalized.includes('smartfon')) {
    return true;
  }
  // 2. Qurilish mollari do'koni
  if (normalized === 'construction' || normalized.includes('qurilish') || normalized.includes('building')) {
    return true;
  }
  // 3. Uy-ro'zg'or buyumlari do'koni
  if (
    normalized === 'household' ||
    normalized.includes('ro‘zg‘or') ||
    normalized.includes('rozgor') ||
    normalized.includes('uy-ro') ||
    normalized.includes('uy ro')
  ) {
    return true;
  }
  // 4. Sport jihozlari do'koni
  if (normalized === 'sport' || normalized.includes('sport')) {
    return true;
  }

  // Qolgan 5 ta do'kon turida mutlaqo ko'rinmaydi:
  // food (Oziq-ovqat), clothing (Kiyim-kechak), cosmetics (Kosmetika), accessories (Aksessuarlar), flower (Gul)
  return false;
};

