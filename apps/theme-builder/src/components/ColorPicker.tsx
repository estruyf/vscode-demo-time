import React from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, description }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-200 mb-2">
        {label}
        {description && <span className="text-xs text-gray-400 ml-2">({description})</span>}
      </label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-10 border-2 border-gray-600 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="#000000 or transparent"
        />
      </div>
    </div>
  );
};
