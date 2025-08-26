import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

export const MainContent: React.FC<MainContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`lg:col-span-2 space-y-6 ${className}`}>
      {children}
    </div>
  );
};