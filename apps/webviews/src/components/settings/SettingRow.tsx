import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Config, SettingDefinition } from '@demotime/common';
import { SettingControl } from './SettingControl';

interface SettingRowProps {
  definition: SettingDefinition;
  value: unknown;
  defaultValue: unknown;
  isModified: boolean;
  isUnsaved: boolean;
  onChange: (value: unknown) => void;
  onReset: () => void;
}

/**
 * Renders the `code` parts of a description
 */
export const Description: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(`[^`]+`)/g).map((part, index) =>
      part.startsWith('`') && part.endsWith('`') ? (
        <code
          key={index}
          className="px-1 py-0.5 rounded-sm text-[0.85em] bg-gray-100 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200"
        >
          {part.slice(1, -1)}
        </code>
      ) : (
        <React.Fragment key={index}>{part}</React.Fragment>
      ),
    )}
  </>
);

export const SettingRow: React.FC<SettingRowProps> = ({
  definition,
  value,
  defaultValue,
  isModified,
  isUnsaved,
  onChange,
  onReset,
}) => {
  // A switch sits next to the label, other controls below it
  const isInline = definition.control === 'boolean';
  const id = `setting-${definition.key.replace(/\./g, '-')}`;

  const control = (
    <SettingControl
      definition={definition}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
    />
  );

  return (
    <div id={id} className="relative px-5 py-4">
      {(isModified || isUnsaved) && (
        <span
          aria-hidden="true"
          className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full ${isUnsaved ? 'bg-yellow-500' : 'bg-gray-400 dark:bg-gray-500'}`}
        />
      )}

      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {definition.label}
            </h3>
            {isUnsaved ? (
              <span className="text-[11px] px-1.5 py-0.5 rounded-sm bg-yellow-100 text-yellow-900 dark:bg-yellow-400/15 dark:text-yellow-300">
                Unsaved
              </span>
            ) : (
              isModified && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  Modified
                </span>
              )
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            <Description text={definition.description} />
          </p>
        </div>
        {isInline && <div className="shrink-0 pt-0.5">{control}</div>}
      </div>

      {!isInline && <div className="mt-3">{control}</div>}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {definition.secret ? (
          <span>Stored in the VS Code secret storage</span>
        ) : (
          <code className="select-all">
            {Config.root}.{definition.key}
          </code>
        )}
        {definition.userSettings && <span>· Saved in your user settings</span>}
        {isModified && !definition.secret && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline-offset-2 hover:underline cursor-pointer"
            title="Reset to the default value"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
};
