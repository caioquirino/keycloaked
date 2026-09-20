import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'keycloaked-theme';

/**
 * Detect the operating system preferred color scheme
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve effective theme ('light' or 'dark') given a ThemeMode
 */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

/**
 * Read the initial theme choice:
 * 1. Check URL query parameters (?theme=dark|light|system) - enables cross-origin/cross-port sync
 * 2. Check localStorage
 * 3. Default to 'system'
 */
export function getInitialTheme(storageKey = THEME_STORAGE_KEY): ThemeMode {
  if (typeof window === 'undefined') return 'system';

  try {
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get('theme') as ThemeMode | null;
    if (urlTheme && ['light', 'dark', 'system'].includes(urlTheme)) {
      localStorage.setItem(storageKey, urlTheme);
      return urlTheme;
    }
  } catch {
    // Ignore URL parsing errors
  }

  try {
    const saved = localStorage.getItem(storageKey) as ThemeMode | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }

  return 'system';
}

/**
 * Apply the theme to documentElement:
 * - If 'system': removes [data-theme], letting CSS @media (prefers-color-scheme: dark) handle it naturally
 * - If 'dark': sets [data-theme="dark"]
 * - If 'light': sets [data-theme="light"]
 */
export function applyTheme(mode: ThemeMode, storageKey = THEME_STORAGE_KEY) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(storageKey, mode);
  } catch {
    // Ignore storage errors
  }

  const root = document.documentElement;
  if (mode === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', mode);
  }
}

/**
 * React Hook for theme management with system detection and synchronization
 */
export function useTheme(storageKey = THEME_STORAGE_KEY) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const initial = getInitialTheme(storageKey);
    // Apply immediately to prevent any flicker during hydration / mounting
    applyTheme(initial, storageKey);
    return initial;
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

  // Listen for changes to system prefers-color-scheme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Synchronize across tabs or local changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const nextTheme = e.newValue as ThemeMode;
        if (['light', 'dark', 'system'].includes(nextTheme)) {
          setThemeState(nextTheme);
          applyTheme(nextTheme, storageKey);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [storageKey]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    applyTheme(newTheme, storageKey);
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    // Cycle: system -> light -> dark -> system
    setThemeState((current) => {
      let next: ThemeMode;
      if (current === 'system') {
        next = systemTheme === 'dark' ? 'light' : 'dark';
      } else if (current === 'dark') {
        next = 'light';
      } else {
        next = 'dark';
      }
      applyTheme(next, storageKey);
      return next;
    });
  }, [systemTheme, storageKey]);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme;

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isSystem: theme === 'system',
  };
}
