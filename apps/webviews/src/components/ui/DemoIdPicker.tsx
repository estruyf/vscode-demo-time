import { messageHandler } from '@estruyf/vscode/dist/client';
import * as React from 'react';
import { SearchableDropdown } from './SearchableDropdown';
import { WebViewMessages } from '@demotime/common';

interface Demo {
  title: string;
  id: string;
}

interface DemoFile {
  filePath: string;
  demos: Demo[];
}

interface DemoData {
  demoFiles: DemoFile[];
  nextDemo?: Demo;
  currentDemoFile?: {
    filePath: string;
    demo: Demo[];
  };
}

export interface IDemoIdPickerProps {
  onDemoSelect?: (demo: Demo, filePath: string) => void;
  value?: string;
  placeholder?: string;
}

export const DemoIdPicker: React.FunctionComponent<IDemoIdPickerProps> = ({
  onDemoSelect,
  value = '',
  placeholder = "Select a demo..."
}) => {
  const [demoData, setDemoData] = React.useState<DemoData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const getAllDemoData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await messageHandler.request<DemoData>(WebViewMessages.toVscode.configEditor.getDemoIds);
      setDemoData(response);
    } catch (error) {
      console.error('Failed to fetch demo data:', error);
      setError('Failed to load demo data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    getAllDemoData();
  }, []);

  // Transform demo data into SearchableDropdown format
  const dropdownOptions = React.useMemo(() => {
    if (!demoData?.demoFiles) return [];

    return demoData.demoFiles
      .map(demoFile => ({
        category: demoFile.filePath.split('/').pop() || demoFile.filePath,
        options: demoFile.demos
          .filter(demo => demo.id) // Only include demos with IDs
          .map(demo => demo.id)
      }))
      .filter(group => group.options.length > 0); // Only include files that have demos with IDs
  }, [demoData]);

  // Find the selected demo's title
  const selectedDemo = React.useMemo(() => {
    if (!value || !demoData?.demoFiles) return null;

    for (const demoFile of demoData.demoFiles) {
      const demo = demoFile.demos.find(d => d.id === value);
      if (demo) {
        return demo;
      }
    }
    return null;
  }, [value, demoData]);

  const handleDemoChange = (selectedId: string) => {
    if (!onDemoSelect) return;

    // Check if this is an existing demo ID from our data
    if (demoData?.demoFiles) {
      for (const demoFile of demoData.demoFiles) {
        const demo = demoFile.demos.find(d => d.id === selectedId);
        if (demo) {
          onDemoSelect(demo, demoFile.filePath);
          return;
        }
      }
    }

    // If not found in existing demos, create a demo object for freeform input
    onDemoSelect({ id: selectedId, title: selectedId }, '');
  };

  if (loading) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
        Loading demos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-3 py-2 border border-red-300 dark:border-red-400 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
        {error}
        <button
          onClick={getAllDemoData}
          className="ml-2 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!demoData || dropdownOptions.length === 0) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
        No demos with IDs found
      </div>
    );
  }

  return (
    <div>
      <SearchableDropdown
        value={value}
        options={dropdownOptions}
        onChange={handleDemoChange}
        placeholder={placeholder}
        noItemsText='No demo found with this ID'
        allowFreeform={true}
      />
      {selectedDemo && (
        <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Selected demo: {selectedDemo.title}
          </div>
        </div>
      )}
    </div>
  );
};
