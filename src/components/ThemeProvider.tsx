import { useEffect, ReactNode } from 'react';
import { useUIStore } from '../store';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both just in case
    root.classList.remove('light', 'dark');
    
    // Add current theme
    root.classList.add(theme);
    
    // Also update meta theme-color if needed
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#111c2d' : '#f9f9ff');
    }
  }, [theme]);

  return <>{children}</>;
}
