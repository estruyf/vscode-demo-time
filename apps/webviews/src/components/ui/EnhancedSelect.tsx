import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface EnhancedSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

interface EnhancedSelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface EnhancedSelectContentProps {
  children: React.ReactNode;
}

interface EnhancedSelectItemProps {
  value: string;
  children: React.ReactNode;
}

interface EnhancedSelectValueProps {
  placeholder?: string;
}

const EnhancedSelectContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedValue: string;
  onSelect: (value: string) => void;
  disabled: boolean;
} | null>(null);

export const EnhancedSelect: React.FC<EnhancedSelectProps> = ({
  value,
  onValueChange,
  children,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (itemValue: string) => {
    onValueChange(itemValue);
    setIsOpen(false);
  };

  return (
    <EnhancedSelectContext.Provider value={{
      isOpen,
      setIsOpen,
      selectedValue: value,
      onSelect: handleSelect,
      disabled
    }}>
      <div className="relative" ref={dropdownRef}>
        {children}
      </div>
    </EnhancedSelectContext.Provider>
  );
};

export const EnhancedSelectTrigger: React.FC<EnhancedSelectTriggerProps> = ({
  children,
  className = ''
}) => {
  const context = React.useContext(EnhancedSelectContext);
  if (!context) { throw new Error('EnhancedSelectTrigger must be used within EnhancedSelect'); }

  const { isOpen, setIsOpen, disabled } = context;

  return (
    <button
      type="button"
      onClick={() => !disabled && setIsOpen(!isOpen)}
      disabled={disabled}
      className={`
        w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden  focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
      <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
};

export const EnhancedSelectContent: React.FC<EnhancedSelectContentProps> = ({
  children
}) => {
  const context = React.useContext(EnhancedSelectContext);
  if (!context) { throw new Error('EnhancedSelectContent must be used within EnhancedSelect'); }
  const { isOpen } = context;

  if (!isOpen) { return null; }

  return (
    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
      {children}
    </div>
  );
};

export const EnhancedSelectItem: React.FC<EnhancedSelectItemProps> = ({
  value,
  children
}) => {
  const context = React.useContext(EnhancedSelectContext);
  if (!context) { throw new Error('EnhancedSelectItem must be used within EnhancedSelect'); }

  const { selectedValue, onSelect } = context;
  const isSelected = value === selectedValue;

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`
        w-full px-3 py-2 text-left focus:outline-hidden transition-colors flex items-center justify-between
        ${isSelected ? 'bg-demo-time-accent text-white dark:text-black' : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'}
      `}
    >
      <span>{children}</span>
      {isSelected && <Check className="h-4 w-4" />}
    </button>
  );
};

export const EnhancedSelectValue: React.FC<EnhancedSelectValueProps & { value?: string }> = ({
  placeholder,
  value
}) => {
  return (
    <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-300'}>
      {value || placeholder}
    </span>
  );
};
