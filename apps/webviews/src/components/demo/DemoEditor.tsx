import React, { useState } from 'react';
import { validateDemo } from '../../utils/validation';
import { Demo } from '../../types/demo';
import { Card, Input, PathInput, Textarea, Switch, SearchableDropdown } from '../ui';
import { Icon } from 'vscrui';
import { VSCODE_ICONS } from '../../constants/icons';
import { ChevronDown, ChevronUp, FilePlus } from 'lucide-react';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { WebViewMessages } from '@demotime/common';

interface DemoEditorProps {
  demo: Demo;
  onChange: (demo: Demo) => void;
}

export const DemoEditor: React.FC<DemoEditorProps> = ({ demo, onChange }) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

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
        <div className="flex items-center justify-between">
          <button
            className="text-demo-time-gray-1 hover:text-demo-time-gray-2"
            aria-label={collapsed ? "Expand settings" : "Collapse settings"}
            onClick={() => setCollapsed((prev) => !prev)}
          >
            <div className="flex items-center space-x-2">
              {collapsed ? <ChevronDown /> : <ChevronUp />}

              <h2 className="text-xl font-semibold text-gray-900">Demo Information</h2>
            </div>
          </button>
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-2">{demo.disabled ? 'Disabled' : 'Enabled'}</span>
            <Switch
              checked={!demo.disabled}
              onCheckedChange={(checked) => handleChange('disabled', !checked)}
            />
          </div>
        </div>

        {!collapsed &&
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Demo Title"
              required
              value={demo.title}
              onChange={(value) => handleChange('title', value)}
              placeholder="Enter demo title"
              error={getFieldError('title')}
            />

            <div>
              <Input
                label="Demo ID"
                value={demo.id || ''}
                onChange={(value) => handleChange('id', value || undefined)}
                placeholder="Enter demo ID (optional)"
                error={getFieldError('id')}
              />
              <p className="text-xs text-gray-500 mt-2">Optional. This ID can be used to trigger this demo from the API of URI handler.</p>
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Description"
                value={demo.description || ''}
                onChange={(value) => handleChange('description', value || undefined)}
                placeholder="Enter demo description"
                error={getFieldError('description')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                />
              </div>
            </div>

            {/* Notes Section */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes File</label>
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
                    <label htmlFor="showOnTrigger" className="text-sm text-gray-700">
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
