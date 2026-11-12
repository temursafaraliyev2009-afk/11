// src/components/QuickActionModal.jsx
import React, { useState, useEffect } from 'react';
import { ModalPortal } from './ModalPortal';
import {
  X,
  ShoppingCart,
  UserPlus,
  Package,
  ShoppingBag,
  Banknote,
  CreditCard,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { StoreIcon } from './StoreIcon';

export const QuickActionModal = ({ type, isOpen, onClose }) => {
  const { user } = useAuth();
  const { products, addSale, addDebt, addProduct, addOrder, storeConfig, employees, currentStore, currentUserName, isDebtsAllowed } = useStore();
  const { t } = useLanguage();
  const { notifySuccess } = useToast();

  const sellerName = user?.displayName || user?.firstName || (user?.email ? user.email.split('@')[0] : '') || currentUserName || 'Foydalanuvchi';

  // State for Sale
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id || '');
  const [saleQty, setSaleQty] = useState(1);
  const [paymentType, setPaymentType] = useState('Naqd');

  // State for Debt
  const [debtName, setDebtName] = useState('');
  const [debtPhone, setDebtPhone] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtNote, setDebtNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  // State for Product
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState(storeConfig.categories[0] || '');
  const [prodUnit, setProdUnit] = useState(storeConfig.units[0] || 'dona');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodStock, setProdStock] = useState('');

  // Dynamic store-specific fields
  const [prodBrand, setProdBrand] = useState('');
  const [prodModel, setProdModel] = useState('');
  const [prodStorage, setProdStorage] = useState('');
  const [prodRam, setProdRam] = useState('');
  const [prodColor, setProdColor] = useState('');
  const [prodImei, setProdImei] = useState('');
  const [prodWarranty, setProdWarranty] = useState('12');
  const [prodSize, setProdSize] = useState('');
  const [prodGender, setProdGender] = useState('Uniseks');
  const [prodMaterial, setProdMaterial] = useState('');
  const [prodExpiryDate, setProdExpiryDate] = useState('');
  const [prodVolume, setProdVolume] = useState('');
  const [prodWholesalePrice, setProdWholesalePrice] = useState('');
  const [prodSportType, setProdSportType] = useState('');
  const [prodCompatibility, setProdCompatibility] = useState('');
  const [prodFlowerType, setProdFlowerType] = useState('');
  const [prodDelivery, setProdDelivery] = useState('Mavjud');

  // State for Order
  const [orderProduct, setOrderProduct] = useState('');
  const [orderSupplier, setOrderSupplier] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [orderTotal, setOrderTotal] = useState('');
  const [orderStatus, setOrderStatus] = useState('Hali yo‘lda');

  if (!isOpen || !type || (type === 'debt' && !isDebtsAllowed)) return null;

  const currentProdObj = products.find(p => p.id === selectedProduct) || products[0];
  const storeType = currentStore?.type || storeConfig?.id || 'food';

  const handleSaleSubmit = (e) => {
    e.preventDefault();
    if (!currentProdObj) return;
    addSale({
      productId: currentProdObj.id,
      productName: currentProdObj.name,
      qty: Number(saleQty),
      unit: currentProdObj.unit,
      price: currentProdObj.price,
      costPrice: currentProdObj.costPrice,
      seller: sellerName,
      paymentType: paymentType
    }, sellerName);
    notifySuccess(t('saleSuccessTitle', 'Savdo saqlandi!'), `${currentProdObj.name} (${saleQty} ${currentProdObj.unit || 'dona'}) savdosi amalga oshirildi.`);
    onClose();
  };

  const handleDebtSubmit = (e) => {
    e.preventDefault();
    if (!debtName || !debtAmount) return;
    addDebt({
      name: debtName,
      phone: debtPhone,
      amount: Number(debtAmount),
      note: debtNote,
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    });
    notifySuccess(t('debtSuccessTitle', 'Qarz qo‘shildi!'), `${debtName} nomiga ${Number(debtAmount).toLocaleString()} so‘m qarz ro‘yxatga olindi.`);
    onClose();
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    if (!prodName || !prodPrice) return;
    addProduct({
      name: prodName,
      category: prodCategory,
      unit: prodUnit,
      price: Number(prodPrice),
      costPrice: Number(prodCost) || Math.round(Number(prodPrice) * 0.75),
      stock: Number(prodStock) || 1,
      // Dynamic store-type specific data
      brand: prodBrand || undefined,
      model: prodModel || undefined,
      storage: prodStorage || undefined,
      ram: prodRam || undefined,
      color: prodColor || undefined,
      imei: prodImei || undefined,
      warranty: prodWarranty || undefined,
      size: prodSize || undefined,
      gender: prodGender || undefined,
      material: prodMaterial || undefined,
      expiryDate: prodExpiryDate || undefined,
      volume: prodVolume || undefined,
      wholesalePrice: prodWholesalePrice ? Number(prodWholesalePrice) : undefined,
      sportType: prodSportType || undefined,
      compatibility: prodCompatibility || undefined,
      flowerType: prodFlowerType || undefined,
      delivery: prodDelivery || undefined
    });
    notifySuccess(t('prodSuccessTitle', 'Mahsulot qo‘shildi!'), `"${prodName}" omborga muvaffaqiyatli kiritildi.`);
    onClose();
  };

  const handleOrderSubmit = (e) => {
    e.preventDefault();
    if (!orderProduct || !orderSupplier) return;
    addOrder({
      product: orderProduct,
      supplier: orderSupplier,
      customerName: orderSupplier,
      qty: orderQty || '10 dona',
      total: Number(orderTotal) || 0,
      status: orderStatus
    });
    notifySuccess(t('orderSuccessTitle', 'Buyurtma saqlandi!'), `"${orderProduct}" uchun buyurtma ro‘yxatga olindi.`);
    onClose();
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-3">
            {type === 'sale' && (
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <ShoppingCart className="w-5 h-5" />
              </div>
            )}
            {type === 'debt' && (
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <UserPlus className="w-5 h-5" />
              </div>
            )}
            {type === 'product' && (
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                <Package className="w-5 h-5" />
              </div>
            )}
            {type === 'order' && (
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
            )}

            <div>
              <h3 className="font-black text-slate-900 text-base">
                {type === 'sale' && t('newSaleAction', 'Yangi Savdo Qilish')}
                {type === 'debt' && t('addDebtAction', 'Yangi Qarz Kiritish')}
                {type === 'product' && t('addProductAction', 'Mahsulot Qo‘shish')}
                {type === 'order' && t('btnAddOrder', 'Yetkazib Beruvchiga Buyurtma')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <span>{currentStore?.name || storeConfig.name}</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. SALE FORM */}
        {type === 'sale' && (
          <form onSubmit={handleSaleSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('colProduct', 'Mahsulotni tanlang')} *</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.price?.toLocaleString()} {t('sum', 'so‘m')} ({p.stock} {p.unit || t('unitPiece', 'dona')})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('colStock', 'Miqdor')} ({currentProdObj?.unit || t('unitPiece', 'dona')})
                </label>
                <input
                  type="number"
                  min="1"
                  max={currentProdObj?.stock || 999}
                  required
                  value={saleQty}
                  onChange={(e) => setSaleQty(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('paymentTypesTitle', 'To‘lov turi')}</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Naqd">{t('kpiCash', 'Naqd pul')}</option>
                  <option value="Karta">{t('kpiCard', 'Karta (UzCard/Humo)')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('navSeller', 'Sotuvchi')}</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={sellerName}
                  className="w-full p-3 bg-slate-100 border border-slate-200 rounded-2xl font-semibold text-slate-700 cursor-not-allowed select-none focus:outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col justify-center">
                <span className="text-[10px] text-emerald-700 font-extrabold uppercase">Jami hisob:</span>
                <span className="text-base font-black text-emerald-800 mt-0.5">
                  {((Number(saleQty) || 0) * (currentProdObj?.price || 0)).toLocaleString()} {t('sum', 'so‘m')}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all mt-2 cursor-pointer"
            >
              {t('confirm', 'Savdoni Tasdiqlash')}
            </button>
          </form>
        )}

        {/* 2. DEBT FORM */}
        {type === 'debt' && (
          <form onSubmit={handleDebtSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t('debtorNameLabel', 'Qarzdor mijoz ismi')} *
              </label>
              <input
                type="text"
                required
                placeholder="Masalan: Jamshid Aliyev"
                value={debtName}
                onChange={(e) => setDebtName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('debtorPhoneLabel', 'Telefon raqami')}
                </label>
                <input
                  type="text"
                  placeholder="+998 90 123 45 67"
                  value={debtPhone}
                  onChange={(e) => setDebtPhone(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('debtAmountInputLabel', 'Qarz summasi (so‘m)')} *
                </label>
                <input
                  type="number"
                  required
                  placeholder="80000"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('dueDateLabel', 'To‘lash muddati')}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('debtNoteLabel', 'Izoh / Mahsulotlar')}
                </label>
                <input
                  type="text"
                  placeholder="Tovar xaridi..."
                  value={debtNote}
                  onChange={(e) => setDebtNote(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-amber-500/25 transition-all mt-2 cursor-pointer"
            >
              {t('btnAddDebt', 'Qarzni Kiritish')}
            </button>
          </form>
        )}

        {/* 3. PRODUCT FORM WITH STORE-SPECIFIC FIELDS */}
        {type === 'product' && (
          <form onSubmit={handleProductSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t('colProduct', 'Mahsulot nomi')} *
              </label>
              <input
                type="text"
                required
                placeholder={`Masalan: ${storeConfig.sampleProducts?.[0]?.name || 'Tovar nomi'}`}
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('colCategory', 'Kategoriya')}</label>
                <select
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {storeConfig.categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('fieldUnit', 'O‘lchov birligi')}</label>
                <select
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {storeConfig.units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('colPrice', 'Sotish narxi')} *</label>
                <input
                  type="number"
                  required
                  placeholder="15000"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('colCostPrice', 'Tannarxi')}</label>
                <input
                  type="number"
                  placeholder="12000"
                  value={prodCost}
                  onChange={(e) => setProdCost(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('colStock', 'Miqdor')} *</label>
                <input
                  type="number"
                  required
                  placeholder="20"
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* DYNAMIC FIELDS PER STORE TYPE */}
            {storeConfig.id === 'phone' && (
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-3">
                <div className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <StoreIcon type="phone" className="w-4 h-4 text-blue-600" />
                  <span>{t('phoneStoreParams', 'Telefon do‘koni parametrlari')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldBrand', 'Brend')}</label>
                    <input
                      type="text"
                      placeholder="Apple, Samsung..."
                      value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldStorage', 'Xotira')}</label>
                    <input
                      type="text"
                      placeholder="128GB, 256GB..."
                      value={prodStorage}
                      onChange={(e) => setProdStorage(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldColor', 'Rangi')}</label>
                    <input
                      type="text"
                      placeholder="Black, Titanium..."
                      value={prodColor}
                      onChange={(e) => setProdColor(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldImei', 'IMEI')}</label>
                    <input
                      type="text"
                      placeholder="35897210..."
                      value={prodImei}
                      onChange={(e) => setProdImei(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {storeConfig.id === 'clothing' && (
              <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100 space-y-3">
                <div className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                  <StoreIcon type="clothing" className="w-4 h-4 text-purple-600" />
                  <span>{t('clothingParams', 'Kiyim-kechak parametrlari')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldSize', 'Razmer')}</label>
                    <input
                      type="text"
                      placeholder="S, M, L, XL..."
                      value={prodSize}
                      onChange={(e) => setProdSize(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldColor', 'Rangi')}</label>
                    <input
                      type="text"
                      placeholder="Oq, Qora..."
                      value={prodColor}
                      onChange={(e) => setProdColor(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldGender', 'Jins')}</label>
                    <select
                      value={prodGender}
                      onChange={(e) => setProdGender(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer"
                    >
                      <option value="Erkaklar">{t('genderMen', 'Erkaklar')}</option>
                      <option value="Ayollar">{t('genderWomen', 'Ayollar')}</option>
                      <option value="Bolalar">{t('genderKids', 'Bolalar')}</option>
                      <option value="Uniseks">{t('genderUnisex', 'Uniseks')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {storeConfig.id === 'cosmetics' && (
              <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-100 space-y-3">
                <div className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                  <StoreIcon type="cosmetics" className="w-4 h-4 text-rose-600" />
                  <span>{t('cosmeticsParams', 'Kosmetika maxsus parametrlari')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldVolume', 'Hajmi / Og‘irligi')}</label>
                    <input
                      type="text"
                      placeholder="50ml, 100g..."
                      value={prodVolume}
                      onChange={(e) => setProdVolume(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldExpiryDate', 'Yaroqlilik muddati')}</label>
                    <input
                      type="date"
                      value={prodExpiryDate}
                      onChange={(e) => setProdExpiryDate(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {storeConfig.id === 'flower' && (
              <div className="p-4 bg-pink-50/70 rounded-2xl border border-pink-100 space-y-3">
                <div className="text-xs font-black text-pink-900 flex items-center gap-1.5">
                  <StoreIcon type="flower" className="w-4 h-4 text-pink-600" />
                  <span>{t('flowerStoreParams', 'Gul do‘koni parametrlari')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldFlowerType', 'Gul turi')}</label>
                    <input
                      type="text"
                      placeholder="Atirgul, Lola..."
                      value={prodFlowerType}
                      onChange={(e) => setProdFlowerType(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('fieldDelivery', 'Yetkazish xizmati')}</label>
                    <select
                      value={prodDelivery}
                      onChange={(e) => setProdDelivery(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer"
                    >
                      <option value="Mavjud">{t('deliveryAvailable', 'Mavjud')}</option>
                      <option value="Olib ketish">{t('pickupOnly', 'Faqat do‘kondan olib ketish')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-blue-600/25 transition-all mt-2 cursor-pointer"
            >
              {t('btnAddProduct', 'Mahsulotni Saqlash')}
            </button>
          </form>
        )}

        {/* 4. ORDER FORM */}
        {type === 'order' && (
          <form onSubmit={handleOrderSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('colOrderProduct', 'Buyurtma tovari')} *</label>
              <input
                type="text"
                required
                placeholder="Masalan: Yangi partiya tovarlari"
                value={orderProduct}
                onChange={(e) => setOrderProduct(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('colOrderSupplier', 'Yetkazib beruvchi')} *</label>
                <input
                  type="text"
                  required
                  placeholder="Distribyutor nomi..."
                  value={orderSupplier}
                  onChange={(e) => setOrderSupplier(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('colOrderQty', 'Miqdori')}</label>
                <input
                  type="text"
                  placeholder={t('orderQtyPlaceholder', '50 dona / 10 qop')}
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('colOrderTotal', 'Jami summa (so‘m)')}</label>
                <input
                  type="number"
                  placeholder="750000"
                  value={orderTotal}
                  onChange={(e) => setOrderTotal(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('colOrderStatus', 'Holati')}</label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Hali yo‘lda">{t('orderStatusOnTheWay', 'Hali yo‘lda')}</option>
                  <option value="Yetkazildi">{t('orderStatusDelivered', 'Yetkazildi')}</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-purple-600/25 transition-all mt-2 cursor-pointer"
            >
              {t('btnAddOrder', 'Buyurtmani Tasdiqlash')}
            </button>
          </form>
        )}
      </div>
    </div>
    </ModalPortal>
  );
};
