import { DemoFileProvider } from '../services/DemoFileProvider';
import { DemoStatusBar } from '../services/DemoStatusBar';
import { DemoPanel } from '../panels/DemoPanel';
import { DemoRunner } from '../services';
import { Preview } from '../preview/Preview';
import { Action } from '@demotime/common';

/**
 * Maps an array of demo objects to an array of objects containing only the `id` and `title` properties.
 *
 * @param demos - The array of demo objects to map.
 * @returns An array of objects, each with `id` and `title` properties. Returns an empty array if the input is not an array.
 */
function mapDemos(demos: any[]): { id: string; title: string }[] {
  return Array.isArray(demos) ? demos.map(({ title, id }) => ({ id, title })) : [];
}

/**
 * Retrieves formatted demo data including demo files, next demo, and current demo file.
 *
 * @returns An object containing demoFiles, nextDemo, and currentDemoFile, or null if no demos found.
 */
export async function getDemoApiData() {
  const demoFiles = await DemoFileProvider.getFiles();
  if (!demoFiles) {
    return null;
  }

  let hasNextSlide = Preview.checkIfHasNextSlide();
  const nextSlideTitle = hasNextSlide ? Preview.getNextSlideTitle() : undefined;
  const demo = hasNextSlide ? DemoRunner.currentDemo : DemoStatusBar.getNextDemo();

  if (!hasNextSlide) {
    const slideStep = demo?.steps.find((step) => step.action === Action.OpenSlide && step.path);
    if (slideStep) {
      hasNextSlide = true;
    }
  }

  let nextDemo = demo ? { title: demo.title, id: demo.id } : undefined;
  if (nextSlideTitle) {
    nextDemo = { title: nextSlideTitle, id: '' };
  }

  const demos = DemoPanel.getDemos();
  const previousEnabled = DemoRunner.allowPrevious();

  const crntFile = DemoPanel.crntExecutingDemoFile;
  let currentDemoFile: string | undefined = undefined;
  if (crntFile?.filePath) {
    currentDemoFile = crntFile.filePath;
  }

  const clock = DemoStatusBar.getClock();
  const countdown = DemoStatusBar.getCountdown();

  return {
    nextDemo,
    demos,
    currentDemoFile,
    previousEnabled,
    slides: {
      hasNext: hasNextSlide,
      nextTitle: nextSlideTitle,
      slideIdx: Preview.getCurrentSlideIndex(),
    },
    clock: {
      current: clock,
      countdown: countdown,
      isPaused: DemoStatusBar.getCountdownPaused(),
    },
  };
}
