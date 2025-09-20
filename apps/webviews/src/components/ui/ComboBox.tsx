import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface ComboBoxProps {
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}

export const ComboBox: React.FC<ComboBoxProps> = ({
  label,
  required = false,
  error,
  className = '',
  placeholder = '',
  value,
  onChange,
  options,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const filtered = options.filter(option =>
      option.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [inputValue, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleOptionSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const inputClasses = `w-full px-3 py-2 pr-10 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
    error ? 'border-error-600 bg-error-50 dark:border-error-600 dark:bg-error-50' : 'border-gray-300 dark:border-demo-time-gray-5'
  } ${disabled ? 'bg-gray-100 dark:bg-demo-time-gray-1 cursor-not-allowed' : 'bg-white dark:bg-demo-time-gray-2'} text-gray-900 dark:text-demo-time-gray-3 ${className}`;</parameter>

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          className={inputClasses}
          placeholder={placeholder}
          disabled={disabled}
        />
        
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-0 top-0 h-full px-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 disabled:cursor-not-allowed"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-demo-time-gray-2 border border-gray-300 dark:border-demo-time-gray-5 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleOptionSelect(option)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-demo-time-gray-1 focus:outline-hidden focus:bg-gray-50 dark:focus:bg-demo-time-gray-1 flex items-center justify-between text-gray-900 dark:text-demo-time-gray-3"
            >
              <span>{option}</span>
              {value === option && <Check className="h-4 w-4 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};