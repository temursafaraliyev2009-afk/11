// src/pages/StoreTypeSelection.jsx
import React, { useState } from 'react';
import {
  ShoppingBag,
  ArrowRight,
  Shield,
  Zap,
  Cloud,
  Store,
  Plus,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { BackgroundWaves } from '../components/BackgroundWaves';
import { StoreBadgeIcon, StoreIcon } from '../components/StoreIcon';

export const StoreTypeSelection = ({ onSelectComplete }) => {
  const { user } = useAuth();
  const { userStores, currentStore, switchStore, createNewStore } = useStore();
  const { t } = useLanguage();
  const { notifySuccess, notifyInfo } = useToast();

  const [createModalType, setCreateModalType] = useState(null); // store card object
  const [newStoreName, setNewStoreName] = useState('');

  const handleSelectExisting = (storeId) => {
    switchStore(storeId);
    const targetStore = userStores.find(s => s.id === storeId);
    notifyInfo(t('storeSwitched', 'Do‘kon almashtirildi'), `"${targetStore?.name || 'Do‘kon'}" paneliga o‘tildi.`);
    if (onSelectComplete) {
      onSelectComplete(storeId);
    }
  };

  const handleOpenCreateModal = (card) => {
    setCreateModalType(card);
    setNewStoreName(`Savatchi ${card.title} Do‘koni`);
  };

  const handleConfirmCreate = (e) => {
    e.preventDefault();
    if (!createModalType) return;
    const created = createNewStore({
      name: newStoreName,
      type: createModalType.id
    });
    notifySuccess(t('storeCreated', 'Do‘kon ochildi!'), `"${newStoreName}" do‘koni muvaffaqiyatli yaratildi.`);
    setCreateModalType(null);
    if (onSelectComplete) {
      onSelectComplete(created.id);
    }
  };

  const storeCards = [
    {
      id: 'food',
      titleKey: 'storeFood',
      title: 'Oziq-ovqat',
      descKey: 'storeFoodDesc',
      desc: 'Oziq-ovqat, ichimliklar, sabzavot-mevalar va bakkaliya',
    },
    {
      id: 'phone',
      titleKey: 'storePhone',
      title: 'Telefon',
      descKey: 'storePhoneDesc',
      desc: 'Smartfonlar, planshetlar, gadjetlar va IMEI hisobi',
    },
    {
      id: 'clothing',
      titleKey: 'storeClothing',
      title: 'Kiyim-kechak',
      descKey: 'storeClothingDesc',
      desc: 'Kiyimlar, oyoq kiyimlar, razmerlar va ranglar',
    },
    {
      id: 'cosmetics',
      titleKey: 'storeCosmetics',
      title: 'Kosmetika',
      descKey: 'storeCosmeticsDesc',
      desc: 'Pardoz, parfyum va go‘zallik parvarishi',
    },
    {
      id: 'construction',
      titleKey: 'storeConstruction',
      title: 'Qurilish mollari',
      descKey: 'storeConstructionDesc',
      desc: 'Sement, bo‘yoqlar, santexnika va asbob-uskunalar',
    },
    {
      id: 'household',
      titleKey: 'storeHousehold',
      title: 'Uy-ro‘zg‘or',
      descKey: 'storeHouseholdDesc',
      desc: 'Idish-tovoqlar, tozalash vositalari va oshxona anjomlari',
    },
    {
      id: 'sport',
      titleKey: 'storeSport',
      title: 'Sport jihozlari',
      descKey: 'storeSportDesc',
      desc: 'Futbol, fitnes, boks va trenajyor jihozlari',
    },
    {
      id: 'accessories',
      titleKey: 'storeAccessories',
      title: 'Aksessuarlar',
      descKey: 'storeAccessoriesDesc',
      desc: 'Powerbanklar, quloqchinlar, simsiz zaryadkalar va kabellar',
    },
    {
      id: 'flower',
      titleKey: 'storeFlower',
      title: 'Gul do‘koni',
      descKey: 'storeFlowerDesc',
      desc: 'Tirik gullar, bayramona buketlar va xona o‘simliklari',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 font-sans relative flex flex-col justify-between select-none overflow-x-hidden">
      <BackgroundWaves />

      {/* Top Navbar */}
      <header className="relative z-10 px-6 lg:px-12 py-5 flex items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#0B132B] rounded-[14px] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">
              {t('appName', 'Savatchi')}
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              {t('storeManagementPlatform', 'Do‘kon boshqaruv platformasi')}
            </p>
          </div>
        </div>


      </header>

      {/* Main Selection Area */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-6 lg:px-8 py-10 w-full">
        {/* Title Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
            {t('nineBusinessTypes', '9 xil biznes sohasi')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t('selectStoreType', 'Do‘kon turini tanlang')}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {t('selectStoreSubtitle', 'Har bir magazin turi uchun moslashtirilgan tovar parametrlari, ombor jadvali va kassa tizimi avtomatik faollashadi.')}
          </p>
        </div>

        {/* 9 Store Type Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storeCards.map((card) => {
            const existingStore = userStores.find(s => s.type === card.id);
            const isCurrentlySelected = currentStore?.type === card.id;

            return (
              <div
                key={card.id}
                className={`bg-white rounded-3xl p-6 border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-xl group relative overflow-hidden ${
                  isCurrentlySelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200/90 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <StoreBadgeIcon type={card.id} size="lg" />

                    {isCurrentlySelected && (
                      <span className="text-[11px] font-black px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        {t('activeStatus', 'Faol')}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                    {t(card.titleKey, card.title)}
                  </h3>

                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                    {t(card.descKey, card.desc)}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                  {existingStore ? (
                    <button
                      onClick={() => handleSelectExisting(existingStore.id)}
                      className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm"
                    >
                      <span>{t('goToStore', 'Do‘konga o‘tish')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenCreateModal(card)}
                      className="w-full py-3 rounded-2xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer border border-blue-200/80"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('openNewStore', 'Yangi do‘kon ochish')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Create New Store Modal */}
      {createModalType && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <StoreBadgeIcon type={createModalType.id} size="md" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {t('openNewStore', 'Yangi do‘kon ochish')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t(createModalType.titleKey, createModalType.title)} {t('categorySphere', 'sohasi')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCreateModalType(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('storeNameLabel', 'Do‘kon nomi *')}
                </label>
                <input
                  type="text"
                  required
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalType(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t('cancel', 'Bekor qilish')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                >
                  {t('btnCreateStore', 'Do‘konni yaratish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
