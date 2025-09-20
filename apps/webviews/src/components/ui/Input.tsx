import React from 'react';

interface InputProps {
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'color';
  disabled?: boolean;
  [key: string]: unknown; // For additional props like `id`, `name`, etc.
}

export const Input: React.FC<InputProps> = ({
  label,
  required = false,
  error,
  className = '',
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  ...rest
}) => {
  const inputClasses = `w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 ${
    error 
      ? 'border-error-600 bg-error-50' 
      : 'border-gray-300 hover:border-gray-400'
  } ${
    disabled 
      ? 'bg-gray-100 cursor-not-allowed' 
      : ''
  } dark:bg-demo-time-gray-2 dark:text-demo-time-gray-3 dark:border-demo-time-gray-5 dark:hover:border-demo-time-gray-6 ${
    error 
      ? 'dark:border-error-600 dark:bg-error-50' 
      : ''
  } ${
    disabled 
      ? 'dark:bg-demo-time-gray-1' 
      : ''
  } ${className}`;

  const inputStyles = type == 'color' ? {
    blockSize: "42px",
    padding: "1px 2px"
  } : {};

  return (
    <div className='w-full'>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
          placeholder={placeholder}
          disabled={disabled}
          {...rest}
          style={inputStyles}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};