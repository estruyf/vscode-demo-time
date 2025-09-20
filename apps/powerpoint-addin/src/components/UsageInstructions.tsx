import * as React from 'react';

export const UsageInstructions: React.FC = () => {
  return (
    <div className="p-4 bg-gray-4 text-[10px]">
      <h3 className="font-semibold mb-2">How to use</h3>
      <ol className="list-decimal list-inside space-y-1">
        <li>
          In your VSCode project, set <code className="bg-gray-6 px-1 rounded">demoTime.api.enabled</code> to <code className="bg-gray-6 px-1 rounded">true</code> in your settings.
        </li>
        <li>
          Set an ID for your demo in one of your demo files.
        </li>
        <li>
          Use the ID in the <strong>Demo ID</strong> input.
        </li>
        <li>
          Save the settings and you are ready to go!
        </li>
      </ol>

      <div className="mt-4 p-2 border border-blue-400 bg-blue-100 text-blue-700 rounded">
        <p className="font-bold">Tip:</p>
        <p>The add-in does not need to be visible on the slide to function; you can drag it outside the slide area.</p>
      </div>

      <div className="mt-4 p-2 border border-yellow-400 bg-yellow-100 text-yellow-700 rounded">
        <p className="font-bold">Important note:</p>
        <p>If you change the slide order, you will have to manually save the settings again.</p>
      </div>
    </div>
  );
};
