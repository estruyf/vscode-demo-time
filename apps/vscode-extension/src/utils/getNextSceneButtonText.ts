/**
 * Get the text of the next scene button in the status bar.
 *
 * @param sceneTitle - The title of the next scene
 * @param customText - The value of the `demoTime.nextSceneButtonText` setting
 * @returns The custom text when it is set, otherwise the title of the next scene
 */
export const getNextSceneButtonText = (
  sceneTitle: string | undefined,
  customText: string | undefined,
): string => {
  const text = typeof customText === 'string' ? customText.trim() : '';
  return text || sceneTitle || '';
};
