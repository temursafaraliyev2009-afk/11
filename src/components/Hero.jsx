import React, { useState, useEffect, useMemo } from 'react';
import { CATEGORIES } from '../data/products';
import { useLanguage } from '../context/LanguageContext';
import { Zap, Clock, ShieldCheck, Truck, Sparkles, ArrowRight, Gift, Percent } from 'lucide-react';
import {
  ShoppingBag,
  Apple,
  Smartphone,
  Tv,
  Shirt,
  Home
} from 'lucide-react';

const ICON_MAP = {
  Sparkles,
  ShoppingBag,
  Apple,
  Smartphone,
  Tv,
  Shirt,
  Home
};

export const Hero = ({ selectedCategory, onSelectCategory }) => {
  const { t, tCategory } = useLanguage();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const BANNERS = useMemo(() => [
    {
      id: 1,
      title: t('banner1Title', 'Sarxil Mevalar va Organik Mahsulotlar'),
      subtitle: t('banner1Subtitle', 'To‘g‘ridan-to‘g‘ri bog‘lardan xonadoningizga 15 minutda!'),
      badge: t('banner1Badge', 'SUPER CHEGIRMA'),
      tag: t('banner1Tag', '30% gacha tejab qoling'),
      bgGradient: 'from-emerald-900 via-teal-900 to-slate-900',
      accentColor: 'from-emerald-400 to-teal-300',
      btnText: t('banner1Btn', 'Xarid qilish'),
      image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 2,
      title: t('banner2Title', 'Apple & Samsung Premium Gadjetlar'),
      subtitle: t('banner2Subtitle', 'Rasmiy kafolat va Toshkent bo‘ylab tekin va tezkor yetkazish'),
      badge: t('banner2Badge', 'YANGI KOLLEKSIYA'),
      tag: t('banner2Tag', '0% Muddatli to‘lov'),
      bgGradient: 'from-blue-950 via-indigo-950 to-slate-950',
      accentColor: 'from-blue-400 to-cyan-300',
      btnText: t('banner2Btn', 'Texnikani ko‘rish'),
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 3,
      title: t('banner3Title', 'Eko Uy-Ro‘zg‘or & Texnika'),
      subtitle: t('banner3Subtitle', 'Shinam va zamonaviy xonadon uchun eng saralangan brendlar'),
      badge: t('banner3Badge', 'TOP BRENDLAR'),
      tag: t('banner3Tag', 'Keshbek 5%'),
      bgGradient: 'from-purple-950 via-slate-900 to-slate-950',
      accentColor: 'from-purple-400 to-pink-300',
      btnText: t('banner3Btn', 'Tanlash'),
      image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80'
    }
  ], [t]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const currentBanner = BANNERS[activeBannerIndex];

  return (
    <section className="relative overflow-hidden pt-6 pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Banner Carousel */}
        <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-r ${currentBanner.bgGradient} text-white shadow-2xl transition-all duration-700 p-8 sm:p-12 border border-white/10 min-h-[340px] flex flex-col justify-between`}>
          {/* Background Decorative Blur */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Content Left */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center space-x-3">
                <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wider text-emerald-300 border border-white/10 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentBanner.badge}
                </span>
                <span className="text-amber-400 font-bold text-xs flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" />
                  {currentBanner.tag}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                {currentBanner.title}
              </h1>

              <p className="text-gray-300 text-sm sm:text-base max-w-lg">
                {currentBanner.subtitle}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => onSelectCategory('all')}
                  className={`bg-gradient-to-r ${currentBanner.accentColor} text-gray-950 font-bold px-6 py-3 rounded-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center space-x-2 text-sm`}
                >
                  <span>{currentBanner.btnText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-2 text-xs text-gray-300 font-medium">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>{t('quickDeliveryBadge', 'Tezkor yetkazish ~ 15 daqiqa')}</span>
                </div>
              </div>
            </div>

            {/* Image Right */}
            <div className="md:col-span-5 flex justify-center relative">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <img
                  src={currentBanner.image}
                  alt={currentBanner.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            </div>
          </div>

          {/* Carousel Indicators */}
          <div className="relative z-10 flex justify-center space-x-2 pt-6">
            {BANNERS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveBannerIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeBannerIndex === idx ? 'w-8 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{t('featFastDelivery', 'Tezkor Yetkazib Berish')}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{t('featFastDeliverySub', '15 daqiqada eshigingizda')}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{t('featOrganic', '100% Organik & Kafolat')}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{t('featOrganicSub', 'Sertifikatlangan toza mahsulot')}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{t('featAffordable', 'Hamyonbop Narxlar')}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{t('featAffordableSub', 'Doimiy mega chegirmalar')}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{t('featEasyPayment', 'Qulay To‘lov')}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{t('featEasyPaymentSub', 'Click, Payme, Naqd & Karta')}</div>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <span>{t('heroSearchByCategory', "Kategoriyalar bo'yicha qidiruv")}</span>
            </h2>
          </div>

          <div className="flex items-center space-x-3 overflow-x-auto pb-3 pt-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || Sparkles;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`btn-pill-base px-4 py-2.5 rounded-2xl font-bold text-xs ${
                    isSelected
                      ? 'btn-pill-emerald font-black'
                      : 'btn-pill-inactive'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                  <span>{cat.id === 'all' ? t('all', 'Barchasi') : tCategory(cat.name)}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors ${
                    isSelected ? 'btn-pill-badge-active' : 'btn-pill-badge-inactive'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
