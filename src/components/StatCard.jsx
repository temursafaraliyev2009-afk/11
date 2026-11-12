// src/components/StatCard.jsx
import React from 'react';
import { TrendingUp, Package, Users, ShoppingBag, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export const StatCard = ({
  title,
  value,
  subtext,
  badgeText,
  trend, // 'up' | 'down' | 'neutral'
  linkText,
  type = 'sales',
  sparklineColor = '#10B981',
  sparklineData,
  onAction,
  showChart = (type === 'sales')
}) => {
  // Default sparkline trend lines matching reference curves
  const defaultSparklines = {
    sales: [
      { v: 10 }, { v: 15 }, { v: 12 }, { v: 22 }, { v: 18 }, { v: 30 }, { v: 28 }, { v: 42 }, { v: 38 }, { v: 50 }, { v: 46 }, { v: 62 }, { v: 58 }, { v: 65 }
    ],
    inventory: [
      { v: 40 }, { v: 35 }, { v: 48 }, { v: 42 }, { v: 55 }, { v: 45 }, { v: 60 }, { v: 52 }, { v: 68 }, { v: 75 }, { v: 65 }, { v: 80 }
    ],
    debt: [
      { v: 20 }, { v: 28 }, { v: 22 }, { v: 35 }, { v: 30 }, { v: 45 }, { v: 38 }, { v: 52 }, { v: 48 }, { v: 60 }, { v: 55 }, { v: 70 }
    ],
    orders: [
      { v: 15 }, { v: 22 }, { v: 18 }, { v: 32 }, { v: 28 }, { v: 40 }, { v: 35 }, { v: 50 }, { v: 42 }, { v: 58 }, { v: 52 }, { v: 64 }
    ]
  };

  // Agar qiymat 0 bo'lsa yoki bo'sh bo'lsa, soxta o'sish egri chizig'i o'rniga haqiqiy tekis 0 chiziq ko'rsatiladi
  const isZeroValue = !value || String(value).trim().startsWith('0 ') || String(value).trim() === '0';

  const emptySparkline = [{ v: 0 }, { v: 0 }];
  const chartData = sparklineData || (isZeroValue ? emptySparkline : (defaultSparklines[type] || defaultSparklines.sales));

  // Icon config
  const icons = {
    sales: {
      Icon: TrendingUp,
      bg: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/25',
      color: '#10B981'
    },
    inventory: {
      Icon: Package,
      bg: 'bg-blue-500',
      shadow: 'shadow-blue-500/25',
      color: '#3B82F6'
    },
    debt: {
      Icon: Users,
      bg: 'bg-amber-500',
      shadow: 'shadow-amber-500/25',
      color: '#F59E0B'
    },
    orders: {
      Icon: ShoppingBag,
      bg: 'bg-purple-600',
      shadow: 'shadow-purple-600/25',
      color: '#8B5CF6'
    }
  };

  const config = icons[type] || icons.sales;
  const IconComponent = config.Icon;
  const gradientId = `grad-${type}`;

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100/90 shadow-sm relative overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md group">
      {/* Top Header Row with Icon & Titles */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-start space-x-3.5">
          {/* Circular Badge Icon */}
          <div className={`w-11 h-11 rounded-full ${config.bg} text-white flex items-center justify-center shadow-lg ${config.shadow} shrink-0 group-hover:scale-105 transition-transform duration-200`}>
            <IconComponent className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
              {title}
            </span>
            <div className="flex items-baseline space-x-1.5">
              <h3 className="text-[21px] font-black text-slate-900 tracking-tight leading-tight">
                {value}
              </h3>
              {subtext && (
                <span className="text-xs font-semibold text-slate-500">
                  {subtext}
                </span>
              )}
            </div>

            {/* Sub-label badge or link */}
            {badgeText && (() => {
              const bStr = String(badgeText).trim();
              const isNegative = trend === 'down' || bStr.startsWith('-') || bStr.includes('↓');
              const isNeutral = trend === 'neutral' || bStr === '0%' || bStr.startsWith('0%') || bStr.includes('ta savdo');

              const badgeColor = isNegative
                ? 'text-rose-600'
                : isNeutral
                ? 'text-slate-400'
                : 'text-emerald-600';

              const cleanText = bStr.replace(/^[↑↓]\s*/, '');

              return (
                <div className={`flex items-center space-x-1 text-[11px] font-bold mt-1 ${badgeColor}`}>
                  {isNegative ? (
                    <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : !isNeutral ? (
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : null}
                  <span>{cleanText}</span>
                </div>
              );
            })()}

            {showChart && linkText && (
              <button
                onClick={onAction}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-0.5 transition-colors"
              >
                <span>{linkText}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Area: Chart OR Action Link */}
      {showChart ? (
        <div className="h-14 w-full -mb-2 mt-2 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={config.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={config.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={config.color}
                strokeWidth={2.2}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : linkText ? (
        <div className="mt-3 pt-2.5 border-t border-slate-100/90 flex items-center justify-between">
          <button
            onClick={onAction}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
          >
            <span>{linkText}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
