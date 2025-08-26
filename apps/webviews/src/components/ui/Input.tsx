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
  const inputClasses = `w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'
    } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`;

  const inputStyles = type == 'color' ? {
    blockSize: "42px",
    padding: "1px 2px"
  } : {};

  return (
    <div className='w-full'>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
};