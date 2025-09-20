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
  const baseClasses = 'bg-white dark:bg-gray-800 rounded-lg';
  
  const variantClasses = {
    default: 'border border-gray-200 dark:border-gray-700',
    elevated: 'shadow-lg border border-gray-200 dark:border-gray-700',
    outlined: 'border-2 border-gray-300 dark:border-gray-600'
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