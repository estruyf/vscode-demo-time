import React from 'react';
import { Step } from '@demotime/common';

interface SettingFieldProps {
  setting?: Step['setting'];
  onChange: (key: string, value: string | number | boolean | object | null | undefined) => void;
  fieldErrors?: { message: string }[];
  isRequired?: boolean;
}

export const SettingField: React.FC<SettingFieldProps> = ({ setting, onChange, fieldErrors = [], isRequired }) => {
  const hasError = fieldErrors.length > 0;

  const handleKeyChange = (value: string) => {
    onChange(value, setting?.value);
  };

  const handleValueChange = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      onChange(setting?.key || '', parsed);
    } catch {
      onChange(setting?.key || '', raw);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Setting {isRequired && <span className="text-red-500">*</span>}
      </label>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-4 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 mb-1 dark:text-gray-400" htmlFor="setting-key">Key</label>
          <input
            id="setting-key"
            type="text"
            value={setting?.key || ''}
            onChange={(e) => handleKeyChange(e.target.value)}
            className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${hasError ? 'border-red-300 bg-red-50 dark:border-red-400 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
            placeholder="Setting key"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 mb-1 dark:text-gray-400" htmlFor="setting-value">Value</label>
          <textarea
            id="setting-value"
            value={
              typeof setting?.value === 'object' && setting?.value !== null
                ? JSON.stringify(setting.value, null, 2)
                : typeof setting?.value === 'boolean'
                  ? String(setting?.value)
                  : setting?.value || ''
            }
            onChange={(e) => handleValueChange(e.target.value)}
            rows={5}
            className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono ${hasError ? 'border-red-300 bg-red-50 dark:border-red-400 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
            placeholder="Setting value (JSON or string)"
          />
        </div>

        {fieldErrors.map((error, index) => (
          <p key={index} className="text-sm text-red-600 dark:text-red-400 mt-1">{error.message}</p>
        ))}
      </div>
    </div>
  );
};

export default SettingField;
