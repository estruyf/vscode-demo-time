import { ContextKeys, StateKeys } from '../constants';
import { Preview } from '../preview/Preview';
import { getFileContents, setContext } from '../utils';
import { Action, COMMAND, Demo, SlideParser } from '@demotime/common';
import { commands } from 'vscode';
import { DemoPanel } from '../panels/DemoPanel';
import { DemoStatusBar } from './DemoStatusBar';
import { Extension } from './Extension';

export class DemoAutoProceedService {
  private static autoProceedTimer: NodeJS.Timeout | undefined;
  private static autoProceedCountdownInterval: NodeJS.Timeout | undefined;
  private static isAutoProceedPaused = false;
  private static isAutoProceedActive = false;
  private static isLoopEnabled = false;
  private static autoProceedCountdown = 0;
  private static autoProceedSource: 'scene' | 'slide' | undefined;

  public static getIsAutoProceedPaused(): boolean {
    return DemoAutoProceedService.isAutoProceedPaused;
  }

  public static getIsAutoProceedActive(): boolean {
    return DemoAutoProceedService.isAutoProceedActive;
  }

  public static getIsLoopEnabled(): boolean {
    return DemoAutoProceedService.isLoopEnabled;
  }

  public static getAutoProceedCountdown(): number {
    return DemoAutoProceedService.autoProceedCountdown;
  }

  public static getAutoProceedSource(): 'scene' | 'slide' | undefined {
    return DemoAutoProceedService.autoProceedSource;
  }

  public static setLoopEnabled(enabled: boolean): void {
    DemoAutoProceedService.isLoopEnabled = enabled;
  }

  public static clearAutoProceedTimers(): void {
    if (DemoAutoProceedService.autoProceedTimer) {
      clearTimeout(DemoAutoProceedService.autoProceedTimer);
      DemoAutoProceedService.autoProceedTimer = undefined;
    }
    if (DemoAutoProceedService.autoProceedCountdownInterval) {
      clearInterval(DemoAutoProceedService.autoProceedCountdownInterval);
      DemoAutoProceedService.autoProceedCountdownInterval = undefined;
    }
    DemoAutoProceedService.autoProceedCountdown = 0;
  }

  public static async onSlideIndexUpdated(currentDemo: Demo | undefined): Promise<void> {
    if (!currentDemo || DemoAutoProceedService.autoProceedSource !== 'slide') {
      return;
    }

    await DemoAutoProceedService.syncAutoProceedForDemo(currentDemo);
  }

  public static async hasSceneAutoLoopTiming(demo: Demo): Promise<boolean> {
    if (demo.autoAdvanceAfter && demo.autoAdvanceAfter > 0) {
      return true;
    }

    const slideStep = demo.steps?.find((step) => step.action === Action.OpenSlide && step.path);
    if (!slideStep?.path) {
      return false;
    }

    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return false;
    }

    const slideContent = await getFileContents(workspaceFolder, slideStep.path);
    if (!slideContent) {
      return false;
    }

    const parser = new SlideParser();
    const slides = parser.parseSlides(slideContent);
    if (slides.length <= 0) {
      return false;
    }

    const startSlideIndex =
      typeof slideStep.slide === 'number' && slideStep.slide >= 0 ? slideStep.slide : 0;
    const slidesToValidate = slides.slice(startSlideIndex);

    return (
      slidesToValidate.length > 0 &&
      slidesToValidate.every(
        (slide) =>
          typeof slide.frontmatter?.autoAdvanceAfter === 'number' &&
          slide.frontmatter.autoAdvanceAfter > 0,
      )
    );
  }

  public static async syncAutoProceedForDemo(currentDemo: Demo | undefined): Promise<void> {
    if (!currentDemo) {
      return;
    }

    let delaySeconds: number | undefined;
    let source: 'scene' | 'slide' | undefined;

    if (typeof currentDemo.autoAdvanceAfter === 'number' && currentDemo.autoAdvanceAfter > 0) {
      delaySeconds = currentDemo.autoAdvanceAfter;
      source = 'scene';
    } else {
      delaySeconds = await DemoAutoProceedService.getCurrentSlideAutoAdvanceAfter(currentDemo);
      if (typeof delaySeconds === 'number' && delaySeconds > 0) {
        source = 'slide';
      }
    }

    DemoAutoProceedService.autoProceedSource = source;
    DemoAutoProceedService.isAutoProceedActive = !!delaySeconds;
    await setContext(ContextKeys.autoProceedActive, DemoAutoProceedService.isAutoProceedActive);
    DemoAutoProceedService.setPreviewAutoProceedManagedState();

    if (!delaySeconds) {
      DemoAutoProceedService.clearAutoProceedTimers();
      DemoStatusBar.updateAutomationIndicator();
      return;
    }

    if (!DemoAutoProceedService.isAutoProceedPaused) {
      DemoAutoProceedService.startAutoProceedTimer(delaySeconds);
    }

    DemoStatusBar.updateAutomationIndicator();
  }

  public static async setAutoProceedPaused(
    paused: boolean,
    currentDemo: Demo | undefined,
  ): Promise<void> {
    DemoAutoProceedService.isAutoProceedPaused = paused;
    await setContext(ContextKeys.autoProceedPaused, paused);

    if (paused) {
      DemoAutoProceedService.clearAutoProceedTimers();
      DemoPanel.updateMessage('Auto-proceed paused');
    } else {
      await DemoAutoProceedService.syncAutoProceedForDemo(currentDemo);
      DemoPanel.updateMessage('Presentation mode enabled');
    }

    DemoAutoProceedService.setPreviewAutoProceedManagedState();
    DemoStatusBar.updateAutomationIndicator();
  }

  public static async toggleAutoProceed(currentDemo: Demo | undefined): Promise<void> {
    await DemoAutoProceedService.setAutoProceedPaused(
      !DemoAutoProceedService.isAutoProceedPaused,
      currentDemo,
    );
  }

  public static async deactivate(): Promise<void> {
    DemoAutoProceedService.isAutoProceedActive = false;
    DemoAutoProceedService.autoProceedSource = undefined;
    DemoAutoProceedService.clearAutoProceedTimers();
    await setContext(ContextKeys.autoProceedActive, false);
    DemoAutoProceedService.setPreviewAutoProceedManagedState();
    DemoStatusBar.updateAutomationIndicator();
  }

  public static async resetState(): Promise<void> {
    DemoAutoProceedService.clearAutoProceedTimers();
    DemoAutoProceedService.isAutoProceedPaused = false;
    DemoAutoProceedService.isAutoProceedActive = false;
    DemoAutoProceedService.isLoopEnabled = false;
    DemoAutoProceedService.autoProceedSource = undefined;
    await setContext(ContextKeys.autoProceedPaused, false);
    await setContext(ContextKeys.autoProceedActive, false);
    DemoAutoProceedService.setPreviewAutoProceedManagedState();
    DemoStatusBar.updateAutomationIndicator();
  }

  private static setPreviewAutoProceedManagedState(): void {
    Preview.updateAutoProceedState({
      managedByExtension:
        DemoAutoProceedService.autoProceedSource === 'slide' &&
        DemoAutoProceedService.isAutoProceedActive,
    });
  }

  private static startAutoProceedTimer(delaySeconds: number): void {
    DemoAutoProceedService.clearAutoProceedTimers();
    DemoAutoProceedService.autoProceedCountdown = delaySeconds;

    DemoAutoProceedService.autoProceedCountdownInterval = setInterval(() => {
      DemoAutoProceedService.autoProceedCountdown = Math.max(
        0,
        DemoAutoProceedService.autoProceedCountdown - 1,
      );
    }, 1000);

    DemoAutoProceedService.autoProceedTimer = setTimeout(async () => {
      DemoAutoProceedService.clearAutoProceedTimers();
      await commands.executeCommand(COMMAND.start);
    }, delaySeconds * 1000);
  }

  private static async getCurrentSlideAutoAdvanceAfter(demo: Demo): Promise<number | undefined> {
    const slideStep = demo.steps?.find((step) => step.action === Action.OpenSlide && step.path);
    if (!slideStep?.path) {
      return undefined;
    }

    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return undefined;
    }

    const slideContent = await getFileContents(workspaceFolder, slideStep.path);
    if (!slideContent) {
      return undefined;
    }

    const parser = new SlideParser();
    const slides = parser.parseSlides(slideContent);
    if (slides.length <= 0) {
      return undefined;
    }

    const startSlideIndex =
      typeof slideStep.slide === 'number' && slideStep.slide >= 0 ? slideStep.slide : 0;
    const currentSlideIndex = Math.max(Preview.getCurrentSlideIndex(), 0);
    const targetSlide = slides[currentSlideIndex] || slides[startSlideIndex];
    const delay = targetSlide?.frontmatter?.autoAdvanceAfter;

    return typeof delay === 'number' && delay > 0 ? delay : undefined;
  }
}
