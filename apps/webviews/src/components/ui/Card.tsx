import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  variant = 'default'
}) => {
  const baseClasses = 'bg-white dark:bg-demo-time-gray-2 rounded-lg';</parameter>
  
  const variantClasses = {
    default: 'border border-gray-200 dark:border-demo-time-gray-5',
    elevated: 'shadow-lg border border-gray-200 dark:border-demo-time-gray-5',
    outlined: 'border-2 border-gray-300 dark:border-demo-time-gray-5'
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;

  return (
    <div className={classes}>
      {children}
    </div>
  );
};