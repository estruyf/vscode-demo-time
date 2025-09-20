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
  const textareaClasses = `w-full px-3 py-2 border rounded-md focus:outline-hidden  focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent transition-colors ${error ? 'border-red-300 bg-red-50 dark:border-red-400 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
    } ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800'} text-gray-900 dark:text-gray-100 ${className}`;

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
