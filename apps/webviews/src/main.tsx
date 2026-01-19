import { lazy, StrictMode, Suspense, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader } from "vscrui";
import './vscode.ts';
import './styles/main.css';
import 'vscrui/dist/codicon.css';
import { WebviewSettingsProvider } from './providers';

const WEBVIEW_MAP: Record<string, React.LazyExoticComponent<React.FC<object>>> = {
  'settings': lazy(() => import('./components/webviews/SettingsView')),
  'config-editor': lazy(() => import('./components/webviews/ConfigEditorView')),
  'preview': lazy(() => import('./components/webviews/PreviewView')),
  'presenter': lazy(() => import('./components/webviews/PresenterView')),
  'overview': lazy(() => import('./components/webviews/DemoScriptView')),
  'analytics-dashboard': lazy(() => import('./components/webviews/AnalyticsDashboardView')),
  'pro-features': lazy(() => import('./components/webviews/ProFeaturesView')),
};

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

const viewType = root.getAttribute('data-view-type') || 'config-editor';
const webviewUrl = root.getAttribute('data-webview-url') || '';
const WebviewComponent = WEBVIEW_MAP[viewType] || WEBVIEW_MAP['config-editor'];

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-600">Something went wrong. Please reload the webview.</div>;
    }
    return this.props.children;
  }
}

createRoot(root).render(
  <StrictMode>
    <WebviewSettingsProvider webviewUrl={webviewUrl}>
      <ErrorBoundary>
        <Suspense fallback={<Loader />}>
          <WebviewComponent />
        </Suspense>
      </ErrorBoundary>
    </WebviewSettingsProvider>

    <img style={{
      display: 'none'
    }} src={`https://api.visitorbadge.io/api/combined?path=https:%2f%2fgithub.com%2festruyf%2fvscode-demo-time&labelColor=%23202736&countColor=%23FFD23F&slug=${viewType || "config-editor"}`} alt={`${viewType || "config-editor"} usage`} />
  </StrictMode>
);
