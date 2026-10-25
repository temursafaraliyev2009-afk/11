// src/pages/Orders.jsx
import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Trash2,
  Receipt,
  Truck,
  Clock,
  CheckCircle2,
  Package,
  Calendar,
  Building,
  Check
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { QuickActionModal } from '../components/QuickActionModal';
import { StoreIcon } from '../components/StoreIcon';

export const Orders = () => {
  const {
    orders = [],
    updateOrderStatus,
    deleteOrder,
    currentStore,
    storeConfig,
    searchTargetItem,
    setSearchTargetItem
  } = useStore();
  const { t } = useLanguage();
  const { notifyInfo, notifyDelete, notifySuccess } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'Hali yo‘lda' | 'Yetkazildi'
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);

  useEffect(() => {
    if (searchTargetItem && searchTargetItem.type === 'order') {
      const orderId = searchTargetItem.id || searchTargetItem.item?.id || searchTargetItem.name || '';
      setSearchQuery(orderId);
      setFilterStatus('all');
      setSearchTargetItem(null);
    }
  }, [searchTargetItem, setSearchTargetItem]);

  // Statistics
  const totalOrdersCount = orders.length;
  const onTheWayCount = orders.filter(o => o.status !== 'Yetkazildi' && o.status !== 'Bekor qilindi').length;
  const deliveredCount = orders.filter(o => o.status === 'Yetkazildi').length;
  const totalOrderSum = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const filteredOrders = orders.filter(o => {
    const customer = String(o.supplier || o.customerName || '');
    const productStr = String(o.product || (Array.isArray(o.items) ? o.items.map(i => i.name).join(', ') : '') || '');
    const idStr = String(o.id || '');
    const q = (searchQuery || '').toLowerCase().trim();

    const matchesSearch = !q ||
                          productStr.toLowerCase().includes(q) ||
                          customer.toLowerCase().includes(q) ||
                          idStr.toLowerCase().includes(q);

    let matchesFilter = true;
    if (filterStatus === 'Hali yo‘lda') {
      matchesFilter = o.status !== 'Yetkazildi' && o.status !== 'Bekor qilindi';
    } else if (filterStatus === 'Yetkazildi') {
      matchesFilter = o.status === 'Yetkazildi';
    }

    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    if (status === 'Yetkazildi') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
    if (status === 'Bekor qilindi') {
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    }
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  };

  const getStatusLabel = (status) => {
    if (status === 'Yetkazildi') return t('orderStatusDelivered', 'Yetkazildi');
    if (status === 'Bekor qilindi') return t('orderStatusCancelled', 'Bekor qilindi');
    return t('orderStatusOnTheWay', 'Hali yo‘lda');
  };

  const storeType = currentStore?.type || storeConfig?.id || 'food';

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans select-none max-w-[1600px] mx-auto">
      {/* Top Header & New Order Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>{t('ordersPageTitle', 'BUYURTMALAR')}</span>
            <span className="text-xs font-black px-3 py-1 bg-purple-50 text-purple-700 rounded-xl border border-purple-200 shadow-xs">
              {currentStore?.name || storeConfig?.name || ''}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Buyurtmalar holati va yetkazib berilishini kuzating.
          </p>
        </div>

        <button
          onClick={() => setIsAddOrderOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>{t('btnAddOrder', 'Buyurtma qo‘shish')}</span>
        </button>
      </div>

      {/* 4 Orders Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Jami buyurtmalar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {t('statTotalOrders', 'Jami buyurtmalar')}
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
              {totalOrdersCount} <span className="text-sm font-bold text-slate-400">{t('itemsUnit', 'ta')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 shrink-0 group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 2: Hali yo'lda */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {t('statOnTheWay', 'Hali yo‘lda')}
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-amber-600 tracking-tight">
              {onTheWayCount} <span className="text-sm font-bold text-amber-500">{t('itemsUnit', 'ta')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 3: Yetkazildi */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {t('statDelivered', 'Yetkazildi')}
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-emerald-600 tracking-tight">
              {deliveredCount} <span className="text-sm font-bold text-emerald-600/70">{t('itemsUnit', 'ta')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 4: Jami summa */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {t('statTotalOrderSum', 'Jami buyurtma summasi')}
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
              {totalOrderSum.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('sum', 'so‘m')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform">
            <Receipt className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('search', 'Mahsulot yoki yetkazib beruvchi qidirish...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('filterAllOrders', 'Barcha buyurtmalar')} ({orders.length})
          </button>
          <button
            onClick={() => setFilterStatus('Hali yo‘lda')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              filterStatus === 'Hali yo‘lda'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('filterOnTheWay', 'Faqat yo‘ldagilar')} ({onTheWayCount})
          </button>
          <button
            onClick={() => setFilterStatus('Yetkazildi')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              filterStatus === 'Yetkazildi'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('filterDelivered', 'Faqat yetkazilganlar')} ({deliveredCount})
          </button>
        </div>
      </div>

      {/* Main Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm font-sans">
            <thead>
              <tr className="bg-slate-50/90 text-slate-400 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200/80">
                <th className="py-4 px-6">{t('colOrderId', 'Buyurtma ID')}</th>
                <th className="py-4 px-6">{t('colOrderProduct', 'Mahsulot')}</th>
                <th className="py-4 px-6">{t('colOrderSupplier', 'Yetkazib beruvchi')}</th>
                <th className="py-4 px-6">{t('date', 'Sana')}</th>
                <th className="py-4 px-6">{t('colOrderQty', 'Miqdor')}</th>
                <th className="py-4 px-6">{t('colOrderTotal', 'Summa')}</th>
                <th className="py-4 px-6">{t('colOrderStatus', 'Holat')}</th>
                <th className="py-4 px-6 text-right">{t('actions', 'Amallar')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-16 text-slate-400 font-semibold text-sm">
                    {t('error', 'Hech qanday buyurtma topilmadi')}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-blue-600 text-xs">
                      {o.id}
                      {o.type === 'customer' && (
                        <span className="block mt-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg w-fit">
                          {t('onlineStoreBadge', 'Onlayn Do‘kon')}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">
                            {o.product || (Array.isArray(o.items) && o.items.length > 0 ? o.items.map(i => `${i.name} (x${i.quantity || 1})`).join(', ') : t('orderNumber', 'Buyurtma'))}
                          </div>
                          {o.deliveryAddress && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {o.deliveryAddress}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2 text-slate-700 font-semibold">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{o.supplier || o.customerName || t('supplierOrCustomer', 'Ta’minotchi / Xaridor')}</span>
                      </div>
                      {o.phone && (
                        <div className="text-[11px] text-slate-400 pl-5">
                          {o.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {o.date || t('today', 'Bugun')}
                    </td>

                    <td className="py-4 px-6 font-bold text-slate-700">
                      {o.qty || (Array.isArray(o.items) ? `${o.items.length} ${t('typesCountSuffix', 'xil')}` : `1 ${t('unitPiece', 'dona')}`)}
                    </td>

                    <td className="py-4 px-6 font-black text-slate-900 text-sm">
                      {Number(o.total || 0).toLocaleString()} {t('sum', 'so‘m')}
                    </td>

                    <td className="py-4 px-6">
                      <select
                        value={o.status || 'Hali yo‘lda'}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          updateOrderStatus(o.id, newStatus);
                          notifyInfo(t('orderStatusUpdated', 'Holat yangilandi'), `Buyurtma #${o.id} holati "${newStatus}" deb o‘zgartirildi.`);
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer focus:outline-none ${getStatusBadge(o.status)}`}
                      >
                        <option value="Hali yo‘lda">{t('orderStatusOnTheWay', 'Hali yo‘lda')}</option>
                        <option value="Yetkazildi">{t('orderStatusDelivered', 'Yetkazildi')}</option>
                        <option value="Bekor qilindi">{t('orderStatusCancelled', 'Bekor qilindi')}</option>
                      </select>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          deleteOrder(o.id);
                          notifyDelete(t('orderDeleted', 'Buyurtma o‘chirildi'), `Buyurtma #${o.id} muvaffaqiyatli o‘chirildi.`);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={t('delete', 'O‘chirish')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Order Modal */}
      <QuickActionModal
        type="order"
        isOpen={isAddOrderOpen}
        onClose={() => setIsAddOrderOpen(false)}
      />
    </div>
  );
};
