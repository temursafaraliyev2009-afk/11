import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Star, Heart, ShoppingBag, ShieldCheck, Truck, Clock, Plus, Minus, Check } from 'lucide-react';

export const ProductModal = () => {
  const { t, tProduct, tUnit } = useLanguage();
  const {
    selectedProductModal,
    setSelectedProductModal,
    cart,
    addToCart,
    updateQuantity,
    toggleWishlist,
    isInWishlist,
    formatPrice,
    region
  } = useCart();

  const [quantity, setQuantity] = useState(1);

  if (!selectedProductModal) return null;

  const product = selectedProductModal;
  const isWishlisted = isInWishlist(product.id);
  const cartItem = cart.find(item => item.id === product.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row">
        {/* Close button */}
        <button
          onClick={() => setSelectedProductModal(null)}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Image */}
        <div className="md:w-1/2 bg-gray-50 dark:bg-slate-800/40 p-6 flex flex-col justify-between relative">
          {product.badge && (
            <span className={`absolute top-4 left-4 z-10 ${product.badgeColor || 'bg-emerald-600'} text-white text-xs font-bold px-3 py-1 rounded-full`}>
              {product.badge}
            </span>
          )}

          <div className="aspect-square rounded-2xl overflow-hidden shadow-inner my-auto">
            <img
              src={product.image}
              alt={tProduct(product.name)}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Truck className="w-4 h-4 text-emerald-500" />
              <span>{t('delivery', 'Yetkazish:')} {region.time}</span>
            </div>
            <div className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>{t('qualityGuarantee', '100% Sifat kafolati')}</span>
            </div>
          </div>
        </div>

        {/* Right Info */}
        <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Category & Rating */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                {product.seller}
              </span>
              <div className="flex items-center space-x-1 text-amber-500 font-bold text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{product.rating}</span>
                <span className="text-gray-400 font-normal text-xs">({product.reviewsCount} {t('reviews', 'sharh')})</span>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
              {tProduct(product.name)}
            </h2>

            {/* Price */}
            <div className="flex items-baseline space-x-3">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatPrice(product.price * quantity)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.originalPrice * quantity)}
                </span>
              )}
              <span className="text-xs text-gray-400 font-medium">
                ({tUnit(product.unit)} {t('unitFor', 'uchun')})
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {product.description}
            </p>

            {/* Specifications */}
            {product.specs && (
              <div className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('specifications', 'Xususiyatlari')}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-gray-400">{key}:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            {/* Quantity Selector */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('quantity', 'Miqdor')}:</span>
              <div className="flex items-center space-x-3 bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 font-bold flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-extrabold text-sm px-2 text-gray-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 font-bold flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  addToCart(product, quantity);
                  setSelectedProductModal(null);
                }}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 text-sm transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t('addToCart', "Savatchaga qo'shish")}</span>
              </button>

              <button
                onClick={() => toggleWishlist(product)}
                className={`p-3 rounded-2xl border transition-all ${
                  isWishlisted
                    ? 'bg-rose-500 text-white border-rose-500 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-rose-500'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-white' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
