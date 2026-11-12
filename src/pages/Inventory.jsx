import React, { useState, useEffect } from 'react';
import { ModalPortal } from '../components/ModalPortal';
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit3,
  Filter,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Coins,
  Tag,
  Shield,
  Layers,
  X
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { QuickActionModal } from '../components/QuickActionModal';
import { StoreIcon } from '../components/StoreIcon';

export const Inventory = () => {
  const {
    products,
    updateProduct,
    adjustStock,
    deleteProduct,
    storeConfig,
    currentStore,
    searchTargetItem,
    setSearchTargetItem,
    isItemPendingDelete,
    setItemPendingDelete
  } = useStore();

  const { t } = useLanguage();
  const { notifySuccess, notifyDelete, showUndoDelete } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortByPrice, setSortByPrice] = useState('default');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  useEffect(() => {
    if (searchTargetItem && searchTargetItem.type === 'product') {
      const prodName = searchTargetItem.name || searchTargetItem.item?.name || '';
      setSearchQuery(prodName);
      setSelectedCategory('all');
      setSelectedStatus('all');
      if (searchTargetItem.item) {
        const fresh = products.find(p => p.id === searchTargetItem.id || p.name === prodName) || searchTargetItem.item;
        setEditingProduct(fresh);
      }
      setSearchTargetItem(null);
    }
  }, [searchTargetItem, products, setSearchTargetItem]);

  // Faol (o'chirish jarayonida bo'lmagan) mahsulotlar ro'yxati
  const activeProducts = products.filter(p => !isItemPendingDelete(p.id));

  // Stats calculation
  const totalProductsCount = activeProducts.length;
  const lowStockCount = activeProducts.filter(p => p.status === 'Kam').length;
  const outOfStockCount = activeProducts.filter(p => p.status === 'Tugagan' || Number(p.stock) === 0).length;
  const totalInventoryValue = activeProducts.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);

  // Filter & Sort
  let filteredProducts = activeProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.imei && p.imei.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (sortByPrice === 'asc') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortByPrice === 'desc') {
    filteredProducts.sort((a, b) => b.price - a.price);
  }

  const getStatusBadge = (status) => {
    if (status === 'Yetarli') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
    if (status === 'Kam') {
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
    return 'bg-rose-50 text-rose-700 border border-rose-200';
  };

  const getStatusLabel = (status) => {
    if (status === 'Yetarli') return t('statusInStock', 'Yetarli');
    if (status === 'Kam') return t('statusLow', 'Kam qolgan');
    return t('statusOut', 'Tugagan');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct(editingProduct.id, {
      name: editingProduct.name,
      price: Number(editingProduct.price),
      costPrice: Number(editingProduct.costPrice) || Math.round(Number(editingProduct.price) * 0.75),
      stock: Number(editingProduct.stock),
      unit: editingProduct.unit,
      category: editingProduct.category,
      brand: editingProduct.brand,
      storage: editingProduct.storage,
      ram: editingProduct.ram,
      color: editingProduct.color,
      imei: editingProduct.imei,
      size: editingProduct.size,
      gender: editingProduct.gender,
      material: editingProduct.material,
      expiryDate: editingProduct.expiryDate,
      volume: editingProduct.volume,
    });
    notifySuccess(t('prodUpdated', 'Mahsulot yangilandi'), `"${editingProduct.name}" muvaffaqiyatli saqlandi.`);
    setEditingProduct(null);
  };

  const storeType = currentStore?.type || storeConfig?.id || 'food';

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans select-none max-w-[1600px] mx-auto">
      {/* Top Header & Add Product Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>{t('inventoryTitle', 'OMBOR VA ZAXIRALAR')}</span>
            <span className="text-xs font-black px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 shadow-xs">
              {currentStore?.name || storeConfig.name}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            {t('inventoryManagementSubtitle', 'Mahsulot qoldig‘i va ombor qiymatini nazorat qiling.')}
          </p>
        </div>

        <button
          onClick={() => setIsAddProductOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>{t('btnAddProduct', 'Mahsulot qo‘shish')}</span>
        </button>
      </div>

      {/* 4 Inventory Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Jami mahsulotlar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {t('statTotalProducts', 'Jami mahsulotlar')}
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
              {totalProductsCount} <span className="text-sm font-bold text-slate-400">{t('itemsUnit', 'xil')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 2: Kam qolgan */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {t('statLowStock', 'Kam qolgan')}
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-amber-600 tracking-tight">
              {lowStockCount} <span className="text-sm font-bold text-amber-500">{t('itemsUnit', 'ta tovar')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 3: Tugagan */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {t('statOutOfStock', 'Tugagan')}
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-rose-600 tracking-tight">
              {outOfStockCount} <span className="text-sm font-bold text-rose-500">{t('itemsUnit', 'ta tovar')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <XCircle className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 4: Ombor qiymati */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {t('statInventoryValue', 'Ombor umumiy qiymati')}
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-emerald-600 tracking-tight">
              {totalInventoryValue.toLocaleString()} <span className="text-sm font-bold text-emerald-600/70">{t('sum', 'so‘m')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <Coins className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* Search & Dynamic Filter Row */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('search', 'Mahsulot qidirish...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">{t('filterAllCategories', 'Barcha kategoriyalar')}</option>
            {storeConfig.categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">{t('filterAllStatuses', 'Barcha holatlar')}</option>
            <option value="Yetarli">{t('statusInStock', 'Yetarli')}</option>
            <option value="Kam">{t('statusLow', 'Kam qolgan')}</option>
            <option value="Tugagan">{t('statusOut', 'Tugagan')}</option>
          </select>

          {/* Price Sorting */}
          <select
            value={sortByPrice}
            onChange={(e) => setSortByPrice(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="default">{t('sortDefault', 'Standart tartib')}</option>
            <option value="asc">{t('sortPriceAsc', 'Avval arzonlari')}</option>
            <option value="desc">{t('sortPriceDesc', 'Avval qimmatlari')}</option>
          </select>
        </div>
      </div>

      {/* Main Inventory Table with Store-Specific Dynamic Columns */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm font-sans">
            <thead>
              <tr className="bg-slate-50/90 text-slate-400 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200/80">
                <th className="py-4 px-6">{t('colProduct', 'Mahsulot')}</th>
                <th className="py-4 px-6">{t('colCategory', 'Kategoriya')}</th>
                <th className="py-4 px-6">{t('colStock', 'Qoldiq')}</th>
                <th className="py-4 px-6">{t('colPrice', 'Sotish narxi')}</th>
                <th className="py-4 px-6">{t('colCostPrice', 'Tannarx')}</th>
                <th className="py-4 px-6">{t('colStatus', 'Holat')}</th>
                <th className="py-4 px-6 text-right">{t('actions', 'Amallar')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-slate-400 font-semibold text-sm">
                    {t('error', 'Hech qanday mahsulot topilmadi')}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/70">
                          <StoreIcon type={storeType} className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm leading-snug">{p.name}</div>
                          {p.brand && (
                            <div className="text-[11px] font-bold text-blue-600">
                              {p.brand} {p.model ? `• ${p.model}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold inline-block">
                        {p.category}
                      </span>
                    </td>

                    {/* Stock with quick +/- buttons */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => adjustStock(p.id, -1)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={t('quickStockDecrease', 'Kamaytirish')}
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>
                        <span className="font-black text-slate-900 text-sm min-w-[36px] text-center">
                          {p.stock}
                        </span>
                        <button
                          onClick={() => adjustStock(p.id, 1)}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title={t('quickStockIncrease', 'Oshirish')}
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                        <span className="text-slate-400 text-xs font-semibold">{p.unit || t('unitPiece', 'dona')}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-black text-slate-900 text-sm">
                      {Number(p.price).toLocaleString()} {t('sum', 'so‘m')}
                    </td>

                    <td className="py-4 px-6 font-semibold text-slate-500 text-xs">
                      {p.costPrice ? `${Number(p.costPrice).toLocaleString()} ${t('sum', 'so‘m')}` : '—'}
                    </td>

                    <td className="py-4 px-6">
                      <span className={`text-[11px] font-extrabold px-3 py-1 rounded-xl inline-block ${getStatusBadge(p.status)}`}>
                        {getStatusLabel(p.status)}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingProduct({ ...p })}
                          className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title={t('edit', 'Tahrirlash')}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(p)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={t('delete', 'O‘chirish')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <ModalPortal>
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="font-black text-slate-900 text-base sm:text-lg">
                {t('editProductModalTitle', 'Mahsulotni tahrirlash')}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('colProduct', 'Mahsulot nomi')} *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('colCategory', 'Kategoriya')}</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {storeConfig.categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('fieldUnit', 'O‘lchov birligi')}</label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {storeConfig.units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('colPrice', 'Sotish narxi (so‘m)')} *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {t('colStock', 'Qoldiq miqdori')} *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t('cancel', 'Bekor qilish')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                >
                  {t('save', 'Saqlash')}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <ModalPortal>
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                {t('deleteProductConfirmTitle', 'Mahsulotni o‘chirishni tasdiqlaysizmi?')}
              </h3>
              <p className="text-xs text-slate-600 font-semibold">{deletingProduct.name}</p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                {t('cancel', 'Bekor qilish')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetProduct = deletingProduct;
                  setDeletingProduct(null);
                  if (!targetProduct || isItemPendingDelete(targetProduct.id)) return;

                  // 1. Vaqtincha interfeysdan yashirish (bazaga tegilmaydi)
                  setItemPendingDelete(targetProduct.id, true);

                  // 2. 5 soniyalik bekor qilish bildirishnomasini ko'rsatish
                  showUndoDelete({
                    title: 'Mahsulot o‘chirilmoqda...',
                    seconds: 5,
                    successMessage: 'Mahsulot muvaffaqiyatli o‘chirildi.',
                    onUndo: () => {
                      setItemPendingDelete(targetProduct.id, false);
                    },
                    onCommit: async () => {
                      try {
                        deleteProduct(targetProduct.id);
                        setItemPendingDelete(targetProduct.id, false);
                      } catch (err) {
                        setItemPendingDelete(targetProduct.id, false);
                        throw err;
                      }
                    }
                  });
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
              >
                {t('delete', 'O‘chirish')}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Add Product Modal */}
      <QuickActionModal
        type="product"
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
      />
    </div>
  );
};
