'use client';

import { useEffect } from 'react';

export default function ThemeSync() {
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('os-theme');
      if (storedTheme === 'light') {
        document.documentElement.classList.add('light');
      } else if (storedTheme === 'dark') {
        document.documentElement.classList.remove('light');
      } else {
        const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        if (systemPrefersLight) {
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
        }
      }
    } catch (e) {
      console.error('Error synchronizing theme:', e);
    }
  }, []);

  return null;
}
