import { createContext, useContext, useLayoutEffect } from 'react';
import type { Theme } from '~/lib/theme';

type Ctx = { theme: Theme; setTheme: (t: Theme) => void };

const ThemeCtx = createContext<Ctx>({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({
  children,
}: {
  initial?: Theme;
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add('dark');
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme: 'dark', setTheme: () => {} }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
