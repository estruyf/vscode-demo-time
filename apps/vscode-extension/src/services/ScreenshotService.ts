import { Uri, workspace } from 'vscode';
import { Extension } from './Extension';
import { DemoStatusBar } from './DemoStatusBar';
import { Logger } from './Logger';
import { getAbsolutePath, getTheme, readFile, writeFile } from '../utils';
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
import type { BrowserType } from 'playwright-chromium';

export class ScreenshotService {
  private static cachedScreenshot: string | null = null;
  private static cachedSlideIdx: number | undefined = undefined;
  private static lastDemoId: string | undefined = undefined;

  public static async generate(): Promise<string | null> {
    try {
      const slideData = await ScreenshotService.getTargetSlide();
      if (!slideData) {
        return null;
      }

      const { targetSlide, demo, slideIndex } = slideData;

      // Check cache validity
      if (
        demo?.id === ScreenshotService.lastDemoId &&
        ScreenshotService.cachedSlideIdx === slideIndex &&
        ScreenshotService.cachedScreenshot
      ) {
        Logger.info('Returning cached next slide screenshot');
        return ScreenshotService.cachedScreenshot;
      }

      // Generate HTML for the slide
      const html = await ScreenshotService.generateSlideHtml(targetSlide);

      // Cache the result
      ScreenshotService.lastDemoId = demo.id;
      ScreenshotService.cachedSlideIdx = slideIndex;

      return html;
    } catch (error) {
      Logger.error(`Error generating next slide screenshot: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get a screenshot of the next slide
   * Returns a base64-encoded PNG image or null if no slide available
   */
  public static async getNextSlideScreenshot(): Promise<string | null> {
    try {
      const { chromium } = await ScreenshotService.getPlaywright();
      if (!chromium) {
        Logger.error('Playwright is not available');
        return null;
      }

      const slideData = await ScreenshotService.getTargetSlide();
      if (!slideData) {
        return null;
      }

      const { targetSlide, demo, slideIndex } = slideData;

      // Check cache validity
      if (
        demo?.id === ScreenshotService.lastDemoId &&
        ScreenshotService.cachedSlideIdx === slideIndex &&
        ScreenshotService.cachedScreenshot
      ) {
        Logger.info('Returning cached next slide screenshot');
        return ScreenshotService.cachedScreenshot;
      }

      // Generate screenshot
      const screenshot = await ScreenshotService.generateScreenshot(chromium, targetSlide);

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
   * Get the target slide for the next slide (either current demo's next slide or next demo's first slide)
   */
  private static async getTargetSlide(): Promise<any | null> {
    const hasNextSlide = Preview.checkIfHasNextSlide();
    const crntSlideIdx = Preview.getCurrentSlideIndex();
    const demo = hasNextSlide ? DemoRunner.currentDemo : DemoStatusBar.getNextDemo();
    const nextSlideIdx = hasNextSlide ? crntSlideIdx + 1 : 0;

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

    return { targetSlide, demo, slideIndex };
  }

  /**
   * Clear the cached screenshot
   */
  public static clearCache(): void {
    ScreenshotService.cachedScreenshot = null;
    ScreenshotService.lastDemoId = undefined;
    ScreenshotService.cachedSlideIdx = undefined;
  }

  /**
   * Get Playwright module
   */
  public static async getPlaywright(): Promise<typeof import('playwright-chromium')> {
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

  /**
   * Generate a screenshot from slide content
   */
  private static async generateScreenshot(chromium: BrowserType<{}>, slide: any): Promise<string> {
    const browser = await chromium.launch({
      args: ['--allow-file-access-from-files', '--enable-local-file-accesses'],
    });

    try {
      const context = await browser.newContext({
        viewport: { width: 960, height: 540 }, // 16:9 aspect ratio
      });
      const page = await context.newPage();

      // Generate HTML for the slide
      const html = await ScreenshotService.generateSlideHtml(slide);

      // Load the HTML
      const workspaceFolder = Extension.getInstance().workspaceFolder;
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }
      await page.goto(`file://${workspaceFolder.uri.fsPath}`);
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.waitForLoadState('networkidle');
      await page.emulateMedia({ media: 'print' });

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 960, height: 540 },
        omitBackground: false,
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

  public static async getThemeCss(slideTheme: SlideTheme): Promise<string> {
    let themeCss: string | null = null;
    const extensionPath = Extension.getInstance().extensionPath;

    if (slideTheme === SlideTheme.default) {
      themeCss = await readFile(
        Uri.joinPath(Uri.parse(extensionPath), 'assets', 'styles', 'themes', 'default.css'),
      );
    } else if (slideTheme === SlideTheme.minimal) {
      themeCss = await readFile(
        Uri.joinPath(Uri.parse(extensionPath), 'assets', 'styles', 'themes', 'minimal.css'),
      );
    } else if (slideTheme === SlideTheme.monomi) {
      themeCss = await readFile(
        Uri.joinPath(Uri.parse(extensionPath), 'assets', 'styles', 'themes', 'monomi.css'),
      );
    } else if (slideTheme === SlideTheme.unnamed) {
      themeCss = await readFile(
        Uri.joinPath(Uri.parse(extensionPath), 'assets', 'styles', 'themes', 'unnamed.css'),
      );
    } else if (slideTheme === SlideTheme.quantum) {
      themeCss = await readFile(
        Uri.joinPath(Uri.parse(extensionPath), 'assets', 'styles', 'themes', 'quantum.css'),
      );
    } else if (slideTheme === SlideTheme.frost) {
      themeCss = await readFile(
        Uri.joinPath(Uri.parse(extensionPath), 'assets', 'styles', 'themes', 'frost.css'),
      );
    }

    const removeCustomVariant = (css: string) =>
      css.replace(/@custom-variant dark\s*\(&:is\(\.vscode-dark \*\)\);?/g, '');
    themeCss = removeCustomVariant(themeCss || '');

    return themeCss || '';
  }

  /**
   * Generate HTML for a single slide
   */
  private static async generateSlideHtml(slide: any): Promise<string> {
    const extension = Extension.getInstance();
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

    if (
      headerTemplate?.includes(`{{crntSlideIdx}}`) ||
      footerTemplate?.includes(`{{crntSlideIdx}}`)
    ) {
      slide.frontmatter.crntSlideIdx = 1; // For single slide screenshots, this is always 1
    }

    if (
      headerTemplate?.includes(`{{totalSlides}}`) ||
      footerTemplate?.includes(`{{totalSlides}}`)
    ) {
      slide.frontmatter.totalSlides = 1; // For single slide screenshots, this is always 1
    }

    if (headerTemplate) {
      headerTemplate = convertTemplateToHtml(headerTemplate, slide.frontmatter);
    }
    if (footerTemplate) {
      footerTemplate = convertTemplateToHtml(footerTemplate, slide.frontmatter);
    }

    let html = renderToString(reactContent);

    if (customLayout) {
      const wsFolder = extension.workspaceFolder;
      if (wsFolder) {
        const customLayoutPath = Uri.joinPath(wsFolder.uri, customLayout);
        const customLayoutContent = await readFile(customLayoutPath);

        html = convertTemplateToHtml(customLayoutContent, {
          metadata: { ...slide.frontmatter },
          content: html,
        });
      }
    }

    // Isolate the styles for the custom layout to the slide
    html = html.replace(/<style>/g, `<style type="text/tailwindcss">#slide-1 {`);
    html = html.replace(/<\/style>/g, '}</style>');

    // Load the appropriate theme CSS
    const themeCss = await ScreenshotService.getThemeCss(slideTheme);

    // Load base styles
    const baseStyles = await readFile(
      Uri.joinPath(
        Uri.parse(Extension.getInstance().extensionPath),
        'assets',
        'styles',
        'print.css',
      ),
    );
    const processedBaseStyles = await ScreenshotService.insertCssVariables(baseStyles);

    // Build the full HTML page with proper theme and layout
    const slideBg =
      image && layout !== SlideLayout.ImageLeft && layout !== SlideLayout.ImageRight
        ? `background-image: url(${image});`
        : ``;

    // Custom themes on global level
    const customThemes = [];
    const customThemeUrls = [];
    const globalCustomTheme = extension.getSetting<string>(Config.slides.customTheme);
    if (globalCustomTheme) {
      const workspaceFolder = extension.workspaceFolder;
      if (globalCustomTheme.startsWith('http')) {
        customThemeUrls.push(globalCustomTheme);
      } else if (workspaceFolder) {
        const theme = await readFile(Uri.joinPath(workspaceFolder.uri, globalCustomTheme));
        if (theme) {
          customThemes.push(theme);
        }
      }
    }

    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style type="text/tailwindcss">
  ${processedBaseStyles}
  ${themeCss}
  </style>
  ${customThemes ? `<style type="text/tailwindcss">${customThemes}</style>` : ``}
  ${customThemeUrls ? `<link rel="stylesheet" href="${customThemeUrls}">` : ``}
  ${customTheme ? `<link rel="stylesheet" href="${customTheme}">` : ''}
</head>
<body>
  <div class="w-full h-full flex items-center justify-center" id="slide-1">
    <div class="slide ${slideTheme.toLowerCase()}" data-theme="${slideTheme.toLowerCase()}" data-layout="${layout.toLowerCase()}">
      <div class="slide__container">
        <div class="slide__layout ${layout.toLowerCase()}" style="${slideBg}">
          ${headerTemplate ? `<header class="slide__header">${headerTemplate}</header>` : ''}

          ${
            layout === SlideLayout.ImageLeft
              ? `<div class="slide__image_left" style="background-image: url(${image});"></div>`
              : ``
          }

          <div class="slide__content">
            <div class="${customLayout ? `slide__content__custom` : `slide__content__inner`}">
              ${html}
            </div>
          </div>

          ${
            layout === SlideLayout.ImageRight
              ? `<div class="slide__image_right" style="background-image: url(${image});"></div>`
              : ``
          }

          ${footerTemplate ? `<footer class="slide__footer">${footerTemplate}</footer>` : ''}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const isDebug = Extension.getInstance().getSetting<boolean>(Config.debug);
    if (isDebug) {
      const workspaceFolder = Extension.getInstance().workspaceFolder;
      if (!workspaceFolder) {
        return fullHtml;
      }

      await writeFile(Uri.joinPath(workspaceFolder.uri, 'slide.debug.html'), fullHtml);
    }
    return fullHtml;
  }

  /**
   * Inserts CSS variables based on the current VS Code theme and editor settings into the provided CSS string.
   *
   * This method retrieves the active theme's color variables and the editor's font size and font family settings,
   * then constructs a `:root` CSS block containing these variables. The generated CSS is prepended to the provided
   * CSS string.
   *
   * @param css - The existing CSS string to which the theme and editor variables will be added. Defaults to an empty string.
   * @returns A promise that resolves to the updated CSS string with the inserted variables.
   */
  private static async insertCssVariables(css: string = ''): Promise<string> {
    const theme = await getTheme(undefined);
    if (!theme) {
      return css;
    }

    // Get the color variables from the theme
    const colors = Object.entries(theme.colors).reduce(
      (acc, [key, value]) => {
        acc[key] = value as string;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Get the font size and family from the editor settings
    // --vscode-editor-font-size
    const editorFontSize = workspace.getConfiguration('editor').get('fontSize') as number;
    // --vscode-editor-font-family
    const editorFontFamily = workspace.getConfiguration('editor').get('fontFamily') as string;

    // Add the colors to the top of the CSS
    let updatedCss = '@reference "tailwindcss";\n\n';
    updatedCss += ':root {\n';
    updatedCss += `  --vscode-editor-font-size: ${editorFontSize}px;\n`;
    updatedCss += `  --vscode-editor-font-family: ${editorFontFamily};\n`;
    for (const [key, value] of Object.entries(colors)) {
      updatedCss += `  --vscode-${key.replace(/\./g, '-')}: ${value};\n`;
    }
    updatedCss += '}\n';
    updatedCss += css;

    return updatedCss;
  }
}
