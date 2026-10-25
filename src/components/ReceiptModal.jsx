// src/components/ReceiptModal.jsx
import React from 'react';
import { ModalPortal } from './ModalPortal';
import { X, Printer, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';

export const ReceiptModal = ({ sale, isOpen, onClose }) => {
  const { user } = useAuth();
  const { storeConfig } = useStore();
  const { t, tUnit } = useLanguage();

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{t('receiptTitle', 'Xarid Cheki')}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div id="printable-receipt" className="bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-300 text-center space-y-3 font-mono text-xs">
          <div className="border-b border-dashed border-slate-300 pb-2">
            <h4 className="font-black text-sm text-slate-900 uppercase">SAVATCHI POS</h4>
            <p className="text-[10px] text-slate-500">{user?.storeName || 'Savatchi Do‘koni'}</p>
            <p className="text-[9px] text-slate-400">{t('fieldCategory', 'Soha')}: {storeConfig.name}</p>
          </div>

          <div className="text-[10px] text-left text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>{t('receiptNumber', 'Chek raqami')}:</span>
              <span className="font-bold text-slate-800">#{sale.id}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('dateTime', 'Sana / Vaqt')}:</span>
              <span>{sale.date || '31-avgust 2024'} {sale.time}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('cashierSeller', 'Kassir / Sotuvchi')}:</span>
              <span>{sale.seller || t('seller', 'Sotuvchi')}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('paymentTypesTitle', 'To‘lov turi')}:</span>
              <span className="font-bold text-slate-800">
                {sale.paymentType === 'Naqd' ? t('kpiCash', 'Naqd') : sale.paymentType === 'Karta' ? t('kpiCard', 'Karta') : sale.paymentType}
              </span>
            </div>
          </div>

          <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5 text-left text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <span>{sale.emoji || '🛒'}</span>
                <span>{sale.product}</span>
              </span>
              <span className="text-slate-600 font-bold">{sale.qty} {tUnit(sale.unit || 'dona')}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{t('unitPrice', 'Dona narxi')}:</span>
              <span>{sale.price?.toLocaleString()} {t('sum', 'so‘m')}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
            <span>{t('totalPaid', 'JAMI TO‘LANDI')}:</span>
            <span className="text-emerald-600">{sale.total?.toLocaleString()} {t('sum', 'so‘m')}</span>
          </div>

          <div className="text-[10px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
            {t('thankYouForPurchase', 'Xaridingiz uchun rahmat!')}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={handlePrint}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{t('printReceipt', 'Chekni chop etish')}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            {t('close', 'Yopish')}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
