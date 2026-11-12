// src/context/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  LogOut,
  Trash2,
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';

const ToastContext = createContext();

// Vaqt doimiylari:
// 250 ms kirish animatsiyasi + 2500 ms ko'rinib turish + 250 ms chiqish animatsiyasi = Jami aynan 3000 ms
export const TOTAL_TOAST_DURATION = 3000;
export const ANIMATION_DURATION = 250;
export const VISIBLE_DURATION = 2500;
export const DEFAULT_TOAST_DURATION = TOTAL_TOAST_DURATION;

export const ToastProvider = ({ children }) => {
  const [currentToast, setCurrentToast] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const [undoToast, setUndoToast] = useState(null);

  const queueRef = useRef([]);
  const isDisplayingRef = useRef(false);
  const isExitingRef = useRef(false);
  const exitTimerRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const recentToastsRef = useRef([]); // Oxirgi 2 soniyadagi yuborilgan xabarlar (deduplication)

  const undoTimerRef = useRef(null);
  const undoIntervalRef = useRef(null);
  const activeUndoRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  // Navbatdagi keyingi xabarni ko'rsatish
  const displayNextToast = useCallback(() => {
    clearTimers();

    if (queueRef.current.length === 0) {
      isDisplayingRef.current = false;
      isExitingRef.current = false;
      setIsExiting(false);
      setCurrentToast(null);
      return;
    }

    const nextToast = queueRef.current.shift();
    isDisplayingRef.current = true;
    isExitingRef.current = false;
    setIsExiting(false);
    setCurrentToast(nextToast);

    const totalDuration = nextToast.duration || TOTAL_TOAST_DURATION;
    const exitStartTime = Math.max(0, totalDuration - ANIMATION_DURATION); // 2750 ms

    // 1. 2750 ms da mayin chiqish animatsiyasi boshlanadi (250 ms davom etadi)
    exitTimerRef.current = setTimeout(() => {
      isExitingRef.current = true;
      setIsExiting(true);
    }, exitStartTime);

    // 2. Jami 3000 ms to'lganda chiqish animatsiyasi tugab, navbatdagi xabar chiqadi
    dismissTimerRef.current = setTimeout(() => {
      isExitingRef.current = false;
      setIsExiting(false);
      displayNextToast();
    }, totalDuration);
  }, [clearTimers]);

  // Foydalanuvchi X tugmasini bosganda mayin chiqish animatsiyasi (250 ms) bilan yopish
  const closeToast = useCallback(() => {
    if (isExitingRef.current) return;
    clearTimers();

    isExitingRef.current = true;
    setIsExiting(true);

    dismissTimerRef.current = setTimeout(() => {
      isExitingRef.current = false;
      setIsExiting(false);
      displayNextToast();
    }, ANIMATION_DURATION);
  }, [clearTimers, displayNextToast]);

  const showToast = useCallback(({
    title,
    message,
    type = 'success', // 'success' | 'logout' | 'delete' | 'sync' | 'info' | 'warning' | 'error'
    duration = DEFAULT_TOAST_DURATION,
    icon = null,
    position = 'top' // 'top' | 'center'
  }) => {
    const now = Date.now();
    const cleanTitle = (title || '').trim();
    const cleanMessage = (message || '').trim();

    // 1. Deduplication kaliti: turi + sarlavhasi + matni bo'yicha to'liq aniqlanadi
    const toastKey = `${type}::${cleanTitle}::${cleanMessage}`;

    // 2 soniyadan eski kiritilgan kalitlarni tozalaymiz
    recentToastsRef.current = recentToastsRef.current.filter(item => now - item.timestamp < 2000);

    // Agar so'nggi 2 soniya ichida aynan bir xil xabar kelgan bo'lsa -> bloklanadi
    const isDuplicate = recentToastsRef.current.some(item => item.key === toastKey);
    if (isDuplicate) {
      return;
    }

    // Agar xuddi shu xabar hozirgi navbatda turgan bo'lsa -> qayta qo'shilmaydi
    const isInQueue = queueRef.current.some(
      item => `${item.type}::${(item.title || '').trim()}::${(item.message || '').trim()}` === toastKey
    );
    if (isInQueue) {
      return;
    }

    // Yangi yozuvni ro'yxatga qo'shamiz
    recentToastsRef.current.push({ key: toastKey, timestamp: now });

    // Joylashuvni aniqlash:
    // Faqat do'kon almashtirish xabarnomasi ekranning aynan markazida (center) chiqadi.
    // Do'kon tanlash ("Do'kon tanlandi"), yangi ochish va boshqa barcha xabarlar top-center bo'ladi.
    const lowerTitle = cleanTitle.toLowerCase();
    const isStoreSwitch =
      position === 'center' ||
      ((lowerTitle.includes('do‘kon almashtirildi') ||
        lowerTitle.includes('do`kon almashtirildi') ||
        lowerTitle.includes('storeswitched')) &&
       !lowerTitle.includes('tanlandi') &&
       !lowerTitle.includes('ochildi'));

    const resolvedPosition = isStoreSwitch ? 'center' : (position || 'top');

    const newToastItem = {
      id: `${now}_${Math.random()}`,
      title: cleanTitle,
      message: cleanMessage,
      type,
      duration: duration || DEFAULT_TOAST_DURATION,
      icon,
      position: resolvedPosition
    };

    if (!isDisplayingRef.current) {
      // Hozir ekranda xabar yo'q: to'g'ridan-to'g'ri navbatga qo'yib darhol ko'rsatamiz
      queueRef.current.push(newToastItem);
      displayNextToast();
    } else {
      // Hozir ekranda xabar ko'rinmoqda: navbatga qo'shamiz (maksimal 5 ta navbat limiti)
      if (queueRef.current.length < 5) {
        queueRef.current.push(newToastItem);
      }
    }
  }, [displayNextToast]);

  // Backward-compatibility alias
  const showCenterMessage = useCallback((params) => {
    showToast({ ...params, position: 'center' });
  }, [showToast]);

  // Yordamchi xabarnoma metodlari — barchasi options qabul qiladi va 3000 ms qoidasiga bo'ysunadi
  const notifySuccess = useCallback((title, message, options = {}) => {
    showToast({ title, message, type: 'success', duration: DEFAULT_TOAST_DURATION, ...options });
  }, [showToast]);

  const notifyLogout = useCallback((title = 'Tizimdan chiqildi', message = 'Xayr! Do‘kon boshqaruv panelidan xavfsiz chiqdingiz.', options = {}) => {
    showToast({ title, message, type: 'logout', duration: DEFAULT_TOAST_DURATION, ...options });
  }, [showToast]);

  const notifyDelete = useCallback((title = 'O‘chirildi', message = 'Ma’lumot muvaffaqiyatli o‘chirildi.', options = {}) => {
    showToast({ title, message, type: 'delete', duration: DEFAULT_TOAST_DURATION, ...options });
  }, [showToast]);

  const notifySync = useCallback((title = 'Sinxronlandi!', message = 'Barcha ma’lumotlar bulut bilan muvaffaqiyatli sinxronlandi.', options = {}) => {
    showToast({ title, message, type: 'sync', duration: DEFAULT_TOAST_DURATION, ...options });
  }, [showToast]);

  const notifyInfo = useCallback((title, message, options = {}) => {
    showToast({ title, message, type: 'info', duration: DEFAULT_TOAST_DURATION, ...options });
  }, [showToast]);

  const notifyWarning = useCallback((title = 'Diqqat', message, options = {}) => {
    showToast({ title, message, type: 'warning', duration: DEFAULT_TOAST_DURATION, ...options });
  }, [showToast]);

  const notifyError = useCallback((title = 'Xatolik', message = 'Amalni bajarishda xatolik yuz berdi.', options = {}) => {
    showToast({ title, message, type: 'error', duration: DEFAULT_TOAST_DURATION, ...options });
  }, [showToast]);

  // Do'kon almashtirish uchun maxsus yordamchi metod (markazda chiqaradi)
  const notifyStoreSwitch = useCallback((title, message, options = {}) => {
    showToast({ title, message, type: 'info', position: 'center', duration: DEFAULT_TOAST_DURATION, ...options });
  }, [showToast]);

  // ─── 5 SONIYALIK O'CHIRISHNI BEKOR QILISH (UNDO DELETION) ────────────────
  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    if (undoIntervalRef.current) {
      clearInterval(undoIntervalRef.current);
      undoIntervalRef.current = null;
    }

    const session = activeUndoRef.current;
    activeUndoRef.current = null;
    setUndoToast(null);

    if (session && session.onUndo) {
      try {
        session.onUndo();
      } catch (err) {
        console.error('onUndo execution failed:', err);
      }
    }

    // Talab 2: Bildirishnoma chiqsin: "O‘chirish bekor qilindi."
    notifySuccess('O‘chirish bekor qilindi.', '');
  }, [notifySuccess]);

  const showUndoDelete = useCallback(({
    title = 'O‘chirilmoqda...',
    seconds = 5,
    onUndo,
    onCommit,
    successMessage = 'Muvaffaqiyatli o‘chirildi.'
  }) => {
    // Agar oldingi kutilayotgan o'chirish bo'lsa, uni darhol bazaga commit qilamiz
    if (activeUndoRef.current) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      const prev = activeUndoRef.current;
      activeUndoRef.current = null;
      if (prev.onCommit) {
        try {
          const res = prev.onCommit();
          if (res && typeof res.catch === 'function') res.catch(() => {});
        } catch (e) {}
      }
    }

    // Oddiy toastlarni yopamiz
    clearTimers();
    closeToast();

    const id = `${Date.now()}_undo_${Math.random()}`;
    const session = {
      id,
      title,
      seconds,
      onUndo,
      onCommit,
      successMessage
    };
    activeUndoRef.current = session;
    setUndoToast({ id, title, seconds });

    let remaining = seconds;
    undoIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setUndoToast(prev => (prev && prev.id === id ? { ...prev, seconds: remaining } : prev));
      } else {
        if (undoIntervalRef.current) {
          clearInterval(undoIntervalRef.current);
          undoIntervalRef.current = null;
        }
      }
    }, 1000);

    undoTimerRef.current = setTimeout(async () => {
      if (undoIntervalRef.current) {
        clearInterval(undoIntervalRef.current);
        undoIntervalRef.current = null;
      }
      undoTimerRef.current = null;

      const currentSession = activeUndoRef.current;
      activeUndoRef.current = null;
      setUndoToast(null);

      if (currentSession && currentSession.onCommit) {
        try {
          await currentSession.onCommit();
          // Talab 3: Muvaffaqiyatli bo‘lsa, bildirishnoma chiqsin: "{Mahsulot/Qarz/Xodim} muvaffaqiyatli o‘chirildi."
          notifyDelete(currentSession.successMessage || 'Muvaffaqiyatli o‘chirildi.', '');
        } catch (err) {
          // Talab 6: Serverdagi o‘chirish muvaffaqiyatsiz bo‘lsa, element tiklansin va xatolik bildirishnomasi ko‘rsatilsin
          if (currentSession.onUndo) {
            try { currentSession.onUndo(); } catch (e) {}
          }
          notifyError('Xatolik', err?.message || 'O‘chirishda xatolik yuz berdi.');
        }
      }
    }, seconds * 1000);
  }, [clearTimers, closeToast, notifyDelete, notifyError]);

  // Unmount bo'lganda taymerlarni xavfsiz tozalash
  useEffect(() => {
    return () => {
      clearTimers();
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, [clearTimers]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showUndoDelete,
        showCenterMessage,
        closeCenterMessage: closeToast,
        closeToast,
        notifySuccess,
        notifyLogout,
        notifyDelete,
        notifySync,
        notifyInfo,
        notifyWarning,
        notifyError,
        notifyStoreSwitch,
        TOTAL_TOAST_DURATION,
        ANIMATION_DURATION,
        VISIBLE_DURATION,
        DEFAULT_TOAST_DURATION
      }}
    >
      {children}
      {/* 5-soniyalik bekor qilish bildirishnomasi (Top-Center) */}
      {undoToast ? (
        <UndoToastBanner
          key={undoToast.id}
          data={undoToast}
          onUndo={handleUndo}
        />
      ) : currentToast ? (
        <ToastBanner
          key={currentToast.id}
          data={currentToast}
          isExiting={isExiting}
          onClose={closeToast}
        />
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// ─── TOAST BANNER (TOP-CENTER VA CENTER-SCREEN IXCHAM TOAST) ─────────────────
export const ToastBanner = ({ data, isExiting, onClose }) => {
  const {
    title,
    message,
    type,
    icon,
    position = 'top' // 'top' | 'center'
  } = data;

  const getTypeStyles = () => {
    switch (type) {
      case 'logout':
        return {
          iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
          borderColor: 'border-rose-200/80 dark:border-rose-900/50',
          accentColor: 'bg-rose-500',
          IconComp: LogOut
        };
      case 'delete':
        return {
          iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
          borderColor: 'border-rose-200/80 dark:border-rose-900/50',
          accentColor: 'bg-rose-500',
          IconComp: Trash2
        };
      case 'sync':
        return {
          iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
          borderColor: 'border-blue-200/80 dark:border-blue-900/50',
          accentColor: 'bg-blue-500',
          IconComp: RefreshCw
        };
      case 'info':
        return {
          iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
          borderColor: 'border-sky-200/80 dark:border-sky-900/50',
          accentColor: 'bg-sky-500',
          IconComp: Info
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
          borderColor: 'border-amber-200/80 dark:border-amber-900/50',
          accentColor: 'bg-amber-500',
          IconComp: AlertTriangle
        };
      case 'error':
        return {
          iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
          borderColor: 'border-rose-200/80 dark:border-rose-900/50',
          accentColor: 'bg-rose-600',
          IconComp: AlertCircle
        };
      case 'success':
      default:
        return {
          iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
          borderColor: 'border-emerald-200/80 dark:border-emerald-900/50',
          accentColor: 'bg-emerald-500',
          IconComp: CheckCircle2
        };
    }
  };

  const styleConfig = getTypeStyles();
  const IconComponent = icon || styleConfig.IconComp;
  const isCenter = position === 'center';

  // Container joylashuvi:
  // - Center: Ekranning markazida, ixcham toast. Hech qanday qora overlay yoki backdrop blur yo'q,
  //   pointer-events-none orqali foydalanuvchi orqa fondagi interfeys bilan bemalol ishlay oladi.
  // - Top: Ekranning yuqori markazida (top-center), mobile safe-area bilan moslashgan, pointer-events-none.
  const containerClasses = isCenter
    ? 'fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none px-4 select-none'
    : 'fixed top-4 sm:top-5 inset-x-0 z-[99999] flex flex-col items-center pointer-events-none px-3 pt-[env(safe-area-inset-top,0px)] select-none';

  // Faqat ikkita mayin animatsiya: 250 ms kirish (opacity + kichik translate) va 250 ms chiqish
  const animationClass = isCenter
    ? (isExiting ? 'toast-exit-center' : 'toast-enter-center')
    : (isExiting ? 'toast-exit-top' : 'toast-enter-top');

  return (
    <div
      className={containerClasses}
      role="status"
      aria-live="polite"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`pointer-events-auto flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 border ${styleConfig.borderColor} max-w-[92vw] sm:max-w-md w-auto relative overflow-hidden ${animationClass}`}
      >
        {/* Left Icon Avatar */}
        <div className={`w-8 h-8 rounded-xl ${styleConfig.iconBg} flex items-center justify-center shrink-0`}>
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
            {title}
          </div>
          {message && (
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug line-clamp-2 mt-0.5">
              {message}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          title="Yopish"
          aria-label="Xabarnomani yopish"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// Backward-compatibility export
export const TopCenterToast = ToastBanner;

// ─── UNDO TOAST BANNER (5 SONIYALIK O'CHIRISHNI BEKOR QILISH BILDIRISHNOMASI) ─
export const UndoToastBanner = ({ data, onUndo }) => {
  if (!data) return null;
  const { title, seconds } = data;

  return (
    <div
      className="fixed top-4 sm:top-5 inset-x-0 z-[99999] flex flex-col items-center pointer-events-none px-3 pt-[env(safe-area-inset-top,0px)] select-none"
      role="alert"
      aria-live="assertive"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto flex items-center gap-2.5 sm:gap-3.5 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/90 dark:border-slate-800 max-w-[92vw] sm:max-w-md w-auto relative overflow-hidden animate-in fade-in slide-in-from-top-3"
      >
        {/* Left Icon Avatar */}
        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Trash2 className="w-4 h-4 animate-pulse" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
            {title}
          </div>
        </div>

        {/* 5-soniya taymer */}
        <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black tracking-tight shrink-0 flex items-center gap-1 font-mono">
          <span>{seconds} soniya</span>
        </div>

        {/* Bekor qilish tugmasi */}
        <button
          type="button"
          onClick={onUndo}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black shadow-md shadow-blue-600/25 transition-all shrink-0 cursor-pointer"
        >
          Bekor qilish
        </button>
      </div>
    </div>
  );
};
