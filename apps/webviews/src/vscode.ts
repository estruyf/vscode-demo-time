import { Action, DemoConfig, IDemoTimeSettings, WebViewMessages } from '@demotime/common';

// Default settings payload for mock response
const defaultDemoTimeSettings: IDemoTimeSettings = {
  defaultFileType: 'yaml',
  previousEnabled: true,
  highlightBorderColor: '#ff0',
  highlightBackground: '#fff',
  highlightBlur: 0,
  highlightOpacity: 1,
  highlightZoomEnabled: false,
  showClock: false,
  timer: 0,
  insertTypingMode: 'instant',
  insertTypingSpeed: 50,
  insertTypingSpeedRandomness: 0,
  hackerTyperChunkSize: 5,
  'api.enabled': false,
  'api.port': 3000,
  customTheme: '',
  slideHeaderTemplate: '',
  slideFooterTemplate: '',
  customWebComponents: [],
  nextActionBehaviour: 'lastExecuted',
  openInConfigEditor: false,
  engageTimeApiKey: '',
  'redaction.enabled': false,
  'redaction.customPatterns': [],
};

// Mock config payload for local browser testing of the config editor.
const defaultDemoConfig: DemoConfig = {
  $schema: 'https://demotime.show/demo-time.schema.json',
  title: 'AI Workflows Demo',
  description: 'Demo flow for testing editor sections with realistic data.',
  version: 2,
  timer: 20,
  loop: false,
  demos: [
    {
      id: 'scene-intro',
      title: 'Introduction',
      description: 'Open the project and explain the objective.',
      icons: {
        start: 'zap',
        end: 'check',
      },
      notes: {
        path: './docs/sample.txt',
        showOnTrigger: false,
      },
      steps: [
        {
          action: Action.Open,
          path: 'README.md',
        },
        {
          action: Action.ShowInfoMessage,
          message: 'Welcome to the AI Workflows demo.',
        },
        {
          action: Action.WaitForTimeout,
          timeout: 800,
        },
      ],
    },
    {
      id: 'scene-live-edit',
      title: 'Live Edit',
      description: 'Perform a small edit and highlight the change.',
      icons: {
        start: 'pencil',
        end: 'sparkles',
      },
      autoAdvanceAfter: 2,
      steps: [
        {
          action: Action.Open,
          path: 'apps/webviews/src/components/webviews/ConfigEditorView.tsx',
        },
        {
          action: Action.Insert,
          path: 'apps/webviews/src/components/webviews/ConfigEditorView.tsx',
          content: '// Demo Time: test insert action\n',
          position: 1,
          insertTypingMode: 'instant',
        },
        {
          action: Action.Highlight,
          path: 'apps/webviews/src/components/webviews/ConfigEditorView.tsx',
          position: 1,
          highlightWholeLine: true,
          zoom: 1,
        },
      ],
    },
    {
      id: 'scene-wrap-up',
      title: 'Wrap Up',
      description: 'Switch theme, open a website, and finish.',
      steps: [
        {
          action: Action.SetTheme,
          theme: 'Default Dark+',
        },
        {
          action: Action.OpenWebsite,
          url: 'https://demotime.show',
        },
        {
          action: Action.ExecuteTerminalCommand,
          command: 'npm test',
          autoExecute: false,
        },
      ],
    },
  ],
};
// In a real VS Code webview, `acquireVsCodeApi` is provided by VS Code.
// In a standard browser environment, we need to provide a mock implementation
// to avoid errors and allow the application to run.

// This check ensures we only define the mock if the real API doesn't exist.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (globalThis as any).acquireVsCodeApi === 'undefined') {
  // We are defining a function on the global scope, so we need to use `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).acquireVsCodeApi = (() => {
    let acquired = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let state: any = undefined;

    // This is the mock API object that will be returned.
    const api = {
      /**
       * Mocks the postMessage function to log messages and simulate a response.
       * In a real VS Code environment, this would send a message to the extension host,
       * which would then post a message back.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postMessage: (message: any) => {
        console.log('VSCode API postMessage (mocked):', message);

        const respond = (payload: unknown) => {
          setTimeout(() => {
            const response = {
              command: 'response',
              requestId: message.requestId,
              payload,
            };

            window.dispatchEvent(
              new MessageEvent('message', {
                data: response,
                origin: window.location.origin,
              }),
            );
          }, 50);
        };

        if (message.command === WebViewMessages.toVscode.settingsView.getSettings) {
          respond(defaultDemoTimeSettings);
          return;
        }

        if (message.command === WebViewMessages.toVscode.configEditor.getContents) {
          respond(defaultDemoConfig);
          return;
        }

        if (message.command === WebViewMessages.toVscode.configEditor.checkStepQueue) {
          // Open the first scene by default so editor panes are populated in local browser mode.
          respond({ stepIndex: 0 });
          return;
        }

        // Simulate a response from the extension host for requests that expect one.
        // The `messageHandler` from `@estruyf/vscode` uses a `requestId` to track responses.
        if (message.requestId) {
          respond({});
        }
      },
      /**
       * Mocks the setState function to store state in a local variable.
       * In a real VS Code environment, this persists the webview's state.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setState: (newState: any) => {
        console.log('VSCode API setState (mocked):', newState);
        state = newState;
        return newState;
      },
      /**
       * Mocks the getState function to retrieve state from a local variable.
       * In a real VS Code environment, this retrieves the webview's persisted state.
       */
      getState: () => {
        console.log('VSCode API getState (mocked):', state);
        return state;
      },
    };

    // The `acquireVsCodeApi` function can only be called once.
    // This wrapper enforces that constraint, similar to the real implementation.
    return () => {
      if (acquired) {
        throw new Error('An instance of the VS Code API has already been acquired.');
      }
      acquired = true;
      return Object.freeze(api);
    };
  })();
}
