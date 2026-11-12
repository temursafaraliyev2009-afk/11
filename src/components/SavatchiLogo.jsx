// src/components/SavatchiLogo.jsx
import React from 'react';

/**
 * SAVATCHI Rasmiy Vektor Logotipi
 * 
 * 1. 7 ta ustun: gorizontal tekis taglikda, oraliq masofasi teng.
 *    - 1-3 ustunlar: qizil (kamayuvchi).
 *    - 4-7 ustunlar: yashil (muntazam matematik aniqlikda balandlashuvchi).
 * 2. SAVATCHI yozuvi:
 *    - Qalin geometrik sans-serif shrift, bosh harflarda (SAVATCHI).
 *    - Yashil ustunlar cho'qqilari chizig'iga aniq parallel qiyalik (-26.565°).
 *    - "S" 3-qizil ustun tepasidan boshlanadi, "I" 7-yashil ustun tepasida tugaydi.
 * 3. Shaffof fon (transparent), ortiqcha bo'sh joylar kesib tashlangan (cropped viewBox).
 */
export const SavatchiLogo = ({ className = 'w-full h-full', theme = 'light', style = {}, showText = true }) => {
  const isDark = theme === 'dark';

  const gradStart = isDark ? '#FFFFFF' : '#0F172A';
  const gradMid1  = isDark ? '#FFFFFF' : '#1E293B';
  const gradMid2  = isDark ? '#F8FAFC' : '#334155';
  const gradEnd   = isDark ? '#E2E8F0' : '#475569';

  const baseBarFill = isDark ? '#334155' : '#CBD5E1';
  const baseBarTop  = isDark ? '#475569' : '#E2E8F0';

  const gradId = `savatchiGrad_${isDark ? 'dark' : 'light'}`;
  const shadowId = `savatchiShadow_${isDark ? 'dark' : 'light'}`;

  // Icon-only rejimda viewBox faqat ustunlar va taglikni o'z ichiga oladi
  const svgViewBox = showText ? "34 38 332 212" : "36 100 328 150";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={svgViewBox}
      className={className}
      style={{ display: 'block', ...style }}
      aria-label="Savatchi Logo"
      role="img"
    >
      <defs>
        {/* SAVATCHI matn gradienti */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradStart} />
          <stop offset="30%" stopColor={gradMid1} />
          <stop offset="65%" stopColor={gradMid2} />
          <stop offset="100%" stopColor={gradEnd} />
        </linearGradient>

        {/* Ustunlar uchun nozik soya */}
        <filter id={shadowId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity={isDark ? 0.28 : 0.08} />
        </filter>

        {/* 1-ustun klipi */}
        <clipPath id="sv-col-c1">
          <rect x="55" y="140" width="26" height="100" rx="4" />
        </clipPath>
        {/* 2-ustun klipi */}
        <clipPath id="sv-col-c2">
          <rect x="99" y="165" width="26" height="75" rx="4" />
        </clipPath>
        {/* 3-ustun klipi */}
        <clipPath id="sv-col-c3">
          <rect x="143" y="190" width="26" height="50" rx="4" />
        </clipPath>
        {/* 4-ustun klipi */}
        <clipPath id="sv-col-c4">
          <rect x="187" y="174" width="26" height="66" rx="4" />
        </clipPath>
        {/* 5-ustun klipi */}
        <clipPath id="sv-col-c5">
          <rect x="231" y="152" width="26" height="88" rx="4" />
        </clipPath>
        {/* 6-ustun klipi */}
        <clipPath id="sv-col-c6">
          <rect x="275" y="130" width="26" height="110" rx="4" />
        </clipPath>
        {/* 7-ustun klipi */}
        <clipPath id="sv-col-c7">
          <rect x="319" y="108" width="26" height="132" rx="4" />
        </clipPath>
      </defs>

      {/* Gorizontal taglik (Base Platform) */}
      <rect x="36" y="240" width="328" height="6" rx="3" fill={baseBarTop} />
      <rect x="36" y="244" width="328" height="2" rx="1" fill={baseBarFill} />

      {/* 7 ta ustun (2.5D flat vektor uslubi) */}
      <g filter={`url(#${shadowId})`}>
        {/* 1-ustun: Qizil (kamayuvchi) */}
        <g clipPath="url(#sv-col-c1)">
          <rect x="55" y="140" width="26" height="100" fill="#F43F5E" />
          <rect x="74" y="140" width="7" height="100" fill="#BE123C" />
          <rect x="55" y="140" width="26" height="4.5" fill="#FDA4AF" />
          <line x1="74" y1="144.5" x2="74" y2="240" stroke="#BE123C" strokeWidth="0.5" opacity="0.4" />
        </g>

        {/* 2-ustun: Qizil (o'rta) */}
        <g clipPath="url(#sv-col-c2)">
          <rect x="99" y="165" width="26" height="75" fill="#F43F5E" />
          <rect x="118" y="165" width="7" height="75" fill="#BE123C" />
          <rect x="99" y="165" width="26" height="4.5" fill="#FDA4AF" />
          <line x1="118" y1="169.5" x2="118" y2="240" stroke="#BE123C" strokeWidth="0.5" opacity="0.4" />
        </g>

        {/* 3-ustun: Qizil (eng past) */}
        <g clipPath="url(#sv-col-c3)">
          <rect x="143" y="190" width="26" height="50" fill="#F43F5E" />
          <rect x="162" y="190" width="7" height="50" fill="#BE123C" />
          <rect x="143" y="190" width="26" height="4.5" fill="#FDA4AF" />
          <line x1="162" y1="194.5" x2="162" y2="240" stroke="#BE123C" strokeWidth="0.5" opacity="0.4" />
        </g>

        {/* 4-ustun: Yashil (o'sish boshlanishi) */}
        <g clipPath="url(#sv-col-c4)">
          <rect x="187" y="174" width="26" height="66" fill="#10B981" />
          <rect x="206" y="174" width="7" height="66" fill="#047857" />
          <rect x="187" y="174" width="26" height="4.5" fill="#6EE7B7" />
          <line x1="206" y1="178.5" x2="206" y2="240" stroke="#047857" strokeWidth="0.5" opacity="0.4" />
        </g>

        {/* 5-ustun: Yashil (2-qadam) */}
        <g clipPath="url(#sv-col-c5)">
          <rect x="231" y="152" width="26" height="88" fill="#10B981" />
          <rect x="250" y="152" width="7" height="88" fill="#047857" />
          <rect x="231" y="152" width="26" height="4.5" fill="#6EE7B7" />
          <line x1="250" y1="156.5" x2="250" y2="240" stroke="#047857" strokeWidth="0.5" opacity="0.4" />
        </g>

        {/* 6-ustun: Yashil (3-qadam) */}
        <g clipPath="url(#sv-col-c6)">
          <rect x="275" y="130" width="26" height="110" fill="#10B981" />
          <rect x="294" y="130" width="7" height="110" fill="#047857" />
          <rect x="275" y="130" width="26" height="4.5" fill="#6EE7B7" />
          <line x1="294" y1="134.5" x2="294" y2="240" stroke="#047857" strokeWidth="0.5" opacity="0.4" />
        </g>

        {/* 7-ustun: Yashil (eng baland cho'qqi) */}
        <g clipPath="url(#sv-col-c7)">
          <rect x="319" y="108" width="26" height="132" fill="#10B981" />
          <rect x="338" y="108" width="7" height="132" fill="#047857" />
          <rect x="319" y="108" width="26" height="4.5" fill="#6EE7B7" />
          <line x1="338" y1="112.5" x2="338" y2="240" stroke="#047857" strokeWidth="0.5" opacity="0.4" />
        </g>
      </g>

      {/* SAVATCHI yozuvi: Qalin geometrik sans-serif, yashil ustunlar cho'qqilariga parallel (-26.565°) */}
      {showText && (
      <g transform="translate(154, 152) rotate(-26.565)">
        <text
          x="0"
          y="0"
          fontFamily="'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="23"
          fontWeight="900"
          letterSpacing="3.5"
          fill={`url(#${gradId})`}
          textLength="202"
          lengthAdjust="spacing"
          style={{ textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased' }}
        >
          SAVATCHI
        </text>
      </g>
      )}
    </svg>
  );
};

export default SavatchiLogo;
