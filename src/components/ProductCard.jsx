import React from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Star, Heart, ShoppingBag, Plus, Minus, Eye, Check } from 'lucide-react';

export const ProductCard = ({ product }) => {
  const { t, tProduct, tUnit } = useLanguage();
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    toggleWishlist,
    isInWishlist,
    formatPrice,
    setSelectedProductModal
  } = useCart();

  const cartItem = cart.find(item => item.id === product.id);
  const isWishlisted = isInWishlist(product.id);

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-gray-800/80 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Top Image Section */}
      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-slate-800/40 p-4">
        {/* Badge */}
        {product.badge && (
          <span className={`absolute top-3 left-3 z-10 ${product.badgeColor || 'bg-emerald-600'} text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-md`}>
            {product.badge}
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={() => toggleWishlist(product)}
          className={`absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
            isWishlisted
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-110'
              : 'bg-white/80 dark:bg-slate-900/80 text-gray-400 hover:text-rose-500 hover:bg-white'
          }`}
          title={isWishlisted ? t('removeFromWishlist', "Saralanganlardan o'chirish") : t('addToWishlist', "Saralanganlarga saqlash")}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`} />
        </button>

        {/* Quick View Button on Hover */}
        <button
          onClick={() => setSelectedProductModal(product)}
          className="absolute inset-x-4 bottom-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3 rounded-xl backdrop-blur-md flex items-center justify-center space-x-1.5 shadow-lg transform translate-y-2 group-hover:translate-y-0"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{t('quickView', "Tezkor ko'rish")}</span>
        </button>

        {/* Product Image */}
        <img
          src={product.image}
          alt={tProduct(product.name)}
          className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Seller / Subtitle */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium mb-1">
            <span>{product.seller || 'Savatchi Market'}</span>
            <div className="flex items-center space-x-1 text-amber-500 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating}</span>
              <span className="text-gray-400 font-normal">({product.reviewsCount})</span>
            </div>
          </div>

          {/* Title */}
          <h3
            onClick={() => setSelectedProductModal(product)}
            className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors"
          >
            {tProduct(product.name)}
          </h3>
        </div>

        {/* Unit & Price */}
        <div>
          <div className="text-[11px] font-medium text-gray-400">
            {tUnit(product.unit)} {t('unitFor', 'uchun')}
          </div>

          <div className="flex items-baseline space-x-2 mt-0.5">
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Actions */}
        <div className="pt-1">
          {cartItem ? (
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-1">
              <button
                onClick={() => {
                  if (cartItem.quantity === 1) {
                    removeFromCart(product.id);
                  } else {
                    updateQuantity(product.id, -1);
                  }
                }}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors shadow-sm"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                {cartItem.quantity} {tUnit(product.unit.includes('kg') ? 'kg' : 'dona')}
              </span>

              <button
                onClick={() => updateQuantity(product.id, 1)}
                className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(product)}
              className="w-full bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white font-bold py-2.5 px-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-600 transition-all duration-200 flex items-center justify-center space-x-2 text-xs group-hover:shadow-md"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t('addToCart', "Savatchaga qo'shish")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
