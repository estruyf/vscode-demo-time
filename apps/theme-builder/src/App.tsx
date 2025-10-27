import { useState } from 'react';
import { ThemeConfig, DEFAULT_THEME } from './types/theme';
import { ThemeEditor } from './components/ThemeEditor';
import { PreviewPanel } from './components/PreviewPanel';
import { downloadTheme, generateThemeCSS } from './utils/themeGenerator';

function App() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [currentLayout, setCurrentLayout] = useState('default');
  const [showCode, setShowCode] = useState(false);

  const handleDownload = () => {
    downloadTheme(theme);
  };

  const handleCopyCode = () => {
    const css = generateThemeCSS(theme);
    navigator.clipboard.writeText(css);
    alert('Theme CSS copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                Demo Time Theme Builder
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Create beautiful custom themes for your presentations
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCode(!showCode)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {showCode ? 'Hide' : 'Show'} Code
              </button>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Copy CSS
              </button>
              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
              >
                Download Theme
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-89px)]">
        {/* Left Panel - Theme Editor */}
        <div className="w-96 border-r border-gray-800 overflow-hidden">
          <ThemeEditor
            theme={theme}
            onThemeChange={setTheme}
            currentLayout={currentLayout}
            onLayoutChange={setCurrentLayout}
          />
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 overflow-hidden">
          {showCode ? (
            <div className="h-full flex flex-col bg-gray-900">
              <div className="bg-gray-800 p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Generated CSS</h2>
                <p className="text-sm text-gray-400">Copy this code to your theme.css file</p>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{generateThemeCSS(theme)}</code>
                </pre>
              </div>
            </div>
          ) : (
            <PreviewPanel theme={theme} currentLayout={currentLayout} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-400">
        💡 Tip: Switch layouts in the editor to customize each layout's appearance
      </div>
    </div>
  );
}

export default App;
