import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Save, Plus, FileCode, Paintbrush, Eye } from 'lucide-react';
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

const ThemeBuilderView = () => {
  const [mode, setMode] = useState<'theme' | 'layout'>('theme');
  const [themes, setThemes] = useState<ThemeFile[]>([]);
  const [layouts, setLayouts] = useState<ThemeFile[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [selectedLayout, setSelectedLayout] = useState<string>('');
  const [themeName, setThemeName] = useState<string>('');
  const [themeContent, setThemeContent] = useState<string>('');
  const [layoutName, setLayoutName] = useState<string>('');
  const [layoutContent, setLayoutContent] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<{
    type: 'blank' | 'success' | 'error';
    text: string;
  }>({ type: 'blank', text: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadExistingFiles();
  }, []);

  const loadExistingFiles = async () => {
    try {
      const themesData = await messageHandler.request<ThemeFile[]>(
        WebViewMessages.toVscode.themeBuilder.getExistingThemes,
      );
      const layoutsData = await messageHandler.request<ThemeFile[]>(
        WebViewMessages.toVscode.themeBuilder.getExistingLayouts,
      );
      setThemes(themesData || []);
      setLayouts(layoutsData || []);
    } catch (error) {
      console.error('Error loading existing files:', error);
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
        setThemeName(data.name);
        setThemeContent(data.content);
        setSelectedTheme(name);
        updatePreview(data.content, layoutContent);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLayout = async (name: string) => {
    try {
      setLoading(true);
      const data = await messageHandler.request<ThemeContent>(
        WebViewMessages.toVscode.themeBuilder.loadLayout,
        { name },
      );
      if (data) {
        setLayoutName(data.name);
        setLayoutContent(data.content);
        setSelectedLayout(name);
        updatePreview(themeContent, data.content);
      }
    } catch (error) {
      console.error('Error loading layout:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreview = async (css: string, html: string) => {
    try {
      const data = await messageHandler.request<{ html: string }>(
        WebViewMessages.toVscode.themeBuilder.getPreviewHtml,
        { css, html },
      );
      if (data) {
        setPreviewHtml(data.html);
      }
    } catch (error) {
      console.error('Error updating preview:', error);
    }
  };

  const saveTheme = async () => {
    if (!themeName.trim()) {
      setSaveStatus({ type: 'error', text: 'Theme name is required' });
      return;
    }

    try {
      setLoading(true);
      const result = await messageHandler.request<{ success: boolean; path?: string }>(
        WebViewMessages.toVscode.themeBuilder.saveTheme,
        { name: themeName, content: themeContent },
      );

      if (result?.success) {
        setSaveStatus({ type: 'success', text: 'Theme saved successfully!' });
        await loadExistingFiles();
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

  const saveLayout = async () => {
    if (!layoutName.trim()) {
      setSaveStatus({ type: 'error', text: 'Layout name is required' });
      return;
    }

    try {
      setLoading(true);
      const result = await messageHandler.request<{ success: boolean; path?: string }>(
        WebViewMessages.toVscode.themeBuilder.saveLayout,
        { name: layoutName, content: layoutContent },
      );

      if (result?.success) {
        setSaveStatus({ type: 'success', text: 'Layout saved successfully!' });
        await loadExistingFiles();
        setTimeout(() => setSaveStatus({ type: 'blank', text: '' }), 3000);
      } else {
        setSaveStatus({ type: 'error', text: 'Failed to save layout' });
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      setSaveStatus({ type: 'error', text: 'Failed to save layout' });
    } finally {
      setLoading(false);
    }
  };

  const handleThemeContentChange = (value: string) => {
    setThemeContent(value);
    updatePreview(value, layoutContent);
  };

  const handleLayoutContentChange = (value: string) => {
    setLayoutContent(value);
    updatePreview(themeContent, value);
  };

  const createNewTheme = () => {
    setThemeName('');
    const newThemeContent = `/* Custom Theme CSS */
body {
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.slide {
  background: var(--vscode-editor-background) !important;
  color: var(--vscode-editor-foreground) !important;
}

.intro {
  h1 {
    font-size: 3em;
    font-weight: bold;
  }
}
`;
    setThemeContent(newThemeContent);
    setSelectedTheme('');
    updatePreview(newThemeContent, layoutContent);
  };

  const createNewLayout = () => {
    setLayoutName('');
    const newLayoutContent = `<style>
/* Custom Layout Styles */
.custom-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}
</style>

<div class="custom-layout">
  <h1>{{metadata.title}}</h1>
  {{{content}}}
</div>
`;
    setLayoutContent(newLayoutContent);
    setSelectedLayout('');
    updatePreview(themeContent, newLayoutContent);
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <AppHeader title="Theme Builder (Pro)" />

      <div className="flex-1 overflow-auto p-4">
        {/* Mode Selector */}
        <div className="mb-4 flex gap-2">
          <Button
            onClick={() => setMode('theme')}
            variant={mode === 'theme' ? 'primary' : 'secondary'}
            className="flex items-center gap-2"
          >
            <Paintbrush size={16} />
            Theme Editor
          </Button>
          <Button
            onClick={() => setMode('layout')}
            variant={mode === 'layout' ? 'primary' : 'secondary'}
            className="flex items-center gap-2"
          >
            <FileCode size={16} />
            Layout Editor
          </Button>
        </div>

        {/* Theme Editor */}
        {mode === 'theme' && (
          <div className="space-y-4">
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
                New
              </Button>
            </div>

            <div>
              <label className="block mb-2 font-semibold">Theme Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                placeholder="my-custom-theme"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold">CSS Content</label>
              <textarea
                className="w-full h-96 px-3 py-2 border rounded font-mono text-sm"
                placeholder="Enter your CSS here..."
                value={themeContent}
                onChange={(e) => handleThemeContentChange(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
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
          </div>
        )}

        {/* Layout Editor */}
        {mode === 'layout' && (
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <select
                className="flex-1 px-3 py-2 border rounded"
                value={selectedLayout}
                onChange={(e) => loadLayout(e.target.value)}
              >
                <option value="">Select existing layout...</option>
                {layouts.map((layout) => (
                  <option key={layout.path} value={layout.name}>
                    {layout.name}
                  </option>
                ))}
              </select>
              <Button onClick={createNewLayout} className="flex items-center gap-2">
                <Plus size={16} />
                New
              </Button>
            </div>

            <div>
              <label className="block mb-2 font-semibold">Layout Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                placeholder="my-custom-layout"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold">
                Handlebars Template
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Use Handlebars syntax: {'{{{content}}}'}, {'{{metadata.title}}'}, etc.
              </p>
              <textarea
                className="w-full h-96 px-3 py-2 border rounded font-mono text-sm"
                placeholder="Enter your Handlebars template here..."
                value={layoutContent}
                onChange={(e) => handleLayoutContentChange(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveLayout} className="flex items-center gap-2">
                <Save size={16} />
                Save Layout
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
          </div>
        )}

        {/* Preview Section */}
        {previewHtml && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={16} />
              <h3 className="font-semibold">Preview</h3>
            </div>
            <div className="border rounded p-4 bg-white">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-96 border-0"
                title="Theme Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">💡 Tips</h3>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Themes are saved as CSS files in .demo/slides/</li>
            <li>Layouts are saved as Handlebars (.hbs) files in .demo/layouts/</li>
            <li>Use VS Code variables like var(--vscode-editor-background) for theming</li>
            <li>Right-click in the preview to inspect elements (if enabled)</li>
            <li>
              See{' '}
              <a
                href="https://demotime.show/slides/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                documentation
              </a>{' '}
              for more examples
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ThemeBuilderView;
