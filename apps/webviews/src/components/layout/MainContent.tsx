import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

export const MainContent = React.forwardRef<HTMLDivElement, MainContentProps>(({ children, className = '' }, ref) => {
  return (
    <div ref={ref} className={`lg:col-span-2 space-y-6 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-205px)] lg:overflow-y-auto ${className}`} style={{
      scrollbarWidth: 'thin',
      scrollbarColor: '#b3b3b3 #f5f5f5'
    }}>
      {children}
    </div>
  );
});
