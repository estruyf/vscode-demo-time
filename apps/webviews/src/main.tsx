import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader } from "vscrui";
import './vscode.ts';
import './index.css';
import 'vscrui/dist/codicon.css';
import { WebviewSettingsProvider } from './providers';

const WEBVIEW_MAP: Record<string, React.LazyExoticComponent<React.FC<{}>>> = {
  'settings': lazy(() => import('./components/webviews/Settings')),
  'config-editor': lazy(() => import('./components/webviews/ConfigEditor')),
  'preview': lazy(() => import('./components/webviews/Preview'))
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
    <WebviewSettingsProvider webviewUrl={webviewUrl}>
      <Suspense fallback={<Loader />}>
        <WebviewComponent />
      </Suspense>
    </WebviewSettingsProvider>

    <img style={{
      display: 'none'
    }} src={`https://api.visitorbadge.io/api/combined?path=https:%2f%2fgithub.com%2festruyf%2fvscode-demo-time&labelColor=%23202736&countColor=%23FFD23F&slug=${viewType || "config-editor"}`} alt={`${viewType || "config-editor"} usage`} />
  </StrictMode>
);