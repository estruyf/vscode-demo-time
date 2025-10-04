import { Uri } from 'vscode';
import { Extension } from './Extension';
import { DemoStatusBar } from './DemoStatusBar';
import { Logger } from './Logger';
import { getAbsolutePath, getTheme, readFile } from '../utils';
import {
  Action,
  Config,
  SlideLayout,
  SlideParser,
  SlideTheme,
  convertTemplateToHtml,
  transformMarkdown,
  twoColumnFormatting,
} from '@demotime/common';
import { renderToString } from 'react-dom/server';
import rehypePrettyCode from 'rehype-pretty-code';
import { resolve } from 'mlly';
import { Preview } from '../preview/Preview';
import { DemoRunner } from './DemoRunner';

export class ScreenshotService {
  private static cachedScreenshot: string | null = null;
  private static cachedSlideIdx: number | null = null;
  private static lastDemoId: string | undefined = undefined;

  /**
   * Get a screenshot of the next slide
   * Returns a base64-encoded PNG image or null if no slide available
   */
  public static async getNextSlideScreenshot(): Promise<string | null> {
    try {
      const hasNextSlide = Preview.checkIfHasNextSlide();
      const crntSlideIdx = Preview.getCurrentSlideIndex();
      let demo = hasNextSlide ? DemoRunner.currentDemo : DemoStatusBar.getNextDemo();
      const nextSlideIdx = hasNextSlide ? crntSlideIdx + 1 : 0;

      // Check cache validity
      if (
        demo?.id === ScreenshotService.lastDemoId &&
        ScreenshotService.cachedSlideIdx === nextSlideIdx &&
        ScreenshotService.cachedScreenshot
      ) {
        Logger.info('Returning cached next slide screenshot');
        return ScreenshotService.cachedScreenshot;
      }

      if (!demo) {
        Logger.info('No next demo available for screenshot');
        return null;
      }

      // Find the first openSlide step in the next demo
      const slideStep = demo.steps.find((step) => step.action === Action.OpenSlide && step.path);

      if (!slideStep || !slideStep.path) {
        Logger.info('No slide step found in next demo');
        return null;
      }

      const wsFolder = Extension.getInstance().workspaceFolder;
      if (!wsFolder) {
        Logger.error('No workspace folder found');
        return null;
      }

      // Get the slide content
      const slideUri = Uri.joinPath(wsFolder.uri, slideStep.path);
      const slideContent = await readFile(slideUri);

      if (!slideContent) {
        Logger.error('Failed to read slide content');
        return null;
      }

      // Parse and get the first slide (or specific slide index if specified)
      const parser = new SlideParser();
      const slides = parser.parseSlides(slideContent);

      if (slides.length === 0) {
        Logger.error('No slides parsed from content');
        return null;
      }

      let slideIndex = 0;
      if (nextSlideIdx !== null) {
        slideIndex = nextSlideIdx;
      } else if (typeof slideStep.slide === 'number') {
        slideIndex = slideStep.slide;
      }
      const targetSlide = slides[slideIndex] || slides[0];

      // Generate screenshot
      const screenshot = await ScreenshotService.generateScreenshot(targetSlide);

      // Cache the result
      ScreenshotService.cachedScreenshot = screenshot;
      ScreenshotService.lastDemoId = demo.id;
      ScreenshotService.cachedSlideIdx = slideIndex;

      return screenshot;
    } catch (error) {
      Logger.error(`Error generating next slide screenshot: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Clear the cached screenshot
   */
  public static clearCache(): void {
    ScreenshotService.cachedScreenshot = null;
    ScreenshotService.lastDemoId = undefined;
  }

  /**
   * Generate a screenshot from slide content
   */
  private static async generateScreenshot(slide: any): Promise<string> {
    const { chromium } = await ScreenshotService.getPlaywright();
    const browser = await chromium.launch({
      args: ['--allow-file-access-from-files', '--enable-local-file-accesses'],
    });

    try {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }, // 16:9 aspect ratio
      });
      const page = await context.newPage();

      // Generate HTML for the slide
      const html = await ScreenshotService.generateSlideHtml(slide);

      // Load the HTML
      await page.setContent(html, { waitUntil: 'networkidle' });

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      await page.close();
      await context.close();
      await browser.close();

      // Convert to base64
      return `data:image/png;base64,${screenshot.toString('base64')}`;
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  /**
   * Generate HTML for a single slide
   */
  private static async generateSlideHtml(slide: any): Promise<string> {
    const theme = await getTheme(undefined);
    const ext = Extension.getInstance();
    const headerSetting = ext.getSetting<string>(Config.slides.slideHeaderTemplate);
    const footerSetting = ext.getSetting<string>(Config.slides.slideFooterTemplate);

    // Transform markdown to HTML
    const vfile = await transformMarkdown(
      twoColumnFormatting(slide.content),
      undefined,
      undefined,
      undefined,
      [[rehypePrettyCode, { theme: theme ? theme : {} }]],
      undefined,
    );
    let { reactContent } = vfile;

    const slideTheme = slide.frontmatter.theme || SlideTheme.default;
    const layout = slide.frontmatter.customLayout
      ? slide.frontmatter.customLayout
      : slide.frontmatter.layout || SlideLayout.Default;
    const image = slide.frontmatter.image || undefined;
    const customTheme = slide.frontmatter.customTheme || undefined;
    const customLayout = slide.frontmatter.customLayout || undefined;
    let headerTemplate = slide.frontmatter.header || undefined;
    let footerTemplate = slide.frontmatter.footer || undefined;

    if (!headerTemplate && headerSetting) {
      const abs = getAbsolutePath(headerSetting);
      headerTemplate = await readFile(abs);
    }

    if (!footerTemplate && footerSetting) {
      const abs = getAbsolutePath(footerSetting);
      footerTemplate = await readFile(abs);
    }

    if (headerTemplate) {
      headerTemplate = convertTemplateToHtml(headerTemplate, slide.frontmatter);
    }
    if (footerTemplate) {
      footerTemplate = convertTemplateToHtml(footerTemplate, slide.frontmatter);
    }

    let html = renderToString(reactContent);

    if (customLayout) {
      const wsFolder = Extension.getInstance().workspaceFolder;
      if (wsFolder) {
        const customLayoutPath = Uri.joinPath(wsFolder.uri, customLayout);
        const customLayoutContent = await readFile(customLayoutPath);
        html = convertTemplateToHtml(customLayoutContent, {
          metadata: { ...slide.frontmatter },
          content: html,
        });
      }
    }

    // Build the full HTML page
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .slide-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
    }
    .slide-header {
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
    }
    .slide-footer {
      position: absolute;
      bottom: 20px;
      left: 20px;
      right: 20px;
    }
    .slide-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 1100px;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #e0e0e0;
      margin-bottom: 0.5em;
    }
    h1 { font-size: 3em; }
    h2 { font-size: 2.5em; }
    h3 { font-size: 2em; }
    p {
      font-size: 1.5em;
      line-height: 1.6;
      margin-bottom: 1em;
    }
    code {
      background: #2d2d2d;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #2d2d2d;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
      margin-bottom: 1em;
    }
    pre code {
      background: transparent;
      padding: 0;
    }
    ul, ol {
      font-size: 1.5em;
      margin-left: 2em;
      margin-bottom: 1em;
    }
    li {
      margin-bottom: 0.5em;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    ${
      slideTheme === SlideTheme.light
        ? `
      body { background: #ffffff; color: #333333; }
      h1, h2, h3, h4, h5, h6 { color: #111111; }
      code { background: #f5f5f5; }
      pre { background: #f5f5f5; }
    `
        : ''
    }
  </style>
  ${customTheme ? `<link rel="stylesheet" href="${customTheme}">` : ''}
</head>
<body>
  <div class="slide-container">
    ${headerTemplate ? `<div class="slide-header">${headerTemplate}</div>` : ''}
    <div class="slide-content">
      ${image ? `<img src="${image}" alt="Slide image" />` : html}
    </div>
    ${footerTemplate ? `<div class="slide-footer">${footerTemplate}</div>` : ''}
  </div>
</body>
</html>`;

    return fullHtml;
  }

  /**
   * Get Playwright module
   */
  private static async getPlaywright(): Promise<typeof import('playwright-chromium')> {
    const wsFolder = Extension.getInstance().workspaceFolder;

    try {
      return await import(await resolve('playwright-chromium', { url: wsFolder?.uri.fsPath }));
    } catch {}

    try {
      return await import('playwright-chromium');
    } catch {
      throw new Error('Playwright not found. Please install playwright-chromium.');
    }
  }
}
