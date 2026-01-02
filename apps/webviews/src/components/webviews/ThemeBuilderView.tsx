import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Save, Plus, Eye, Upload, X } from 'lucide-react';
import { Loader as Spinner } from 'vscrui';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { WebViewMessages } from '@demotime/common';
import '../../styles/config.css';
import { AppHeader } from '../layout';

interface ThemeFile {
  name: string;
  path: string;
}

interface ThemeContent {
  name: string;
  content: string;
}

interface SlideTemplate {
  name: string;
  backgroundColor?: string;
  backgroundImage?: string;
  color?: string;
  fontSize?: string;
  h1FontSize?: string;
  h1Color?: string;
  padding?: string;
  layout?: 'default' | 'center' | 'flex-start';
}

interface ThemeConfig {
  name: string;
  className: string;
  globalBackground?: string;
  globalBackgroundImage?: string;
  globalColor?: string;
  globalFontSize?: string;
  globalFontFamily?: string;
  slideTemplates: Record<string, SlideTemplate>;
}

const DEFAULT_SLIDE_TEMPLATES = [
  'default',
  'intro',
  'section',
  'quote',
  'image',
  'image-left',
  'image-right',
  'two-columns',
  'video',
];

// Helper function to get a valid color value for color picker
const getColorPickerValue = (colorValue: string | undefined, defaultColor: string): string => {
  return colorValue?.startsWith('#') ? colorValue : defaultColor;
};

const ThemeBuilderView = () => {
  const [themes, setThemes] = useState<ThemeFile[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'blank' | 'success' | 'error';
    text: string;
  }>({ type: 'blank', text: '' });

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    name: '',
    className: '',
    globalBackground: '#ffffff',
    globalColor: '#000000',
    globalFontSize: '24px',
    globalFontFamily: 'Arial, sans-serif',
    slideTemplates: {},
  });

  const [activeTemplate, setActiveTemplate] = useState<string>('default');
  const [previewHtml, setPreviewHtml] = useState<string>('');

  useEffect(() => {
    loadExistingThemes();
  }, []);

  const loadExistingThemes = async () => {
    try {
      const themesData = await messageHandler.request<ThemeFile[]>(
        WebViewMessages.toVscode.themeBuilder.getExistingThemes,
      );
      setThemes(themesData || []);
    } catch (error) {
      console.error('Error loading existing themes:', error);
    }
  };

  const loadTheme = async (name: string) => {
    try {
      setLoading(true);
      const data = await messageHandler.request<ThemeContent>(
        WebViewMessages.toVscode.themeBuilder.loadTheme,
        { name },
      );
      if (data) {
        // Parse the CSS to extract theme configuration
        // This is a simplified parser - in production, you'd want a more robust solution
        const parsedConfig = parseCSSToConfig(data.content, name);
        setThemeConfig(parsedConfig);
        setSelectedTheme(name);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseCSSToConfig = (css: string, name: string): ThemeConfig => {
    // Enhanced CSS parser to extract theme configuration
    // Note: This parser handles common theme patterns but may not capture all edge cases.
    // For production use with complex CSS, consider using a CSS parsing library.
    const config: ThemeConfig = {
      name,
      className: name,
      globalBackground: '#ffffff',
      globalColor: '#000000',
      globalFontSize: '24px',
      globalFontFamily: 'Arial, sans-serif',
      slideTemplates: {},
    };

    // Extract main selector content
    const mainSelectorMatch = css.match(/\.slide\.\S+\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);
    if (!mainSelectorMatch) return config;

    const mainContent = mainSelectorMatch[1];

    // Extract global properties (before any nested selectors)
    const globalSection = mainContent.split(/\.[a-z_]+\s*\{/)[0];
    
    // Extract background (handle both simple colors and complex values)
    const bgMatch = globalSection.match(/background:\s*([^;]+);/);
    if (bgMatch) config.globalBackground = bgMatch[1].trim();

    // Extract color
    const colorMatch = globalSection.match(/(?:^|[^-])color:\s*([^;]+);/);
    if (colorMatch) config.globalColor = colorMatch[1].trim();

    // Extract font-size
    const fontSizeMatch = globalSection.match(/font-size:\s*([^;]+);/);
    if (fontSizeMatch) config.globalFontSize = fontSizeMatch[1].trim();

    // Extract font-family
    const fontFamilyMatch = globalSection.match(/font-family:\s*([^;]+);/);
    if (fontFamilyMatch) config.globalFontFamily = fontFamilyMatch[1].trim();

    // Extract background image from .slide__layout
    const layoutBgMatch = css.match(/\.slide__layout\s*\{[^}]*background-image:\s*url\(['"]*([^'")\s]+)['"]*\)/);
    if (layoutBgMatch) config.globalBackgroundImage = layoutBgMatch[1];

    // Extract slide templates using the defined template list
    const templateNames = DEFAULT_SLIDE_TEMPLATES.join('|');
    const templateRegex = new RegExp(`\\.(${templateNames})\\s*\\{([^}]*(?:\\{[^}]*\\}[^}]*)*)\\}`, 'g');
    let templateMatch;
    
    while ((templateMatch = templateRegex.exec(css)) !== null) {
      const templateName = templateMatch[1];
      const templateContent = templateMatch[2];
      
      const template: SlideTemplate = {
        name: templateName,
      };

      // Check for layout type
      if (templateContent.includes('align-items: center') && templateContent.includes('justify-content: center')) {
        template.layout = 'center';
      } else if (templateContent.includes('align-items: flex-start')) {
        template.layout = 'flex-start';
      }

      // Extract padding
      const paddingMatch = templateContent.match(/padding:\s*([^;]+);/);
      if (paddingMatch) template.padding = paddingMatch[1].trim();

      // Extract H1 styles
      const h1Match = templateContent.match(/h1\s*\{([^}]+)\}/);
      if (h1Match) {
        const h1Content = h1Match[1];
        const h1SizeMatch = h1Content.match(/font-size:\s*([^;]+);/);
        if (h1SizeMatch) template.h1FontSize = h1SizeMatch[1].trim();
        
        const h1ColorMatch = h1Content.match(/color:\s*([^;]+);/);
        if (h1ColorMatch) template.h1Color = h1ColorMatch[1].trim();
      }

      config.slideTemplates[templateName] = template;
    }

    return config;
  };

  const generateCSS = (): string => {
    const { className, globalBackground, globalBackgroundImage, globalColor, globalFontSize, globalFontFamily, slideTemplates } = themeConfig;

    let css = `.slide.${className} {\n`;
    css += `  background: ${globalBackground};\n`;
    css += `  color: ${globalColor};\n`;
    css += `  font-size: ${globalFontSize};\n`;
    css += `  font-family: ${globalFontFamily};\n\n`;

    if (globalBackgroundImage) {
      css += `  .slide__layout {\n`;
      css += `    background-image: url("${globalBackgroundImage}");\n`;
      css += `    background-repeat: no-repeat;\n`;
      css += `    background-size: cover;\n`;
      css += `    background-position: center center;\n`;
      css += `  }\n\n`;
    }

    css += `  .slide__content__inner {\n`;
    css += `    padding: calc(var(--spacing) * 8);\n`;
    css += `    box-sizing: border-box;\n`;
    css += `    > :not([hidden]) ~ :not([hidden]) {\n`;
    css += `      margin-top: 15px;\n`;
    css += `    }\n`;
    css += `  }\n\n`;

    // Add heading styles
    for (let i = 1; i <= 5; i++) {
      const size = 32 - (i - 1) * 2;
      css += `  h${i} {\n`;
      if (i === 1) {
        css += `    color: ${globalColor};\n`;
      }
      css += `    font-size: ${size}px;\n`;
      if (i === 1) {
        css += `    font-weight: 600;\n`;
      }
      css += `  }\n\n`;
    }

    // Add paragraph and list styles
    css += `  p {\n`;
    css += `    font-size: ${globalFontSize};\n`;
    css += `  }\n\n`;

    css += `  ul, ol {\n`;
    css += `    font-size: ${globalFontSize};\n`;
    css += `    margin-left: 19px;\n`;
    css += `    li {\n`;
    css += `      margin-bottom: calc(var(--spacing) * 2);\n`;
    css += `    }\n`;
    css += `  }\n\n`;

    // Add slide template styles
    Object.entries(slideTemplates).forEach(([templateName, template]) => {
      css += `  .${templateName} {\n`;
      
      if (template.backgroundColor || template.backgroundImage || template.color || template.padding || template.layout) {
        css += `    .slide__content__inner {\n`;
        
        if (template.layout === 'center') {
          css += `      display: flex;\n`;
          css += `      flex-direction: column;\n`;
          css += `      align-items: center;\n`;
          css += `      justify-content: center;\n`;
          css += `      text-align: center;\n`;
        } else if (template.layout === 'flex-start') {
          css += `      display: flex;\n`;
          css += `      flex-direction: column;\n`;
          css += `      align-items: flex-start;\n`;
          css += `      justify-content: center;\n`;
        }
        
        if (template.padding) {
          css += `      padding: ${template.padding};\n`;
        }
        
        css += `    }\n\n`;
      }

      if (template.h1FontSize || template.h1Color) {
        css += `    h1 {\n`;
        if (template.h1FontSize) {
          css += `      font-size: ${template.h1FontSize};\n`;
        }
        if (template.h1Color) {
          css += `      color: ${template.h1Color};\n`;
        }
        css += `    }\n\n`;
      }

      css += `  }\n\n`;
    });

    css += `}\n`;

    return css;
  };

  const saveTheme = async () => {
    if (!themeConfig.name.trim() || !themeConfig.className.trim()) {
      setSaveStatus({ type: 'error', text: 'Theme name and class name are required' });
      return;
    }

    try {
      setLoading(true);
      const css = generateCSS();
      const result = await messageHandler.request<{ success: boolean; path?: string }>(
        WebViewMessages.toVscode.themeBuilder.saveTheme,
        { name: themeConfig.className, content: css },
      );

      if (result?.success) {
        setSaveStatus({ type: 'success', text: 'Theme saved successfully!' });
        await loadExistingThemes();
        setTimeout(() => setSaveStatus({ type: 'blank', text: '' }), 3000);
      } else {
        setSaveStatus({ type: 'error', text: 'Failed to save theme' });
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      setSaveStatus({ type: 'error', text: 'Failed to save theme' });
    } finally {
      setLoading(false);
    }
  };

  const createNewTheme = () => {
    setThemeConfig({
      name: '',
      className: '',
      globalBackground: '#ffffff',
      globalColor: '#000000',
      globalFontSize: '24px',
      globalFontFamily: 'Arial, sans-serif',
      slideTemplates: {},
    });
    setSelectedTheme('');
  };

  const updateGlobalProperty = (key: keyof ThemeConfig, value: any) => {
    setThemeConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateTemplateProperty = (templateName: string, key: keyof SlideTemplate, value: any) => {
    setThemeConfig((prev) => ({
      ...prev,
      slideTemplates: {
        ...prev.slideTemplates,
        [templateName]: {
          ...prev.slideTemplates[templateName],
          [key]: value,
        },
      },
    }));
  };

  const addTemplate = (templateName: string) => {
    if (!themeConfig.slideTemplates[templateName]) {
      setThemeConfig((prev) => ({
        ...prev,
        slideTemplates: {
          ...prev.slideTemplates,
          [templateName]: {
            name: templateName,
          },
        },
      }));
    }
  };

  const removeTemplate = (templateName: string) => {
    setThemeConfig((prev) => {
      const newTemplates = { ...prev.slideTemplates };
      delete newTemplates[templateName];
      return { ...prev, slideTemplates: newTemplates };
    });
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <AppHeader title="Visual Theme Builder (Pro)" />

      <div className="flex-1 overflow-auto p-4">
        {/* Theme Selection */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2 items-center">
            <select
              className="flex-1 px-3 py-2 border rounded"
              value={selectedTheme}
              onChange={(e) => loadTheme(e.target.value)}
            >
              <option value="">Select existing theme...</option>
              {themes.map((theme) => (
                <option key={theme.path} value={theme.name}>
                  {theme.name}
                </option>
              ))}
            </select>
            <Button onClick={createNewTheme} className="flex items-center gap-2">
              <Plus size={16} />
              New Theme
            </Button>
          </div>
        </div>

        {/* Theme Configuration */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="border rounded p-4 space-y-4">
            <h3 className="font-semibold text-lg">Theme Information</h3>
            
            <div>
              <label className="block mb-2 font-medium">Theme Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                placeholder="My Awesome Theme"
                value={themeConfig.name}
                onChange={(e) => updateGlobalProperty('name', e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">CSS Class Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                placeholder="my-theme"
                value={themeConfig.className}
                onChange={(e) => updateGlobalProperty('className', e.target.value)}
              />
              <p className="text-sm text-gray-600 mt-1">
                Used as: .slide.{themeConfig.className || 'class-name'}
              </p>
            </div>
          </div>

          {/* Global Styles */}
          <div className="border rounded p-4 space-y-4">
            <h3 className="font-semibold text-lg">Global Slide Styles</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium">Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-16 h-10 border rounded"
                    value={getColorPickerValue(themeConfig.globalBackground, '#ffffff')}
                    onChange={(e) => updateGlobalProperty('globalBackground', e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border rounded"
                    placeholder="#ffffff"
                    value={themeConfig.globalBackground || ''}
                    onChange={(e) => updateGlobalProperty('globalBackground', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium">Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-16 h-10 border rounded"
                    value={getColorPickerValue(themeConfig.globalColor, '#000000')}
                    onChange={(e) => updateGlobalProperty('globalColor', e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border rounded"
                    placeholder="#000000"
                    value={themeConfig.globalColor || ''}
                    onChange={(e) => updateGlobalProperty('globalColor', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-2 font-medium">Background Image URL</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                placeholder=".demo/assets/background.png"
                value={themeConfig.globalBackgroundImage || ''}
                onChange={(e) => updateGlobalProperty('globalBackgroundImage', e.target.value)}
              />
              <p className="text-sm text-gray-600 mt-1">
                Relative to workspace root or full URL
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium">Font Size</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="24px"
                  value={themeConfig.globalFontSize || ''}
                  onChange={(e) => updateGlobalProperty('globalFontSize', e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Font Family</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Arial, sans-serif"
                  value={themeConfig.globalFontFamily || ''}
                  onChange={(e) => updateGlobalProperty('globalFontFamily', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Slide Templates */}
          <div className="border rounded p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Slide Templates</h3>
              <select
                className="px-3 py-2 border rounded"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addTemplate(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Add template...</option>
                {DEFAULT_SLIDE_TEMPLATES.map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Tabs */}
            {Object.keys(themeConfig.slideTemplates).length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {Object.keys(themeConfig.slideTemplates).map((templateName) => (
                    <button
                      key={templateName}
                      className={`px-3 py-1 rounded ${
                        activeTemplate === templateName
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200'
                      }`}
                      onClick={() => setActiveTemplate(templateName)}
                    >
                      {templateName}
                    </button>
                  ))}
                </div>

                {/* Active Template Editor */}
                {activeTemplate && themeConfig.slideTemplates[activeTemplate] && (
                  <div className="border rounded p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Configure: {activeTemplate}</h4>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => {
                          removeTemplate(activeTemplate);
                          setActiveTemplate(Object.keys(themeConfig.slideTemplates)[0] || '');
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 font-medium">Layout</label>
                        <select
                          className="w-full px-3 py-2 border rounded"
                          value={themeConfig.slideTemplates[activeTemplate]?.layout || 'default'}
                          onChange={(e) =>
                            updateTemplateProperty(activeTemplate, 'layout', e.target.value)
                          }
                        >
                          <option value="default">Default</option>
                          <option value="center">Center</option>
                          <option value="flex-start">Flex Start</option>
                        </select>
                      </div>

                      <div>
                        <label className="block mb-2 font-medium">Padding</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded"
                          placeholder="60px 65px"
                          value={themeConfig.slideTemplates[activeTemplate]?.padding || ''}
                          onChange={(e) =>
                            updateTemplateProperty(activeTemplate, 'padding', e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 font-medium">H1 Font Size</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded"
                          placeholder="42px"
                          value={themeConfig.slideTemplates[activeTemplate]?.h1FontSize || ''}
                          onChange={(e) =>
                            updateTemplateProperty(activeTemplate, 'h1FontSize', e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label className="block mb-2 font-medium">H1 Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            className="w-16 h-10 border rounded"
                            value={getColorPickerValue(
                              themeConfig.slideTemplates[activeTemplate]?.h1Color,
                              '#000000'
                            )}
                            onChange={(e) =>
                              updateTemplateProperty(activeTemplate, 'h1Color', e.target.value)
                            }
                          />
                          <input
                            type="text"
                            className="flex-1 px-3 py-2 border rounded"
                            placeholder="#000000"
                            value={themeConfig.slideTemplates[activeTemplate]?.h1Color || ''}
                            onChange={(e) =>
                              updateTemplateProperty(activeTemplate, 'h1Color', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Background Image</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded"
                        placeholder=".demo/assets/template-bg.png"
                        value={themeConfig.slideTemplates[activeTemplate]?.backgroundImage || ''}
                        onChange={(e) =>
                          updateTemplateProperty(activeTemplate, 'backgroundImage', e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {Object.keys(themeConfig.slideTemplates).length === 0 && (
              <p className="text-gray-600 text-center py-4">
                No templates configured. Add a template from the dropdown above.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 items-center">
            <Button onClick={saveTheme} className="flex items-center gap-2">
              <Save size={16} />
              Save Theme
            </Button>
            {saveStatus.text && (
              <span
                className={`px-3 py-2 ${
                  saveStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {saveStatus.text}
              </span>
            )}
          </div>

          {/* Preview */}
          <div className="border rounded p-4 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Eye size={16} />
              CSS Preview
            </h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
              {generateCSS()}
            </pre>
          </div>

          {/* Help */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold mb-2">💡 How to Use</h3>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Configure global styles that apply to all slides</li>
              <li>Add slide templates (intro, section, quote, etc.) and customize each one</li>
              <li>Set background colors/images globally or per template</li>
              <li>Themes are saved to <code>.demo/theme/</code> folder</li>
              <li>Use the theme in your slide markdown: <code>theme: {themeConfig.className || 'your-theme'}</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeBuilderView;
