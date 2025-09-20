import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  required = false,
  error,
  className = '',
  placeholder,
  value,
  onChange,
  options,
  disabled = false
}) => {
  const selectClasses = `w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
    error ? 'border-red-300 bg-red-50 dark:border-red-400 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
  } ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800'} text-gray-900 dark:text-gray-100 ${className}`;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClasses}
        disabled={disabled}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};