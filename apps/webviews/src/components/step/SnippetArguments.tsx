import { SnippetField, WebViewMessages } from '@demotime/common';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { RefreshCcw } from 'lucide-react';
import * as React from 'react';

export interface ISnippetArgumentsProps {
  path: string;
  args: Record<string, unknown> | undefined;
  onChange: (args: Record<string, unknown>) => void;
}

const omit = (obj: Record<string, unknown>, key: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

export const SnippetArguments: React.FunctionComponent<ISnippetArgumentsProps> = ({
  path,
  args,
  onChange,
}: React.PropsWithChildren<ISnippetArgumentsProps>) => {
  const [fields, setFields] = React.useState<SnippetField[]>([]);
  const [customKeys, setCustomKeys] = React.useState<string[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchFields = React.useCallback(() => {
    if (!path) {
      return;
    }
    setRefreshing(true);
    messageHandler
      .request<SnippetField[] | string[]>(WebViewMessages.toVscode.configEditor.checkSnippetArgs, path)
      .then((result: SnippetField[] | string[]) => {
        if (!result || result.length === 0) {
          setFields([]);
          return;
        }
        // Handle legacy string[] response from older extension builds
        if (typeof result[0] === 'string') {
          setFields((result as string[]).map((name) => ({ name, type: 'string' as const })));
        } else {
          setFields(result as SnippetField[]);
        }
      })
      .catch((error: Error) => {
        console.error('Error fetching snippet arguments:', error.message);
        setFields([]);
      })
      .finally(() => setRefreshing(false));
  }, [path]);

  React.useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Sync custom keys: any keys in args that aren't in known fields
  React.useEffect(() => {
    const knownNames = new Set(fields.map((f) => f.name));
    const extraKeys = Object.keys(args || {}).filter((k) => !knownNames.has(k));
    setCustomKeys((prev) => {
      // Remove any prev keys that became known fields, then add remaining extras
      const filtered = prev.filter((k) => k !== '' && !knownNames.has(k));
      const merged = new Set([...filtered, ...extraKeys]);
      return Array.from(merged);
    });
  }, [fields, args]);

  const currentArgs: Record<string, unknown> =
    typeof args === 'object' && args !== null ? args : {};

  const setArg = (name: string, value: string | number | boolean | undefined) => {
    if (value === undefined || value === '') {
      onChange(omit(currentArgs, name));
    } else {
      onChange({ ...currentArgs, [name]: value });
    }
  };

  const renameCustomKey = (oldKey: string, newKey: string) => {
    setCustomKeys((prev) => prev.map((k) => (k === oldKey ? newKey : k)));
    if (newKey && newKey !== oldKey) {
      const oldVal = currentArgs[oldKey];
      onChange({ ...omit(currentArgs, oldKey), [newKey]: oldVal ?? '' });
    } else if (!newKey && oldKey) {
      onChange(omit(currentArgs, oldKey));
    }
  };

  const setCustomValue = (key: string, value: string) => {
    if (!key) {
      return;
    }
    onChange({ ...currentArgs, [key]: value });
  };

  const removeCustomKey = (key: string) => {
    setCustomKeys((prev) => prev.filter((k) => k !== key));
    onChange(omit(currentArgs, key));
  };

  if (!path) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3 border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-900/50">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={fetchFields}
          disabled={refreshing}
          title="Refresh snippet arguments"
          className="text-xs text-gray-400 hover:text-demo-time-accent disabled:opacity-40 flex items-center gap-1"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.name}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
                {field.description && (
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
                    — {field.description}
                  </span>
                )}
              </label>
              {field.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={!!currentArgs[field.name]}
                  onChange={(e) => setArg(field.name, e.target.checked)}
                  className="rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={(currentArgs[field.name] as string | number) ?? ''}
                  onChange={(e) =>
                    setArg(
                      field.name,
                      field.type === 'number'
                        ? e.target.value === ''
                          ? undefined
                          : Number(e.target.value)
                        : e.target.value || undefined,
                    )
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder={`Enter ${field.name}`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {customKeys.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Custom arguments</p>
          {customKeys.map((key, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                value={key}
                onChange={(e) => renameCustomKey(key, e.target.value)}
                placeholder="Name"
                className="w-2/5 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <input
                type="text"
                value={key ? ((currentArgs[key] as string) ?? '') : ''}
                onChange={(e) => setCustomValue(key, e.target.value)}
                placeholder="Value"
                disabled={!key}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => removeCustomKey(key)}
                className="shrink-0 text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-xs px-1"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setCustomKeys((prev) => [...prev, ''])}
        className="text-xs text-demo-time-accent hover:underline"
      >
        + Add custom argument
      </button>
    </div>
  );
};
