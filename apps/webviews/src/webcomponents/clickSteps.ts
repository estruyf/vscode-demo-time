import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '@demotime/common';

/**
 * Shared click step counter for the slide preview.
 *
 * Click components (`dt-show`, `dt-hide`, `dt-list`) register the last click number they react to
 * and get the current click step back. Every "next" or "previous" input moves this one counter, so
 * all components stay in sync and the extension knows if the slide still has steps left.
 */
export type ClickStepListener = (step: number) => void;

interface ClickStepRegistration {
  lastStep: number;
  listener: ClickStepListener;
}

const registrations = new Set<ClickStepRegistration>();
const subscribers = new Set<ClickStepListener>();

let currentStep = 0;
let revealAll = false;
let lastSentState: string | undefined;

/**
 * Static rendering (like the PDF export) has no inputs to advance the clicks and no VS Code API,
 * so all components render their final state.
 */
export const isStaticMode = () =>
  (typeof document !== 'undefined' && !!document.body?.hasAttribute('data-demotime-static')) ||
  typeof (globalThis as { acquireVsCodeApi?: unknown }).acquireVsCodeApi !== 'function';

const getTotalSteps = () => {
  let total = 0;
  registrations.forEach((registration) => {
    total = Math.max(total, registration.lastStep);
  });
  return total;
};

const update = () => {
  const total = getTotalSteps();
  const isStatic = isStaticMode();
  if (revealAll || isStatic) {
    currentStep = total;
  }

  registrations.forEach((registration) => registration.listener(currentStep));
  subscribers.forEach((subscriber) => subscriber(currentStep));

  if (isStatic) {
    return;
  }

  const state = {
    listening: currentStep < total,
    hasPrevious: Math.min(currentStep, total) > 0,
  };
  const stateKey = JSON.stringify(state);
  if (stateKey !== lastSentState) {
    lastSentState = stateKey;
    messageHandler.send(WebViewMessages.toVscode.setHasClickListener, state);
  }
};

/**
 * Registers a component that reacts to the clicks up to `lastStep`.
 * @returns A function to unregister the component.
 */
export const registerClickSteps = (lastStep: number, listener: ClickStepListener) => {
  const registration: ClickStepRegistration = { lastStep: Math.max(0, lastStep), listener };
  registrations.add(registration);
  update();

  return () => {
    registrations.delete(registration);
    update();
  };
};

/**
 * Subscribes to click step changes without adding steps.
 */
export const subscribeClickSteps = (subscriber: ClickStepListener) => {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
};

/**
 * Reveals the next click step.
 * @returns `true` when there was a step left to reveal.
 */
export const nextClickStep = (): boolean => {
  const total = getTotalSteps();
  if (currentStep >= total) {
    return false;
  }

  revealAll = false;
  currentStep++;
  update();
  return true;
};

/**
 * Goes back one click step.
 * @returns `true` when there was a step to go back to.
 */
export const previousClickStep = (): boolean => {
  const step = Math.min(currentStep, getTotalSteps());
  if (step <= 0) {
    return false;
  }

  revealAll = false;
  currentStep = step - 1;
  update();
  return true;
};

/**
 * Resets the counter for a new slide.
 * @param atEnd Reveal all steps, used when going back to the previous slide.
 */
export const resetClickSteps = (atEnd = false) => {
  revealAll = atEnd;
  currentStep = 0;
  update();
};
