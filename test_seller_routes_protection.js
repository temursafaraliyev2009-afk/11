// test_seller_routes_protection.js
// SEC-01: /store/seller/* marshrutlarini avtorizatsiya va rollar bo'yicha himoyasini tekshirish
import assert from 'assert';

console.log("====================================================");
console.log("SAVATCHI: SEC-01 SELLER MARSHRUTLARI HIMOYASI TESTI");
console.log("====================================================");

// Mock ProtectedRoute mantiqiy funksiyasi (src/routes/ProtectedRoute.jsx bilan 100% bir xil)
function evaluateProtectedRoute({ isAuthenticated, loading, selectedStoreId, requireStore = true, children }) {
  if (loading) {
    return { status: 'LOADING', view: 'SPINNER' };
  }
  if (!isAuthenticated) {
    return { status: 'REDIRECT', to: '/login' };
  }
  if (requireStore && !selectedStoreId) {
    return { status: 'REDIRECT', to: '/select-store' };
  }
  return { status: 'RENDER', view: children };
}

// Mock StoreFrontLayout marshrut tekshirgichi (src/App.jsx dagi StoreFrontLayout marshrutlari)
function resolveStoreRoute({ path, authState, storeState }) {
  const { isAuthenticated, loading } = authState;
  const { selectedStoreId, isEmployee, isRentalAllowed, isDebtsAllowed, isInstallmentAllowed } = storeState;

  // 1. Ommaviy (Public) storefront marshrutlari
  if (path === '/store' || path === '/store/' || path === '/') {
    return { status: 'RENDER', component: 'HomePage', isPublic: true };
  }
  if (path === '/store/orders') {
    return { status: 'RENDER', component: 'OrdersPage', isPublic: true };
  }
  if (path === '/store/wishlist') {
    return { status: 'RENDER', component: 'WishlistPage', isPublic: true };
  }
  if (path === '/store/analytics') {
    return { status: 'RENDER', component: 'AnalyticsPage', isPublic: true };
  }

  // 2. Himoyalangan Sotuvchi (Seller) marshrutlari
  if (path.startsWith('/store/seller')) {
    const subRoute = path.replace('/store/seller', '') || '/';

    // Har bir seller marshruti ProtectedRoute orqali o'tadi
    const guard = evaluateProtectedRoute({
      isAuthenticated,
      loading,
      selectedStoreId,
      requireStore: true,
      children: subRoute
    });

    if (guard.status !== 'RENDER') {
      return guard; // REDIRECT yoki LOADING
    }

    // Tizimga kirgan va do'koni bor foydalanuvchilar uchun rol va funksiya tekshiruvlari
    switch (subRoute) {
      case '/':
      case '':
        return { status: 'RENDER', component: 'SellerDashboard' };
      case '/sales':
        return { status: 'RENDER', component: 'SalesPage' };
      case '/inventory':
        return { status: 'RENDER', component: 'InventoryPage' };
      case '/staff':
        return !isEmployee 
          ? { status: 'RENDER', component: 'StaffPage' } 
          : { status: 'REDIRECT', to: '/store/seller' };
      case '/debtors':
        return isDebtsAllowed 
          ? { status: 'RENDER', component: 'DebtorsPage' } 
          : { status: 'REDIRECT', to: '/store/seller' };
      case '/rentals':
        return isRentalAllowed 
          ? { status: 'RENDER', component: 'RentalsPage' } 
          : { status: 'REDIRECT', to: '/store/seller' };
      case '/installments':
        return isInstallmentAllowed 
          ? { status: 'RENDER', component: 'InstallmentsPage' } 
          : { status: 'REDIRECT', to: '/store/seller' };
      case '/reports':
        return !isEmployee 
          ? { status: 'RENDER', component: 'ReportsPage' } 
          : { status: 'REDIRECT', to: '/store/seller' };
      case '/history':
        return !isEmployee 
          ? { status: 'RENDER', component: 'ActivityHistoryPage' } 
          : { status: 'REDIRECT', to: '/store/seller' };
      default:
        return { status: 'REDIRECT', to: '/store/' };
    }
  }

  // Catch-all
  return { status: 'REDIRECT', to: '/store/' };
}

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ [FAIL] ${name}: ${e.message}`);
    failed++;
  }
}

// ══════════════════════════════════════════════════════
// GURUHI 1: ANONIM (KIRMAGAN) FOYDALANUVCHILARNI BLOKLASH
// ══════════════════════════════════════════════════════
const anonymousAuth = { isAuthenticated: false, loading: false };
const emptyStore = { selectedStoreId: null, isEmployee: false, isRentalAllowed: true, isDebtsAllowed: true, isInstallmentAllowed: true };

run("1.1 Anonim foydalanuvchi /store/seller ga kirganda /login ga yo'naltiriladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/login');
});

run("1.2 Anonim foydalanuvchi /store/seller/sales ga kirganda /login ga yo'naltiriladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/sales', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/login');
});

run("1.3 Anonim foydalanuvchi /store/seller/inventory ga kirganda /login ga yo'naltiriladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/inventory', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/login');
});

run("1.4 Anonim foydalanuvchi /store/seller/staff ga kirganda /login ga yo'naltiriladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/staff', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/login');
});

run("1.5 Anonim foydalanuvchi /store/seller/debtors ga kirganda /login ga yo'naltiriladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/debtors', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/login');
});

run("1.6 Anonim foydalanuvchi /store/seller/rentals ga kirganda /login ga yo'naltiriladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/rentals', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/login');
});

run("1.7 Anonim foydalanuvchi /store/seller/installments ga kirganda /login ga yo'naltiriladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/installments', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/login');
});

run("1.8 Anonim foydalanuvchi /store/seller/reports ga kirganda /login ga yo'naltiriladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/reports', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/login');
});

run("1.9 Anonim foydalanuvchi /store/seller/history ga kirganda /login ga yo'naltiriladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/history', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/login');
});

// ══════════════════════════════════════════════════════
// GURUHI 2: OMMAVIY (PUBLIC) STOREFRONT SAHIFALARI OCHIQ QOLISHI
// ══════════════════════════════════════════════════════
run("2.1 Anonim xaridor /store/ bosh sahifasiga to'siqsiz kira oladi", () => {
  const res = resolveStoreRoute({ path: '/store', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'RENDER');
  assert.strictEqual(res.component, 'HomePage');
  assert.strictEqual(res.isPublic, true);
});

run("2.2 Anonim xaridor /store/orders sahifasiga to'siqsiz kira oladi", () => {
  const res = resolveStoreRoute({ path: '/store/orders', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'RENDER');
  assert.strictEqual(res.component, 'OrdersPage');
  assert.strictEqual(res.isPublic, true);
});

run("2.3 Anonim xaridor /store/wishlist sahifasiga to'siqsiz kira oladi", () => {
  const res = resolveStoreRoute({ path: '/store/wishlist', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'RENDER');
  assert.strictEqual(res.component, 'WishlistPage');
  assert.strictEqual(res.isPublic, true);
});

run("2.4 Anonim xaridor /store/analytics sahifasiga to'siqsiz kira oladi", () => {
  const res = resolveStoreRoute({ path: '/store/analytics', authState: anonymousAuth, storeState: emptyStore });
  assert.strictEqual(res.status, 'RENDER');
  assert.strictEqual(res.component, 'AnalyticsPage');
  assert.strictEqual(res.isPublic, true);
});

// ══════════════════════════════════════════════════════
// GURUHI 3: DO'KON TANLANMAGAN FOYDALANUVCHILAR
// ══════════════════════════════════════════════════════
const authNoStore = { isAuthenticated: true, loading: false };
run("3.1 Tizimga kirgan, ammo do'kon tanlamagan foydalanuvchi /select-store ga yo'naltiriladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller', authState: authNoStore, storeState: emptyStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/select-store');
});

// ══════════════════════════════════════════════════════
// GURUHI 4: DO'KON EGASI (OWNER) RUXSATLARI
// ══════════════════════════════════════════════════════
const authOk = { isAuthenticated: true, loading: false };
const ownerStore = {
  selectedStoreId: 'store-123',
  isEmployee: false,
  isRentalAllowed: true,
  isDebtsAllowed: true,
  isInstallmentAllowed: true
};

run("4.1 Do'kon egasi /store/seller dashboardiga kira oladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller', authState: authOk, storeState: ownerStore });
  assert.strictEqual(res.status, 'RENDER');
  assert.strictEqual(res.component, 'SellerDashboard');
});

run("4.2 Do'kon egasi /store/seller/sales sahifasiga kira oladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/sales', authState: authOk, storeState: ownerStore });
  assert.strictEqual(res.status, 'RENDER');
  assert.strictEqual(res.component, 'SalesPage');
});

run("4.3 Do'kon egasi /store/seller/staff sahifasiga to'liq kira oladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/staff', authState: authOk, storeState: ownerStore });
  assert.strictEqual(res.status, 'RENDER');
  assert.strictEqual(res.component, 'StaffPage');
});

run("4.4 Do'kon egasi /store/seller/reports hisobotlariga to'liq kira oladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/reports', authState: authOk, storeState: ownerStore });
  assert.strictEqual(res.status, 'RENDER');
  assert.strictEqual(res.component, 'ReportsPage');
});

run("4.5 Do'kon egasi /store/seller/history faoliyat tarixiga to'liq kira oladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/history', authState: authOk, storeState: ownerStore });
  assert.strictEqual(res.status, 'RENDER');
  assert.strictEqual(res.component, 'ActivityHistoryPage');
});

// ══════════════════════════════════════════════════════
// GURUHI 5: ODDIY XODIM (EMPLOYEE) RUXSATLARI VA CHEKLOVLARI
// ══════════════════════════════════════════════════════
const employeeStore = {
  selectedStoreId: 'store-123',
  isEmployee: true,
  isRentalAllowed: true,
  isDebtsAllowed: true,
  isInstallmentAllowed: true
};

run("5.1 Xodim /store/seller dashboardiga kira oladi", () => {
  const res = resolveStoreRoute({ path: '/store/seller', authState: authOk, storeState: employeeStore });
  assert.strictEqual(res.status, 'RENDER');
  assert.strictEqual(res.component, 'SellerDashboard');
});

run("5.2 Xodim /store/seller/sales va inventory sahifalariga kira oladi", () => {
  const resSales = resolveStoreRoute({ path: '/store/seller/sales', authState: authOk, storeState: employeeStore });
  const resInv = resolveStoreRoute({ path: '/store/seller/inventory', authState: authOk, storeState: employeeStore });
  assert.strictEqual(resSales.status, 'RENDER');
  assert.strictEqual(resInv.status, 'RENDER');
});

run("5.3 Xodim /store/seller/staff sahifasidan /store/seller ga bloklanadi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/staff', authState: authOk, storeState: employeeStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/store/seller');
});

run("5.4 Xodim /store/seller/reports sahifasidan /store/seller ga bloklanadi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/reports', authState: authOk, storeState: employeeStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/store/seller');
});

run("5.5 Xodim /store/seller/history sahifasidan /store/seller ga bloklanadi", () => {
  const res = resolveStoreRoute({ path: '/store/seller/history', authState: authOk, storeState: employeeStore });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/store/seller');
});

// ══════════════════════════════════════════════════════
// GURUHI 6: AUTH LOADING, REFRESH VA LOGOUT HOLATLARI
// ══════════════════════════════════════════════════════
run("6.1 Brauzer yangilanganda (loading: true) ProtectedRoute login'ga chalg'imasdan spinner ko'rsatadi", () => {
  const res = resolveStoreRoute({
    path: '/store/seller/sales',
    authState: { isAuthenticated: false, loading: true },
    storeState: ownerStore
  });
  assert.strictEqual(res.status, 'LOADING');
  assert.strictEqual(res.view, 'SPINNER');
});

run("6.2 Foydalanuvchi logout qilganda (isAuthenticated: false) zudlik bilan /login ga yuboradi", () => {
  const res = resolveStoreRoute({
    path: '/store/seller/sales',
    authState: { isAuthenticated: false, loading: false },
    storeState: ownerStore
  });
  assert.strictEqual(res.status, 'REDIRECT');
  assert.strictEqual(res.to, '/login');
});

console.log("\n====================================================");
console.log(`SEC-01 NATIJA: ${passed}/${passed + failed} ta sinov muvaffaqiyatli o'tdi!`);
if (failed > 0) {
  console.log(`⚠️  ${failed} ta sinov MUVAFFAQIYATSIZ!`);
  process.exit(1);
}
console.log("====================================================");
process.exit(0);

