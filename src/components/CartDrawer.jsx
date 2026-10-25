import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight, Tag, Truck, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const CartDrawer = () => {
  const { t, tProduct } = useLanguage();
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartSubtotal,
    discountAmount,
    cartTotal,
    formatPrice,
    applyPromoCode,
    appliedCoupon,
    setIsCheckoutOpen
  } = useCart();

  const [couponInput, setCouponInput] = useState('');

  if (!isCartOpen) return null;

  const freeShippingThreshold = 300000;
  const progressToFreeShipping = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (couponInput) {
      applyPromoCode(couponInput);
      setCouponInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('yourCart', 'Sizning Savatchangiz')}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{cart.length} {t('cartItemsSelected', 'xil mahsulot tanlandi')}</p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="px-5 py-3 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {remainingForFreeShipping === 0
                  ? t('freeShippingReached', "Siz Bepul yetkazib berishga ega bo'ldingiz! 🎉")
                  : `${t('addMorePrefix', 'Yana')} ${formatPrice(remainingForFreeShipping)} ${t('addMoreForFreeShipping', "qo'shing va Bepul yetkazishga ega bo'ling!")}`}
              </span>
            </div>
            <div className="w-full h-2 bg-emerald-200/60 dark:bg-emerald-900/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${progressToFreeShipping}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{t('cartEmpty', "Savatchangiz bo'sh")}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                    {t('cartEmptyDesc', "Katalogdan o'zingizga yoqqan meva, oziq-ovqat yoki texnika vositalarini qo'shing!")}
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all"
                >
                  {t('startShopping', "Xarid qilishni boshlash")}
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-gray-800"
                >
                  <img
                    src={item.image}
                    alt={tProduct(item.name)}
                    className="w-16 h-16 object-cover rounded-xl shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                      {tProduct(item.name)}
                    </h4>
                    <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatPrice(item.price)}
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center space-x-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors border border-gray-200 dark:border-gray-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Remove Item */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                    title={t('delete', "O'chirish")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Summary */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900 space-y-4">
              {/* Promo Code Input */}
              <form onSubmit={handleApplyCoupon} className="flex space-x-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={t('promoCodePlaceholder', "Promo kod (masalan: SAVATCHI2026)")}
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white font-bold text-xs px-3.5 rounded-xl transition-colors"
                >
                  {t('apply', "Qo'llash")}
                </button>
              </form>

              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-xl text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-900/50">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {appliedCoupon}
                  </span>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>{t('productsTotal', "Mahsulotlar qiymati:")}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPrice(cartSubtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>{t('discount', "Chegirma:")}</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>{t('delivery', "Yetkazib berish:")}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {remainingForFreeShipping === 0 ? t('free', 'BEPUL') : formatPrice(15000)}
                  </span>
                </div>

                <div className="flex justify-between text-base font-black text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-gray-800">
                  <span>{t('totalToPay', "Jami to'lov:")}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatPrice(cartTotal + (remainingForFreeShipping === 0 ? 0 : 15000))}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckoutOpen(true);
                }}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center space-x-2 text-sm transition-all duration-200 active:scale-98"
              >
                <span>{t('proceedCheckout', "Buyurtmani Rasmiylashtirish")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
