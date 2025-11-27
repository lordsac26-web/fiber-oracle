import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

export default function Layout({ children, currentPageName }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved dark mode preference
    const savedSettings = localStorage.getItem('fibertechSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
        setDarkMode(true);
      }
    }
  }, []);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Toaster position="top-center" richColors />
      {children}
    </div>
  );
}