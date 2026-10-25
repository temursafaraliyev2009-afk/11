// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  DAY: 'day',
  TWILIGHT: 'twilight',
  NIGHT: 'night'
};

const THEME_KEY = 'savatchi_theme';
const LEGACY_ALGORITHM_MODE_KEY = 'savatchi_algorithm_mode';

const VALID_THEMES = [THEMES.DAY, THEMES.TWILIGHT, THEMES.NIGHT];

// Clean up any legacy inline custom properties if present
const SV_VARIABLES = [
  '--sv-page',
  '--sv-page-soft',
  '--sv-card',
  '--sv-muted',
  '--sv-hover',
  '--sv-border',
  '--sv-sidebar',
  '--sv-sidebar-card',
  '--sv-text',
  '--sv-text-2',
  '--sv-text-3',
  '--sv-accent-text',
  '--sv-emerald-text',
  '--sv-amber-text',
  '--sv-rose-text',
  '--sv-accent-soft',
  '--sv-emerald-soft',
  '--sv-amber-soft',
  '--sv-rose-soft',
  '--sv-shadow',
  '--sv-shadow-2',
  '--sv-wave'
];

function applyThemeToDOM(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Purge any legacy algorithm class or leftover inline properties
  root.classList.remove('algorithm-mode');
  SV_VARIABLES.forEach((prop) => root.style.removeProperty(prop));

  // Remove existing theme state classes
  root.classList.remove('theme-day', 'theme-twilight', 'theme-night');

  if (theme === THEMES.DAY) {
    root.classList.remove('dark');
    root.classList.add('theme-day');
    root.setAttribute('data-theme', 'day');
  } else if (theme === THEMES.TWILIGHT) {
    root.classList.add('dark', 'theme-twilight');
    root.setAttribute('data-theme', 'twilight');
  } else if (theme === THEMES.NIGHT) {
    root.classList.add('dark', 'theme-night');
    root.setAttribute('data-theme', 'night');
  }
}

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return THEMES.DAY;
    try {
      // Safe migration from obsolete Algorithm Mode or invalid saved themes
      const legacyAlgo = localStorage.getItem(LEGACY_ALGORITHM_MODE_KEY);
      if (legacyAlgo !== null) {
        localStorage.removeItem(LEGACY_ALGORITHM_MODE_KEY);
      }

      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'twilight') return THEMES.TWILIGHT;
      if (saved === 'night') return THEMES.NIGHT;
      if (saved === 'day' || saved === 'light') return THEMES.DAY;

      // Old algorithm mode or unrecognised values migrate safely to Day Mode
      return THEMES.DAY;
    } catch (e) {
      return THEMES.DAY;
    }
  });

  const setTheme = useCallback((newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return;
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch (e) {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      let next = THEMES.DAY;
      if (prev === THEMES.DAY) next = THEMES.TWILIGHT;
      else if (prev === THEMES.TWILIGHT) next = THEMES.NIGHT;
      else if (prev === THEMES.NIGHT) next = THEMES.DAY;

      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
      return next;
    });
  }, []);

  // Sync DOM on theme changes and on initial load
  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }, [theme]);

  const isDark = theme === THEMES.TWILIGHT || theme === THEMES.NIGHT;
  const isDay = theme === THEMES.DAY;
  const isTwilight = theme === THEMES.TWILIGHT;
  const isNight = theme === THEMES.NIGHT;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDay,
        isTwilight,
        isNight,
        darkMode: isDark,
        isDark,

        // Legacy compatibility props for safe integration
        isAlgorithmMode: false,
        setIsAlgorithmMode: () => {},
        toggleAlgorithmMode: toggleTheme,
        currentProgress: isDay ? 1.0 : isTwilight ? 0.45 : 0.0,
        currentDarkness: isDay ? 0.0 : isTwilight ? 0.55 : 1.0
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: THEMES.DAY,
      setTheme: () => {},
      toggleTheme: () => {},
      isDay: true,
      isTwilight: false,
      isNight: false,
      darkMode: false,
      isDark: false,
      isAlgorithmMode: false,
      setIsAlgorithmMode: () => {},
      toggleAlgorithmMode: () => {},
      currentProgress: 1.0,
      currentDarkness: 0.0
    };
  }
  return context;
};
