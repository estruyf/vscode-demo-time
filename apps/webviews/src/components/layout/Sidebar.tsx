import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-8 ${className} lg:min-w-[320px] xl:min-w-[360px]`} style={{
      scrollbarWidth: 'thin',
      scrollbarColor: '#b3b3b3 #f5f5f5'
    }}>
      {children}
    </div>
  );
};
