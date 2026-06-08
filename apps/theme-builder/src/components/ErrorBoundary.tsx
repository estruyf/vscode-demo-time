import * as React from 'react';
import { clearTheme } from '../lib/storage';
import { btnPrimary, btnSecondary } from './controls';

interface State {
  error: Error | null;
}

/**
 * Last line of defence: if anything throws during render (e.g. a corrupt
 * imported/persisted theme), show a recovery screen instead of a blank page.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Theme Builder crashed:', error, info);
  }

  private reset = (clear: boolean) => {
    if (clear) {
      clearTheme();
    }
    this.setState({ error: null });
    // A reload guarantees a clean tree from the (now reset) stored theme.
    location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-lg font-semibold text-gray-100">Something went wrong</h1>
        <p className="max-w-md text-sm text-gray-400">
          The theme builder hit an unexpected error. You can try again, or reset the saved theme if
          it keeps happening (this clears your current work in progress).
        </p>
        <pre className="max-w-md overflow-auto rounded-md border border-[var(--color-line)] bg-black/40 p-3 text-left text-[11px] text-amber-300">
          {this.state.error.message}
        </pre>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={() => this.reset(false)}>
            Try again
          </button>
          <button type="button" className={btnPrimary} onClick={() => this.reset(true)}>
            Reset saved theme
          </button>
        </div>
      </div>
    );
  }
}
