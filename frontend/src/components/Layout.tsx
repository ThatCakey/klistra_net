import React, { useEffect, useState, useRef } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'system';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const isDark = theme === 'dark' || (theme === 'system' && systemDark);

      if (isDark) {
        root.classList.remove('light');
      } else {
        root.classList.add('light');
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    localStorage.setItem('theme', theme);

    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (t: Theme) => {
    switch (t) {
      case 'light': return <Sun size={20} />;
      case 'dark': return <Moon size={20} />;
      case 'system': return <Monitor size={20} />;
    }
  };

  return (
    <div className="relative flex flex-col items-center min-h-screen p-4 bg-gradient-to-br from-background via-gradient-mid to-background font-mono text-on-background overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-primary-variant/20 rounded-full blur-[110px]"></div>
      </div>

      {/* Noise Overlay for Color Banding Fix */}
      <div 
        className="fixed inset-0 pointer-events-none -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      ></div>

      <div className="w-full max-w-[900px] mt-6 flex flex-col gap-6">
        {/* Header */}
        <header className="flex justify-between items-center bg-surface/50 backdrop-blur-md p-4 rounded-xl border border-border-color shadow-lg z-50">
           <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
              <h1 className="text-xl font-bold tracking-tighter">Klistra.nu</h1>
           </div>
           
           <div className="relative" ref={dropdownRef}>
             <button 
               onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
               className="p-2 rounded-full hover:bg-surface-variant transition-colors flex items-center gap-2"
               aria-label="Toggle theme"
             >
                {getIcon(theme)}
             </button>

             {isDropdownOpen && (
               <div className="absolute right-0 mt-2 w-36 bg-surface border border-border-color rounded-lg shadow-xl overflow-hidden flex flex-col z-50">
                 {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                   <button
                     key={t}
                     onClick={() => {
                       setTheme(t);
                       setIsDropdownOpen(false);
                     }}
                     className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-variant transition-colors text-left
                       ${theme === t ? 'text-primary' : 'text-on-surface'}
                     `}
                   >
                     {getIcon(t)}
                     <span className="capitalize">{t}</span>
                   </button>
                 ))}
               </div>
             )}
           </div>
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
