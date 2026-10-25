import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { Clock } from 'lucide-react';

export const ActivityHistoryPage = () => {
  const { t } = useLanguage();
  const { activities = [], isOwner, isEmployee, currentUserName, currentUserId } = useStore();

  if (isEmployee) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto mt-12 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Clock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Ruxsat cheklangan</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Faoliyat tarixi faqat do‘kon egasi yoki ruxsat berilgan foydalanuvchilar uchun mo‘ljallangan.
        </p>
      </div>
    );
  }

  const visibleLogs = isOwner ? activities : activities.filter(act =>
    (currentUserName && act.user === currentUserName) ||
    (currentUserId && act.userId === currentUserId)
  );

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <span>{t('activityAuditTitle', 'Faoliyat & Audit Tarixi')}</span>
        </h2>
        <p className="text-xs text-slate-400">{t('activityAuditSubtitle', 'Do‘konda bajarilgan amallar tarixini ko‘ring.')}</p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        {visibleLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm font-semibold">
            Hech qanday faoliyat yozuvi topilmadi
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 pl-6 space-y-6">
            {visibleLogs.map(log => (
              <div key={log.id} className="relative group">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white"></div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-900">{log.user}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase">
                      {log.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">• {log.time}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 mt-1">{log.action || log.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
