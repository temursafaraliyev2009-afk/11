import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { FileText, Plus, Search, Trash2, CheckCircle2, X } from 'lucide-react';

export const DebtorsPage = () => {
  const { isDebtsAllowed } = useStore();
  const { t } = useLanguage();

  if (!isDebtsAllowed) {
    return <Navigate to="/store/seller" replace />;
  }
  const [debtors, setDebtors] = useState([
    { id: 1, name: 'Azizbek Rahimov', phone: '+998 90 123 45 67', debtAmount: 80000, daysCount: 10, status: 'To\'lanmagan' },
    { id: 2, name: 'Jasur Olimov', phone: '+998 93 456 78 90', debtAmount: 150000, daysCount: 5, status: 'Kutilmoqda' },
    { id: 3, name: 'Sardor Karimov', phone: '+998 97 789 01 23', debtAmount: 350000, daysCount: 22, status: 'To\'lanmagan' },
    { id: 4, name: 'Otabek Yoqubov', phone: '+998 94 321 65 49', debtAmount: 45000, daysCount: 2, status: 'Kutilmoqda' },
  ]);

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDebt, setNewDebt] = useState({ name: '', phone: '', amount: '' });

  const handleAddDebt = (e) => {
    e.preventDefault();
    if (!newDebt.name || !newDebt.amount) return;
    const item = {
      id: Date.now(),
      name: newDebt.name,
      phone: newDebt.phone || '+998 90 000 00 00',
      debtAmount: Number(newDebt.amount),
      daysCount: 1,
      status: 'To\'lanmagan'
    };
    setDebtors([item, ...debtors]);
    setIsAddOpen(false);
    setNewDebt({ name: '', phone: '', amount: '' });
  };

  const handlePayDebt = (id) => {
    setDebtors(debtors.filter(d => d.id !== id));
  };

  const totalDebt = debtors.reduce((sum, d) => sum + d.debtAmount, 0);

  const filtered = debtors.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 pb-12 font-sans select-none w-full max-w-[1600px] min-w-0 mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>{t('debtorsList', "Qarzdorlar Ro'yxati")}</span>
          </h2>
          <p className="text-xs text-slate-400">{t('debtorsSubtitle', 'Mijozlar qarzi va to‘lovlarini boshqaring.')}</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={t('searchDebtorByName', "Mijoz ismi bo'yicha...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 hover:opacity-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addDebt', "Qarz Qo'shish")}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden w-full">
        <div className="w-full overflow-hidden">
          <table className="w-full text-left text-xs table-fixed border-collapse">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[20%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-[10px] sm:text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 truncate">{t('debtorNameCol', 'Mijoz Ismi')}</th>
                <th className="py-3 px-3 truncate">{t('phoneLabel', 'Telefon')}</th>
                <th className="py-3 px-3 truncate">{t('debtAmountCol', 'Qarz Summasi')}</th>
                <th className="py-3 px-3 truncate">{t('dueDateCol', 'Muddati')}</th>
                <th className="py-3 px-3 text-right truncate">{t('actions', 'Amallar')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900 truncate" title={d.name}>{d.name}</td>
                  <td className="py-3 px-3 text-slate-500 font-medium truncate font-mono">{d.phone}</td>
                  <td className="py-3 px-3 font-black text-amber-600 truncate">{d.debtAmount.toLocaleString()} {t('sum', "so'm")}</td>
                  <td className="py-3 px-3 text-slate-400 font-medium truncate">{d.daysCount} {t('daysAgo', 'kundan beri')}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handlePayDebt(d.id)}
                      className="bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors inline-flex items-center space-x-1 shrink-0 cursor-pointer text-[11px]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('debtPaidAction', "To'landi")}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">{t('addNewDebt', 'Yangi Qarz Kiritish')}</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDebt} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('debtorNameCol', 'Mijoz Ismi')}</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Sardor Rahimov"
                  value={newDebt.name}
                  onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('phoneLabel', 'Telefon Raqami')}</label>
                <input
                  type="text"
                  placeholder="+998 90 123 45 67"
                  value={newDebt.phone}
                  onChange={(e) => setNewDebt({ ...newDebt, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('debtAmountCol', "Qarz Summasi (So'm)")}</label>
                <input
                  type="number"
                  required
                  placeholder="100000"
                  value={newDebt.amount}
                  onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl shadow-lg mt-2"
              >
                {t('save', 'Saqlash')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

