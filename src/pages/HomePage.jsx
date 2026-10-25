import React, { useState, useMemo } from 'react';
import { Hero } from '../components/Hero';
import { PRODUCTS } from '../data/products';
import { useLanguage } from '../context/LanguageContext';
import { Filter, ArrowUpDown, Sparkles, AlertCircle } from 'lucide-react';
import { ProductCard as PCard } from '../components/ProductCard';

export const HomePage = ({ searchQuery, selectedCategory, onSelectCategory }) => {
  const { t } = useLanguage();
  const [sortBy, setSortBy] = useState('popular'); // 'popular', 'price-low', 'price-high', 'rating'
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(20000000);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      // Category filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesDesc = product.description.toLowerCase().includes(q);
        const matchesSeller = product.seller.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesSeller) return false;
      }
      // Price range filter
      if (product.price < minPrice || product.price > maxPrice) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return b.reviewsCount - a.reviewsCount; // popular
    });
  }, [selectedCategory, searchQuery, sortBy, minPrice, maxPrice]);

  return (
    <div className="min-h-screen pb-16">
      {/* Hero Header */}
      <Hero
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <span>{t('productsCatalog', 'Mahsulotlar Katalogi')}</span>
              <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full">
                {filteredProducts.length} {t('productsWord', 'mahsulot')}
              </span>
            </h2>
            {searchQuery && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                "{searchQuery}" {t('searchResultsFor', "bo'yicha qidiruv natijalari")}
              </p>
            )}
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-medium">
              <ArrowUpDown className="w-4 h-4 text-emerald-500" />
              <span>{t('sorting', 'Saralash:')}</span>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:border-emerald-500 shadow-sm"
            >
              <option value="popular">{t('sortPopular', "Ommabopligi bo'yicha")}</option>
              <option value="rating">{t('sortRating', 'Reytingi yuqorilar')}</option>
              <option value="price-low">{t('sortPriceLow', 'Narxi: Arzondan qimmatga')}</option>
              <option value="price-high">{t('sortPriceHigh', 'Narxi: Qimmatdan arsonga')}</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {t('noProductsFound', 'Mahsulot topilmadi')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {t('noProductsFoundSub', "Qidiruv sozlamalarini o'zgartiring yoki filtrlarni tozalang.")}
            </p>
            <button
              onClick={() => {
                onSelectCategory('all');
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-colors"
            >
              {t('viewAllProducts', "Barcha mahsulotlarni ko'rish")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-6">
            {filteredProducts.map((product) => (
              <PCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
