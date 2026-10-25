import React from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ProductCard } from '../components/ProductCard';
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const WishlistPage = () => {
  const { wishlist, addToCart } = useCart();
  const { t } = useLanguage();

  const handleAddAllToCart = () => {
    wishlist.forEach(item => addToCart(item, 1));
  };

  return (
    <div className="min-h-screen py-8 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <Link to="/store/" className="inline-flex items-center space-x-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-2 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('backToCatalog', 'Katalogga qaytish')}</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center space-x-3">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            <span>{t('wishlistTitle', 'Saralangan Mahsulotlar')}</span>
            <span className="text-xs bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold px-3 py-1 rounded-full">
              {wishlist.length} {t('itemsUnit', 'ta')}
            </span>
          </h1>
        </div>

        {wishlist.length > 0 && (
          <button
            onClick={handleAddAllToCart}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t('addAllToCart', "Barchasini Savatchaga Qo'shish")}</span>
          </button>
        )}
      </div>

      {/* Grid */}
      {wishlist.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('wishlistEmpty', "Saralangan mahsulotlar hozircha yo'q")}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            {t('wishlistEmptyDesc', "Mahsulot kartochkasidagi yurakcha tugmasini bosib, sevimli narsalaringizni shu yerda saqlab qo'ying.")}
          </p>
          <Link
            to="/store/"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-colors"
          >
            {t('goToCatalog', "Katalogga o'tish")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-6">
          {wishlist.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
