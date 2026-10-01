import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { WebViewMessages } from '@demotime/common';
import { nextClickStep, previousClickStep, subscribeClickSteps } from '../webcomponents/clickSteps';

const NEXT_KEYS = ['ArrowRight', 'PageDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'PageUp'];

// Clicks on these elements (like the slide controls) don't count as a click step
const IGNORED_CLICK_TARGETS =
  'a, button, input, select, textarea, label, summary, video, audio, [role="button"], [contenteditable], [data-slide-controls]';
// Keys typed in these elements don't count as a click step
const IGNORED_KEY_TARGETS = 'input, select, textarea, [contenteditable]';

const hasTarget = (event: Event, selector: string) =>
  event.composedPath().some((target) => target instanceof Element && target.matches(selector));

/**
 * Connects the inputs of the slide preview to the shared click step counter.
 *
 * - `nextStep`/`previousStep` messages from the extension (keybindings, remote, auto-advance, ...)
 * - Mouse clicks on the slide
 * - Arrow and page keys when presentation mode is off (in presentation mode, the extension
 *   keybindings handle these keys and send the messages)
 *
 * @returns The current click step.
 */
export const useClickSteps = () => {
  const [clickStep, setClickStep] = React.useState(0);
  const isPresentationModeRef = React.useRef(false);

  React.useEffect(() => subscribeClickSteps(setClickStep), []);

  React.useEffect(() => {
    messageHandler
      .request<boolean>(WebViewMessages.toVscode.getPresentationStarted)
      .then((value) => {
        isPresentationModeRef.current = !!value;
      })
      .catch(() => {
        isPresentationModeRef.current = false;
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageListener = (message: MessageEvent<EventData<any>>) => {
      const { command, payload } = message.data;
      if (command === WebViewMessages.toWebview.nextStep) {
        nextClickStep();
      } else if (command === WebViewMessages.toWebview.previousStep) {
        previousClickStep();
      } else if (command === WebViewMessages.toWebview.updateIsInPresentationMode) {
        isPresentationModeRef.current = !!payload;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        isPresentationModeRef.current ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        hasTarget(event, IGNORED_KEY_TARGETS)
      ) {
        return;
      }

      let handled = false;
      if (NEXT_KEYS.includes(event.key)) {
        handled = nextClickStep();
      } else if (PREVIOUS_KEYS.includes(event.key)) {
        handled = previousClickStep();
      }

      if (handled) {
        event.preventDefault();
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented || hasTarget(event, IGNORED_CLICK_TARGETS)) {
        return;
      }

      nextClickStep();
    };

    Messenger.listen(messageListener);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('click', onClick);

    return () => {
      Messenger.unlisten(messageListener);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', onClick);
    };
  }, []);

  return clickStep;
};
