import React from 'react';
import { ThemeConfig, LayoutConfig } from '../types/theme';
import { ColorPicker } from './ColorPicker';

interface ThemeEditorProps {
  theme: ThemeConfig;
  onThemeChange: (theme: ThemeConfig) => void;
  currentLayout: string;
  onLayoutChange: (layout: string) => void;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({
  theme,
  onThemeChange,
  currentLayout,
  onLayoutChange,
}) => {
  const updateTheme = (updates: Partial<ThemeConfig>) => {
    onThemeChange({ ...theme, ...updates });
  };

  const updateLayout = (layout: keyof ThemeConfig['layouts'], updates: Partial<LayoutConfig>) => {
    onThemeChange({
      ...theme,
      layouts: {
        ...theme.layouts,
        [layout]: {
          ...theme.layouts[layout],
          ...updates,
        },
      },
    });
  };

  const layouts = [
    { id: 'default', name: 'Default' },
    { id: 'intro', name: 'Intro' },
    { id: 'quote', name: 'Quote' },
    { id: 'section', name: 'Section' },
    { id: 'imageLeft', name: 'Image Left' },
    { id: 'imageRight', name: 'Image Right' },
    { id: 'twoColumns', name: 'Two Columns' },
  ];

  const currentLayoutConfig =
    theme.layouts[currentLayout as keyof ThemeConfig['layouts']] || theme.layouts.default;

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white mb-2">Theme Editor</h2>
        <input
          type="text"
          value={theme.name}
          onChange={(e) => updateTheme({ name: e.target.value })}
          placeholder="Theme name"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Layout Selector */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Select Layout to Edit</h3>
          <div className="grid grid-cols-2 gap-2">
            {layouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => onLayoutChange(layout.id)}
                className={`px-4 py-2 rounded transition-colors ${
                  currentLayout === layout.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {layout.name}
              </button>
            ))}
          </div>
        </div>

        {/* Global Settings */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Global Settings</h3>
          <ColorPicker
            label="Text Color"
            value={theme.color}
            onChange={(value) => updateTheme({ color: value })}
            description="Default text color"
          />
          <ColorPicker
            label="Background"
            value={theme.background}
            onChange={(value) => updateTheme({ background: value })}
            description="Default background"
          />
          <ColorPicker
            label="Heading Color"
            value={theme.headingColor}
            onChange={(value) => updateTheme({ headingColor: value })}
          />
          <ColorPicker
            label="Heading Background"
            value={theme.headingBackground}
            onChange={(value) => updateTheme({ headingBackground: value })}
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-200 mb-2">Font Size</label>
            <input
              type="text"
              value={theme.fontSize}
              onChange={(e) => updateTheme({ fontSize: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1.1em"
            />
          </div>
          <ColorPicker
            label="Link Color"
            value={theme.linkColor}
            onChange={(value) => updateTheme({ linkColor: value })}
          />
          <ColorPicker
            label="Link Hover Color"
            value={theme.linkActiveColor}
            onChange={(value) => updateTheme({ linkActiveColor: value })}
          />
          <ColorPicker
            label="Blockquote Border"
            value={theme.blockquoteBorder}
            onChange={(value) => updateTheme({ blockquoteBorder: value })}
          />
          <ColorPicker
            label="Blockquote Background"
            value={theme.blockquoteBackground}
            onChange={(value) => updateTheme({ blockquoteBackground: value })}
          />
        </div>

        {/* Layout-Specific Settings */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            {layouts.find((l) => l.id === currentLayout)?.name} Layout Settings
          </h3>
          <ColorPicker
            label="Layout Background"
            value={currentLayoutConfig.background}
            onChange={(value) =>
              updateLayout(currentLayout as keyof ThemeConfig['layouts'], { background: value })
            }
            description="Supports colors, gradients"
          />
          <ColorPicker
            label="Layout Text Color"
            value={currentLayoutConfig.color}
            onChange={(value) =>
              updateLayout(currentLayout as keyof ThemeConfig['layouts'], { color: value })
            }
          />
          <ColorPicker
            label="Layout Heading Color"
            value={currentLayoutConfig.headingColor}
            onChange={(value) =>
              updateLayout(currentLayout as keyof ThemeConfig['layouts'], { headingColor: value })
            }
          />
          <ColorPicker
            label="Layout Heading Background"
            value={currentLayoutConfig.headingBackground}
            onChange={(value) =>
              updateLayout(currentLayout as keyof ThemeConfig['layouts'], {
                headingBackground: value,
              })
            }
          />
        </div>
      </div>
    </div>
  );
};
