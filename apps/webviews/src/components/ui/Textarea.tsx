import React from 'react';

interface TextareaProps {
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  required = false,
  error,
  className = '',
  placeholder,
  value,
  onChange,
  rows = 3,
  disabled = false
}) => {
  const textareaClasses = `w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
    error ? 'border-error-600 bg-error-50 dark:border-error-600 dark:bg-error-50' : 'border-gray-300 dark:border-demo-time-gray-5'
  } ${disabled ? 'bg-gray-100 dark:bg-demo-time-gray-1 cursor-not-allowed' : 'bg-white dark:bg-demo-time-gray-2'} text-gray-900 dark:text-demo-time-gray-3 ${className}`;</parameter>

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaClasses}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};