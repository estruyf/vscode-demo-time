import React from 'react';
import { TYPING_MODES, TERMINAL_TYPING_MODES } from '../../types/demo';
import { Action, Config, InsertTypingMode, WebViewMessages } from '@demotime/common';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';

export interface InsertTypingModePickerProps {
  value: InsertTypingMode | undefined;
  action: Action | undefined;
  required?: boolean;
  error?: string;
  fieldErrors?: Array<{ message: string }>;
  onChange: (value: InsertTypingMode | undefined) => void;
}

export const InsertTypingModePicker: React.FC<InsertTypingModePickerProps> = ({
  value,
  action,
  required = false,
  error,
  fieldErrors = [],
  onChange,
}) => {
  const [crtnValue, setCrtnValue] = React.useState(value);

  const getTypingModeOptions = () => {
    // Use terminal typing modes for terminal commands
    if (action === 'executeTerminalCommand') {
      return TERMINAL_TYPING_MODES;
    }
    return TYPING_MODES;
  };

  React.useEffect(() => {
    if (value) {
      setCrtnValue(value);
    } else {
      messageHandler.request<InsertTypingMode>(WebViewMessages.toVscode.getSetting, Config.insert.typingMode).then((mode) => {
        setCrtnValue(mode);
      });
    }
  }, [value]);

  const hasError = error || fieldErrors.length > 0;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Insert Typing Mode {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={crtnValue || 'instant'}
        onChange={(e) => onChange((e.target.value as InsertTypingMode) || undefined)}
        className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${hasError
          ? 'border-red-300 bg-red-50 dark:border-red-400 dark:bg-red-900/20'
          : 'border-gray-300 dark:border-gray-600'
          }`}
      >
        {getTypingModeOptions().map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>
      {fieldErrors.map((fieldError, index) => (
        <p key={index} className="text-sm text-red-600 dark:text-red-400 mt-1">
          {fieldError.message}
        </p>
      ))}
    </div>
  );
};
