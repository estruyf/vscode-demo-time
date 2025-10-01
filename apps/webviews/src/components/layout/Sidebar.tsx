import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`${className} lg:min-w-[320px] xl:min-w-[360px] custom-scrollbar`}
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="space-y-8">
        {children}
      </div>
    </div>
  );
};
