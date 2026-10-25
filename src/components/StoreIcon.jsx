// src/components/StoreIcon.jsx
import React from 'react';
import {
  ShoppingBag,
  Smartphone,
  Shirt,
  Sparkles,
  Hammer,
  Home,
  Activity,
  Headphones,
  Flower2,
  Store,
  Package
} from 'lucide-react';

export const STORE_ICONS_MAP = {
  food: ShoppingBag,
  phone: Smartphone,
  clothing: Shirt,
  cosmetics: Sparkles,
  construction: Hammer,
  household: Home,
  sport: Activity,
  accessories: Headphones,
  flower: Flower2,
  default: Store
};

export const STORE_COLORS_MAP = {
  food: {
    bg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
    solidBg: 'bg-emerald-600',
    badge: 'bg-emerald-500/15 text-emerald-400',
    gradient: 'from-emerald-500 to-teal-600',
  },
  phone: {
    bg: 'bg-blue-50 text-blue-600 border-blue-200/80',
    solidBg: 'bg-blue-600',
    badge: 'bg-blue-500/15 text-blue-400',
    gradient: 'from-blue-600 to-indigo-600',
  },
  clothing: {
    bg: 'bg-purple-50 text-purple-600 border-purple-200/80',
    solidBg: 'bg-purple-600',
    badge: 'bg-purple-500/15 text-purple-400',
    gradient: 'from-purple-600 to-pink-600',
  },
  cosmetics: {
    bg: 'bg-rose-50 text-rose-600 border-rose-200/80',
    solidBg: 'bg-rose-600',
    badge: 'bg-rose-500/15 text-rose-400',
    gradient: 'from-rose-500 to-pink-600',
  },
  construction: {
    bg: 'bg-amber-50 text-amber-600 border-amber-200/80',
    solidBg: 'bg-amber-600',
    badge: 'bg-amber-500/15 text-amber-400',
    gradient: 'from-amber-600 to-orange-600',
  },
  household: {
    bg: 'bg-cyan-50 text-cyan-600 border-cyan-200/80',
    solidBg: 'bg-cyan-600',
    badge: 'bg-cyan-500/15 text-cyan-400',
    gradient: 'from-cyan-600 to-blue-600',
  },
  sport: {
    bg: 'bg-green-50 text-green-600 border-green-200/80',
    solidBg: 'bg-green-600',
    badge: 'bg-green-500/15 text-green-400',
    gradient: 'from-green-600 to-emerald-600',
  },
  accessories: {
    bg: 'bg-violet-50 text-violet-600 border-violet-200/80',
    solidBg: 'bg-violet-600',
    badge: 'bg-violet-500/15 text-violet-400',
    gradient: 'from-violet-600 to-indigo-600',
  },
  flower: {
    bg: 'bg-pink-50 text-pink-600 border-pink-200/80',
    solidBg: 'bg-pink-600',
    badge: 'bg-pink-500/15 text-pink-400',
    gradient: 'from-pink-500 to-rose-600',
  },
  default: {
    bg: 'bg-slate-50 text-slate-600 border-slate-200',
    solidBg: 'bg-slate-600',
    badge: 'bg-slate-500/15 text-slate-400',
    gradient: 'from-slate-600 to-slate-800',
  }
};

export const StoreIcon = ({ type = 'food', className = 'w-5 h-5', style }) => {
  const IconComponent = STORE_ICONS_MAP[type] || STORE_ICONS_MAP.default;
  return <IconComponent className={className} style={style} />;
};

export const StoreBadgeIcon = ({ type = 'food', size = 'md', className = '' }) => {
  const IconComponent = STORE_ICONS_MAP[type] || STORE_ICONS_MAP.default;
  const colors = STORE_COLORS_MAP[type] || STORE_COLORS_MAP.default;

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-14 h-14 rounded-2xl',
  }[size] || 'w-10 h-10 rounded-xl';

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  }[size] || 'w-5 h-5';

  return (
    <div className={`${sizeClasses} ${colors.bg} border flex items-center justify-center shrink-0 shadow-xs ${className}`}>
      <IconComponent className={iconSizes} />
    </div>
  );
};
