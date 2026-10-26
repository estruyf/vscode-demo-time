import { getLastSlideIdx } from '@demotime/common';
import { WorkspaceFolder } from 'vscode';
import { DemoRunner } from '../services';
import { readSlideFile } from './parseSlideFile';

/**
 * Gets the 1-based number of the last slide of a slide file, like the `slide` property of the
 * `openSlide` move. While presenting, hidden slides are skipped.
 */
export const getLastSlideNumber = async (
  workspaceFolder: WorkspaceFolder,
  path?: string,
): Promise<number | undefined> => {
  try {
    const slides = await readSlideFile(workspaceFolder, path);
    if (!slides) {
      return;
    }

    const lastIdx = getLastSlideIdx(slides, DemoRunner.getIsPresentationMode());
    return lastIdx === undefined ? undefined : lastIdx + 1;
  } catch {
    return;
  }
};
