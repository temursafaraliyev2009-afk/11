// src/components/MailboxModal.jsx
import React, { useState, useEffect } from 'react';
import { ModalPortal } from './ModalPortal';
import {
  Mail,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  ShieldCheck,
  AlertCircle,
  Inbox,
  Send,
  Bell,
  UserCheck,
  UserX,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getUserMailMessages,
  acceptStaffInvitation,
  rejectStaffInvitation,
  getAllMailMessages
} from '../services/mailService';
import { isAccountStoreOwner } from '../services/accountService';


export const MailboxModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'all'
  const [messages, setMessages] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  // Faqat haqiqiy login qilgan foydalanuvchi
  const effectiveUser = user || {
    id: 'usr-guest',
    email: 'foydalanuvchi@savatchi.uz',
    displayName: 'Foydalanuvchi'
  };

  const loadMessages = () => {
    if (effectiveUser) {
      const msgs = getUserMailMessages(effectiveUser);
      setMessages(msgs);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen, effectiveUser?.email, effectiveUser?.id]);

  useEffect(() => {
    const handleUpdate = () => {
      loadMessages();
    };
    window.addEventListener('savatchi_mail_updated', handleUpdate);
    window.addEventListener('savatchi_invitation_accepted', handleUpdate);
    window.addEventListener('savatchi_invitation_rejected', handleUpdate);
    return () => {
      window.removeEventListener('savatchi_mail_updated', handleUpdate);
      window.removeEventListener('savatchi_invitation_accepted', handleUpdate);
      window.removeEventListener('savatchi_invitation_rejected', handleUpdate);
    };
  }, [effectiveUser?.email, effectiveUser?.id]);

  if (!isOpen) return null;

  const isEffectiveOwner = isAccountStoreOwner(effectiveUser);

  const handleAccept = async (invitation) => {
    if (isAccountStoreOwner(effectiveUser)) {
      notifyError(
        t('error', 'Xatolik'),
        "Do‘kon egasi rolidagi foydalanuvchi boshqa do‘konga xodim sifatida qo‘shila olmaydi!"
      );
      return;
    }
    setActionLoading(invitation.id);
    try {
      const result = await acceptStaffInvitation(invitation.id, effectiveUser);
      notifySuccess(
        t('invitationAcceptedTitle', 'Taklif qabul qilindi!'),
        `Siz "${invitation.storeName}" do‘koniga muvaffaqiyatli qo‘shildingiz. Boshlang‘ich rolingiz: "${result.newEmployee.role}".`
      );
      loadMessages();
    } catch (err) {
      notifyError(t('error', 'Xatolik'), err.message || 'Taklifni qabul qilishda xatolik yuz berdi');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (invitation) => {
    setActionLoading(invitation.id);
    try {
      await rejectStaffInvitation(invitation.id, effectiveUser);
      notifyInfo(
        t('invitationRejectedTitle', 'Taklif rad etildi'),
        `"${invitation.storeName}" do‘koni uchun yuborilgan taklif rad etildi.`
      );
      loadMessages();
    } catch (err) {
      notifyError(t('error', 'Xatolik'), err.message || 'Taklifni rad etishda xatolik yuz berdi');
    } finally {
      setActionLoading(null);
    }
  };

  // Faqat joriy foydalanuvchiga kelgan kiruvchi takliflar. Do'kon egasiga xodimlik takliflari kelmaydi (Qoida 3).
  const incomingInvitations = isEffectiveOwner
    ? []
    : messages.filter((m) => {
        const toEmail = (m.toUser?.email || '').toLowerCase();
        const toId = m.toUser?.id || m.toUser?.uid;
        const userEmail = (effectiveUser.email || '').toLowerCase();
        const userId = effectiveUser.id || effectiveUser.uid;
        return (
          m.type === 'staff_invitation' &&
          ((userEmail && toEmail && userEmail === toEmail) || (userId && toId && userId === toId))
        );
      });

  const pendingCount = incomingInvitations.filter((m) => m.status === 'Kutilmoqda').length;

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('uz-UZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans select-none animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                    {t('mailboxTitle', 'Pochta va Xabarlar')}
                  </h3>
                  {pendingCount > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                      {pendingCount} {t('newNotificationsCount', 'yangi')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {t('mailboxSubtitle', 'Xodimlik takliflari va do‘kon xabarlari markazi')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center px-6 pt-3 border-b border-slate-100 gap-2">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center space-x-2 pb-3 px-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                activeTab === 'inbox'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>{t('incomingInvitationsTab', 'Kiruvchi takliflar')}</span>
              {pendingCount > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-md">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center space-x-2 pb-3 px-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>{t('allMessagesTab', 'Barcha xabarlar')} ({messages.length})</span>
            </button>
          </div>

          {/* Mail Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 max-h-[60vh]">
            {activeTab === 'inbox' && (
              <>
                {incomingInvitations.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Inbox className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-700 text-sm">
                        {t('noStaffInvitations', 'Yangi xodimlik takliflari yo‘q')}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {t('noStaffInvitationsDesc', 'Admin sizning akkauntingizga taklif yuborganida, bu yerda ko‘rinadi va siz uni qabul qilishingiz mumkin bo‘ladi.')}
                      </p>
                    </div>
                  </div>
                ) : (
                  incomingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className={`p-4 sm:p-5 rounded-3xl border transition-all space-y-3.5 ${
                        inv.status === 'Kutilmoqda'
                          ? 'bg-blue-50/40 border-blue-200 shadow-sm'
                          : inv.status === 'Qabul qilindi'
                          ? 'bg-emerald-50/30 border-emerald-200/80'
                          : 'bg-slate-50/60 border-slate-200 text-slate-500'
                      }`}
                    >
                      {/* Invitation Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                            <Store className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-900 text-sm">
                                {inv.storeName}
                              </h4>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 capitalize">
                                {inv.storeType || t('store', 'Do‘kon')}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formatDate(inv.createdAt)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {inv.status === 'Kutilmoqda' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                              {t('waitingOrders', 'Kutilmoqda')}
                            </span>
                          )}
                          {inv.status === 'Qabul qilindi' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {t('stageReceived', 'Qabul qilindi')}
                            </span>
                          )}
                          {inv.status === 'Rad etildi' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              {t('invitationRejectedTitle', 'Rad etildi')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Invitation Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-2xl bg-white border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {t('invitationFromAccount', 'Taklif yuborgan akkaunt:')}
                          </span>
                          <span className="font-extrabold text-slate-800 mt-0.5 block truncate">
                            {inv.fromUser?.name || t('roleOwner', 'Do‘kon egasi')}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium truncate block">
                            {inv.fromUser?.email}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-2xl bg-white border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {t('initialAssignedRole', 'Boshlang‘ich biriktiriladigan rol:')}
                          </span>
                          <span className="font-extrabold text-blue-700 mt-0.5 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {t('staffAutoAssigned', 'Xodim (avtomatik tayinlanadi)')}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {t('roleChangeNotice', 'Taklif qabul qilingach admin rolni o‘zgartirishi mumkin')}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons for Pending Invitations */}
                      {inv.status === 'Kutilmoqda' && (
                        <div className="flex items-center space-x-3 pt-1">
                          <button
                            type="button"
                            onClick={() => handleReject(inv)}
                            disabled={actionLoading === inv.id}
                            className="flex-1 py-2.5 px-4 rounded-2xl bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <UserX className="w-4 h-4" />
                            <span>{t('rejectInvitation', 'Rad etish')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAccept(inv)}
                            disabled={actionLoading === inv.id}
                            className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>{t('acceptInvitation', 'Qabul qilish')}</span>
                          </button>
                        </div>
                      )}

                      {/* Feedback for Responded Status */}
                      {inv.status === 'Qabul qilindi' && (
                        <div className="p-2.5 rounded-2xl bg-emerald-100/60 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            {t('joinedAsStaffNotice', 'Siz ushbu do‘konga xodim sifatida qo‘shilgansiz.')}
                          </span>
                          {inv.respondedAt && (
                            <span className="text-[10px] text-emerald-700 font-bold">
                              {formatDate(inv.respondedAt)}
                            </span>
                          )}
                        </div>
                      )}

                      {inv.status === 'Rad etildi' && (
                        <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            {t('invitationRejectedNotice', 'Siz ushbu taklifni rad qilgansiz.')}
                          </span>
                          {inv.respondedAt && (
                            <span className="text-[10px] text-rose-600 font-bold">
                              {formatDate(inv.respondedAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'all' && (
              <>
                {messages.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Bell className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-700 text-sm">{t('noAllMessages', 'Xabarlar yo‘q')}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {t('mailboxSubtitle', 'Sizga yuborilgan barcha bildirishnomalar va takliflar bu yerda aks etadi.')}
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">
                            {m.title || (m.type === 'staff_invitation' ? t('staffInvitationType', 'Xodimlik taklifi') : t('notifications', 'Xabar'))}
                          </span>
                          {m.storeName && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                              {m.storeName}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatDate(m.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        {m.message ||
                          `"${m.storeName}" do‘koniga xodimlik taklifi yuborildi. Holati: ${m.status}`}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>{t('staffNameLabel', 'Yuboruvchi')}: {m.fromUser?.name || m.fromUser?.email}</span>
                        <span className="font-bold text-slate-700">{t('status', 'Holat')}: {m.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>


        </div>
      </div>
    </ModalPortal>
  );
};
