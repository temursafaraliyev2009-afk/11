// test_undo_delete_all_entities.js
// SAVATCHI — Barcha o'chirish amallarida 5 soniyalik bekor qilish auditi
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('SAVATCHI — BARCHA BO‘LIMLARDA UNDO DELETE TESTLARI');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failCount++;
  }
}

// 1. ToastContext checks
const toastContextCode = fs.readFileSync(path.join(__dirname, 'src/context/ToastContext.jsx'), 'utf8');
assert(toastContextCode.includes('showUndoDelete'), 'ToastContext showUndoDelete funksiyasini eksport qilmoqda');
assert(toastContextCode.includes('UndoToastBanner'), 'ToastContext UndoToastBanner komponentiga ega');
assert(toastContextCode.includes('seconds = 5'), 'ToastContext sukut bo‘yicha 5 soniya taymeriga ega');
assert(toastContextCode.includes('Bekor qilish'), 'ToastContext "Bekor qilish" tugmasiga ega');

// 2. StoreContext checks
const storeContextCode = fs.readFileSync(path.join(__dirname, 'src/context/StoreContext.jsx'), 'utf8');
assert(storeContextCode.includes('pendingDeleteIds'), 'StoreContext pendingDeleteIds holatiga ega');
assert(storeContextCode.includes('isItemPendingDelete'), 'StoreContext isItemPendingDelete yordamchisiga ega');
assert(storeContextCode.includes('setItemPendingDelete'), 'StoreContext setItemPendingDelete yordamchisiga ega');
assert(storeContextCode.includes('deleteProduct'), 'StoreContext deleteProduct funksiyasiga ega');
assert(storeContextCode.includes('deleteDebt'), 'StoreContext deleteDebt funksiyasiga ega');
assert(storeContextCode.includes('deleteEmployee'), 'StoreContext deleteEmployee funksiyasiga ega');
assert(storeContextCode.includes('deleteOrder'), 'StoreContext deleteOrder funksiyasiga ega');
assert(storeContextCode.includes('deleteRental'), 'StoreContext deleteRental funksiyasiga ega');
assert(storeContextCode.includes('deleteInstallmentContract'), 'StoreContext deleteInstallmentContract funksiyasiga ega');

// 3. Inventory.jsx (Mahsulotlar)
const inventoryCode = fs.readFileSync(path.join(__dirname, 'src/pages/Inventory.jsx'), 'utf8');
assert(inventoryCode.includes('showUndoDelete'), 'Inventory.jsx showUndoDelete ishlatmoqda');
assert(inventoryCode.includes('isItemPendingDelete'), 'Inventory.jsx isItemPendingDelete bilan filtrlash qilmoqda');
assert(inventoryCode.includes('setItemPendingDelete'), 'Inventory.jsx setItemPendingDelete ishlatmoqda');
assert(inventoryCode.includes('deletingProduct'), 'Inventory.jsx deletingProduct modaliga ega');

// 4. Debts.jsx (Qarzlar)
const debtsCode = fs.readFileSync(path.join(__dirname, 'src/pages/Debts.jsx'), 'utf8');
assert(debtsCode.includes('showUndoDelete'), 'Debts.jsx showUndoDelete ishlatmoqda');
assert(debtsCode.includes('isItemPendingDelete'), 'Debts.jsx isItemPendingDelete bilan filtrlash qilmoqda');
assert(debtsCode.includes('setItemPendingDelete'), 'Debts.jsx setItemPendingDelete ishlatmoqda');
assert(debtsCode.includes('deletingDebt'), 'Debts.jsx deletingDebt modaliga ega');

// 5. Employees.jsx (Xodimlar)
const employeesCode = fs.readFileSync(path.join(__dirname, 'src/pages/Employees.jsx'), 'utf8');
assert(employeesCode.includes('showUndoDelete'), 'Employees.jsx showUndoDelete ishlatmoqda');
assert(employeesCode.includes('isItemPendingDelete'), 'Employees.jsx isItemPendingDelete bilan filtrlash qilmoqda');
assert(employeesCode.includes('setItemPendingDelete'), 'Employees.jsx setItemPendingDelete ishlatmoqda');
assert(employeesCode.includes('deletingStaff'), 'Employees.jsx deletingStaff modaliga ega');

// 6. Orders.jsx (Buyurtmalar)
const ordersCode = fs.readFileSync(path.join(__dirname, 'src/pages/Orders.jsx'), 'utf8');
assert(ordersCode.includes('showUndoDelete'), 'Orders.jsx showUndoDelete ishlatmoqda');
assert(ordersCode.includes('isItemPendingDelete'), 'Orders.jsx isItemPendingDelete bilan filtrlash qilmoqda');
assert(ordersCode.includes('setItemPendingDelete'), 'Orders.jsx setItemPendingDelete ishlatmoqda');
assert(ordersCode.includes('deletingOrder'), 'Orders.jsx deletingOrder modaliga ega');
assert(ordersCode.includes('activeOrders'), 'Orders.jsx activeOrders orqali statistika va filtrlashni hisoblamoqda');

// 7. Rentals.jsx (Arenda / Ijara yozuvlari)
const rentalsCode = fs.readFileSync(path.join(__dirname, 'src/pages/Rentals.jsx'), 'utf8');
assert(rentalsCode.includes('showUndoDelete'), 'Rentals.jsx showUndoDelete ishlatmoqda');
assert(rentalsCode.includes('isItemPendingDelete'), 'Rentals.jsx isItemPendingDelete bilan filtrlash qilmoqda');
assert(rentalsCode.includes('setItemPendingDelete'), 'Rentals.jsx setItemPendingDelete ishlatmoqda');
assert(rentalsCode.includes('deletingRental'), 'Rentals.jsx deletingRental modaliga ega');
assert(rentalsCode.includes('activeRentals'), 'Rentals.jsx activeRentals orqali statistika va filtrlashni hisoblamoqda');

// 8. Installments.jsx (Muddatli to‘lov shartnomalari)
const installmentsCode = fs.readFileSync(path.join(__dirname, 'src/pages/Installments.jsx'), 'utf8');
assert(installmentsCode.includes('showUndoDelete'), 'Installments.jsx showUndoDelete ishlatmoqda');
assert(installmentsCode.includes('isItemPendingDelete'), 'Installments.jsx isItemPendingDelete bilan filtrlash qilmoqda');
assert(installmentsCode.includes('setItemPendingDelete'), 'Installments.jsx setItemPendingDelete ishlatmoqda');
assert(installmentsCode.includes('deletingContract'), 'Installments.jsx deletingContract modaliga ega');
assert(installmentsCode.includes('activeInstallments'), 'Installments.jsx activeInstallments orqali tablar va filtrlashni hisoblamoqda');

// 9. InventoryPage.jsx (Sotuvchi Ombor sahifasi)
const invPageCode = fs.readFileSync(path.join(__dirname, 'src/pages/InventoryPage.jsx'), 'utf8');
assert(invPageCode.includes('showUndoDelete'), 'InventoryPage.jsx showUndoDelete ishlatmoqda');
assert(invPageCode.includes('pendingDeleteIds'), 'InventoryPage.jsx pendingDeleteIds bilan filtrlash qilmoqda');

console.log('\n====================================================');
console.log(`YAKUNIY NATIJA: ${passCount} ta PASS, ${failCount} ta FAIL`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
