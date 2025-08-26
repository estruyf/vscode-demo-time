import React from 'react';
import { Card } from '../ui/Card';

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-8 ${className}`}>
      {children}
    </div>
  );
};