/**
 * Attribute on the `<html>` element of the slide preview while the slides reduce motion. Custom CSS
 * and web components can use it too: `:root[data-reduced-motion] .my-animation { ... }`.
 */
export const REDUCED_MOTION_ATTRIBUTE = 'data-reduced-motion';

/**
 * Event on `window` when reduced motion gets turned on or off
 */
export const REDUCED_MOTION_EVENT = 'demotime.reducedMotion';

export const getReducedMotion = (): boolean =>
  document.documentElement.hasAttribute(REDUCED_MOTION_ATTRIBUTE);

export const setReducedMotion = (value: boolean) => {
  if (getReducedMotion() === value) {
    return;
  }

  document.documentElement.toggleAttribute(REDUCED_MOTION_ATTRIBUTE, value);
  window.dispatchEvent(new CustomEvent(REDUCED_MOTION_EVENT, { detail: { reducedMotion: value } }));
};

export const subscribeReducedMotion = (listener: () => void) => {
  window.addEventListener(REDUCED_MOTION_EVENT, listener);
  return () => window.removeEventListener(REDUCED_MOTION_EVENT, listener);
};
