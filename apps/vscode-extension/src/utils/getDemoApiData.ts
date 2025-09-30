import { DemoFileProvider } from '../services/DemoFileProvider';
import { DemoStatusBar } from '../services/DemoStatusBar';
import { DemoPanel } from '../panels/DemoPanel';

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

  const nextDemoFull = DemoStatusBar.getNextDemo();
  const nextDemo = nextDemoFull ? { title: nextDemoFull.title, id: nextDemoFull.id } : undefined;
  const demos = DemoPanel.getDemos();

  const crntFile = DemoPanel.crntExecutingDemoFile;
  let currentDemoFile: string | undefined = undefined;
  if (crntFile?.filePath) {
    currentDemoFile = crntFile.filePath;
  }

  return {
    nextDemo,
    demos,
    currentDemoFile,
  };
}
