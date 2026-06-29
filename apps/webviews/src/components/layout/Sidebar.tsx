import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`${className} w-full lg:min-w-80 xl:min-w-90 custom-scrollbar`}
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="space-y-4 sm:space-y-8">
        {children}
      </div>
    </div>
  );
};
