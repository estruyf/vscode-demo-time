import React from 'react';
import { DemoConfig } from '../../types/demo';
import { validateConfig } from '../../utils/validation';

interface MainConfigFormProps {
  config: DemoConfig;
  onChange: (updates: Partial<DemoConfig>) => void;
}

export const MainConfigForm: React.FC<MainConfigFormProps> = ({ config, onChange }) => {
  const validation = validateConfig(config);
  const titleError = validation.errors.find(e => e.field === 'title' && e.demoIndex === undefined);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-demo-time-gray-3 mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-demo-time-black text-demo-time-white ${titleError ? 'border-red-300 bg-red-50' : 'border-demo-time-gray-5'
            }`}
          placeholder="Enter demo title"
        />
        {titleError && (
          <p className="text-sm text-red-600 mt-1">{titleError.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-demo-time-gray-3 mb-2">
          Description
        </label>
        <textarea
          value={config.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-demo-time-black text-demo-time-white border-demo-time-gray-5`}
          placeholder="Enter demo description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-demo-time-gray-3 mb-2">
          Timer (minutes)
        </label>
        <input
          type="number"
          value={config.timer || ''}
          onChange={(e) => onChange({ timer: e.target.value ? parseInt(e.target.value) : undefined })}
          className="w-full px-3 py-2 border border-demo-time-gray-5 rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-demo-time-black text-demo-time-white"
          placeholder="Enter timer in minutes"
          min="1"
        />
        <p className="text-xs text-demo-time-gray-4 mt-2">Optional. Use this to show a timer during the presentation for this demo section.</p>
      </div>
    </div>
  );
};