// src/components/CreateStoreModal.jsx
import React, { useState, useEffect } from 'react';
import { ModalPortal } from './ModalPortal';
import {
  X,
  Plus,
  Store,
  Check,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { StoreIcon } from './StoreIcon';

const STORE_TYPE_OPTIONS = [
  { id: 'food', nameKey: 'storeFood', defaultName: 'Oziq-ovqat', desc: 'Oziq-ovqat va bakkaliya' },
  { id: 'phone', nameKey: 'storePhone', defaultName: 'Telefon & Gadjet', desc: 'Smartfonlar va aksessuarlar' },
  { id: 'clothing', nameKey: 'storeClothing', defaultName: 'Kiyim-kechak', desc: 'Kiyimlar va oyoq kiyimlar' },
  { id: 'cosmetics', nameKey: 'storeCosmetics', defaultName: 'Kosmetika & Parfyum', desc: 'Pardoz va go‘zallik' },
  { id: 'construction', nameKey: 'storeConstruction', defaultName: 'Qurilish mollari', desc: 'Qurilish va ta’mirlash' },
  { id: 'household', nameKey: 'storeHousehold', defaultName: 'Uy-ro‘zg‘or', desc: 'Idish-tovoq va anjomlar' },
  { id: 'sport', nameKey: 'storeSport', defaultName: 'Sport jihozlari', desc: 'Sport kiyimlari va anjomlar' },
  { id: 'accessories', nameKey: 'storeAccessories', defaultName: 'Aksessuarlar', desc: 'Gadjetlar va soatlar' },
  { id: 'flower', nameKey: 'storeFlower', defaultName: 'Gul do‘koni', desc: 'Tirik gullar va sovg‘alar' },
];

export const CreateStoreModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { createNewStore, currentUserId: storeUserId } = useStore();
  const { t } = useLanguage();
  const { notifySuccess, notifyWarning, notifyError } = useToast();

  const [selectedType, setSelectedType] = useState('food');
  const [storeName, setStoreName] = useState('Savatchi Oziq-ovqat');
  const [hasManuallyEditedName, setHasManuallyEditedName] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal ochilganda qiymatlarni reset qilish
  useEffect(() => {
    if (isOpen) {
      setSelectedType('food');
      setStoreName('Savatchi Oziq-ovqat');
      setHasManuallyEditedName(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Esc bosilganda modalni yopish
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Tur tanlanganda avtomatik tavsiya qilingan nom berish (agar foydalanuvchi o'zi o'zgartirmagan bo'lsa)
  const handleSelectType = (typeId) => {
    setSelectedType(typeId);
    if (!hasManuallyEditedName || !storeName.trim()) {
      const option = STORE_TYPE_OPTIONS.find(opt => opt.id === typeId);
      const typeTitle = option ? t(option.nameKey, option.defaultName) : 'Do‘kon';
      setStoreName(`Savatchi ${typeTitle}`);
    }
  };

  const handleNameChange = (e) => {
    setStoreName(e.target.value);
    setHasManuallyEditedName(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const activeUserId = user?.id || user?.uid || storeUserId;
    if (!activeUserId) {
      notifyError(
        t('authRequiredTitle', 'Avtorizatsiya talab etiladi'),
        t('authRequiredDesc', 'Yangi do‘kon yaratish uchun tizimga kirgan bo‘lishingiz kerak!')
      );
      return;
    }

    const trimmedName = storeName.trim();
    if (!trimmedName) {
      notifyWarning(
        t('storeNameRequired', 'Do‘kon nomini kiriting'),
        t('storeNameRequiredDesc', 'Iltimos, yangi do‘koningiz uchun nom kiriting.')
      );
      return;
    }

    if (!selectedType) {
      notifyWarning(
        t('storeTypeRequired', 'Do‘kon turini tanlang'),
        t('storeTypeRequiredDesc', 'Iltimos, do‘koningiz yo‘nalishini tanlang.')
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const newStore = await createNewStore({
        name: trimmedName,
        type: selectedType
      });

      if (newStore) {
        notifySuccess(
          t('storeCreated', 'Do‘kon ochildi!'),
          `"${newStore.name}" do‘koni muvaffaqiyatli yaratildi va faollashtirildi.`
        );
        onClose();
      } else {
        notifyError(
          t('storeCreateFailed', 'Xatolik yuz berdi'),
          t('storeCreateFailedDesc', 'Do‘konni yaratib bo‘lmadi. Iltimos qaytadan urinib ko‘ring.')
        );
      }
    } catch (err) {
      console.error('Error creating store:', err);
      notifyError(
        t('storeCreateFailed', 'Xatolik yuz berdi'),
        err.message || 'Do‘kon yaratishda xatolik yuz berdi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-slate-100 space-y-5 max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base leading-tight">
                  {t('openNewStore', 'Yangi do‘kon ochish')}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {t('chooseBusinessTypeDesc', 'Biznesingiz yo‘nalishini tanlang va nomlang')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title={t('close', 'Yopish')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* Store Type Selection Cards */}
            <div>
              <label className="font-extrabold text-slate-800 block mb-2 text-xs">
                {t('selectBusinessType', 'Do‘kon yo‘nalishi *')}
              </label>

              <div className="grid grid-cols-3 gap-2">
                {STORE_TYPE_OPTIONS.map((opt) => {
                  const isSelected = selectedType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectType(opt.id)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                          : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 text-slate-700'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center mb-1.5 shadow-xs shrink-0">
                        <StoreIcon type={opt.id} className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-[11px] leading-tight line-clamp-1">
                        {t(opt.nameKey, opt.defaultName)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Store Name Input */}
            <div>
              <label className="font-extrabold text-slate-800 block mb-1.5 text-xs">
                {t('storeNameLabel', 'Do‘kon nomi *')}
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={handleNameChange}
                placeholder={t('storeNamePlaceholder', 'Masalan: Savatchi Markaz')}
                maxLength={60}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {t('storeNameTip', 'Do‘kon nomi chek va hisobotlarda ko‘rsatiladi')}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {t('cancel', 'Bekor qilish')}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? t('saving', 'Yaratilmoqda...') : t('btnCreateStore', 'Do‘konni yaratish')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

