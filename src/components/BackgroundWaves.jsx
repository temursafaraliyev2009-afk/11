// src/components/BackgroundWaves.jsx
import React from 'react';

export const BackgroundWaves = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#EEF4FE] via-[#F6F8FE] to-[#E9EEFB]" />

      {/* SVG Wave Shapes matching the screenshot's top-right & ambient lavender curves */}
      <svg
        className="absolute top-0 right-0 w-[800px] h-[500px] opacity-40 text-blue-200/50 transform translate-x-32 -translate-y-16"
        viewBox="0 0 800 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 120C180 40 360 200 540 100C680 20 750 160 800 140V0H0V120Z"
          fill="url(#wave-grad-1)"
        />
        <defs>
          <linearGradient id="wave-grad-1" x1="0" y1="0" x2="800" y2="400" gradientUnits="userSpaceOnUse">
            <stop stopColor="#93C5FD" stopOpacity="0.45" />
            <stop offset="0.5" stopColor="#C4B5FD" stopOpacity="0.3" />
            <stop offset="1" stopColor="#E0E7FF" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      <svg
        className="absolute top-10 right-20 w-[650px] h-[350px] opacity-30 transform translate-x-20"
        viewBox="0 0 650 350"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 60C140 120 280 10 420 80C560 150 600 40 650 60V0H0V60Z"
          fill="url(#wave-grad-2)"
        />
        <defs>
          <linearGradient id="wave-grad-2" x1="0" y1="0" x2="650" y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A5B4FC" stopOpacity="0.4" />
            <stop offset="1" stopColor="#DBEAFE" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Ambient soft glow spots */}
      <div className="absolute -top-32 right-1/4 w-96 h-96 bg-purple-200/25 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />
    </div>
  );
};
