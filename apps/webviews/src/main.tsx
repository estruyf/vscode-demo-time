import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader } from "vscrui";
import './vscode.ts';
import './styles/main.css';
import 'vscrui/dist/codicon.css';
import { WebviewSettingsProvider } from './providers';
import { ThemeProvider } from './providers/ThemeProvider';

const WEBVIEW_MAP: Record<string, React.LazyExoticComponent<React.FC<object>>> = {
  'settings': lazy(() => import('./components/webviews/SettingsView')),
  'config-editor': lazy(() => import('./components/webviews/ConfigEditorView')),
  'preview': lazy(() => import('./components/webviews/PreviewView')),
  'presenter': lazy(() => import('./components/webviews/PresenterView')),
  'overview': lazy(() => import('./components/webviews/DemoScriptView')),
};

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

const viewType = root.getAttribute('data-view-type') || 'config-editor';
const webviewUrl = root.getAttribute('data-webview-url') || '';
const WebviewComponent = WEBVIEW_MAP[viewType] || WEBVIEW_MAP['config-editor'];

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <WebviewSettingsProvider webviewUrl={webviewUrl}>
        <Suspense fallback={<Loader />}>
          <WebviewComponent />
        </Suspense>
      </WebviewSettingsProvider>
    </ThemeProvider>

    <img style={{
      display: 'none'
    }} src={`https://api.visitorbadge.io/api/combined?path=https:%2f%2fgithub.com%2festruyf%2fvscode-demo-time&labelColor=%23202736&countColor=%23FFD23F&slug=${viewType || "config-editor"}`} alt={`${viewType || "config-editor"} usage`} />
  </StrictMode>
);
