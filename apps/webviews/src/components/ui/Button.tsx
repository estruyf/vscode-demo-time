import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  children,
  onClick,
  type = 'button',
  title
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-demo-time-accent hover:bg-demo-time-accent-high text-demo-time-black focus:ring-demo-time-accent',
    secondary: 'bg-demo-time-black border border-demo-time-gray-5 hover:bg-demo-time-gray-7 text-demo-time-gray-2 focus:ring-demo-time-accent',
    success: 'bg-[#ffd43b] hover:bg-[#e6c135] text-gray-900 focus:ring-[#ffd43b]',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500',
    dark: 'bg-demo-time-gray-1 hover:bg-demo-time-gray-2 text-demo-time-black focus:ring-demo-time-gray-3'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
    >
      {Icon && iconPosition === 'left' && (
        <Icon className={`h-4 w-4 ${children ? 'mr-2' : ''}`} />
      )}
      {children}
      {Icon && iconPosition === 'right' && (
        <Icon className={`h-4 w-4 ${children ? 'ml-2' : ''}`} />
      )}
    </button>
  );
};