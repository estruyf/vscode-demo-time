import React, { useEffect, useState } from 'react';
import { CATEGORIZED_ACTIONS, THEMES, TYPING_MODES, TERMINAL_TYPING_MODES } from '../../types/demo';
import { getFieldsForAction, getRequiredFields } from '../../utils/actionHelpers';
import { validateStep } from '../../utils/validation';
import { SearchableDropdown } from '../ui/SearchableDropdown';
import { ComboBox } from '../ui/ComboBox';
import { PathInput } from '../ui/PathInput';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { Switch } from '../ui/Switch';
import { SnippetArguments } from './SnippetArguments';
import { DemoIdPicker } from '../ui/DemoIdPicker';
import { Action, Step, WebViewMessages } from '@demotime/common';
import { PollIdPicker } from './PollIdPicker';
import { useDemoConfigContext } from '../../hooks';

interface StepEditorProps {
  step: Step;
  onChange: (step: Step) => void;
}

export const StepEditor: React.FC<StepEditorProps> = ({ step, onChange }) => {
  // Local state for id field (ExecuteScript only)
  const [localId, setLocalId] = React.useState(step.id || '');
  React.useEffect(() => {
    setLocalId(step.id || '');
  }, [step.id]);

  const commitId = () => {
    if (localId !== step.id) {
      handleChange('id', localId || undefined);
    }
  };
  const availableFields = getFieldsForAction(step?.action);
  const requiredFields = getRequiredFields(step?.action);
  const stepValidation = validateStep(step);
  const { config } = useDemoConfigContext();

  // State for fetched themes
  const [fetchedThemes, setFetchedThemes] = useState<string[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  useEffect(() => {
    const fetchThemes = async () => {
      setLoadingThemes(true);
      setThemeError(null);
      try {
        messageHandler.request<string[]>(WebViewMessages.toVscode.configEditor.getThemes).then((data) => {
          setFetchedThemes(Array.isArray(data) ? data : THEMES);
        });
      } catch (err) {
        console.log('Error fetching themes:', (err as Error).message);
        setFetchedThemes(THEMES);
      } finally {
        setLoadingThemes(false);
      }
    };
    fetchThemes();
  }, []);

  // Parse position into separate fields
  const parsePosition = (position?: string | number) => {
    if (!position) { return { startLine: '', startChar: '', endLine: '', endChar: '' }; }

    const pos = position.toString().trim();

    // Handle special cases
    if (pos === 'start' || pos === 'end') {
      return { startLine: pos, startChar: '', endLine: '', endChar: '' };
    }

    // Handle full range: "10,5:20,10"
    const fullRangeMatch = pos.match(/^(\d+),(\d+):(\d+),(\d+)$/);
    if (fullRangeMatch) {
      return {
        startLine: fullRangeMatch[1],
        startChar: fullRangeMatch[2],
        endLine: fullRangeMatch[3],
        endChar: fullRangeMatch[4]
      };
    }

    // Handle line range: "10:20"
    const lineRangeMatch = pos.match(/^(\d+):(\d+)$/);
    if (lineRangeMatch) {
      return {
        startLine: lineRangeMatch[1],
        startChar: '',
        endLine: lineRangeMatch[2],
        endChar: ''
      };
    }

    // Handle line,character: "10,5"
    const lineCharMatch = pos.match(/^(\d+),(\d+)$/);
    if (lineCharMatch) {
      return {
        startLine: lineCharMatch[1],
        startChar: lineCharMatch[2],
        endLine: '',
        endChar: ''
      };
    }

    // Handle single line: "10"
    if (/^\d+$/.test(pos)) {
      return {
        startLine: pos,
        startChar: '',
        endLine: '',
        endChar: ''
      };
    }

    return { startLine: pos, startChar: '', endLine: '', endChar: '' };
  };

  // Combine position fields into position string
  const combinePosition = (startLine: string, startChar: string, endLine: string, endChar: string): string | undefined => {
    if (!startLine.trim()) { return undefined; }

    const start = startLine.trim();
    const startC = startChar.trim();
    const end = endLine.trim();
    const endC = endChar.trim();

    // Handle special cases
    if (start === 'start' || start === 'end') {
      return start;
    }

    // Build position string based on what's filled
    if (end && endC) {
      // Full range: "10,5:20,10"
      return `${start},${startC || '0'}:${end},${endC}`;
    } else if (end) {
      // Line range: "10:20"
      return `${start}:${end}`;
    } else if (startC) {
      // Line,character: "10,5"
      return `${start},${startC}`;
    } else {
      // Single line: "10"
      return start;
    }
  };

  // Validate position ranges
  const validatePositionRange = (startLine: string, startChar: string, endLine: string, endChar: string): string | null => {
    if (!startLine.trim()) { return null; }

    const start = startLine.trim();
    const startC = startChar.trim();
    const end = endLine.trim();
    const endC = endChar.trim();

    // Skip validation for special cases
    if (start === 'start' || start === 'end') { return null; }

    // Validate that all values are numbers when provided
    if (!/^\d+$/.test(start)) { return 'Start line must be a number'; }
    if (startC && !/^\d+$/.test(startC)) { return 'Start character must be a number'; }
    if (end && !/^\d+$/.test(end)) { return 'End line must be a number'; }
    if (endC && !/^\d+$/.test(endC)) { return 'End character must be a number'; }

    if (end) {
      const startLineNum = parseInt(start);
      const endLineNum = parseInt(end);

      if (endLineNum < startLineNum) {
        return 'End line cannot be lower than start line';
      }

      if (startC && endC && startLineNum === endLineNum) {
        const startCharNum = parseInt(startC);
        const endCharNum = parseInt(endC);

        if (endCharNum < startCharNum) {
          return 'End character cannot be lower than start character on the same line';
        }
      }
    }

    return null;
  };

  const handleChange = <K extends keyof Step>(field: K, value: Step[K]) => {
    const newStep = { ...step };
    if (value === '' || value === undefined) {
      delete newStep[field];
    } else {
      newStep[field] = value;
    }

    // Special logic for highlightWholeLine based on position
    if (field === 'position' && typeof value === 'string') {
      // Full range: "10,5:20,10"
      const fullRangeMatch = value.match(/^(\d+),(\d+):(\d+),(\d+)$/);
      if (fullRangeMatch) {
        newStep.highlightWholeLine = false;
      } else if (typeof newStep.highlightWholeLine === 'undefined') {
        // If not a full range and highlightWholeLine is undefined, default to true
        newStep.highlightWholeLine = true;
      }
    }

    onChange(newStep);
  };

  const handleSettingChange = (key: string, value: string | number | boolean | object | null | undefined) => {
    handleChange('setting', { key, value: value === undefined ? null : value });
  };

  const handleStateChange = (key: string, value: string) => {
    handleChange('state', { key, value });
  };

  // Handle position field changes
  const handlePositionChange = (field: 'startLine' | 'startChar' | 'endLine' | 'endChar', value: string) => {
    const currentPos = parsePosition(step.position);
    const newPos = { ...currentPos, [field]: value };
    const combinedPosition = combinePosition(newPos.startLine, newPos.startChar, newPos.endLine, newPos.endChar);
    handleChange('position', combinedPosition);
  };

  const getTypingModeOptions = () => {
    // Use terminal typing modes for terminal commands
    if (step.action === 'executeTerminalCommand') {
      return TERMINAL_TYPING_MODES;
    }
    return TYPING_MODES;
  };

  const renderField = (field: string) => {
    const isRequired = requiredFields.includes(field);
    const fieldErrors = stepValidation.errors.filter(error => error.field === field);
    const hasError = fieldErrors.length > 0;
    let label = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');

    if (field === "slide") {
      label = "Slide Number (1-based index)";
    } else if (field === 'timeout') {
      label = "Timeout (ms)";
    } else if (field === 'zoom') {
      label = "Zoom Level (times to use VS Code zoom)";
    } else if (field === 'insertTypingSpeed') {
      label = "Insert Typing Speed (ms)";
    } else if (step.action === Action.RunDemoById) {
      label = "Demo ID";
    } else if (step.action === Action.ExecuteScript) {
      label = "Script ID";
    }

    switch (field) {
      case 'action':
        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action {isRequired && <span className="text-red-500">*</span>}
            </label>
            <SearchableDropdown
              value={step.action}
              options={CATEGORIZED_ACTIONS}
              onChange={(value) => handleChange('action', value as Action)}
              placeholder="Select action..."
            />
            {
              step.action && step.action.toLowerCase().includes('engagetime') && (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2 space-y-1">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Make sure to set the Engage Time Session ID in the demo configuration.
                    </p>
                    <button
                      type="button"
                      className="!text-sm bg-transparent p-0 m-0 border-none underline decoration-dotted hover:decoration-solid text-blue-700 cursor-pointer"
                      style={{ font: 'inherit' }}
                      onClick={(e) => {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent('engagetime:open-config', {}));
                      }}
                    >
                      Open Engage Time Config
                    </button>
                  </div>
                  {
                    config.engageTime?.sessionId ? null : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2 space-y-1">
                        <p className="text-sm text-red-700 mt-1">
                          <strong>Error:</strong> No Engage Time Session ID is set in the demo configuration.
                        </p>
                      </div>
                    )
                  }
                </>
              )
            }
          </div>
        );

      case 'theme':
        return (
          <div key={field}>
            <ComboBox
              label="Theme"
              required={isRequired}
              value={step.theme || ''}
              onChange={(value) => handleChange('theme', value || undefined)}
              options={loadingThemes ? THEMES : (fetchedThemes.length > 0 ? fetchedThemes : THEMES)}
              placeholder={loadingThemes ? 'Loading themes...' : 'Select or enter custom theme'}
              error={themeError || (fieldErrors.length > 0 ? fieldErrors[0].message : undefined)}
            />
            {themeError && (
              <p className="text-sm text-red-600 mt-1">{themeError}</p>
            )}
          </div>
        );

      case 'pollId':
        return (
          <div key={field}>
            <PollIdPicker
              label="Poll ID"
              required={isRequired}
              sessionId={config.engageTime?.sessionId || ''}
              value={step.pollId || ''}
              onChange={(value) => handleChange('pollId', value || undefined)}
              error={fieldErrors.length > 0 ? fieldErrors[0].message : undefined}
            />
          </div>
        );

      case 'insertTypingMode':
        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Insert Typing Mode {isRequired && <span className="text-red-500">*</span>}
            </label>
            <select
              value={step.insertTypingMode || 'instant'}
              onChange={(e) => handleChange('insertTypingMode', (e.target.value || undefined) as typeof step.insertTypingMode)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
            >
              {getTypingModeOptions().map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
            {fieldErrors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 mt-1">{error.message}</p>
            ))}
          </div>
        );

      case 'highlightWholeLine': {
        // Disable the field if position is a full range (start line/char:end line/char)
        const pos = step.position?.toString() || '';
        const isFullRange = /^\d+,\d+:\d+,\d+$/.test(pos);
        return (
          <div key={field}>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={typeof step[field] === 'undefined' ? true : step[field]}
                onChange={(e) => handleChange(field, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={isFullRange}
              />
              <span className="text-sm font-medium text-gray-700">
                {label} {isRequired && <span className="text-red-500">*</span>}
                {isFullRange && (
                  <span className="ml-2 text-xs text-gray-400">(Disabled for full range position)</span>
                )}
              </span>
            </label>
          </div>
        );
      }
      case 'overwrite':
      case 'openInVSCode':
      case 'autoExecute':
        return (
          <div key={field}>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={typeof step[field] === 'undefined' ? true : step[field]}
                onChange={(e) => handleChange(field, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {label} {isRequired && <span className="text-red-500">*</span>}
              </span>
            </label>
          </div>
        );

      case 'timeout':
      case 'zoom':
      case 'insertTypingSpeed':
      case 'slide':
        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {label} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              value={typeof step[field] !== 'undefined' ? step[field] : ''}
              onChange={(e) => handleChange(field, e.target.value ? parseInt(e.target.value) : undefined)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              placeholder={`Enter ${label.toLowerCase()}`}
              min={0}
            />
            {fieldErrors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 mt-1">{error.message}</p>
            ))}
          </div>
        );

      case 'content':
      case 'message':
        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {label} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={step[field] || ''}
              onChange={(e) => handleChange(field, e.target.value || undefined)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
            {fieldErrors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 mt-1">{error.message}</p>
            ))}
          </div>
        );

      case 'setting':
        return (
          <div key={field} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Setting {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="setting-key">Key</label>
                <input
                  id="setting-key"
                  type="text"
                  value={step.setting?.key || ''}
                  onChange={(e) => handleSettingChange(e.target.value, step.setting?.value)}
                  className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  placeholder="Setting key"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="setting-value">Value</label>
                <textarea
                  id="setting-value"
                  value={
                    typeof step.setting?.value === 'object' && step.setting?.value !== null
                      ? JSON.stringify(step.setting.value, null, 2)
                      : typeof step.setting?.value === 'boolean'
                        ? String(step.setting?.value)
                        : step.setting?.value || ''
                  }
                  onChange={e => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleSettingChange(step.setting?.key || '', parsed);
                    } catch {
                      // Optionally show error or ignore
                      handleSettingChange(step.setting?.key || '', e.target.value);
                    }
                  }}
                  rows={5}
                  className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  placeholder="Setting value (JSON or string)"
                />
              </div>

              {fieldErrors.map((error, index) => (
                <p key={index} className="text-sm text-red-600 mt-1">{error.message}</p>
              ))}
            </div>
          </div>
        );

      case 'state':
        return (
          <div key={field} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="state-key">Key</label>
                <input
                  id="state-key"
                  type="text"
                  value={step.state?.key || ''}
                  onChange={(e) => handleStateChange(e.target.value, step.state?.value || '')}
                  className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  placeholder="State key"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="state-value">Value</label>
                <input
                  id="state-value"
                  type="text"
                  value={step.state?.value || ''}
                  onChange={(e) => handleStateChange(step.state?.key || '', e.target.value)}
                  className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  placeholder="State value"
                />
              </div>

              {fieldErrors.map((error, index) => (
                <p key={index} className="text-sm text-red-600 mt-1">{error.message}</p>
              ))}
            </div>
          </div>
        );

      case 'args':
        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arguments {isRequired && <span className="text-red-500">*</span>}
              <span className="text-xs text-gray-500 block mt-1">
                For VS Code commands: JSON object/array. For snippets: placeholder names
              </span>
            </label>
            <textarea
              value={typeof step.args === 'string' ? step.args : JSON.stringify(step.args, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleChange('args', parsed);
                } catch {
                  handleChange('args', e.target.value);
                }
              }}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              placeholder="Enter arguments (JSON or string)"
            />
            {
              (step.action === 'snippet' && step.contentPath) && (
                <SnippetArguments path={step.contentPath} />
              )
            }
            {fieldErrors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 mt-1">{error.message}</p>
            ))}
          </div>
        );

      case 'command': {
        // Different placeholders based on action type
        const commandPlaceholder = step.action === 'executeTerminalCommand'
          ? 'Enter terminal command (e.g., npm install)'
          : step.action === 'executeScript'
            ? 'Enter script command (e.g., node, bash, python)'
            : step.action === 'executeVSCodeCommand'
              ? 'Enter VS Code command ID (e.g., workbench.action.files.save)'
              : 'Enter command';

        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Command {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={step[field] || ''}
              onChange={(e) => handleChange(field, e.target.value || undefined)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              placeholder={commandPlaceholder}
            />
            {fieldErrors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 mt-1">{error.message}</p>
            ))}
          </div>
        );
      }

      case 'position': {
        const positionFields = parsePosition(step.position);
        const positionError = validatePositionRange(positionFields.startLine, positionFields.startChar, positionFields.endLine, positionFields.endChar);

        return (
          <div key={field} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="position-start-line">Start Line</label>
                  <input
                    id="position-start-line"
                    type="text"
                    value={positionFields.startLine}
                    onChange={(e) => handlePositionChange('startLine', e.target.value)}
                    className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${positionError ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="10 or start"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="position-start-char">Start Character</label>
                  <input
                    id="position-start-char"
                    type="text"
                    value={positionFields.startChar}
                    onChange={(e) => handlePositionChange('startChar', e.target.value)}
                    className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${positionError ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="5 (optional)"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="position-end-line">End Line</label>
                  <input
                    id="position-end-line"
                    type="text"
                    value={positionFields.endLine}
                    onChange={(e) => handlePositionChange('endLine', e.target.value)}
                    className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${positionError ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="20 (optional)"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="position-end-char">End Character</label>
                  <input
                    id="position-end-char"
                    type="text"
                    value={positionFields.endChar}
                    onChange={(e) => handlePositionChange('endChar', e.target.value)}
                    className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${positionError ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="10 (optional)"
                  />
                </div>
              </div>

              {positionError && (
                <p className="text-sm text-red-600">{positionError}</p>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Position Examples:</strong>
                </p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><code className="bg-blue-50 px-1 rounded-sm">10</code> - Line 10 (Start Line only)</p>
                  <p><code className="bg-blue-50 px-1 rounded-sm">10:20</code> - Lines 10 to 20 (Start + End Line)</p>
                  <p><code className="bg-blue-50 px-1 rounded-sm">10,5</code> - Line 10, character 5 (Start Line + Character)</p>
                  <p><code className="bg-blue-50 px-1 rounded-sm">10,5:20,10</code> - From line 10, char 5 to line 20, char 10 (All fields)</p>
                  <p><code className="bg-blue-50 px-1 rounded-sm">start</code> or <code className="bg-blue-50 px-1 rounded-sm">end</code> - Special keywords (Start Line only)</p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'startPlaceholder': {
        // Handle both startPlaceholder and endPlaceholder together
        if (availableFields.includes('endPlaceholder')) {
          const startError = stepValidation.errors.find(error => error.field === 'startPlaceholder');
          const endError = stepValidation.errors.find(error => error.field === 'endPlaceholder');

          return (
            <div key="placeholders" className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placeholders {(requiredFields.includes('startPlaceholder') || requiredFields.includes('endPlaceholder')) && <span className="text-red-500">*</span>}
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="start-placeholder">Start Placeholder</label>
                    <input
                      id="start-placeholder"
                      type="text"
                      value={step.startPlaceholder || ''}
                      onChange={(e) => handleChange('startPlaceholder', e.target.value || undefined)}
                      className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${startError ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="<!-- START -->"
                    />
                    {startError && (
                      <p className="text-sm text-red-600">{startError.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600 mb-1" htmlFor="end-placeholder">End Placeholder</label>
                    <input
                      id="end-placeholder"
                      type="text"
                      value={step.endPlaceholder || ''}
                      onChange={(e) => handleChange('endPlaceholder', e.target.value || undefined)}
                      className={`px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${endError ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="<!-- END -->"
                    />
                    {endError && (
                      <p className="text-sm text-red-600">{endError.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }
        // Fall through to default case if endPlaceholder is not available
        return null;
      }

      case 'id': {
        if (step.action === Action.ExecuteScript) {
          return (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {label} {isRequired && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={localId}
                onChange={e => setLocalId(e.target.value)}
                onBlur={commitId}
                onKeyDown={e => { if (e.key === 'Enter') { commitId(); } }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                placeholder={`Enter script ID`}
              />
              {fieldErrors.map((error, index) => (
                <p key={index} className="text-sm text-red-600 mt-1">{error.message}</p>
              ))}
            </div>
          );
        }

        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {label} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <DemoIdPicker
              value={step[field as keyof Step] || ''}
              onDemoSelect={(demo) => handleChange(field as keyof Step, demo.id)}
              placeholder="Select a demo..."
            />
            {fieldErrors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 mt-1">{error.message}</p>
            ))}
          </div>
        );
      }

      default:
        // Handle path fields with file picker
        if (field === 'path' || field === 'contentPath' || field === 'dest') {
          const fileTypes = step.action === 'openSlide' ? ['md'] : undefined;
          return (
            <div key={field}>
              <PathInput
                label={label === "Dest" ? "Destination Path" : label}
                required={isRequired}
                value={step[field] || ''}
                onChange={(value) => handleChange(field, value || undefined)}
                placeholder={`Enter ${label.toLowerCase()}`}
                error={fieldErrors.length > 0 ? fieldErrors[0].message : undefined}
                type={field === 'contentPath' ? 'file' : 'file'}
                fileTypes={fileTypes}
              />
            </div>
          );
        }

        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {label} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={step[field as keyof Step] || ''}
              onChange={(e) => handleChange(field as keyof Step, e.target.value || undefined)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
            {fieldErrors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 mt-1">{error.message}</p>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">Step Configuration</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">{step.disabled ? 'Disabled' : 'Enabled'}</span>
          <Switch
            checked={!step.disabled}
            onCheckedChange={(checked: boolean) => onChange({ ...step, disabled: !checked })}
            className="ml-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField('action')}
        {availableFields.filter(field => {
          // Skip endPlaceholder if startPlaceholder is available (they're grouped together)
          if (field === 'endPlaceholder' && availableFields.includes('startPlaceholder')) {
            return false;
          }
          return true;
        }).map(field => renderField(field))}
      </div>

      {/* Show validation hints for complex actions */}
      {(step.action === 'insert' || step.action === 'replace') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This action requires either content OR contentPath, and either position OR startPlaceholder.
          </p>
        </div>
      )}

      {step.action === 'create' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This action requires a path. You can optionally provide either content OR contentPath (but not both), or leave both empty to create an empty file.
          </p>
        </div>
      )}

      {step.action === 'highlight' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This action requires either position OR both startPlaceholder and endPlaceholder.
          </p>
        </div>
      )}

      {step.action === 'copyToClipboard' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This action requires either <code className="bg-white px-1 rounded-sm">content</code> OR <code className="bg-white px-1 rounded-sm">contentPath</code>.
          </p>
        </div>
      )}
    </div>
  );
};
