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
  hackerTyperChunkSize: 5,
  'api.enabled': false,
  'api.port': 3000,
  customTheme: '',
  slideHeaderTemplate: '',
  slideFooterTemplate: '',
  customWebComponents: [],
  nextActionBehaviour: 'lastExecuted',
  openInConfigEditor: false,
};
import { WebViewMessages } from '@demotime/common';
// In a real VS Code webview, `acquireVsCodeApi` is provided by VS Code.
// In a standard browser environment, we need to provide a mock implementation
// to avoid errors and allow the application to run.

import { IDemoTimeSettings } from './types/IDemoTimeSettings';

// This check ensures we only define the mock if the real API doesn't exist.
if (typeof globalThis.acquireVsCodeApi === 'undefined') {
  // We are defining a function on the global scope, so we need to use `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).acquireVsCodeApi = (() => {
    let acquired = false;
    // biome-ignore lint/suspicious/noExplicitAny: We are mocking a generic state object.
    let state: any = undefined;

    // This is the mock API object that will be returned.
    const api = {
      /**
       * Mocks the postMessage function to log messages and simulate a response.
       * In a real VS Code environment, this would send a message to the extension host,
       * which would then post a message back.
       */
      // biome-ignore lint/suspicious/noExplicitAny: We are mocking a generic message object.
      postMessage: (message: any) => {
        console.log('VSCode API postMessage (mocked):', message);

        if (message.command === WebViewMessages.toVscode.settingsView.getSettings) {
          setTimeout(() => {
            const response: {
              command: string;
              requestId: string;
              payload: IDemoTimeSettings;
            } = {
              command: 'response',
              requestId: message.requestId,
              payload: defaultDemoTimeSettings,
            };
            window.dispatchEvent(
              new MessageEvent('message', {
                data: response,
                origin: window.location.origin,
              }),
            );
          }, 50);
          return;
        }

        // Simulate a response from the extension host for requests that expect one.
        // The `messageHandler` from `@estruyf/vscode` uses a `requestId` to track responses.
        if (message.requestId) {
          setTimeout(() => {
            const response = {
              command: 'response',
              requestId: message.requestId,
              payload: {}, // Mock payload for the response
            };

            console.log('Mocking VSCode response:', response);

            // Dispatch a "message" event on the window, which is what the
            // real VS Code host does. The message handler is listening for this.
            window.dispatchEvent(
              new MessageEvent('message', {
                data: response,
                origin: window.location.origin,
              }),
            );
          }, 50); // Simulate a small network delay.
        }
      },
      /**
       * Mocks the setState function to store state in a local variable.
       * In a real VS Code environment, this persists the webview's state.
       */
      // biome-ignore lint/suspicious/noExplicitAny: We are mocking a generic state object.
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
