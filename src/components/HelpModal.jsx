// src/components/HelpModal.jsx
import React, { useState, useEffect } from 'react';
import { ModalPortal } from './ModalPortal';
import {
  X,
  HelpCircle,
  Package,
  ShoppingCart,
  Receipt,
  ShoppingBag,
  BarChart3,
  Users,
  Copy,
  Check,
  ExternalLink,
  Info,
  Phone
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const HelpModal = ({ isOpen, onClose }) => {
  const { t, lang } = useLanguage();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText('+998 91 883 07 02');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      id: 'inventory',
      title: t('featInventoryTitle', 'Mahsulotlar va omborni boshqarish'),
      desc: t('featInventoryDesc', 'Mahsulotlar qoldig‘i, yangi tovarlar kiritish va narxlarni nazorat qilish.'),
      icon: Package,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
    {
      id: 'sales',
      title: t('featSalesTitle', 'Savdo va tushumlarni hisobga olish'),
      desc: t('featSalesDesc', 'Tezkor kassa savdolari, naqd va karta tushumlarini aniq hisoblab borish.'),
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600 border-blue-100'
    },
    {
      id: 'debts',
      title: t('featDebtsTitle', 'Mijozlar qarzlarini kuzatish'),
      desc: t('featDebtsDesc', 'Nasiya savdolar, to‘lov muddatlari va qarzdorlik hisobini yuritish.'),
      icon: Receipt,
      color: 'bg-amber-50 text-amber-600 border-amber-100'
    },
    {
      id: 'orders',
      title: t('featOrdersTitle', 'Buyurtmalarni boshqarish'),
      desc: t('featOrdersDesc', 'Yangi, yo‘ldagi va yetkazib berilgan mijoz buyurtmalarini boshqarish.'),
      icon: ShoppingBag,
      color: 'bg-purple-50 text-purple-600 border-purple-100'
    },
    {
      id: 'reports',
      title: t('featReportsTitle', 'Hisobotlar orqali do‘kon faoliyatini kuzatish'),
      desc: t('featReportsDesc', 'Savdo aylanmasi, daromad va do‘kon ko‘rsatkichlarini chuqur tahlil qilish.'),
      icon: BarChart3,
      color: 'bg-teal-50 text-teal-600 border-teal-100'
    },
    {
      id: 'staff',
      title: t('featStaffTitle', 'Xodimlar va ularning rollarini boshqarish'),
      desc: t('featStaffDesc', 'Do‘kon xodimlari ro‘yxati va ularning tizimdagi vazifa rollarini sozlash.'),
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100'
    }
  ];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans select-none animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 shrink-0">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                  {t('help', 'Yordam va qo‘llab-quvvatlash')}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {t('helpSubtitle', 'Savatchi qo‘llanmasi va bevosita aloqa')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={t('close', 'Yopish')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto pb-8">
            {/* 1. SAYT HAQIDA */}
            <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 rounded-2xl p-4 sm:p-4.5 border border-blue-100/90 shadow-xs">
              <div className="flex items-center space-x-2 text-blue-700 font-black text-xs uppercase tracking-wider mb-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{t('aboutTitle', 'Savatchi haqida')}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                {t('aboutDesc', '“Savatchi — kichik do‘konlarni boshqarishni osonlashtiruvchi zamonaviy web-sayt. U mahsulotlar va ombor qoldig‘ini nazorat qilish, savdolarni hisobga olish, qarzlarni boshqarish, buyurtmalarni kuzatish hamda hisobotlarni ko‘rishga yordam beradi.”')}
              </p>
            </div>

            {/* 2. SAYT IMKONIYATLARI */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>{t('featuresTitle', 'Sayt imkoniyatlari')}</span>
                </h4>
                <span className="text-[11px] font-semibold text-slate-400">
                  {t('featuresSubtitle', 'Asosiy imkoniyatlar')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {features.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 hover:shadow-xs transition-all flex items-start space-x-3 group"
                    >
                      <div
                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${item.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-slate-900 text-xs leading-snug">
                          {item.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. TELEGRAM ORQALI BOG‘LANISH */}
            <div className="bg-gradient-to-br from-sky-50 via-blue-50/40 to-slate-50 rounded-2xl p-4 sm:p-5 border border-sky-100/90 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#229ED9]"></span>
                    <span>{t('contactTitle', 'Men bilan bog‘lanish')}</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {t('contactSubtitle', 'Savol, taklif yoki yordam uchun bevosita Telegram orqali yozishingiz mumkin')}
                  </p>
                </div>

                {/* Kontakt ma'lumoti & nusxa olish */}
                <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-800">
                    +998 91 883 07 02
                  </span>
                  <button
                    onClick={handleCopyPhone}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer ml-1"
                    title={t('copyPhoneTitle', 'Raqamdan nusxa olish')}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {copied && (
                    <span className="text-[10px] font-bold text-emerald-600 animate-in fade-in">
                      {t('copied', 'Nusxa olindi!')}
                    </span>
                  )}
                </div>
              </div>

              {/* Telegram orqali bog‘lanish tugmasi */}
              <div className="pt-0.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href="https://t.me/+998918830702"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center space-x-2.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#229ED9] to-[#1a8bc4] hover:from-[#1e8ec5] hover:to-[#167db0] text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-500/25 active:scale-95 transition-all duration-150 cursor-pointer whitespace-nowrap"
                >
                  {/* Telegram official airplane SVG */}
                  <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.95-1.28 4.92-2.13 5.9-2.54 2.81-1.17 3.4-1.37 3.78-1.38.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                  </svg>
                  <span>{t('contactBtn', 'Telegram orqali bog‘lanish')}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
                </a>

                <span className="text-[11px] text-slate-500 font-medium text-center sm:text-left">
                  {t('contactDirectNote', 'Telefon raqam orqali to‘g‘ridan-to‘g‘ri Telegram chat ochiladi')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
