import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="relative flex flex-col items-center min-h-screen p-4 bg-gradient-to-br from-background via-gradient-mid to-background font-mono text-on-background overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-primary-variant/20 rounded-full blur-[110px]"></div>
      </div>

      <div className="w-full max-w-[900px] mt-6 flex flex-col gap-6">
        {/* Header */}
        <header className="flex justify-between items-center bg-surface/50 backdrop-blur-md p-4 rounded-xl border border-border-color shadow-lg">
           <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
              <h1 className="text-xl font-bold tracking-tighter">Klistra.nu</h1>
           </div>
           <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-surface-variant transition-colors">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
           </button>
        </header>

        {children}

        {/* Footer */}
        <footer className="text-center text-sm text-subtle-gray py-4">
           <p>&copy; {new Date().getFullYear()} Klistra.nu. Secure & Encrypted.</p>
           <div className="flex justify-center gap-4 mt-2">
             <a href="/privacy" className="hover:text-primary transition-colors">Privacy</a>
             <a href="/api" className="hover:text-primary transition-colors">API</a>
             <a href="https://github.com/esaiaswestberg/klistra_nu" target="_blank" className="hover:text-primary transition-colors">GitHub</a>
           </div>
        </footer>
      </div>
    </div>
  );
}
