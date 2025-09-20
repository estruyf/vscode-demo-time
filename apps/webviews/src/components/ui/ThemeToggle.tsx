import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  currentTheme: 'light' | 'dark' | 'auto';
  onThemeChange: (theme: 'light' | 'dark' | 'auto') => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  currentTheme,
  onThemeChange,
  className = ''
}) => {
  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'auto' as const, icon: Monitor, label: 'Auto' }
  ];

  const getButtonClasses = (theme: typeof currentTheme) => {
    const baseClasses = 'inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:ring-offset-2';

    if (currentTheme === theme) {
      return `${baseClasses} bg-demo-time-accent text-demo-time-black shadow-sm`;
    }

    return `${baseClasses} text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700`;
  };

  return (
    <div className={`inline-flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-1 shadow-sm ${className}`}>
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => onThemeChange(value)}
          className={getButtonClasses(value)}
          title={`Switch to ${label} mode`}
          aria-label={`Switch to ${label} mode`}
        >
          <Icon className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
};
