import React, { useState, useEffect } from 'react';

interface KeybindingPickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}

const SPECIAL_KEYS = [
  { value: 'enter', label: 'Enter' },
  { value: 'return', label: 'Return' },
  { value: 'tab', label: 'Tab' },
  { value: 'escape', label: 'Escape' },
  { value: 'esc', label: 'Esc' },
  { value: 'backspace', label: 'Backspace' },
  { value: 'delete', label: 'Delete' },
  { value: 'del', label: 'Del' },
  { value: 'space', label: 'Space' },
  { value: 'left', label: '← Left' },
  { value: 'right', label: '→ Right' },
  { value: 'up', label: '↑ Up' },
  { value: 'down', label: '↓ Down' },
  { value: 'home', label: 'Home' },
  { value: 'end', label: 'End' },
  { value: 'pageup', label: 'Page Up' },
  { value: 'pagedown', label: 'Page Down' },
];

export const KeybindingPicker: React.FC<KeybindingPickerProps> = ({
  value,
  onChange,
  required = false,
  error,
}) => {
  const [ctrl, setCtrl] = useState(false);
  const [alt, setAlt] = useState(false);
  const [shift, setShift] = useState(false);
  const [meta, setMeta] = useState(false);
  const [isCmdOrCtrl, setIsCmdOrCtrl] = useState(false);
  const [key, setKey] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [useCustomKey, setUseCustomKey] = useState(false);

  // Parse incoming value
  useEffect(() => {
    if (!value) {
      setCtrl(false);
      setAlt(false);
      setShift(false);
      setMeta(false);
      setIsCmdOrCtrl(false);
      setKey('');
      setCustomKey('');
      setUseCustomKey(false);
      return;
    }

    const parts = value.toLowerCase().split('+').map(p => p.trim());
    const modifiers = {
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
    };

    let keyPart = '';
    let foundCmdOrCtrl = false;

    for (const part of parts) {
      if (part === 'cmdorctrl') {
        modifiers.ctrl = true;
        modifiers.meta = true;
        foundCmdOrCtrl = true;
      } else if (['ctrl', 'control'].includes(part)) {
        modifiers.ctrl = true;
      } else if (['alt', 'option'].includes(part)) {
        modifiers.alt = true;
      } else if (part === 'shift') {
        modifiers.shift = true;
      } else if (['cmd', 'command', 'meta', 'win', 'super'].includes(part)) {
        modifiers.meta = true;
      } else {
        keyPart = part;
      }
    }

    setCtrl(modifiers.ctrl);
    setAlt(modifiers.alt);
    setShift(modifiers.shift);
    setMeta(modifiers.meta);
    setIsCmdOrCtrl(foundCmdOrCtrl);

    // Check if it's a special key
    const isSpecial = SPECIAL_KEYS.some(sk => sk.value === keyPart);
    if (isSpecial) {
      setKey(keyPart);
      setUseCustomKey(false);
      setCustomKey('');
    } else {
      setKey('');
      setCustomKey(keyPart);
      setUseCustomKey(true);
    }
  }, [value]);

  // Build keybinding string from components
  const buildKeybinding = (
    ctrlMod: boolean,
    altMod: boolean,
    shiftMod: boolean,
    metaMod: boolean,
    keyVal: string,
    customKeyVal: string,
    isCustom: boolean,
    useCmdOrCtrl: boolean
  ): string => {
    const parts: string[] = [];

    // If both ctrl and meta are set AND we have the cmdOrCtrl flag, emit cmdorctrl
    if (useCmdOrCtrl && ctrlMod && metaMod) {
      parts.push('cmdorctrl');
    } else {
      if (metaMod) { parts.push('cmd'); }
      if (ctrlMod) { parts.push('ctrl'); }
    }
    if (altMod) { parts.push('alt'); }
    if (shiftMod) { parts.push('shift'); }

    const finalKey = isCustom ? customKeyVal.trim() : keyVal;
    if (finalKey) {
      parts.push(finalKey);
    }

    return parts.join('+');
  };

  const handleModifierChange = (modifier: 'ctrl' | 'alt' | 'shift' | 'meta' | 'cmdOrCtrl', checked: boolean) => {
    const newModifiers = { ctrl, alt, shift, meta };

    // Handle cmdOrCtrl specially
    if (modifier === 'cmdOrCtrl') {
      if (checked) {
        // Enable both ctrl and meta, set cmdOrCtrl flag
        setCtrl(true);
        setMeta(true);
        setIsCmdOrCtrl(true);
        const newValue = buildKeybinding(true, alt, shift, true, key, customKey, useCustomKey, true);
        onChange(newValue);
      } else {
        // Disable cmdOrCtrl flag
        setIsCmdOrCtrl(false);
        const newValue = buildKeybinding(false, alt, shift, false, key, customKey, useCustomKey, false);
        onChange(newValue);
      }
      return;
    }

    // For other modifiers, clear cmdOrCtrl flag
    newModifiers[modifier] = checked;
    if (modifier === 'ctrl') { setCtrl(checked); }
    if (modifier === 'alt') { setAlt(checked); }
    if (modifier === 'shift') { setShift(checked); }
    if (modifier === 'meta') { setMeta(checked); }
    setIsCmdOrCtrl(false);

    const newValue = buildKeybinding(
      newModifiers.ctrl,
      newModifiers.alt,
      newModifiers.shift,
      newModifiers.meta,
      key,
      customKey,
      useCustomKey,
      false
    );
    onChange(newValue);
  };

  const handleKeyChange = (newKey: string) => {
    setKey(newKey);
    setUseCustomKey(false);
    setCustomKey('');

    const newValue = buildKeybinding(ctrl, alt, shift, meta, newKey, '', false, isCmdOrCtrl);
    onChange(newValue);
  };

  const handleCustomKeyChange = (newCustomKey: string) => {
    setCustomKey(newCustomKey);
    setUseCustomKey(true);
    setKey('');

    const newValue = buildKeybinding(ctrl, alt, shift, meta, '', newCustomKey, true, isCmdOrCtrl);
    onChange(newValue);
  };

  const handleKeyModeToggle = (isCustom: boolean) => {
    setUseCustomKey(isCustom);
    if (isCustom) {
      setKey('');
      const newValue = buildKeybinding(ctrl, alt, shift, meta, '', customKey, true, isCmdOrCtrl);
      onChange(newValue);
    } else {
      setCustomKey('');
      const newValue = buildKeybinding(ctrl, alt, shift, meta, key, '', false, isCmdOrCtrl);
      onChange(newValue);
    }
  };

  const displayValue = buildKeybinding(ctrl, alt, shift, meta, key, customKey, useCustomKey, isCmdOrCtrl);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Keybinding {required && <span className="text-red-500">*</span>}
      </label>

      {/* Modifiers */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Modifiers</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ctrl && !isCmdOrCtrl}
              onChange={(e) => handleModifierChange('ctrl', e.target.checked)}
              disabled={isCmdOrCtrl}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className={`text-sm ${isCmdOrCtrl ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
              }`}>Ctrl</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={alt}
              onChange={(e) => handleModifierChange('alt', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Alt</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shift}
              onChange={(e) => handleModifierChange('shift', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Shift</span>
          </label>
        </div>

        <div className="grid gap-3">
          <label className="flex items-center space-x-2 cursor-pointer col-span-2">
            <input
              type="checkbox"
              checked={meta && !isCmdOrCtrl}
              onChange={(e) => handleModifierChange('meta', e.target.checked)}
              disabled={isCmdOrCtrl}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className={`text-sm ${isCmdOrCtrl ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
              }`}>Cmd/Meta (platform-specific)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isCmdOrCtrl}
              onChange={(e) => handleModifierChange('cmdOrCtrl', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Cmd/Ctrl<span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(cross-platform)</span></span>
          </label>
        </div>

        {/* Key Selection */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Key</div>

          <div className="flex items-center space-x-2 mb-2">
            <button
              type="button"
              onClick={() => handleKeyModeToggle(false)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${!useCustomKey
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
            >
              Special Key
            </button>
            <button
              type="button"
              onClick={() => handleKeyModeToggle(true)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${useCustomKey
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
            >
              Custom Key
            </button>
          </div>

          {!useCustomKey ? (
            <select
              value={key}
              onChange={(e) => handleKeyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select a key...</option>
              {SPECIAL_KEYS.map((sk) => (
                <option key={sk.value} value={sk.value}>
                  {sk.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={customKey}
              onChange={(e) => handleCustomKeyChange(e.target.value)}
              placeholder="e.g., a, p, 5, /"
              maxLength={1}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent focus:border-demo-time-accent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          )}
        </div>

        {/* Preview */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Preview</div>
          <div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm text-gray-900 dark:text-gray-100">
            {displayValue || <span className="text-gray-400">No keybinding set</span>}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>}

      {/* Help text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Common examples: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">ctrl+c</code>,{' '}
        <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">ctrl+shift+p</code>,{' '}
        <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">cmd+k</code>
      </p>
    </div>
  );
};
