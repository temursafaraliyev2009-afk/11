import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { REGIONS, PRODUCTS } from '../data/products';
import {
  ShoppingBag,
  Heart,
  Search,
  MapPin,
  Sun,
  Sunset,
  Moon,
  Package,
  Store,
  ChevronDown,
  DollarSign,
  TrendingUp,
  X,
  Mail,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MailboxModal } from './MailboxModal';
import { SavatchiLogo } from './SavatchiLogo';
import { getPendingInvitationsCount } from '../services/mailService';

export const Header = ({ searchQuery, setSearchQuery, onSelectCategory }) => {
  const { user } = useAuth();
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const {
    cart,
    wishlist,
    currency,
    setCurrency,
    region,
    setRegion,
    setIsCartOpen,
    cartTotal,
    formatPrice,
    orders
  } = useCart();

  const { theme, setTheme, toggleTheme, darkMode } = useTheme();
  const { t, tProduct } = useLanguage();
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const themeMenuRef = useRef(null);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setIsThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const updateCount = () => {
      setPendingCount(getPendingInvitationsCount(user));
    };
    updateCount();
    window.addEventListener('savatchi_mail_updated', updateCount);
    window.addEventListener('savatchi_invitation_accepted', updateCount);
    window.addEventListener('savatchi_invitation_rejected', updateCount);
    return () => {
      window.removeEventListener('savatchi_mail_updated', updateCount);
      window.removeEventListener('savatchi_invitation_accepted', updateCount);
      window.removeEventListener('savatchi_invitation_rejected', updateCount);
    };
  }, [user]);

  const searchSuggestions = searchQuery.trim()
    ? PRODUCTS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-40 w-full glass-effect border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
      {/* Top Bar */}
      <div className="bg-emerald-900/90 text-emerald-100 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          {/* Location Selector */}
          <div className="relative flex items-center space-x-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('deliveryLabel', 'Yetkazib berish:')}</span>
            <button
              onClick={() => setIsRegionOpen(!isRegionOpen)}
              className="font-semibold underline underline-offset-2 flex items-center hover:text-white transition-colors"
            >
              {region.name} ({region.time})
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>

            {isRegionOpen && (
              <div className="absolute top-6 left-0 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-2 w-56 z-50">
                <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase">{t('selectCity', 'Shaharni tanlang')}</div>
                {REGIONS.map(reg => (
                  <button
                    key={reg.id}
                    onClick={() => {
                      setRegion(reg);
                      setIsRegionOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center hover:bg-emerald-50 dark:hover:bg-emerald-950/50 ${
                      region.id === reg.id ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20' : ''
                    }`}
                  >
                    <span>{reg.name}</span>
                    <span className="text-[10px] text-gray-400">{reg.time}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Announcement */}
          <div className="hidden md:flex items-center space-x-2">
            <span className="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-medium text-[11px]">
              PROMO: SAVATCHI2026
            </span>
            <span>Birinchi buyurtmangiz uchun 15% Chegirma!</span>
          </div>

          {/* Settings: Language & Currency & Dark Mode */}
          <div className="flex items-center space-x-4">
            {/* Currency Toggle */}
            <div className="flex items-center space-x-1 bg-emerald-950/60 p-0.5 rounded-md border border-emerald-800/50">
              <button
                onClick={() => setCurrency('UZS')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  currency === 'UZS' ? 'bg-emerald-500 text-white' : 'text-emerald-300 hover:text-white'
                }`}
              >
                UZS
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  currency === 'USD' ? 'bg-emerald-500 text-white' : 'text-emerald-300 hover:text-white'
                }`}
              >
                USD ($)
              </button>
            </div>

            {/* Mailbox (Pochta & Xabarlar) */}
            <button
              onClick={() => setIsMailboxOpen(true)}
              className="relative flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-200 hover:text-white hover:bg-emerald-800/40 transition-colors cursor-pointer"
              title="Pochta va Xabarlar"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">Pochta</span>
              {pendingCount > 0 && (
                <span className="w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>



            {/* Theme Selector: Day, Twilight, Night */}
            <div className="relative" ref={themeMenuRef}>
              <button
                type="button"
                onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                className="p-1 text-emerald-300 hover:text-white transition-colors flex items-center space-x-1 cursor-pointer rounded-md hover:bg-emerald-950/40"
                title={`${t('theme', 'Mavzu')}: ${theme === 'day' ? t('dayMode', 'Kunduzgi rejim') : theme === 'twilight' ? t('twilightMode', 'Shom rejimi') : t('nightMode', 'Tungi rejim')}`}
              >
                {theme === 'day' ? (
                  <Sun className="w-4 h-4 text-amber-300" />
                ) : theme === 'twilight' ? (
                  <Sunset className="w-4 h-4 text-orange-300" />
                ) : (
                  <Moon className="w-4 h-4 text-emerald-300" />
                )}
                <ChevronDown className="w-3 h-3 text-emerald-400" />
              </button>

              {isThemeDropdownOpen && (
                <div className="absolute right-0 top-7 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-1.5 w-44 z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {t('theme', 'Mavzu')}
                  </div>
                  {[
                    { id: 'day', labelKey: 'dayMode', fallback: 'Kunduzgi rejim', icon: Sun, iconColor: 'text-amber-500' },
                    { id: 'twilight', labelKey: 'twilightMode', fallback: 'Shom rejimi', icon: Sunset, iconColor: 'text-indigo-400' },
                    { id: 'night', labelKey: 'nightMode', fallback: 'Tungi rejim', icon: Moon, iconColor: 'text-blue-400' }
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = theme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setTheme(opt.id);
                          setIsThemeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center transition-colors cursor-pointer ${
                          isSelected
                            ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20'
                            : 'hover:bg-emerald-50/50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-3.5 h-3.5 ${opt.iconColor}`} />
                          <span>{t(opt.labelKey, opt.fallback)}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/store/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-white p-0.5 shadow-lg shadow-slate-900/10 border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 overflow-hidden shrink-0">
              <SavatchiLogo className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight gradient-text">
                SAVATCHI
              </span>
              <span className="hidden sm:block text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider -mt-1">
                {t('appTagline', 'Eko Bozor & Express')}
              </span>
            </div>
          </Link>

          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <div className="relative">
              <input
                type="text"
                placeholder={t('searchStorePlaceholder', '10 000+ mahsulot, meva va maishiy texnika izlang...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-gray-100 dark:bg-slate-800/80 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 text-sm transition-all duration-300"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Search Suggestions Dropdown */}
            {isSearchFocused && searchSuggestions.length > 0 && (
              <div className="absolute top-12 left-0 right-0 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50">
                <div className="p-2 border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-gray-400 px-3 uppercase">
                  {t('topSearchResults', 'Top Qidiruv Natijalari')}
                </div>
                {searchSuggestions.map(product => (
                  <Link
                    key={product.id}
                    to="/store/"
                    onClick={() => setSearchQuery(product.name)}
                    className="flex items-center space-x-3 p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  >
                    <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{tProduct(product.name)}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{formatPrice(product.price)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Orders Link */}
            <Link
              to="/store/orders"
              className={`p-2.5 rounded-xl border flex items-center space-x-2 text-sm font-medium transition-all ${
                location.pathname === '/store/orders'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
              title={t('ordersHistoryTitle', 'Buyurtmalar tarixi')}
            >
              <div className="relative">
                <Package className="w-5 h-5" />
                {orders.length > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                    {orders.length}
                  </span>
                )}
              </div>
              <span className="hidden lg:inline">{t('navOrders', 'Buyurtmalar')}</span>
            </Link>

            {/* Analytics & Dashboard */}
            <Link
              to="/store/analytics"
              className={`p-2.5 rounded-xl border flex items-center space-x-2 text-sm font-medium transition-all ${
                location.pathname === '/store/analytics'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
              title={t('analyticsTitle', 'Xarajatlar & Tahlil')}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="hidden xl:inline">{t('navAnalytics', 'Tahlil')}</span>
            </Link>

            {/* Seller Mode */}
            <Link
              to="/store/seller"
              className={`p-2.5 rounded-xl border flex items-center space-x-2 text-sm font-medium transition-all ${
                location.pathname === '/store/seller'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
              title={t('navSeller', 'Sotuvchi')}
            >
              <Store className="w-5 h-5 text-amber-500" />
              <span className="hidden xl:inline">{t('navSeller', 'Sotuvchi')}</span>
            </Link>

            {/* Wishlist */}
            <Link
              to="/store/wishlist"
              className={`relative p-2.5 rounded-xl border transition-all ${
                location.pathname === '/store/wishlist'
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
              title={t('navWishlist', 'Saralanganlar')}
            >
              <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-xs font-bold flex items-center justify-center animate-pulse">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart Drawer Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center space-x-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all duration-200 font-semibold text-sm"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-400 text-gray-900 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center shadow">
                    {totalCartItems}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline font-bold">
                {cartTotal > 0 ? formatPrice(cartTotal) : t('cart', 'Savatcha')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mailbox Modal */}
      <MailboxModal
        isOpen={isMailboxOpen}
        onClose={() => setIsMailboxOpen(false)}
      />
    </header>
  );
};
