import * as React from 'react';

export const UsageInstructions: React.FC = () => {
  return (
    <div className="p-4 bg-gray-4">
      <h3 className="font-semibold mb-2">How to use</h3>
      <ol className="list-decimal list-inside space-y-1 text-[10px]">
        <li>
          In your VSCode project, set <code className="bg-gray-6 px-1 rounded">demoTime.api.enabled</code> to <code className="bg-gray-6 px-1 rounded">true</code> in your settings.
        </li>
        <li>
          Set IDs to your demo steps.
        </li>
        <li>
          Use these IDs in the <strong>Command ID</strong> input.
        </li>
        <li>
          Save the settings and you are ready to go!
        </li>
      </ol>
    </div>
  );
};
