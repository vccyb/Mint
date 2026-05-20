import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// Inject view-transition CSS via JS to bypass Tailwind v4 CSS processing
const STYLE_ID = 'view-transition-theme-toggle';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
::view-transition-old(root) {
  z-index: 1;
}
::view-transition-new(root) {
  z-index: 9999;
}`;
  document.head.appendChild(style);
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    ensureStyles();
    const saved = localStorage.getItem('mint-theme') as 'light' | 'dark' | null;
    const initial = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setThemeState(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const setTheme = (t: 'light' | 'dark') => {
    setThemeState(t);
    localStorage.setItem('mint-theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  };

  const handleClick = async (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    const newTheme = theme === 'dark' ? 'light' : 'dark';

    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    const transition = document.startViewTransition(() => {
      setTheme(newTheme);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0% at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
  };

  return (
    <button
      onClick={handleClick}
      className="p-1.5 rounded-md hover:bg-bg-hover transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-text-secondary" />
      ) : (
        <Moon className="w-4 h-4 text-text-secondary" />
      )}
    </button>
  );
}
