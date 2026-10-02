import React from 'react';
import { converter, parse } from 'culori';
import { Check, ChevronDown } from 'lucide-react';

type ColorMode = 'theme' | 'custom' | 'none';

interface ThemeColor {
  name: string;
  label: string;
}

/**
 * VS Code theme colors that work well for highlighting code
 */
const THEME_COLORS: ThemeColor[] = [
  { name: '--vscode-editor-selectionBackground', label: 'Selection' },
  { name: '--vscode-editor-inactiveSelectionBackground', label: 'Inactive selection' },
  { name: '--vscode-editor-selectionHighlightBackground', label: 'Selection highlight' },
  { name: '--vscode-editor-findMatchBackground', label: 'Find match' },
  { name: '--vscode-editor-findMatchHighlightBackground', label: 'Other find matches' },
  { name: '--vscode-editor-wordHighlightBackground', label: 'Word highlight' },
  { name: '--vscode-editor-wordHighlightStrongBackground', label: 'Word highlight (write)' },
  { name: '--vscode-editor-rangeHighlightBackground', label: 'Range highlight' },
  { name: '--vscode-editor-lineHighlightBackground', label: 'Current line' },
  { name: '--vscode-editor-hoverHighlightBackground', label: 'Hover highlight' },
  { name: '--vscode-diffEditor-insertedTextBackground', label: 'Diff: inserted text' },
  { name: '--vscode-diffEditor-removedTextBackground', label: 'Diff: removed text' },
  { name: '--vscode-focusBorder', label: 'Focus border' },
  { name: '--vscode-contrastActiveBorder', label: 'Contrast border (high contrast)' },
  { name: '--vscode-editorCursor-foreground', label: 'Cursor' },
  { name: '--vscode-textLink-foreground', label: 'Link' },
  { name: '--vscode-button-background', label: 'Button' },
  { name: '--vscode-editorError-foreground', label: 'Error' },
  { name: '--vscode-editorWarning-foreground', label: 'Warning' },
  { name: '--vscode-editorInfo-foreground', label: 'Info' },
  { name: '--vscode-charts-red', label: 'Red' },
  { name: '--vscode-charts-orange', label: 'Orange' },
  { name: '--vscode-charts-yellow', label: 'Yellow' },
  { name: '--vscode-charts-green', label: 'Green' },
  { name: '--vscode-charts-blue', label: 'Blue' },
  { name: '--vscode-charts-purple', label: 'Purple' },
];

const DEFAULT_THEME_COLOR = 'var(--vscode-editor-selectionBackground)';
const DEFAULT_CUSTOM_COLOR = 'rgba(255,0,0,0.5)';

const toRgb = converter('rgb');

const getMode = (value: string): ColorMode => {
  const color = value.trim().toLowerCase();
  if (color.startsWith('var(')) {
    return 'theme';
  }
  if (color === '' || color === 'transparent' || color === 'none') {
    return 'none';
  }
  return 'custom';
};

/**
 * Gets the variable name from a `var(--name)` or `var(--name, fallback)` value
 */
const getVariableName = (value: string) => {
  const match = value.trim().match(/^var\(\s*(--[\w-]+)/);
  return match ? match[1] : '';
};

const isThemeColorDefined = (name: string) =>
  !!name && getComputedStyle(document.documentElement).getPropertyValue(name).trim() !== '';

/**
 * Parses a CSS color into its RGB channels (0-255) and alpha (0-1)
 */
const parseColor = (value: string) => {
  const parsed = parse(value.trim());
  if (!parsed) {
    return undefined;
  }

  const rgb = toRgb(parsed);
  const channel = (channelValue: number | undefined) =>
    Math.round(Math.max(0, Math.min(1, channelValue ?? 0)) * 255);
  return {
    r: channel(rgb.r),
    g: channel(rgb.g),
    b: channel(rgb.b),
    alpha: rgb.alpha ?? 1,
  };
};

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;

const roundAlpha = (alpha: number) => Math.round(alpha * 100) / 100;

const Swatch: React.FC<{ color: string; className?: string }> = ({ color, className = '' }) => (
  <span
    className={`relative inline-block shrink-0 overflow-hidden rounded-sm border border-gray-300 dark:border-gray-600 ${className}`}
    style={{
      backgroundImage:
        'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
      backgroundSize: '8px 8px',
      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
      backgroundColor: '#fff',
    }}
  >
    <span className="absolute inset-0" style={{ background: color }} />
  </span>
);

interface ThemeColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const ThemeColorPicker: React.FC<ThemeColorPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const name = getVariableName(value);

  // Only suggest the colors of the current theme
  const suggestions = React.useMemo(() => {
    const search = query.trim().toLowerCase();
    return THEME_COLORS.filter((color) => isThemeColorDefined(color.name)).filter(
      (color) =>
        !search ||
        color.name.toLowerCase().includes(search) ||
        color.label.toLowerCase().includes(search),
    );
  }, [query]);

  React.useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const select = (colorName: string) => {
    onChange(`var(${colorName})`);
    setQuery('');
    setIsOpen(false);
  };

  const label = THEME_COLORS.find((color) => color.name === name)?.label;

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-left flex items-center gap-2 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent cursor-pointer"
        >
          <Swatch color={value} className="w-4 h-4" />
          <span className="flex-1 min-w-0 truncate">
            {label && <span className="mr-2">{label}</span>}
            <code className="text-xs text-gray-500 dark:text-gray-400">
              {name || 'Select a theme color'}
            </code>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const typed = query.trim();
                    if (suggestions.length > 0) {
                      select(suggestions[0].name);
                    } else if (/^--[\w-]+$/.test(typed)) {
                      select(typed);
                    }
                  }
                }}
                placeholder="Search, or type a variable like --vscode-editor-background"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-1 focus:ring-demo-time-accent"
              />
            </div>
            <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
              {suggestions.map((color) => (
                <li key={color.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={color.name === name}
                    onClick={() => select(color.name)}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <Swatch color={`var(${color.name})`} className="w-4 h-4" />
                    <span className="flex-1 min-w-0">
                      <span className="block">{color.label}</span>
                      <code className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                        {color.name}
                      </code>
                    </span>
                    {color.name === name && <Check className="h-4 w-4" />}
                  </button>
                </li>
              ))}
              {suggestions.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  {/^--[\w-]+$/.test(query.trim())
                    ? `Press Enter to use ${query.trim()}`
                    : 'No theme colors match. Type a variable name that starts with --'}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {name && !isThemeColorDefined(name) && (
        <p className="text-xs text-yellow-800 dark:text-yellow-300">
          <code>{name}</code> isn’t set in the current theme, so it might not show.
        </p>
      )}
    </div>
  );
};

interface CustomColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const CustomColorPicker: React.FC<CustomColorPickerProps> = ({ value, onChange }) => {
  // Keep what the user types, and only pass valid colors on
  const [text, setText] = React.useState(value);
  React.useEffect(() => {
    setText(value);
  }, [value]);

  const color = parseColor(text);
  const current = parseColor(value) || parseColor(DEFAULT_CUSTOM_COLOR)!;

  const onTextChange = (newText: string) => {
    setText(newText);
    if (parseColor(newText)) {
      onChange(newText.trim());
    }
  };

  const onPickerChange = (hex: string) => {
    const picked = parseColor(hex);
    if (picked) {
      onChange(`rgba(${picked.r},${picked.g},${picked.b},${roundAlpha(current.alpha)})`);
    }
  };

  const onAlphaChange = (alpha: number) => {
    onChange(`rgba(${current.r},${current.g},${current.b},${roundAlpha(alpha)})`);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label className="relative w-10 h-10 shrink-0 cursor-pointer" title="Pick a color">
          <Swatch color={value} className="w-10 h-10 rounded-md" />
          <input
            type="color"
            aria-label="Pick a color"
            value={toHex(current.r, current.g, current.b)}
            onChange={(e) => onPickerChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
        <input
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          aria-label="Color value"
          aria-invalid={!color}
          placeholder="#ff000080, rgba(255, 0, 0, 0.5) or red"
          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent ${color ? 'border-gray-300 dark:border-gray-600' : 'border-red-400 dark:border-red-400'}`}
        />
      </div>
      {!color && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Use a hex, <code>rgb()</code>, <code>rgba()</code>, <code>hsl()</code> or named color.
        </p>
      )}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 dark:text-gray-300 w-14">Opacity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={current.alpha}
          aria-label="Opacity"
          onChange={(e) => onAlphaChange(Number(e.target.value))}
          className="flex-1 accent-demo-time-accent"
        />
        <span className="text-xs tabular-nums text-gray-600 dark:text-gray-300 w-10 text-right">
          {Math.round(current.alpha * 100)}%
        </span>
      </div>
    </div>
  );
};

interface ColorValueInputProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * The aria-label of the mode buttons
   */
  label: string;
}

const MODES: { mode: ColorMode; label: string }[] = [
  { mode: 'theme', label: 'Theme color' },
  { mode: 'custom', label: 'Custom' },
  { mode: 'none', label: 'None' },
];

/**
 * A color that is a VS Code theme color (`var(--vscode-...)`), a custom CSS color, or none
 * (`transparent`)
 */
export const ColorValueInput: React.FC<ColorValueInputProps> = ({ value, onChange, label }) => {
  const color = value || '';
  const mode = getMode(color);

  // Restore the last value of a mode when switching back to it
  const lastValues = React.useRef<Record<ColorMode, string>>({
    theme: mode === 'theme' ? color : DEFAULT_THEME_COLOR,
    custom: mode === 'custom' ? color : DEFAULT_CUSTOM_COLOR,
    none: 'transparent',
  });
  React.useEffect(() => {
    lastValues.current[mode] = color;
  }, [mode, color]);

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden"
      >
        {MODES.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={mode === option.mode}
            onClick={() => mode !== option.mode && onChange(lastValues.current[option.mode])}
            className={`px-3 py-1.5 text-sm cursor-pointer transition-colors border-r last:border-r-0 border-gray-300 dark:border-gray-600 ${
              mode === option.mode
                ? 'bg-demo-time-accent text-white dark:text-black'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'theme' && <ThemeColorPicker value={color} onChange={onChange} />}
      {mode === 'custom' && <CustomColorPicker value={color} onChange={onChange} />}
      {mode === 'none' && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          No color. Saved as <code>transparent</code>.
        </p>
      )}
    </div>
  );
};
