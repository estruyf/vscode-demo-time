import { getLastSlideIdx, SlideParser } from '@demotime/common';
import { WorkspaceFolder } from 'vscode';
import { DemoRunner } from '../services';
import { getFileContents } from './getFileContents';

/**
 * Gets the 1-based number of the last slide of a slide file, like the `slide` property of the
 * `openSlide` move. While presenting, hidden slides are skipped.
 */
export const getLastSlideNumber = async (
  workspaceFolder: WorkspaceFolder,
  path?: string,
): Promise<number | undefined> => {
  try {
    const content = await getFileContents(workspaceFolder, path);
    if (!content) {
      return;
    }

    const slides = new SlideParser().parseSlides(content);
    const lastIdx = getLastSlideIdx(slides, DemoRunner.getIsPresentationMode());
    return lastIdx === undefined ? undefined : lastIdx + 1;
  } catch {
    return;
  }
};
