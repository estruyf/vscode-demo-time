import rehypePrettyCode from 'rehype-pretty-code';
import { resolve } from 'mlly';
import { Notifications } from './Notifications';
import { Subscription } from '../models';
import { Extension } from './Extension';
import { DemoFileProvider, Logger, Slides } from '.';
import { getAbsolutePath, getTheme, readFile, sortFiles, writeFile } from '../utils';
import {
  commands,
  Uri,
  workspace,
  WorkspaceFolder,
  window,
  ProgressLocation,
  env,
  ColorThemeKind,
} from 'vscode';
import { Page } from 'playwright-chromium';
import { General } from '../constants';
import { renderToString } from 'react-dom/server';
import {
  Action,
  COMMAND,
  Config,
  convertTemplateToHtml,
  SlideLayout,
  SlideParser,
  SlideTheme,
  Step,
  transformMarkdown,
  twoColumnFormatting,
} from '@demotime/common';
import { ScreenshotService } from './ScreenshotService';

export class PdfExportService {
  private static workspaceFolder: WorkspaceFolder | undefined;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    PdfExportService.init();

    subscriptions.push(commands.registerCommand(COMMAND.exportToPdf, PdfExportService.exportToPdf));
  }

  public static init() {
    // Get the workspace folder
    const workspaceFolder = workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      PdfExportService.workspaceFolder = workspaceFolder;
    }
  }

  /**
   * Export all slides from demo files to a PDF
   */
  public static async exportToPdf(): Promise<void> {
    if (!PdfExportService.workspaceFolder) {
      Notifications.error('No workspace folder found.');
      return;
    }

    try {
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: 'Exporting slides to PDF',
          cancellable: false,
        },
        async (progress) => {
          const { chromium } = await PdfExportService.getPlaywright();
          const browser = await chromium.launch({
            args: ['--allow-file-access-from-files', '--enable-local-file-accesses'],
          });
          const context = await browser.newContext();
          const page = await context.newPage();

          // Get all demo files
          let demoFiles = await DemoFileProvider.getFiles();
          if (!demoFiles) {
            Notifications.error('No demo files found.');
            return;
          }

          // Sort the demo files by their paths
          demoFiles = sortFiles(demoFiles).reduce(
            (sortedFiles, key) => {
              if (demoFiles) {
                sortedFiles[key] = demoFiles[key];
              }
              return sortedFiles;
            },
            {} as typeof demoFiles,
          );

          // Get all slide actions
          const slideActions: Step[] = [];
          for (const demoFile of Object.values(demoFiles)) {
            for (const demo of demoFile.demos) {
              for (const step of demo.steps) {
                if (step.action === Action.OpenSlide && step.path) {
                  slideActions.push(step);
                }
              }
            }
          }

          // Retrieving slide contents
          progress.report({ message: 'Retrieving slide contents...' });
          const slideContents = [];
          for (const slideAction of slideActions) {
            const slideUri = Uri.joinPath(
              PdfExportService.workspaceFolder?.uri as Uri,
              slideAction.path as string,
            );
            const content = await readFile(slideUri);
            slideContents.push({ content });
          }

          if (slideContents.length === 0) {
            Notifications.error('No slides found.');
            return;
          }

          let pdfPath: Uri | undefined = Uri.joinPath(
            PdfExportService.workspaceFolder?.uri as Uri,
            General.pdfExportFile,
          );
          pdfPath = await window.showSaveDialog({
            defaultUri: pdfPath,
            filters: {
              pdf: ['pdf'],
            },
            saveLabel: 'Export',
            title: 'Export slides to PDF',
          });

          if (!pdfPath) {
            Notifications.infoWithProgress('Export cancelled.');
            return;
          }

          // Generate HTML for all slides
          progress.report({ message: 'Generating HTML for slides...' });
          const html = await PdfExportService.generateSlidesHtml(slideContents);
          const tempHtmlOutputPath = Uri.joinPath(
            PdfExportService.workspaceFolder?.uri as Uri,
            General.htmlExportFile,
          );
          await writeFile(tempHtmlOutputPath, html);

          // Convert HTML to PDF
          progress.report({ message: 'Converting HTML to PDF...' });
          await PdfExportService.generatePdfFromHtml(
            page,
            tempHtmlOutputPath.fsPath,
            pdfPath.fsPath,
          );

          // Clean up
          await page.close();
          await context.close();
          await browser.close();

          const isDebug = Extension.getInstance().getSetting<boolean>(Config.debug);
          if (Extension.getInstance().isProductionMode && !isDebug) {
            // Delete the temporary HTML file
            await workspace.fs.delete(tempHtmlOutputPath);
          }

          // Open the generated PDF
          await env.openExternal(pdfPath);
          Notifications.infoWithProgress('Slides exported to PDF successfully.');
        },
      );
    } catch (error) {
      Notifications.error(`Error exporting slides to PDF: ${(error as Error).message}`);
      return;
    }
  }

  private static async getPlaywright(): Promise<typeof import('playwright-chromium')> {
    const playwrightModule = await ScreenshotService.getPlaywright();
    if (playwrightModule) {
      return playwrightModule;
    }

    const markdownContent = `
  # Playwright Not Found

  To export slides to PDF, you need to install Playwright Chromium. Please run the following command in your terminal:

  \`\`\`bash
  npm i playwright-chromium -D
  \`\`\`

  Once installed, try exporting the slides again.
  `;

    const tempMarkdownPath = Uri.joinPath(
      PdfExportService.workspaceFolder?.uri as Uri,
      'playwright-instructions.md',
    );
    await writeFile(tempMarkdownPath, markdownContent);

    await commands.executeCommand('markdown.showPreview', tempMarkdownPath);
    throw new Error('Playwright not found. Instructions have been opened in a markdown preview.');
  }

  /**
   * Generate HTML for slides using the existing markdown processing pipeline
   */
  private static async generateSlidesHtml(slides: { content: string }[]): Promise<string> {
    const theme = await getTheme(undefined);
    const ext = Extension.getInstance();
    const headerSetting = ext.getSetting<string>(Config.slides.slideHeaderTemplate);
    const footerSetting = ext.getSetting<string>(Config.slides.slideFooterTemplate);

    // Generate slide content HTML
    const slideContents = [];

    let idx = 0;
    const parser = new SlideParser();
    const totalSlides = await Slides.getTotalSlides();

    for (const slide of slides) {
      try {
        const allSlides = parser.parseSlides(slide.content);
        for (const crntSlide of allSlides) {
          const vfile = await transformMarkdown(
            twoColumnFormatting(crntSlide.content),
            undefined,
            undefined,
            undefined,
            [[rehypePrettyCode, { theme: theme ? theme : {} }]],
            undefined,
          );
          let { reactContent } = vfile;

          const slideTheme = crntSlide.frontmatter.theme || SlideTheme.default;
          const layout = crntSlide.frontmatter.customLayout
            ? crntSlide.frontmatter.customLayout
            : crntSlide.frontmatter.layout || SlideLayout.Default;
          const image = crntSlide.frontmatter.image || undefined;
          const video = crntSlide.frontmatter.video || undefined;
          const customTheme = crntSlide.frontmatter.customTheme || undefined;
          const customLayout = crntSlide.frontmatter.customLayout || undefined;
          let headerTemplate = crntSlide.frontmatter.header || undefined;
          let footerTemplate = crntSlide.frontmatter.footer || undefined;

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
            crntSlide.frontmatter.crntSlideIdx = idx + 1;
          }

          if (
            headerTemplate?.includes(`{{totalSlides}}`) ||
            footerTemplate?.includes(`{{totalSlides}}`)
          ) {
            crntSlide.frontmatter.totalSlides = totalSlides;
          }

          if (headerTemplate) {
            headerTemplate = convertTemplateToHtml(headerTemplate, crntSlide.frontmatter);
          }
          if (footerTemplate) {
            footerTemplate = convertTemplateToHtml(footerTemplate, crntSlide.frontmatter);
          }

          let html = renderToString(reactContent);
          if (customLayout) {
            const customLayoutPath = Uri.joinPath(
              PdfExportService.workspaceFolder?.uri as Uri,
              customLayout,
            );
            const customLayoutContent = await readFile(customLayoutPath);

            html = convertTemplateToHtml(customLayoutContent, {
              metadata: { ...crntSlide.frontmatter },
              content: html,
            });
          }

          // Isolate the styles for the custom layout to the slide
          html = html.replace(/<style>/g, `<style type="text/tailwindcss">#slide-${idx + 1} {`);
          html = html.replace(/<\/style>/g, '}</style>');

          slideContents.push({
            html,
            theme: slideTheme,
            layout,
            image,
            video,
            customTheme,
            customLayout,
            headerTemplate,
            footerTemplate,
          });

          idx++;
        }
      } catch (error) {
        Logger.error(`Error processing slide content: ${(error as Error).message}`);

        idx++;
      }
    }

    const extensionPath = Extension.getInstance().extensionPath;
    const exportStyles = await readFile(
      Uri.joinPath(Uri.parse(extensionPath), 'assets', 'styles', 'print.css'),
    );
    const css = await PdfExportService.insertCssVariables(exportStyles);

    let defaultTheme = await ScreenshotService.getThemeCss(SlideTheme.default);
    let minimalTheme = await ScreenshotService.getThemeCss(SlideTheme.minimal);
    let monomiTheme = await ScreenshotService.getThemeCss(SlideTheme.monomi);
    let unnamedTheme = await ScreenshotService.getThemeCss(SlideTheme.unnamed);
    let quantumTheme = await ScreenshotService.getThemeCss(SlideTheme.quantum);
    let frostTheme = await ScreenshotService.getThemeCss(SlideTheme.frost);

    const webcomponentsUrl = Uri.joinPath(
      Uri.parse(extensionPath),
      'out',
      'webcomponents',
      'index.mjs',
    ).toString();

    const customComponents = [];
    const customComponentsUrls = [];
    const extension = Extension.getInstance();
    const webComponents = extension.getSetting<string[]>(Config.webcomponents.scripts);
    const workspaceFolder = extension.workspaceFolder;

    if (webComponents) {
      for (const webComponent of webComponents) {
        if (webComponent.startsWith('http')) {
          customComponentsUrls.push(webComponent);
        } else if (workspaceFolder) {
          const component = await readFile(Uri.joinPath(workspaceFolder.uri, webComponent));
          if (component) {
            customComponents.push(component);
          }
        }
      }
    }

    const customThemes = [];
    const customThemeUrls = [];
    const customTheme = extension.getSetting<string>(Config.slides.customTheme);
    if (customTheme) {
      if (customTheme.startsWith('http')) {
        customThemeUrls.push(customTheme);
      } else if (workspaceFolder) {
        const theme = await readFile(Uri.joinPath(workspaceFolder.uri, customTheme));
        if (theme) {
          customThemes.push(theme);
        }
      }
    }

    // Get workspace title
    const workspaceTitle = workspace.name || 'Demo Time';

    // Get color theme
    const colorTheme = window.activeColorTheme;
    const isDark =
      colorTheme.kind === ColorThemeKind.Dark || colorTheme.kind === ColorThemeKind.HighContrast;

    // Create the HTML document with all slides
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${workspaceTitle}</title>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

    mermaid.initialize({ startOnLoad: true, theme: "${isDark ? 'dark' : 'default'}" });
  </script>
  
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>

  <script src="${webcomponentsUrl}" type="module"></script>

  ${customComponentsUrls.map((url) => `<script type="module" src="${url}"></script>`).join('\n')}
  ${customComponents.map((component) => `<script type="module">${component}</script>`).join('\n')}

  <style type="text/tailwindcss">
  ${css}
  </style>
</head>
<body>
    `;

    // Add each slide as a div
    const allSlides = slideContents.filter((slide) => slide !== undefined);

    let index = 0;

    const slideThemes: { [theme: string]: number[] } = {
      [SlideTheme.default]: [],
      [SlideTheme.minimal]: [],
      [SlideTheme.monomi]: [],
      [SlideTheme.unnamed]: [],
      [SlideTheme.quantum]: [],
      [SlideTheme.frost]: [],
    };

    for (const slide of allSlides) {
      if (slide) {
        const css = await PdfExportService.getCustomTheme(slide.customTheme || '');
        const slideBg =
          slide.image &&
          slide.layout !== SlideLayout.ImageLeft &&
          slide.layout !== SlideLayout.ImageRight
            ? `background-image: url(${slide.image});`
            : ``;

        if (slide.theme === SlideTheme.default) {
          slideThemes.default.push(index + 1);
        } else if (slide.theme === SlideTheme.minimal) {
          slideThemes.minimal.push(index + 1);
        } else if (slide.theme === SlideTheme.monomi) {
          slideThemes.monomi.push(index + 1);
        } else if (slide.theme === SlideTheme.unnamed) {
          slideThemes.unnamed.push(index + 1);
        } else if (slide.theme === SlideTheme.quantum) {
          slideThemes.quantum.push(index + 1);
        } else if (slide.theme === SlideTheme.frost) {
          slideThemes.frost.push(index + 1);
        }

        html += `
<div class="w-full h-full flex items-center justify-center" id="slide-${index + 1}">
${css ? `<style type="text/tailwindcss">#slide-${index + 1} { ${css} }</style>` : ``}

  <div class="slide ${slide.theme.toLowerCase()}" date-theme="${slide.theme.toLowerCase()}" data-layout="${slide.layout.toLowerCase()}" >
    <div class="slide__container">
      <div class="slide__layout ${slide.layout.toLowerCase()}" style="${slideBg}">
        ${slide.headerTemplate ? `<header class="slide__header">${slide.headerTemplate}</header>` : ``}

        ${
          slide.layout === SlideLayout.ImageLeft
            ? `<div class="slide__image_left" style="background-image: url(${slide.image});"></div>`
            : ``
        }
        
        <div class="slide__content">
          <div class="${slide.customLayout ? `slide__content__custom` : `slide__content__inner`}">
            ${slide.html}
          </div>
        </div>
      
        ${
          slide.layout === SlideLayout.ImageRight
            ? `<div class="slide__image_right" style="background-image: url(${slide.image});"></div>`
            : ``
        }

        ${slide.footerTemplate ? `<footer class="slide__footer">${slide.footerTemplate}</footer>` : ``}
      </div>
    </div>
  </div>
</div>`;
      }

      index++;
    }

    // Add the themes to the HTML
    for (const [theme, slides] of Object.entries(slideThemes)) {
      if (slides.length > 0) {
        const slideIds = slides.map((slideIndex) => `#slide-${slideIndex}`).join(', ');

        if (theme === SlideTheme.default) {
          html += `<style type="text/tailwindcss">${slideIds} { ${defaultTheme} }</style>`;
        } else if (theme === SlideTheme.minimal) {
          html += `<style type="text/tailwindcss">${slideIds} { ${minimalTheme} }</style>`;
        } else if (theme === SlideTheme.monomi) {
          html += `<style type="text/tailwindcss">${slideIds} { ${monomiTheme} }</style>`;
        } else if (theme === SlideTheme.unnamed) {
          html += `<style type="text/tailwindcss">${slideIds} { ${unnamedTheme} }</style>`;
        } else if (theme === SlideTheme.quantum) {
          html += `<style type="text/tailwindcss">${slideIds} { ${quantumTheme} }</style>`;
        } else if (theme === SlideTheme.frost) {
          html += `<style type="text/tailwindcss">${slideIds} { ${frostTheme} }</style>`;
        }
      }
    }

    html += `
        ${customThemes ? `<style type="text/tailwindcss">${customThemes}</style>` : ``}
        ${customThemeUrls ? `<link rel="stylesheet" href="${customThemeUrls}">` : ``}
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Generates a PDF file from an HTML file using a Puppeteer page instance.
   *
   * @param page - The Puppeteer `Page` instance used to load the HTML and generate the PDF.
   * @param htmlPath - The file path to the HTML file to be converted into a PDF.
   * @param pdfPath - The file path where the generated PDF will be saved.
   * @returns A promise that resolves to the file path of the generated PDF.
   *
   * @throws Will throw an error if the HTML file cannot be loaded or the PDF generation fails.
   */
  private static async generatePdfFromHtml(
    page: Page,
    htmlPath: string,
    pdfPath: string,
  ): Promise<string> {
    // Load the HTML file
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');
    await page.emulateMedia({ media: 'print' });

    await page.waitForTimeout(5000);

    // Generate the PDF
    await page.pdf({
      path: pdfPath,
      width: '960px',
      height: '540px',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      preferCSSPageSize: true,
    });

    return pdfPath;
  }

  /**
   * Retrieves a custom theme as a string, either from a URL or a local file path.
   *
   * @param themePath - The path or URL to the custom theme. If the path is empty or undefined, the method returns `undefined`.
   * @returns A promise that resolves to the theme's CSS content as a string, or `undefined` if the theme could not be retrieved.
   *
   * @remarks
   * - If the `themePath` starts with "https://", the method fetches the theme from the URL.
   * - If the `themePath` is a local file path, it reads the file content from the workspace folder.
   * - If an error occurs during fetching or reading, an error notification is displayed, and the method returns `undefined`.
   */
  private static async getCustomTheme(themePath: string): Promise<string | undefined> {
    if (!themePath) {
      return undefined;
    }

    if (themePath.startsWith('https://')) {
      const response = await fetch(themePath);
      if (!response.ok) {
        Notifications.error(`Error fetching theme from URL: ${themePath}`);
        return undefined;
      }

      const css = await response.text();
      return css;
    }

    const uri = Uri.joinPath(PdfExportService.workspaceFolder?.uri as Uri, themePath);
    const fileContent = await readFile(uri);
    if (!fileContent) {
      Notifications.error(`Error reading theme file: ${themePath}`);
      return undefined;
    }
    return fileContent;
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
