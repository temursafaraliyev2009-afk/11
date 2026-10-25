// src/context/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  LogOut,
  Trash2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  X
} from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [centerMessage, setCenterMessage] = useState(null);
  const timerRef = useRef(null);

  const closeCenterMessage = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCenterMessage(null);
  }, []);

  const showCenterMessage = useCallback(({
    title,
    message,
    type = 'success', // 'success' | 'logout' | 'delete' | 'sync' | 'info' | 'warning' | 'error'
    duration = 2400,
    icon = null,
    onConfirm = null,
    showConfirm = false,
    confirmText = 'Tasdiqlash',
    cancelText = 'Bekor qilish'
  }) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setCenterMessage({
      title,
      message,
      type,
      duration,
      icon,
      onConfirm,
      showConfirm,
      confirmText,
      cancelText
    });

    if (!showConfirm && duration > 0) {
      timerRef.current = setTimeout(() => {
        setCenterMessage(null);
      }, duration);
    }
  }, []);

  // Quick helper shortcuts
  const notifySuccess = useCallback((title, message) => {
    showCenterMessage({ title, message, type: 'success' });
  }, [showCenterMessage]);

  const notifyLogout = useCallback((title = 'Tizimdan chiqildi', message = 'Xayr! Do‘kon boshqaruv panelidan xavfsiz chiqdingiz.') => {
    showCenterMessage({ title, message, type: 'logout', duration: 1800 });
  }, [showCenterMessage]);

  const notifyDelete = useCallback((title = 'O‘chirildi', message = 'Ma’lumot muvaffaqiyatli o‘chirildi.') => {
    showCenterMessage({ title, message, type: 'delete' });
  }, [showCenterMessage]);

  const notifySync = useCallback((title = 'Sinxronlandi!', message = 'Barcha ma’lumotlar bulut bilan muvaffaqiyatli sinxronlandi.') => {
    showCenterMessage({ title, message, type: 'sync', duration: 2500 });
  }, [showCenterMessage]);

  const notifyInfo = useCallback((title, message) => {
    showCenterMessage({ title, message, type: 'info' });
  }, [showCenterMessage]);

  const notifyError = useCallback((title = 'Xatolik', message = 'Amalni bajarishda xatolik yuz berdi.') => {
    showCenterMessage({ title, message, type: 'error', duration: 3200 });
  }, [showCenterMessage]);

  return (
    <ToastContext.Provider
      value={{
        showCenterMessage,
        closeCenterMessage,
        notifySuccess,
        notifyLogout,
        notifyDelete,
        notifySync,
        notifyInfo,
        notifyError
      }}
    >
      {children}
      {/* Center Screen Notification Overlay */}
      {centerMessage && (
        <CenterNotificationModal
          data={centerMessage}
          onClose={closeCenterMessage}
        />
      )}
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

// Center Notification Modal Component
const CenterNotificationModal = ({ data, onClose }) => {
  const {
    title,
    message,
    type,
    duration,
    icon,
    showConfirm,
    onConfirm,
    confirmText,
    cancelText
  } = data;

  const getTypeStyles = () => {
    switch (type) {
      case 'logout':
        return {
          iconBg: 'bg-gradient-to-tr from-rose-500 to-red-600 shadow-rose-500/30 ring-rose-200',
          borderAccent: 'border-t-4 border-t-rose-500',
          IconComp: LogOut,
          btnColor: 'bg-rose-600 hover:bg-rose-700 text-white'
        };
      case 'delete':
        return {
          iconBg: 'bg-gradient-to-tr from-rose-500 to-red-600 shadow-rose-500/30 ring-rose-200',
          borderAccent: 'border-t-4 border-t-rose-500',
          IconComp: Trash2,
          btnColor: 'bg-rose-600 hover:bg-rose-700 text-white'
        };
      case 'sync':
        return {
          iconBg: 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/30 ring-blue-200',
          borderAccent: 'border-t-4 border-t-blue-500',
          IconComp: RefreshCw,
          spinIcon: true,
          btnColor: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'info':
        return {
          iconBg: 'bg-gradient-to-tr from-blue-500 to-cyan-500 shadow-blue-500/30 ring-blue-200',
          borderAccent: 'border-t-4 border-t-blue-500',
          IconComp: Info,
          btnColor: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'warning':
        return {
          iconBg: 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/30 ring-amber-200',
          borderAccent: 'border-t-4 border-t-amber-500',
          IconComp: AlertTriangle,
          btnColor: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
      case 'error':
        return {
          iconBg: 'bg-gradient-to-tr from-rose-600 to-red-600 shadow-rose-600/30 ring-rose-200',
          borderAccent: 'border-t-4 border-t-rose-600',
          IconComp: AlertCircle,
          btnColor: 'bg-rose-600 hover:bg-rose-700 text-white'
        };
      case 'success':
      default:
        return {
          iconBg: 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/30 ring-emerald-200',
          borderAccent: 'border-t-4 border-t-emerald-500',
          IconComp: CheckCircle2,
          btnColor: 'bg-emerald-600 hover:bg-emerald-700 text-white'
        };
    }
  };

  const styleConfig = getTypeStyles();
  const IconComponent = icon || styleConfig.IconComp;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-100/90 text-center space-y-4 relative overflow-hidden transform animate-in zoom-in-95 duration-200 ${styleConfig.borderAccent}`}
      >
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Yopish"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Icon Avatar in Center */}
        <div className="relative pt-2">
          <div
            className={`w-16 h-16 rounded-3xl ${styleConfig.iconBg} text-white flex items-center justify-center mx-auto shadow-xl ring-4 ring-offset-2 ring-offset-white group-hover:scale-105 transition-all`}
          >
            <IconComponent className={`w-8 h-8 ${styleConfig.spinIcon ? 'animate-spin' : ''}`} />
          </div>
        </div>

        {/* Title and Message */}
        <div className="space-y-1.5 px-2">
          <h3 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight leading-snug">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* Optional Action / Confirm Buttons */}
        {showConfirm ? (
          <div className="flex items-center space-x-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              className={`flex-1 py-3 rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer ${styleConfig.btnColor}`}
            >
              {confirmText}
            </button>
          </div>
        ) : (
          <div className="pt-2">
            <button
              onClick={onClose}
              className={`w-full py-3 rounded-2xl font-black text-xs shadow-md shadow-blue-500/10 transition-all cursor-pointer active:scale-98 ${styleConfig.btnColor}`}
            >
              Tushundim
            </button>
          </div>
        )}

        {/* Auto dismiss visual timer bar */}
        {!showConfirm && duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-slate-300 animate-pulse"
              style={{
                animation: `shrinkWidth ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
