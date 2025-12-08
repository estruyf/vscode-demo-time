import React from 'react';
import { Step } from '@demotime/common';

interface StateFieldProps {
  state?: Step['state'];
  onChange: (key: string, value: string) => void;
  fieldErrors?: { message: string }[];
  isRequired?: boolean;
}

export const StateField: React.FC<StateFieldProps> = ({ state, onChange, fieldErrors = [], isRequired }) => {
  const hasError = fieldErrors.length > 0;

  const handleKeyChange = (value: string) => {
    onChange(value, state?.value || '');
  };

  const handleValueChange = (value: string) => {
    onChange(state?.key || '', value);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        State {isRequired && <span className="text-red-500">*</span>}
      </label>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-4 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 mb-1 dark:text-gray-400" htmlFor="state-key">Key</label>
          <input
            id="state-key"
            type="text"
            value={state?.key || ''}
            onChange={(e) => handleKeyChange(e.target.value)}
            className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${hasError ? 'border-red-300 bg-red-50 dark:border-red-400 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
            placeholder="State key"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 mb-1 dark:text-gray-400" htmlFor="state-value">Value</label>
          <input
            id="state-value"
            type="text"
            value={state?.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${hasError ? 'border-red-300 bg-red-50 dark:border-red-400 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}`}
            placeholder="State value"
          />
        </div>

        {fieldErrors.map((error, index) => (
          <p key={index} className="text-sm text-red-600 dark:text-red-400 mt-1">{error.message}</p>
        ))}
      </div>
    </div>
  );
};

export default StateField;
