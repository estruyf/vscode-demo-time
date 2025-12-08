import React from 'react';

interface NoteBoxProps {
  variant?: 'info' | 'warning' | 'error';
  className?: string;
  children: React.ReactNode;
}

export const NoteBox: React.FC<NoteBoxProps> = ({ variant = 'info', children, className = '' }) => {
  const base = 'rounded-lg p-3';

  if (variant === 'warning') {
    return (
      <div className={`${base} bg-yellow-50 dark:bg-gray-900 border border-yellow-200 dark:border-yellow-300 ${className}`}>
        <div className="text-sm text-yellow-800 dark:text-yellow-300">{children}</div>
      </div>
    );
  }

  if (variant === 'error') {
    return (
      <div className={`${base} bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-400 ${className}`}>
        <div className="text-sm text-red-700 dark:text-red-400">{children}</div>
      </div>
    );
  }

  // default: info
  return (
    <div className={`${base} bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-500 ${className}`}>
      <div className="text-sm text-blue-800 dark:text-blue-200">{children}</div>
    </div>
  );
};

export default NoteBox;
