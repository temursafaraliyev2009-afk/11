// src/components/ProductSticker.jsx
import React from 'react';
import { useStore } from '../context/StoreContext';

export const ProductSticker = ({ emoji, size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'w-7 h-7 text-sm rounded-lg',
    sm: 'w-8 h-8 text-base rounded-xl',
    md: 'w-10 h-10 text-xl rounded-2xl',
    lg: 'w-12 h-12 text-2xl rounded-2xl',
    xl: 'w-14 h-14 text-3xl rounded-3xl'
  };

  return (
    <div
      className={`bg-slate-100/90 border border-slate-200/50 flex items-center justify-center shrink-0 shadow-xs select-none ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      <span role="img" aria-label="sticker">
        {emoji || '📦'}
      </span>
    </div>
  );
};

export const StickerPicker = ({ selectedSticker, onSelect }) => {
  const { storeConfig } = useStore();
  const stickers = storeConfig.stickers || ['📦', '🍞', '🥛', '🥤', '📱', '👕', '💄', '🌹', '⚽'];

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700">
        Mahsulot stikeri <span className="text-slate-400 font-normal">(Rasm talab qilinmaydi)</span>
      </label>
      <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 max-h-36 overflow-y-auto">
        {stickers.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(s)}
            className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all ${
              selectedSticker === s
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-110'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};
