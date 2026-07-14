import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ACCENT_COLORS,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  readSettings,
  settingsRootFontPx,
  type AppSettings,
} from "@/shared/config/settings";

/**
 * Persists application preferences to localStorage and applies their appearance /
 * accessibility side-effects globally (CSS-variable + class toggles on <html>), so
 * nothing here depends on the desktop runtime. Types, defaults, and pure helpers
 * live in `@/shared/config/settings`.
 */
interface SettingsState {
  settings: AppSettings;
  update: (partial: Partial<AppSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());

  // Apply appearance + accessibility side-effects to the document root.
  useEffect(() => {
    const root = document.documentElement;
    for (const accent of ACCENT_COLORS) {
      root.classList.toggle(
        `accent-${accent}`,
        accent !== "teal" && settings.accentColor === accent,
      );
    }
    root.classList.toggle("high-contrast", settings.highContrast);
    root.classList.toggle("reduce-motion", settings.reducedMotion);
    root.classList.toggle("keyboard-nav", settings.enhancedKeyboardNav);
    root.style.fontSize = settingsRootFontPx(settings);
  }, [settings]);

  const update = useCallback((partial: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...partial };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Persisting preferences is best-effort; the app works without it.
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // ignore
    }
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, update, reset }),
    [settings, update, reset],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsState {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
