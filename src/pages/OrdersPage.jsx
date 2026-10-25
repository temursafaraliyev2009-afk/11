import React from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Package, Clock, CheckCircle2, Truck, ShoppingBag, MapPin, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const OrdersPage = () => {
  const { orders, formatPrice, addToCart } = useCart();
  const { t } = useLanguage();

  const handleReorder = (orderItems) => {
    if (orderItems && orderItems.length > 0) {
      orderItems.forEach(item => addToCart(item, item.quantity || 1));
    }
  };

  return (
    <div className="min-h-screen py-8 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="pb-6 border-b border-gray-200 dark:border-gray-800">
        <Link to="/store/" className="inline-flex items-center space-x-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-2 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('backToCatalog', 'Katalogga qaytish')}</span>
        </Link>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center space-x-3">
          <Package className="w-7 h-7 text-emerald-500" />
          <span>{t('ordersHistoryTitle', 'Buyurtmalar Tarixi va Statusi')}</span>
          <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold px-3 py-1 rounded-full">
            {orders.length} {t('ordersCountSuffix', 'ta buyurtma')}
          </span>
        </h1>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mx-auto">
            <Package className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('noOrders', "Sizda hali buyurtmalar yo'q")}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            {t('noOrdersDesc', "Savatchani to'ldiring va express yetkazib berish xizmatimizdan foydalaning.")}
          </p>
          <Link
            to="/store/"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-colors"
          >
            {t('makeOrder', 'Buyurtma berish')}
          </Link>
        </div>
      ) : (
        <div className="space-y-6 pt-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6"
            >
              {/* Top info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-black text-gray-900 dark:text-white">
                      {t('orderNumber', 'Buyurtma')} #{order.id}
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{order.date}</span>
                    <span>•</span>
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{order.deliveryAddress}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-400">{t('totalToPay', "Jami to'lov:")}</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {formatPrice(order.total)}
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="bg-gray-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                  {t('deliveryStages', 'Yetkazib Berish Bosqichlari')}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center relative">
                  {/* Progress Line */}
                  <div className="absolute top-4 left-6 right-6 h-0.5 bg-emerald-500 z-0" />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 mt-1">{t('stageReceived', 'Qabul qilindi')}</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 mt-1">{t('stagePreparing', 'Tayyorlanmoqda')}</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow animate-pulse">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">{t('stageOnTheWay', 'Kuryer Yo‘lda')}</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-400 flex items-center justify-center font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-medium text-gray-400 mt-1">{t('stageDelivered', 'Yetkazildi')}</span>
                  </div>
                </div>
              </div>

              {/* Items List & Reorder */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {order.itemsCount || order.items?.length || 1} {t('orderItemsCount', 'ta mahsulot bor')}
                </div>

                {order.items && order.items.length > 0 && (
                  <button
                    onClick={() => handleReorder(order.items)}
                    className="bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white font-bold text-xs py-2 px-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center space-x-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('reorder', 'Qaytadan buyurtma berish')}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
