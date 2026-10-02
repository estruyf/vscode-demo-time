import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { isReducedMotion, ReducedMotionPreference, WebViewMessages } from '@demotime/common';
import { getReducedMotion, setReducedMotion, subscribeReducedMotion } from '../utils/reducedMotion';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the slides reduce motion. Use it in components that animate, like slide transitions and
 * the `fade-in`, `text-typewriter` and `text-highlight` components.
 */
export const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReducedMotion, getReducedMotion);

/**
 * Resolves whether the slides reduce motion, from the `demoTime.slideReducedMotion` and
 * `workbench.reduceMotion` settings and the `prefers-reduced-motion` media query, and shares it
 * with `useReducedMotion`.
 *
 * @returns `undefined` until the extension answered, then whether the slides reduce motion.
 */
export const useReducedMotionPreference = () => {
  const [preference, setPreference] = React.useState<ReducedMotionPreference | undefined>(
    undefined,
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(
    () => window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false,
  );

  React.useEffect(() => {
    messageHandler
      .request<ReducedMotionPreference>(WebViewMessages.toVscode.preview.getReducedMotion)
      .then((value) => setPreference(value || 'auto'))
      .catch(() => setPreference('auto'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageListener = (message: MessageEvent<EventData<any>>) => {
      const { command, payload } = message.data;
      if (command === WebViewMessages.toWebview.preview.updateReducedMotion) {
        setPreference(payload || 'auto');
      }
    };

    const mediaQuery = window.matchMedia?.(REDUCED_MOTION_QUERY);
    const onMediaChange = (ev: MediaQueryListEvent) => setPrefersReducedMotion(ev.matches);
    mediaQuery?.addEventListener('change', onMediaChange);

    Messenger.listen(messageListener);
    return () => {
      Messenger.unlisten(messageListener);
      mediaQuery?.removeEventListener('change', onMediaChange);
    };
  }, []);

  const reducedMotion =
    preference === undefined ? undefined : isReducedMotion(preference, prefersReducedMotion);

  // Before paint, so the slide doesn't start an animation that it should skip
  React.useLayoutEffect(() => {
    if (reducedMotion !== undefined) {
      setReducedMotion(reducedMotion);
    }
  }, [reducedMotion]);

  return reducedMotion;
};
