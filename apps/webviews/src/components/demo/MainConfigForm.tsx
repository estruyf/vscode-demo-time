import React, { useState } from 'react';
import { validateConfig } from '../../utils/validation';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { DemoConfig, WebViewMessages } from '@demotime/common';

interface MainConfigFormProps {
  config: DemoConfig;
  onChange: (updates: Partial<DemoConfig>) => void;
}

export const MainConfigForm: React.FC<MainConfigFormProps> = ({ config, onChange }) => {
  const validation = validateConfig(config);
  const titleError = validation.errors.find(e => e.field === 'title' && e.demoIndex === undefined);
  const [engageCollapsed, setEngageCollapsed] = useState(true);
  const sessionIdInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handler = () => {
      setEngageCollapsed(false);
      setTimeout(() => {
        sessionIdInputRef.current?.focus();
      }, 100);
    };

    window.addEventListener('engagetime:open-config', handler as EventListener);
    return () => {
      window.removeEventListener('engagetime:open-config', handler as EventListener);
    };
  }, [setEngageCollapsed, sessionIdInputRef]);

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
          className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-demo-time-gray-2 text-gray-900 dark:text-demo-time-gray-3 ${titleError ? 'border-error-600 bg-error-50 dark:border-error-600 dark:bg-error-50' : 'border-gray-300 dark:border-demo-time-gray-5'
            }`}
          placeholder="Enter demo title"
        />
        {titleError && (
          <p className="text-sm text-error-600 dark:text-error-700 mt-1">{titleError.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-demo-time-gray-3 mb-2">
          Description
        </label>
        <textarea
          value={config.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-demo-time-gray-2 text-gray-900 dark:text-demo-time-gray-3 border-gray-300 dark:border-demo-time-gray-5`}
          placeholder="Enter demo description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-demo-time-gray-3 mb-2">
          Timer (minutes)
        </label>
        <input
          type="number"
          value={config.timer || ''}
          onChange={(e) => onChange({ timer: e.target.value ? parseInt(e.target.value) : undefined })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-demo-time-gray-5 rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-demo-time-gray-2 text-gray-900 dark:text-demo-time-gray-3"
          placeholder="Enter timer in minutes"
          min="1"
        />
        <p className="text-xs text-gray-600 dark:text-demo-time-gray-5 mt-2">Optional. Use this to show a timer during the presentation for this demo section.</p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-demo-time-gray-3 mb-2">Engage Time</label>
            <p className="text-xs text-gray-600 dark:text-demo-time-gray-5">Integrate Engage Time sessions for live interactions</p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setEngageCollapsed(v => !v)}
              aria-expanded={!engageCollapsed}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-demo-time-gray-2 border border-gray-300 dark:border-demo-time-gray-5 rounded-md text-gray-600 dark:text-demo-time-gray-5 hover:text-gray-900 dark:hover:text-demo-time-gray-3 hover:border-gray-400 dark:hover:border-demo-time-gray-6 hover:bg-gray-50 dark:hover:bg-demo-time-gray-1 transition-all duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent"
            >
              <span className="text-sm font-medium">{engageCollapsed ? 'Show' : 'Hide'}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 transition-transform duration-200 ${engageCollapsed ? 'rotate-0' : 'rotate-180'}`}
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        {!engageCollapsed && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-demo-time-gray-3 mb-2">Session ID</label>
            <input
              type="text"
              id="engageTimeSessionId"
              ref={sessionIdInputRef}
              value={config.engageTime?.sessionId || ''}
              onChange={(e) => onChange({ engageTime: { sessionId: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-demo-time-gray-5 rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-demo-time-gray-2 text-gray-900 dark:text-demo-time-gray-3"
              placeholder="Enter engage time session ID"
            />

            <div className="bg-warning-50 dark:bg-warning-50 border border-warning-200 dark:border-warning-600 rounded-lg p-3 mt-2 space-y-1">
              <p className="text-sm text-warning-800 dark:text-warning-200">
                <strong>Note:</strong> Make sure you configure your Engage Time API key in the Demo Time settings.
                <button
                  type="button"
                  className="bg-transparent p-0 m-0 border-none underline decoration-dotted hover:decoration-solid text-blue-700 dark:text-blue-400 cursor-pointer"
                  style={{ font: 'inherit' }}
                  onClick={(e) => {
                    e.preventDefault();
                    messageHandler.send(WebViewMessages.toVscode.configEditor.openSettings);
                  }}
                >
                  Open Demo Time Settings
                </button>
              </p>
              <p className="text-sm text-warning-800 dark:text-warning-200">
                You can get it at <a href="https://engagetime.live" target="_blank" rel="noopener noreferrer" className="underline! decoration-dotted! hover:decoration-solid! text-blue-700! dark:text-blue-400!">https://engagetime.live</a>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
