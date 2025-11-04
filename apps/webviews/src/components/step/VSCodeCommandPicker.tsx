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

  React.useEffect(() => {
    const fetchCommands = async () => {
      const fetchedCommands = await messageHandler.request<string[]>(WebViewMessages.toVscode.configEditor.commands);
      setCommands(fetchedCommands);
    };

    fetchCommands();
  }, []);

  return (
    <div className="mt-1">
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
