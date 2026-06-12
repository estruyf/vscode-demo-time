import { WebViewMessages } from '@demotime/common';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { SearchableDropdown } from '../ui/SearchableDropdown';

export interface IVSCodeCommandPickerProps {
  value: string;
  placeholder: string;
  error?: string;
  onChange: (command: string) => void;
}

export const VSCodeCommandPicker: React.FunctionComponent<IVSCodeCommandPickerProps> = ({
  value,
  placeholder,
  error,
  onChange
}: React.PropsWithChildren<IVSCodeCommandPickerProps>) => {
  const [commands, setCommands] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchCommands = async () => {
      try {
        setLoading(true);
        const fetchedCommands = await messageHandler.request<string[]>(WebViewMessages.toVscode.configEditor.commands);
        setCommands(fetchedCommands);
        setFetchError(null);
      } catch (err) {
        setFetchError('Failed to load VS Code commands');
        console.error('Error fetching commands:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommands();
  }, []);

  return (
    <div className="mt-1">
      {loading && <p className="text-sm text-gray-500 mb-1">Loading commands...</p>}
      {fetchError && <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">{fetchError}</p>}

      <SearchableDropdown
        value={value}
        options={commands}
        onChange={onChange}
        placeholder={placeholder}
        allowFreeform={true}
        noItemsText="No VS Code commands found"
        className={error ? 'border-red-300 dark:border-red-400' : ''}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
};
