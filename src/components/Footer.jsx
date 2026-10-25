import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingBag, Phone, Mail, MapPin, Heart, ShieldCheck, Truck, Headphones, ArrowRight } from 'lucide-react';

export const Footer = () => {
  const { t, tCategory } = useLanguage();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="bg-slate-900 text-gray-400 text-xs border-t border-slate-800 transition-colors">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 border-b border-slate-800">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">SAVATCHI.UZ</span>
          </div>
          <p className="text-gray-400 leading-relaxed text-xs">
            {t('footerAbout', "O'zbekistondagi eng tezkor onlayn bozor. Sifatli oziq-ovqat, sarxil mevalar va zamonaviy maishiy texnikalar 15 daqiqada xonadoningizda!")}
          </p>
          <div className="flex items-center space-x-3 text-white font-bold">
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>+998 (71) 200-00-00</span>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{t('footerCategoriesTitle', 'Kategoriyalar')}</h4>
          <ul className="space-y-2.5">
            <li><a href="#" className="hover:text-emerald-400 transition-colors">{tCategory('Sarxil Meva va Sabzavotlar', 'Sarxil Meva va Sabzavotlar')}</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">{tCategory("Halol Go'sht & Sut Mahsulotlari", "Halol Go'sht & Sut Mahsulotlari")}</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">{tCategory('Smartfonlar va Noutbuklar', 'Smartfonlar va Noutbuklar')}</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">{tCategory('Maishiy va Oshxona Texnikasi', 'Maishiy va Oshxona Texnikasi')}</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">{tCategory("Uy va Ro'zg'or buyumlari", "Uy va Ro'zg'or buyumlari")}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{t('footerSupportTitle', 'Mijozlarga Yordam')}</h4>
          <ul className="space-y-2.5">
            <li><a href="#" className="hover:text-emerald-400 transition-colors">{t('footerHowToOrder', 'Qanday buyurtma beriladi?')}</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">{t('footerDeliveryTerms', 'Yetkazib berish shartlari')}</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">{t('footerPaymentMethods', "To'lov usullari (Click, Payme)")}</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">{t('footerReturnPolicy', 'Mahsulotni qaytarish siyosati')}</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">{t('footerWarrantyService', 'Kafolat va Servis xizmati')}</a></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-white font-bold text-sm mb-2 uppercase tracking-wider">{t('footerNewsTitle', 'Yangiliklar va Chegirmalar')}</h4>
          <p className="text-xs text-gray-400">
            {t('footerSubscribeTitle', "Haftalik eksklyuziv promo-kodlar va aksiyalardan birinchilardan bo'lib xabardor bo'ling:")}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email) {
                setSubscribed(true);
                setEmail('');
                setTimeout(() => setSubscribed(false), 3000);
              }
            }}
            className="flex flex-col gap-2"
          >
            <div className="flex">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email', 'Email manzilingiz...')}
                className="bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-l-xl focus:outline-none focus:border-emerald-500 w-full"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 rounded-r-xl transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {subscribed && (
              <span className="text-emerald-400 text-[11px] font-bold">
                {t('subscribeSuccess', '✓ Rahmat! Yangiliklarimizga obuna bo‘ldingiz.')}
              </span>
            )}
          </form>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {t('copyright', '© 2026 Savatchi Inc. Barcha huquqlar himoyalangan.')}
        </div>

        <div className="flex items-center space-x-3 text-xs font-semibold text-gray-300">
          <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">CLICK</span>
          <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">PAYME</span>
          <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">UZCARD</span>
          <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">HUMO</span>
        </div>
      </div>
    </footer>
  );
};

