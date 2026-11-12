import React, { useState, useEffect, useMemo } from 'react';
import { ModalPortal } from '../components/ModalPortal';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Shield,
  Activity,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Search,
  UserCheck,
  Edit3,
  Send,
  Clock,
  Sparkles,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import {
  findAccountByIdentifier,
  findAccountByIdentifierAsync,
  isAccountAlreadyEmployee,
  getAllRegisteredAccounts,
  isAccountStoreOwner
} from '../services/accountService';
import {
  sendStaffInvitation,
  getAllMailMessages,
  updateEmployeeRoleInStorage
} from '../services/mailService';

export const Employees = () => {
  const { user, updateUserProfile } = useAuth();
  const {
    employees,
    addEmployee,
    deleteEmployee,
    updateEmployeeRole,
    currentStore,
    searchTargetItem,
    setSearchTargetItem,
    isEmployee,
    isOwner,
    isUnassigned,
    isItemPendingDelete,
    setItemPendingDelete
  } = useStore();
  const { t } = useLanguage();
  const { notifySuccess, notifyDelete, notifyError, notifyInfo, showUndoDelete } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [foundAccount, setFoundAccount] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isAlreadyStaff, setIsAlreadyStaff] = useState(false);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState(null);

  // Xodim kartasini bosganda ochiladigan Edit/Details modali (Talab 4)
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState(null);
  const [editingRole, setEditingRole] = useState('');
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Ushbu do'kon uchun yuborilgan kutilayotgan takliflar
  const [pendingInvitations, setPendingInvitations] = useState([]);

  useEffect(() => {
    if (searchTargetItem && searchTargetItem.type === 'employee') {
      const emp = employees.find(e => e.id === searchTargetItem.id || e.email === searchTargetItem.email || e.name === searchTargetItem.name) || searchTargetItem.item;
      if (emp) {
        setSelectedStaffForEdit(emp);
        setEditingRole(emp.role || '');
      }
      setSearchTargetItem(null);
    }
  }, [searchTargetItem, employees, setSearchTargetItem]);

  // Filtrlangan xodimlar: do'kon egasining o'zi xodim kartasi sifatida chiqmaydi (Step 2 talabi)
  const displayEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        if (isItemPendingDelete(emp.id)) return false;
        const isOwnerHimself =
          (currentStore?.ownerId && (emp.accountId === currentStore.ownerId || emp.userId === currentStore.ownerId || emp.id === currentStore.ownerId)) ||
          (currentStore?.ownerEmail && emp.email && emp.email.trim().toLowerCase() === currentStore.ownerEmail.trim().toLowerCase()) ||
          (user?.id && (emp.accountId === user.id || emp.userId === user.id || emp.id === user.id)) ||
          (user?.email && emp.email && emp.email.trim().toLowerCase() === user.email.trim().toLowerCase());
        return !isOwnerHimself;
      })
      .map((emp) => {
        if (emp.role === "Do'kon egasi" || emp.role === "Do‘kon egasi" || emp.role === "Magazin egasi") {
          return { ...emp, role: "Xodim" };
        }
        return emp;
      });
  }, [employees, currentStore, user, isItemPendingDelete]);

  const MAX_SLOTS = 7;
  const currentCount = displayEmployees.length;
  const availableSlots = MAX_SLOTS - currentCount;

  const [accountsVersion, setAccountsVersion] = useState(0);

  useEffect(() => {
    const handleAccountsUpdate = () => {
      setAccountsVersion((v) => v + 1);
    };
    window.addEventListener('savatchi_account_registered', handleAccountsUpdate);
    window.addEventListener('storage', handleAccountsUpdate);
    return () => {
      window.removeEventListener('savatchi_account_registered', handleAccountsUpdate);
      window.removeEventListener('storage', handleAccountsUpdate);
    };
  }, []);

  // Mavjud barcha ro'yxatdan o'tgan akkauntlar
  const allAccounts = useMemo(() => {
    return getAllRegisteredAccounts();
  }, [accountsVersion]);

  const candidateAccounts = useMemo(() => {
    return allAccounts.filter((acc) => {
      if (isAccountAlreadyEmployee(acc, displayEmployees)) return false;
      const accEmail = (acc.email || '').trim().toLowerCase();
      const uEmail = (user?.email || '').trim().toLowerCase();
      if (accEmail && uEmail && accEmail === uEmail) return false;
      if (isAccountStoreOwner(acc)) return false;
      return true;
    });
  }, [allAccounts, displayEmployees, user]);

  const loadPendingInvitations = () => {
    if (!currentStore?.id) return;
    const allMsgs = getAllMailMessages();
    const pending = allMsgs.filter(
      (m) => m.type === 'staff_invitation' && m.storeId === currentStore.id && m.status === 'Kutilmoqda'
    );
    setPendingInvitations(pending);
  };

  useEffect(() => {
    loadPendingInvitations();
    const handleMailUpdate = () => {
      loadPendingInvitations();
    };
    window.addEventListener('savatchi_mail_updated', handleMailUpdate);
    window.addEventListener('savatchi_invitation_accepted', handleMailUpdate);
    window.addEventListener('savatchi_invitation_rejected', handleMailUpdate);
    return () => {
      window.removeEventListener('savatchi_mail_updated', handleMailUpdate);
      window.removeEventListener('savatchi_invitation_accepted', handleMailUpdate);
      window.removeEventListener('savatchi_invitation_rejected', handleMailUpdate);
    };
  }, [currentStore?.id]);

  const handleCloseAdd = () => {
    setIsAddOpen(false);
    setSearchQuery('');
    setFoundAccount(null);
    setSearchError('');
    setIsAlreadyStaff(false);
    setHasPendingInvite(false);
  };

  const handlePerformSearch = async (explicitQuery) => {
    const q = (explicitQuery !== undefined ? explicitQuery : searchQuery).trim();
    if (!q) {
      setFoundAccount(null);
      setIsAlreadyStaff(false);
      setHasPendingInvite(false);
      setSearchError(
        t(
          'accountNotFoundStaff',
          'Bunday akkaunt mavjud emas. Foydalanuvchi avval akkaunt yaratishi kerak.'
        )
      );
      return null;
    }

    // 1. Avval mahalliy keshdan sinxron qidirish (tezkor javob)
    let account = findAccountByIdentifier(q);

    // 2. Agar mahalliy keshda topilmasa, Supabase clouddan qidirish (multi-device)
    if (!account) {
      try {
        account = await findAccountByIdentifierAsync(q);
      } catch (e) {
        // Cloud xatolik bo'lsa, sinxron qidiruv natijasiga qaytamiz
      }
    }

    if (!account) {
      setFoundAccount(null);
      setIsAlreadyStaff(false);
      setHasPendingInvite(false);
      setSearchError(
        t(
          'accountNotFoundStaff',
          'Bunday akkaunt mavjud emas. Foydalanuvchi avval akkaunt yaratishi kerak.'
        )
      );
      return null;
    }

    // 0. Do'kon egasini xodimlikka taklif qilish qat'iyan taqiqlanadi (Qoida 3)
    if (isAccountStoreOwner(account)) {
      setFoundAccount(null);
      setIsAlreadyStaff(false);
      setHasPendingInvite(false);
      setSearchError("Ushbu foydalanuvchi allaqachon do‘kon egasi hisoblanadi va xodim sifatida taklif qilinishi mumkin emas!");
      return null;
    }

    // O'zini o'zi taklif qilishni taqiqlash
    const userEmail = (user?.email || '').trim().toLowerCase();
    const userId = user?.id || user?.uid;
    const aEmail = (account.email || '').trim().toLowerCase();
    const aId = account.id || account.uid;
    if ((userEmail && aEmail && userEmail === aEmail) || (userId && aId && userId === aId)) {
      setFoundAccount(null);
      setIsAlreadyStaff(false);
      setHasPendingInvite(false);
      setSearchError("O‘zingizni xodim sifatida taklif qila olmaysiz!");
      return null;
    }

    setFoundAccount(account);
    const alreadyStaff = isAccountAlreadyEmployee(account, employees);
    setIsAlreadyStaff(alreadyStaff);

    // Taklif allaqachon yuborilganligini tekshirish
    const allMsgs = getAllMailMessages();
    const targetEmail = (account.email || '').trim().toLowerCase();
    const targetId = account.id || account.uid;
    const pending = allMsgs.some((m) => {
      if (m.type !== 'staff_invitation' || m.status !== 'Kutilmoqda' || m.storeId !== currentStore.id) {
        return false;
      }
      const toEmail = (m.toUser?.email || '').trim().toLowerCase();
      const toId = m.toUser?.id || m.toUser?.uid;
      return (targetEmail && toEmail && targetEmail === toEmail) || (targetId && toId && targetId === toId);
    });
    setHasPendingInvite(pending);

    if (alreadyStaff) {
      setSearchError(t('accountAlreadyStaff', 'Bu akkaunt allaqachon xodimlar ro‘yxatida.'));
    } else if (pending) {
      setSearchError(t('inviteAlreadyPending', 'Ushbu akkauntga allaqachon taklif yuborilgan. Foydalanuvchi tasdiqlashi kutilmoqda.'));
    } else {
      setSearchError('');
    }

    return account;
  };

  /**
   * Admin xodimlik taklifini yuboradi (Talab 2)
   */
  const handleSendInvitationSubmit = async (e) => {
    e.preventDefault();
    setSearchError('');

    let account = foundAccount;
    if (!account) {
      account = await handlePerformSearch();
      if (!account) return;
    }

    if (isAccountAlreadyEmployee(account, employees)) {
      setIsAlreadyStaff(true);
      setSearchError(t('accountAlreadyStaff', 'Bu akkaunt allaqachon xodimlar ro‘yxatida.'));
      return;
    }

    if (isAccountStoreOwner(account)) {
      setSearchError("Ushbu foydalanuvchi allaqachon do‘kon egasi hisoblanadi va xodim sifatida taklif qilinishi mumkin emas!");
      return;
    }

    if (availableSlots <= 0) {
      setSearchError(t('staffLimitReached', 'Do‘konda maksimal 7 ta xodim sig‘imi to‘lgan!'));
      return;
    }

    try {
      sendStaffInvitation({
        storeId: currentStore.id,
        storeName: currentStore.name,
        storeType: currentStore.type,
        fromUser: user || { id: user?.id || 'usr-owner', name: user?.displayName || 'Do‘kon egasi', email: user?.email || '' },
        targetAccount: account
      });

      const fullName =
        account.displayName ||
        `${account.firstName || ''} ${account.lastName || ''}`.trim() ||
        account.email;

      notifySuccess(
        t('staffInviteSentTitle', 'Xodimlik taklifi yuborildi!'),
        `${fullName} ${t('staffInviteSentDesc', 'akkauntining Pochta bo‘limiga taklif yuborildi. U qabul qilgach, avtomatik ravishda jamoaga qo‘shiladi.')}`
      );

      loadPendingInvitations();
      handleCloseAdd();
    } catch (err) {
      setSearchError(err.message || t('inviteSendError', 'Taklif yuborishda xatolik yuz berdi'));
    }
  };

  /**
   * Admin xodimning kartasini bosganda ochiladigan modal (Talab 4)
   */
  const handleOpenStaffDetails = (emp) => {
    setSelectedStaffForEdit(emp);
    setEditingRole(emp.role || 'Xodim');
  };

  const handleCloseStaffDetails = () => {
    setSelectedStaffForEdit(null);
    setEditingRole('');
  };

  /**
   * Admin rol nomini o'zi yozib saqlaydi (Talab 4 va 5)
   */
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!selectedStaffForEdit) return;

    const trimmedRole = editingRole.trim();
    if (!trimmedRole) {
      notifyError('Xatolik', 'Rol nomini kiritish shart! Matn maydoni bo‘sh bo‘lishi mumkin emas.');
      return;
    }

    if (trimmedRole === "Do'kon egasi" || trimmedRole === "Do‘kon egasi" || trimmedRole === "Magazin egasi") {
      notifyError('Xatolik', 'Xodimga do‘kon egasi rolini berib bo‘lmaydi! Xodim uchun mos lavozim kiriting (masalan: Kassir, Omborchi, Menejer, Sotuvchi).');
      return;
    }

    setIsSavingRole(true);
    try {
      // 1. StoreContext orqali yangilash
      if (updateEmployeeRole) {
        updateEmployeeRole(selectedStaffForEdit.id, trimmedRole, user?.displayName || 'Admin');
      }

      // 2. Storage qatlamiga qat'iy yozish
      updateEmployeeRoleInStorage(currentStore.id, selectedStaffForEdit.id, trimmedRole);

      notifySuccess(
        'Rol muvaffaqiyatli saqlandi!',
        `${selectedStaffForEdit.name} uchun yangi rol: "${trimmedRole}" saqlandi.`
      );

      handleCloseStaffDetails();
    } catch (err) {
      notifyError('Xatolik', err.message || 'Rolni saqlashda xatolik yuz berdi');
    } finally {
      setIsSavingRole(false);
    }
  };

  const getRoleBadge = (r) => {
    if (r === 'Do‘kon egasi' || r === 'Admin' || r === 'Magazin egasi') {
      return 'bg-purple-50 text-purple-700 border-purple-200/80';
    }
    if (r === 'Xodim') {
      return 'bg-blue-50 text-blue-700 border-blue-200/80';
    }
    if (r === 'Kassir') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
    if (r === 'Ombor mudiri' || r === 'Omborchi') {
      return 'bg-amber-50 text-amber-700 border-amber-200/80';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
  };

  if (isEmployee) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto mt-12 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Shield className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Ruxsat cheklangan</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Xodimlarni boshqarish va yangi xodim taklif qilish faqat do‘kon egasi yoki administrator uchun mo‘ljallangan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans select-none max-w-[1600px] mx-auto">
      {/* Top Header & Add Employee Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>{t('staffTitle', 'XODIMLAR VA ROLLARI')}</span>
            <span className="text-xs font-black px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 shadow-xs">
              {currentCount} / {MAX_SLOTS} {t('slotsCapacityText', 'xodim')}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Xodimlarni boshqaring. Rol nomini o‘zgartirish uchun istalgan xodim kartasini bosing.
          </p>
        </div>

        <button
          onClick={() => {
            if (!isOwner) {
              notifyInfo("Xodimlarni boshqarish faqat do‘kon egasi vakolatiga ega foydalanuvchilar uchun ruxsat etiladi.");
              return;
            }
            setIsAddOpen(true);
          }}
          disabled={availableSlots <= 0 || !isOwner}
          className={`font-extrabold text-xs sm:text-sm py-3.5 px-6 rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all ${availableSlots > 0 && isOwner
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/25 active:scale-[0.98] cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          title={!isOwner ? "Xodim qo‘shish faqat do‘kon egasi uchun ruxsat etilgan" : undefined}
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>{t('btnAddStaff', 'Xodim qo‘shish')}</span>
        </button>
      </div>

      {/* Roli belgilanmagan foydalanuvchi uchun yo'l-yo'riq banneri */}
      {!isOwner && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Sizda hozircha ushbu do‘konga nisbatan boshqaruv vakolati yo‘q. Xodimlarni qo‘shish, o‘chirish va boshqarish faqat do‘kon egasi uchun ruxsat etiladi.
            </span>
          </div>
        </div>
      )}

      {/* Slots Capacity Box (Max 7 Slots Rule) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-base border border-blue-100 shrink-0">
            {currentCount}/{MAX_SLOTS}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Jamoa a’zolari sig‘imi
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tarif bo‘yicha maksimal {MAX_SLOTS} tagacha xodim biriktirishingiz mumkin.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {Array.from({ length: MAX_SLOTS }).map((_, index) => (
            <div
              key={index}
              className={`h-3 w-8 sm:w-10 rounded-full transition-all ${index < currentCount ? 'bg-blue-600' : 'bg-slate-100'
                }`}
            />
          ))}
          <span className="text-xs font-bold text-slate-600 pl-2">
            {availableSlots} {t('availableSlotsText', 'bo‘sh o‘rin')}
          </span>
        </div>
      </div>

      {/* Yuborilgan takliflar (Kutilmoqda) bloki */}
      {pendingInvitations.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/70 via-white to-blue-50/40 p-5 sm:p-6 rounded-3xl border border-amber-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                  Yuborilgan takliflar ({pendingInvitations.length})
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Ushbu foydalanuvchilar o‘z Pochta bo‘limida taklifni qabul qilgach, avtomatik ravishda faol xodim bo‘lib qo‘shiladi.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              Kutilmoqda
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900 text-xs truncate">
                    {inv.toUser?.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {inv.toUser?.email}
                  </div>
                  <div className="text-[10px] text-blue-600 font-bold mt-1">
                    Boshlang‘ich rol: "Xodim"
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                  Pochtaga yuborilgan
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee Cards Grid yoki Bo'sh holat */}
      {displayEmployees.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/80 shadow-xs flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base sm:text-lg font-black text-slate-800">
              Ushbu do‘konda hali birorta ham xodim mavjud emas
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Hozircha do‘konga biriktirilgan faol xodimlar ro‘yxati bo‘sh. {isOwner ? 'Yangi xodim qo‘shish uchun yuqoridagi "Xodim qo‘shish" tugmasini bosing.' : 'Xodimlarni boshqarish faqat do‘kon egasi uchun ruxsat etiladi.'}
            </p>
          </div>
          {isOwner && availableSlots > 0 && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Xodim taklif qilish</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayEmployees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => {
                if (isOwner) {
                  handleOpenStaffDetails(emp);
                }
              }}
              className={`bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs transition-all flex flex-col justify-between group relative overflow-hidden ${isOwner ? 'hover:shadow-md hover:border-blue-300 cursor-pointer' : 'cursor-default'
                }`}
              title={isOwner ? "Xodim ma’lumotlari va rolini o‘zgartirish uchun bosing" : undefined}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl ${emp.bg || 'bg-blue-600'} text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0 overflow-hidden`}
                  >
                    {emp.photoURL ? (
                      <img src={emp.photoURL} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      emp.avatar || emp.name?.charAt(0) || 'X'
                    )}
                  </div>
                  <div>
                    <h3 className={`font-black text-slate-900 text-base leading-snug ${isOwner ? 'group-hover:text-blue-600' : ''} transition-colors`}>
                      {emp.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border inline-block ${getRoleBadge(emp.role)}`}>
                        {emp.role}
                      </span>
                      {isOwner && (
                        <span className="text-[10px] text-slate-400 group-hover:text-blue-500 font-medium flex items-center gap-0.5">
                          <Edit3 className="w-3 h-3" />
                          O‘zgartirish
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingStaff(emp);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title={t('delete', 'O‘chirish')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email:
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[170px]">{emp.email}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Telefon:
                  </span>
                  <span className="font-semibold text-slate-800">{emp.phone || '+998 90 000 00 00'}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Faollik:
                  </span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {emp.lastActivity || 'Hozir faol'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff / Send Invitation Modal (Talab 2) */}
      {isAddOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  {t('btnAddStaff', 'Xodim qo‘shish (Taklif yuborish)')}
                </h3>
                <button
                  onClick={handleCloseAdd}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error / Warning Banner */}
              {searchError && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold flex items-start space-x-2.5 animate-in fade-in duration-150 ${isAlreadyStaff || hasPendingInvite
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}
                >
                  <AlertCircle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${isAlreadyStaff || hasPendingInvite ? 'text-amber-600' : 'text-rose-600'
                      }`}
                  />
                  <span className="leading-relaxed">{searchError}</span>
                </div>
              )}

              <form onSubmit={handleSendInvitationSubmit} className="space-y-4 text-xs">
                {/* Account Search Input */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">
                    {t('searchStaffAccountLabel', 'Akkauntni qidirish (Email, telefon yoki ID)')} *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        autoFocus
                        placeholder={t(
                          'searchStaffAccountPlaceholder',
                          'Masalan: jasur@savatchi.uz yoki +998 93 111 22 33'
                        )}
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (searchError) setSearchError('');
                          if (foundAccount) setFoundAccount(null);
                          if (isAlreadyStaff) setIsAlreadyStaff(false);
                          if (hasPendingInvite) setHasPendingInvite(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!foundAccount) {
                              handlePerformSearch();
                            } else if (!isAlreadyStaff && !hasPendingInvite) {
                              handleSendInvitationSubmit(e);
                            }
                          }
                        }}
                        className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePerformSearch()}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-2xl transition-all cursor-pointer shrink-0 text-xs shadow-sm shadow-blue-600/20"
                    >
                      {t('btnCheckAccount', 'Tekshirish')}
                    </button>
                  </div>
                </div>

                {/* Quick candidate accounts suggestions */}
                {candidateAccounts.length > 0 && !foundAccount && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="text-[11px] font-bold text-slate-400">
                      Tizimdagi mavjud akkauntlar:
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {candidateAccounts.slice(0, 5).map((acc) => (
                        <button
                          key={acc.id || acc.email}
                          type="button"
                          onClick={() => {
                            setSearchQuery(acc.email);
                            handlePerformSearch(acc.email);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 rounded-xl text-[11px] font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate max-w-[130px]">
                            {acc.displayName || acc.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verified Account Details Card */}
                {foundAccount && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        {t('accountFoundTitle', 'Mavjud akkaunt ma’lumotlari')}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('verifiedAccountBadge', 'Tizimda mavjud akkaunt')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-11 h-11 rounded-2xl ${foundAccount.bg || 'bg-blue-600'
                          } text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0 overflow-hidden`}
                      >
                        {foundAccount.photoURL ? (
                          <img
                            src={foundAccount.photoURL}
                            alt={foundAccount.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          foundAccount.avatar ||
                          (foundAccount.displayName
                            ? foundAccount.displayName.charAt(0).toUpperCase()
                            : 'U')
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                          {foundAccount.displayName ||
                            `${foundAccount.firstName || ''} ${foundAccount.lastName || ''}`.trim() ||
                            foundAccount.email}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {foundAccount.email || 'Email kiritilmagan'}
                          </span>
                        </p>
                        {foundAccount.phone && (
                          <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{foundAccount.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Automatic Initial Role Notice (Talab 3) */}
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800 space-y-1">
                      <div className="font-extrabold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        Boshlang‘ich rol: "Xodim" (Avtomatik beriladi)
                      </div>
                      <p className="text-slate-500 text-[10px] leading-relaxed">
                        Foydalanuvchi o‘z pochtasida taklifni qabul qilgach, avtomatik ravishda "Xodim" roli bilan jamoaga qo‘shiladi. Keyin siz uning rolini o‘zingiz xohlagancha o‘zgartirishingiz mumkin.
                      </p>
                    </div>
                  </div>
                )}

                {/* Form Action Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseAdd}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {t('cancel', 'Bekor qilish')}
                  </button>
                  <button
                    type="submit"
                    disabled={!foundAccount || isAlreadyStaff || hasPendingInvite || availableSlots <= 0}
                    className={`flex-1 py-3 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${foundAccount && !isAlreadyStaff && !hasPendingInvite && availableSlots > 0
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 active:scale-[0.98]'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Xodimlik taklifini yuborish</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Detail & Edit Role Modal (Talab 4 va 5) */}
      {selectedStaffForEdit && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150"
            onClick={handleCloseStaffDetails}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-100 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    Xodim ma’lumotlari va Rolni boshqarish
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Rol nomini oddiy matn maydoniga o‘zingiz yozing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseStaffDetails}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Staff Profile Card */}
              <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div
                  className={`w-12 h-12 rounded-2xl ${selectedStaffForEdit.bg || 'bg-blue-600'
                    } text-white font-black text-sm flex items-center justify-center shadow-md shrink-0 overflow-hidden`}
                >
                  {selectedStaffForEdit.photoURL ? (
                    <img
                      src={selectedStaffForEdit.photoURL}
                      alt={selectedStaffForEdit.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    selectedStaffForEdit.avatar || selectedStaffForEdit.name?.charAt(0) || 'X'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-slate-900 text-sm truncate">
                    {selectedStaffForEdit.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {selectedStaffForEdit.email}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    {selectedStaffForEdit.phone || '+998 90 000 00 00'}
                  </p>
                </div>
              </div>

              {/* Edit Role Form — Qat'iy talab 4: Dropdown yo'q, faqat oddiy matn maydoni! */}
              <form onSubmit={handleSaveRole} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="font-bold text-slate-800 block mb-1.5">
                    Rol / Lavozim nomi *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Masalan: Sotuvchi, Kassir, Omborchi, Boshqaruvchi..."
                    value={editingRole}
                    onChange={(e) => setEditingRole(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <div className="mt-2 text-[11px] text-slate-500 leading-relaxed space-y-1">
                    <p className="font-medium text-slate-600">
                      • Rol nomini matn maydoniga o‘zingiz yozing.
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      (Tayyor ro‘yxat mavjud emas — admin o‘zi xohlagan ixtiyoriy rolni yozishi mumkin: Sotuvchi, Kassir, Omborchi, Boshqaruvchi, Katta sotuvchi va h.k.)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseStaffDetails}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {t('cancel', 'Bekor qilish')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingRole || !editingRole.trim()}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingRole ? 'Saqlanmoqda...' : t('save', 'Saqlash')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Staff Confirmation Modal */}
      {deletingStaff && (
        <ModalPortal>
          <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                  {t('deleteStaffConfirmTitle', 'Xodimni tizimdan o‘chirmoqchimisiz?')}
                </h3>
                <p className="text-xs text-slate-600 font-semibold">{deletingStaff.name} ({deletingStaff.role})</p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingStaff(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t('cancel', 'Bekor qilish')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetStaff = deletingStaff;
                    setDeletingStaff(null);
                    if (!targetStaff || isItemPendingDelete(targetStaff.id)) return;

                    // 1. Vaqtincha interfeysdan yashirish (bazaga tegilmaydi)
                    setItemPendingDelete(targetStaff.id, true);

                    // 2. 5 soniyalik bekor qilish bildirishnomasini ko'rsatish
                    showUndoDelete({
                      title: 'Xodim o‘chirilmoqda...',
                      seconds: 5,
                      successMessage: 'Xodim muvaffaqiyatli o‘chirildi.',
                      onUndo: () => {
                        setItemPendingDelete(targetStaff.id, false);
                      },
                      onCommit: async () => {
                        try {
                          await deleteEmployee(targetStaff.id);
                          setItemPendingDelete(targetStaff.id, false);
                        } catch (err) {
                          setItemPendingDelete(targetStaff.id, false);
                          throw err;
                        }
                      }
                    });
                  }}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
                >
                  {t('delete', 'O‘chirish')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
