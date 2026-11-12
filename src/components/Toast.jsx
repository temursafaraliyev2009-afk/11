import React from 'react';
import { useCart } from '../context/CartContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts } = useCart();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 sm:top-5 inset-x-0 z-[99999] flex flex-col items-center space-y-2 pointer-events-none px-3 pt-[env(safe-area-inset-top,0px)]">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-xl backdrop-blur-md border max-w-[92vw] sm:max-w-md w-auto transition-all duration-300 transform animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/40'
              : toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-100 border-rose-500/40'
              : 'bg-slate-900/90 text-slate-100 border-slate-700/60'
          }`}
        >
          <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
          </div>
          <p className="text-xs sm:text-sm font-bold leading-tight">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};
