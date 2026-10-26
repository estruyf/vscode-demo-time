import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { WebViewMessages } from '@demotime/common';
import { nextClickStep, previousClickStep, subscribeClickSteps } from '../webcomponents/clickSteps';

const NEXT_KEYS = ['ArrowRight', 'PageDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'PageUp'];

// Clicks on these elements (like the slide controls) don't count as a click step
const IGNORED_CLICK_TARGETS =
  'a, button, input, select, textarea, label, summary, video, audio, [role="button"], [contenteditable], [data-slide-controls], [data-slide-thumbnails]';
// Keys typed in these elements don't count as a click step
const IGNORED_KEY_TARGETS = 'input, select, textarea, [contenteditable]';

const hasTarget = (event: Event, selector: string) =>
  event.composedPath().some((target) => target instanceof Element && target.matches(selector));

export interface ClickStepsNavigation {
  /**
   * Called when a next key has no click step left to reveal
   */
  next: () => void;
  /**
   * Called when a previous key has no click step to go back to
   */
  previous: () => void;
}

/**
 * Connects the inputs of the slide preview to the shared click step counter.
 *
 * - `nextStep`/`previousStep` messages from the extension (keybindings, remote, auto-advance, ...)
 * - Mouse clicks on the slide
 * - Arrow and page keys when presentation mode is off (in presentation mode, the extension
 *   keybindings handle these keys and send the messages). Without a click step left, the keys
 *   call `navigation`, so they move through the slides like in presentation mode.
 *
 * @returns The current click step.
 */
export const useClickSteps = (navigation?: ClickStepsNavigation) => {
  const [clickStep, setClickStep] = React.useState(0);
  const isPresentationModeRef = React.useRef(false);
  const navigationRef = React.useRef(navigation);
  navigationRef.current = navigation;

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

      const isNext = NEXT_KEYS.includes(event.key);
      if (!isNext && !PREVIOUS_KEYS.includes(event.key)) {
        return;
      }

      if (isNext ? nextClickStep() : previousClickStep()) {
        event.preventDefault();
        return;
      }

      // Move to the next or previous slide, unless a listener after this one handles the key (like
      // a paused animated SVG slide)
      setTimeout(() => {
        const navigation = navigationRef.current;
        if (!event.defaultPrevented && navigation) {
          if (isNext) {
            navigation.next();
          } else {
            navigation.previous();
          }
        }
      });
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented || hasTarget(event, IGNORED_CLICK_TARGETS)) {
        return;
      }

      // Outside presentation mode, a double-click reveals the slide source, so it counts as one click
      if (!isPresentationModeRef.current && event.detail > 1) {
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
