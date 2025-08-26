import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

const SelectContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedValue: string;
  onSelect: (value: string) => void;
  disabled: boolean;
} | null>(null);

export const Select: React.FC<SelectProps> = ({
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
    <SelectContext.Provider value={{
      isOpen,
      setIsOpen,
      selectedValue: value,
      onSelect: handleSelect,
      disabled
    }}>
      <div className="relative" ref={dropdownRef}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className = ''
}) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');

  const { isOpen, setIsOpen, disabled } = context;

  return (
    <button
      type="button"
      onClick={() => !disabled && setIsOpen(!isOpen)}
      disabled={disabled}
      className={`
        w-full px-3 py-2 border border-demo-time-gray-5 rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-demo-time-black text-demo-time-white text-left flex items-center justify-between hover:border-demo-time-gray-4 transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
      <ChevronDown className={`h-4 w-4 text-demo-time-gray-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
};

export const SelectContent: React.FC<SelectContentProps> = ({
  children
}) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be used within Select');

  const { isOpen } = context;

  if (!isOpen) return null;

  return (
    <div className="absolute z-50 w-full mt-1 bg-demo-time-black border border-demo-time-gray-5 rounded-md shadow-lg max-h-60 overflow-y-auto">
      {children}
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({
  value,
  children
}) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');

  const { selectedValue, onSelect } = context;
  const isSelected = value === selectedValue;

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`
        w-full px-3 py-2 text-left focus:outline-hidden transition-colors flex items-center justify-between
        ${isSelected ? 'bg-demo-time-accent text-demo-time-black' : 'text-demo-time-white hover:bg-demo-time-gray-6'}
      `}
    >
      <span>{children}</span>
      {isSelected && <Check className="h-4 w-4" />}
    </button>
  );
};

export const SelectValue: React.FC<SelectValueProps & { value?: string }> = ({
  placeholder,
  value
}) => {
  return (
    <span className={value ? 'text-demo-time-white' : 'text-demo-time-gray-4'}>
      {value || placeholder}
    </span>
  );
};