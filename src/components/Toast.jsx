import React from 'react';
import { useCart } from '../context/CartContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts } = useCart();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 max-w-md w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-2xl backdrop-blur-md border transition-all duration-300 transform translate-y-0 animate-bounce-short ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-500/50'
              : toast.type === 'error'
              ? 'bg-rose-900/90 text-rose-100 border-rose-500/50'
              : 'bg-slate-900/90 text-slate-100 border-slate-700'
          }`}
        >
          <div className="flex items-center space-x-3">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
