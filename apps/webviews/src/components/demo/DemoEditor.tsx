import React, { useState } from 'react';
import { validateDemo } from '../../utils/validation';
import { Card, Input, PathInput, Textarea, Switch, SearchableDropdown } from '../ui';
import { Icon } from 'vscrui';
import { VSCODE_ICONS } from '../../constants/icons';
import { ChevronDown, ChevronUp, FilePlus, Link, RefreshCw } from 'lucide-react';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { Demo, WebViewMessages } from '@demotime/common';

interface DemoEditorProps {
  demo: Demo;
  onChange: (demo: Demo) => void;
  onGenerateId?: () => string;
  index?: number;
}

export const DemoEditor: React.FC<DemoEditorProps> = ({ demo, onChange, onGenerateId, index }) => {
  // Scene details are hidden by default to keep the editor compact.
  const [collapsed, setCollapsed] = useState<boolean>(true);

  // Notes file helpers
  const handleNotesPathChange = React.useCallback((path: string) => {
    const crntDemo = { ...demo };
    if (!path) {
      delete crntDemo.notes;
      onChange(crntDemo);
      return;
    }

    onChange({
      ...crntDemo,
      notes: {
        path
      },
    });
  }, [demo, onChange]);

  // If the demo is not available (e.g., during a state transition), don't render the editor.
  if (!demo) {
    return null;
  }

  const validation = validateDemo(demo);

  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */ }
  const handleChange = (field: keyof Demo, value: any) => {
    onChange({ ...demo, [field]: value });
  };

  const handleIconChange = (type: 'start' | 'end', icon: string) => {
    const currentIcons = demo.icons || { start: '', end: '' };
    onChange({
      ...demo,
      icons: {
        ...currentIcons,
        [type]: icon,
      },
    });
  };

  const notesPath = demo.notes?.path || '';

  const handleCreateNotesFile = async () => {
    // Generate a default notes file name
    const fileName = `${demo.id || demo.title.replace(/\s+/g, '_').toLowerCase()}_notes.md`;
    // Place in workspace root or a notes folder
    const filePath = `notes/${fileName}`;
    // Create the file via VS Code API
    const result = await messageHandler.request<string>(WebViewMessages.toVscode.configEditor.createNotes, { path: filePath, content: `# Notes for ${demo.title}\n` });
    handleNotesPathChange(result);
  };

  // Helper function to get field errors
  const getFieldError = (fieldName: string) => {
    const error = validation.errors.find(e => e.field === fieldName);
    return error?.message;
  };

  function handleShowOnTriggerChange(checked: boolean): void {
    if (checked) {
      handleChange('notes', { ...demo.notes, showOnTrigger: checked });
    } else {
      const updatedNotes = { ...demo.notes };
      delete updatedNotes.showOnTrigger;
      handleChange('notes', updatedNotes);
    }
  }

  return (
    <Card>
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Row 1: scene number, title and enabled toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {typeof index === 'number' && (
                <span className="flex items-center justify-center h-10 w-10 shrink-0 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-sm font-semibold tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
              )}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate" title={demo.title}>
                {demo.title || <span className="text-gray-400 dark:text-gray-500">Untitled scene</span>}
              </h2>
            </div>
            <div className="flex items-center shrink-0">
              <span className={`text-sm font-medium mr-2 ${demo.disabled ? 'text-gray-500 dark:text-gray-400' : 'text-green-600 dark:text-green-400'}`}>
                {demo.disabled ? 'Disabled' : 'Enabled'}
              </span>
              <Switch
                checked={!demo.disabled}
                onCheckedChange={(checked) => handleChange('disabled', !checked)}
              />
            </div>
          </div>

          {/* Row 2: scene id, generate action and details toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-flex items-center gap-1.5 max-w-full px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
                title={demo.id || 'No scene ID set'}
              >
                <Link className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                <span className={`truncate font-mono text-xs ${demo.id ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                  {demo.id || 'No ID'}
                </span>
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (onGenerateId) {
                    handleChange('id', onGenerateId());
                  }
                }}
                title="Generate unique scene ID"
                disabled={!onGenerateId}
              >
                <RefreshCw className="h-4 w-4" />
                Generate ID
              </button>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Show scene details' : 'Hide scene details'}
              onClick={() => setCollapsed((prev) => !prev)}
            >
              <span>Scene details</span>
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!collapsed &&
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-6">
            <Input
              label="Scene title"
              required
              value={demo.title}
              onChange={(value) => handleChange('title', value)}
              placeholder="Enter scene title"
              error={getFieldError('title')}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scene ID
              </label>
              <Input
                label={undefined}
                value={demo.id || ''}
                onChange={(value) => handleChange('id', value || undefined)}
                placeholder="Enter scene ID (optional)"
                error={getFieldError('id')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">Optional. This ID can be used to trigger this demo from the API of URI handler. Use <span className="font-medium">Generate ID</span> above for a unique value.</p>
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Description"
                value={demo.description || ''}
                onChange={(value) => handleChange('description', value || undefined)}
                placeholder="Enter scene description"
                error={getFieldError('description')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Icon
              </label>
              <div className="flex items-center gap-2">
                {demo.icons?.start && (
                  <div className="relative p-2 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center h-[42px] w-[42px]">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Icon name={demo.icons.start as any} />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-0.5 text-xs text-gray-500 hover:text-red-600 hover:border-red-400 shadow-xs flex items-center justify-center"
                      style={{ width: 20, height: 20 }}
                      title="Remove icon"
                      onClick={() => handleIconChange('start', '')}
                    >
                      ×
                    </button>
                  </div>
                )}
                <SearchableDropdown
                  value={demo.icons?.start || ''}
                  onChange={(value) => handleIconChange('start', value)}
                  options={VSCODE_ICONS}
                  placeholder="Select start icon"
                  className="grow"
                  isIconPicker
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Icon
              </label>
              <div className="flex items-center gap-2">
                {demo.icons?.end && (
                  <div className="relative p-2 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center h-[42px] w-[42px]">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Icon name={demo.icons.end as any} />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-0.5 text-xs text-gray-500 hover:text-red-600 hover:border-red-400 shadow-xs flex items-center justify-center"
                      style={{ width: 20, height: 20 }}
                      title="Remove icon"
                      onClick={() => handleIconChange('end', '')}
                    >
                      ×
                    </button>
                  </div>
                )}
                <SearchableDropdown
                  value={demo.icons?.end || ''}
                  onChange={(value) => handleIconChange('end', value)}
                  options={VSCODE_ICONS}
                  placeholder="Select end icon"
                  className="grow"
                  isIconPicker
                />
              </div>
            </div>

            <div>
              <Input
                label="Auto advance after (seconds)"
                type="number"
                min={1}
                value={typeof demo.autoAdvanceAfter === 'number' ? `${demo.autoAdvanceAfter}` : ''}
                onChange={(value) => {
                  const parsed = Number(value);
                  handleChange(
                    'autoAdvanceAfter',
                    value.trim() === '' || !Number.isFinite(parsed) ? undefined : parsed,
                  );
                }}
                placeholder="Optional"
                error={getFieldError('autoAdvanceAfter')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
                When set, this scene advances automatically after the given number of seconds.
              </p>
            </div>

            {/* Notes Section */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes File</label>
              <div className="flex items-center gap-2 mb-2">
                <PathInput
                  label={undefined}
                  value={notesPath}
                  onChange={handleNotesPathChange}
                  placeholder="Link or create a markdown notes file..."
                  type="file"
                  fileTypes={["md"]}
                  showOpenButton={true}
                  error={getFieldError('notes')}
                />
                <button
                  type="button"
                  className={`px-3 py-2 rounded-md flex items-center gap-1 ${notesPath
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  onClick={handleCreateNotesFile}
                  title="Create new notes file"
                  disabled={!!notesPath}
                >
                  <FilePlus className="h-4 w-4" />
                  Create
                </button>
              </div>
              {/* ShowOnTrigger Checkbox */}
              {
                notesPath && (
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      checked={!!demo.notes?.showOnTrigger}
                      onChange={(e) => handleShowOnTriggerChange(e.target.checked)}
                      id="showOnTrigger"
                      className="mr-2"
                    />
                    <label htmlFor="showOnTrigger" className="text-sm text-gray-700 dark:text-gray-300">
                      Show notes file when demo is triggered
                    </label>
                  </div>
                )
              }
            </div>
          </div>
        }
      </div>
    </Card>
  );
};
