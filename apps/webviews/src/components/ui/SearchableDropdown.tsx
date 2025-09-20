import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Icon } from 'vscrui';

interface DropdownOption {
  value: string;
  category?: string;
}

interface DropdownGroup {
  category: string;
  options: string[];
}

interface SearchableDropdownProps {
  value: string;
  options: string[] | DropdownGroup[];
  onChange: (value: string) => void;
  placeholder?: string;
  noItemsText?: string;
  className?: string;
  allowFreeform?: boolean;
  isIconPicker?: boolean;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = "Select an option...",
  noItemsText = "No options available",
  className = "",
  allowFreeform = false,
  isIconPicker = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<DropdownOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Convert options to flat array with categories
  const flattenOptions = (opts: string[] | DropdownGroup[]): DropdownOption[] => {
    if (opts.length === 0) return [];

    // Check if it's already a simple string array
    if (typeof opts[0] === 'string') {
      return (opts as string[]).map(opt => ({ value: opt }));
    }

    // It's a grouped array
    const result: DropdownOption[] = [];
    (opts as DropdownGroup[]).forEach(group => {
      group.options.forEach(option => {
        result.push({ value: option, category: group.category });
      });
    });
    return result;
  };

  // Get all flattened options (memoized)
  const allOptions = React.useMemo(() => flattenOptions(options), [options]);

  useEffect(() => {
    const filtered = allOptions.filter(option =>
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
    setSelectedIndex(-1); // Reset selection when filter changes
  }, [searchTerm, allOptions]);

  // Calculate dropdown position
  const calculatePosition = () => {
    if (!dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 300; // Approximate max height

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      setDropdownPosition('above');
    } else {
      setDropdownPosition('below');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected option into view
  useEffect(() => {
    const selectableOptions = filteredOptions.filter(opt => !opt.category || opt.value);
    if (selectedIndex >= 0 && selectedIndex < selectableOptions.length) {
      optionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      calculatePosition();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setSelectedIndex(-1);
  };

  // Get only selectable options (skip headers)
  const getSelectableOptions = () => {
    const regularOptions = filteredOptions.filter(opt => !opt.category || opt.value);
    // Add freeform option if enabled and no matches found
    if (allowFreeform && searchTerm.trim() && regularOptions.length === 0) {
      return [{ value: searchTerm.trim() }];
    }
    return regularOptions;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const selectableOptions = getSelectableOptions();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const nextIndex = prev + 1;
        return nextIndex >= selectableOptions.length ? 0 : nextIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const nextIndex = prev - 1;
        return nextIndex < 0 ? selectableOptions.length - 1 : nextIndex;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < selectableOptions.length) {
        handleSelect(selectableOptions[selectedIndex].value);
      } else if (selectableOptions.length > 0) {
        handleSelect(selectableOptions[0].value);
      } else if (allowFreeform && searchTerm.trim()) {
        // Allow freeform entry if no options match
        handleSelect(searchTerm.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      setSelectedIndex(-1);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
      setSearchTerm('');
      setSelectedIndex(-1);
    }
  };

  const handleMouseEnter = (optionValue: string) => {
    const selectableOptions = getSelectableOptions();
    const index = selectableOptions.findIndex(opt => opt.value === optionValue);
    setSelectedIndex(index);
  };

  // Group options by category for rendering
  const groupedOptions = () => {
    const groups: { [key: string]: DropdownOption[] } = {};
    const ungrouped: DropdownOption[] = [];

    filteredOptions.forEach(option => {
      if (option.category) {
        if (!groups[option.category]) {
          groups[option.category] = [];
        }
        groups[option.category].push(option);
      } else {
        ungrouped.push(option);
      }
    });

    return { groups, ungrouped };
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-3 py-2 border border-gray-300 dark:border-demo-time-gray-5 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-demo-time-gray-2 text-gray-900 dark:text-demo-time-gray-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-demo-time-gray-6 transition-colors"
      >
        <span className={value ? 'text-gray-900 dark:text-demo-time-gray-3' : 'text-gray-500 dark:text-demo-time-gray-5'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-demo-time-gray-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute z-50 w-full bg-white dark:bg-demo-time-gray-2 border border-gray-300 dark:border-demo-time-gray-5 rounded-md shadow-lg ${dropdownPosition === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}>
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-demo-time-gray-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-demo-time-gray-5" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search actions..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-demo-time-gray-5 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-demo-time-gray-1 text-gray-900 dark:text-demo-time-gray-3"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {(() => {
              const { groups, ungrouped } = groupedOptions();
              let selectableIndex = 0;

              if (Object.keys(groups).length === 0 && ungrouped.length === 0) {
                if (allowFreeform && searchTerm.trim()) {
                  return (
                    <button
                      ref={(el) => (optionRefs.current[0] = el)}
                      type="button"
                      onClick={() => handleSelect(searchTerm.trim())}
                      onMouseEnter={() => setSelectedIndex(0)}
                      className={`w-full px-3 py-2 text-left focus:outline-hidden transition-colors ${selectedIndex === 0
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      Use "{searchTerm.trim()}"
                    </button>
                  );
                }
                return (
                  <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                    {noItemsText}
                  </div>
                );
              }

              return (
                <>
                  {/* Render ungrouped options first */}
                  {ungrouped.map((option) => {
                    const currentIndex = selectableIndex++;
                    return (
                      <button
                        ref={(el) => (optionRefs.current[currentIndex] = el)}
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        onMouseEnter={() => handleMouseEnter(option.value)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between focus:outline-hidden transition-colors ${selectedIndex === currentIndex
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                          : value === option.value
                            ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                            : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <span className="truncate">{option.value}</span>
                        {isIconPicker && (
                          <Icon name={option.value as never} className="ml-2 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {/* Render grouped options */}
                  {Object.entries(groups).map(([category, categoryOptions]) => (
                    <div key={category}>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-demo-time-gray-5 uppercase tracking-wider bg-gray-50 dark:bg-demo-time-gray-1 border-t border-gray-100 dark:border-demo-time-gray-5">
                        {category}
                      </div>
                      {categoryOptions.map((option) => {
                        const currentIndex = selectableIndex++;
                        return (
                          <button
                            ref={(el) => (optionRefs.current[currentIndex] = el)}
                            key={option.value}
                            type="button"
                            onClick={() => handleSelect(option.value)}
                            onMouseEnter={() => handleMouseEnter(option.value)}
                            className={`w-full px-3 py-2 text-left focus:outline-hidden transition-colors ${selectedIndex === currentIndex
                              ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                              : value === option.value
                                ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'text-gray-900 dark:text-demo-time-gray-3 hover:bg-gray-50 dark:hover:bg-demo-time-gray-1'
                              }`}
                          >
                            {option.value}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
