/**
 * Reduced motion for the slides:
 * - `on`: always reduce motion
 * - `off`: always animate
 * - `auto`: follow the `prefers-reduced-motion` media query of the OS
 */
export type ReducedMotionPreference = 'auto' | 'on' | 'off';

const isPreference = (value: unknown): value is ReducedMotionPreference =>
  value === 'auto' || value === 'on' || value === 'off';

/**
 * Combines the `demoTime.slideReducedMotion` setting with the `workbench.reduceMotion` setting of
 * VS Code. The Demo Time setting wins when it is `on` or `off`, with `auto` it follows VS Code,
 * which follows the OS by default.
 */
export const getReducedMotionPreference = (
  slideSetting: unknown,
  workbenchSetting: unknown,
): ReducedMotionPreference => {
  if (slideSetting === 'on' || slideSetting === 'off') {
    return slideSetting;
  }

  return isPreference(workbenchSetting) ? workbenchSetting : 'auto';
};

/**
 * Returns whether the slides should reduce motion.
 * @param preference The preference from `getReducedMotionPreference`
 * @param prefersReducedMotion Whether the `prefers-reduced-motion: reduce` media query matches
 */
export const isReducedMotion = (
  preference: ReducedMotionPreference | undefined,
  prefersReducedMotion: boolean,
): boolean => {
  if (preference === 'on') {
    return true;
  }
  if (preference === 'off') {
    return false;
  }
  return prefersReducedMotion;
};
