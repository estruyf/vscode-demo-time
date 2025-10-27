import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

export const MainContent = React.forwardRef<HTMLDivElement, MainContentProps>(({ children, className = '' }, ref) => {
  return (
    <div
      ref={ref}
      className={`h-full lg:col-span-2 lg:overflow-y-auto custom-scrollbar ${className}`}
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="space-y-6 min-h-full">
        {children}
      </div>
    </div>
  );
});
