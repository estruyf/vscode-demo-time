import remarkParse from "remark-parse";
import { SlideTheme } from "../constants/SlideTheme";
import remarkRehype from "remark-rehype";
import remarkFrontmatter from "remark-frontmatter";
import rehypeRaw from "rehype-raw";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { matter } from "vfile-matter";
import { resolve } from "mlly";
import { Notifications } from "./Notifications";
import { Action, Step, Subscription } from "../models";
import { Extension } from "./Extension";
import { FileProvider } from ".";
import { getTheme, readFile, writeFile } from "../utils";
import { commands, Uri, workspace, WorkspaceFolder, window, ProgressLocation } from "vscode";
import { Page } from "playwright-chromium";
import { COMMAND, General, SlideLayout } from "../constants";
import { twoColumnFormatting } from "../preview/utils";

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
      Notifications.error("No workspace folder found.");
      return;
    }

    try {
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: "Exporting slides to PDF",
          cancellable: false,
        },
        async (progress) => {
          const { chromium } = await PdfExportService.getPlaywright();
          const browser = await chromium.launch();
          const context = await browser.newContext();
          const page = await context.newPage();

          // Get all demo files
          const demoFiles = await FileProvider.getFiles();
          if (!demoFiles) {
            Notifications.error("No demo files found.");
            return;
          }

          // Get all slide actions
          const slideActions: Step[] = [];
          for (const demoFile of Object.values(demoFiles)) {
            demoFile.demos.forEach((demo) => {
              demo.steps.forEach((step) => {
                if (step.action === Action.OpenSlide && step.path) {
                  slideActions.push(step);
                }
              });
            });
          }

          // Retrieving slide contents
          progress.report({ message: "Retrieving slide contents..." });
          const slideContents = await Promise.all(
            slideActions.map(async (slideAction) => {
              const slideUri = Uri.joinPath(PdfExportService.workspaceFolder?.uri as Uri, slideAction.path as string);
              const content = await readFile(slideUri);
              return {
                content: twoColumnFormatting(content),
              };
            })
          );

          // Generate HTML for all slides
          progress.report({ message: "Generating HTML for slides..." });
          const html = await PdfExportService.generateSlidesHtml(slideContents);
          const tempHtmlOutputPath = Uri.joinPath(PdfExportService.workspaceFolder?.uri as Uri, General.htmlExportFile);
          await writeFile(tempHtmlOutputPath, html);

          // Convert HTML to PDF
          progress.report({ message: "Converting HTML to PDF..." });
          await PdfExportService.generatePdfFromHtml(page, tempHtmlOutputPath.fsPath);

          // Clean up
          await page.close();
          await context.close();
          await browser.close();
          await workspace.fs.delete(tempHtmlOutputPath);
          Notifications.info("Slides exported to PDF successfully.");
        }
      );
    } catch (error) {
      Notifications.error(`Error exporting slides to PDF: ${(error as Error).message}`);
      return;
    }
  }

  private static async getPlaywright(): Promise<typeof import("playwright-chromium")> {
    try {
      return await import(await resolve("playwright-chromium", { url: PdfExportService.workspaceFolder?.uri.fsPath }));
    } catch {}

    try {
      return await import("playwright-chromium");
    } catch {}

    const markdownContent = `
  # Playwright Not Found

  To export slides to PDF, you need to install Playwright Chromium. Please run the following command in your terminal:

  \`\`\`bash
  npm i playwright-chromium -D
  \`\`\`

  Once installed, try exporting the slides again.
  `;

    const tempMarkdownPath = Uri.joinPath(PdfExportService.workspaceFolder?.uri as Uri, "playwright-instructions.md");
    await writeFile(tempMarkdownPath, markdownContent);

    await commands.executeCommand("markdown.showPreview", tempMarkdownPath);
    throw new Error("Playwright not found. Instructions have been opened in a markdown preview.");
  }

  /**
   * Generate HTML for slides using the existing markdown processing pipeline
   */
  private static async generateSlidesHtml(slides: { content: string }[]): Promise<string> {
    const theme = await getTheme(undefined);

    // Generate slide content HTML
    const slideContents = await Promise.all(
      slides.map(async (slide) => {
        const processor = unified()
          .use(remarkParse)
          .use(remarkRehype, {
            allowDangerousHtml: true,
          })
          .use(rehypeRaw)
          .use(rehypePrettyCode, { theme: theme ? theme : {} })
          .use(remarkFrontmatter)
          .use(rehypeStringify)
          .use(() => (_, file) => {
            try {
              matter(file);
            } catch (err) {
              // Catch error and ignore it
            }
          });

        try {
          const vfile = await processor.process(slide.content);
          const theme = (vfile.data?.matter as any)?.theme || SlideTheme.default;
          const layout = (vfile.data?.matter as any)?.layout || SlideLayout.Default;
          const image = (vfile.data?.matter as any)?.image || undefined;
          const customTheme = (vfile.data?.matter as any)?.customTheme || undefined;

          return {
            html: vfile,
            theme,
            layout,
            image,
            customTheme,
          };
        } catch (error) {
          console.error("Error processing slide content:", (error as Error).message);
          return;
        }
      })
    );

    const extensionPath = Extension.getInstance().extensionPath;
    const exportStyles = await readFile(Uri.joinPath(Uri.parse(extensionPath), "assets", "styles", "print.css"));
    const css = await PdfExportService.insertCssVariables(exportStyles);

    const defaultTheme = await readFile(
      Uri.joinPath(Uri.parse(extensionPath), "assets", "styles", "themes", "default.css")
    );

    const minimalTheme = await readFile(
      Uri.joinPath(Uri.parse(extensionPath), "assets", "styles", "themes", "minimal.css")
    );

    const monomiTheme = await readFile(
      Uri.joinPath(Uri.parse(extensionPath), "assets", "styles", "themes", "monomi.css")
    );

    const unnamedTheme = await readFile(
      Uri.joinPath(Uri.parse(extensionPath), "assets", "styles", "themes", "unnamed.css")
    );

    // Create the HTML document with all slides
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo Time Slides</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>

  <style type="text/tailwindcss">
  ${css}
  </style>
</head>
<body>
    `;

    // Add each slide as a div
    const allSlides = slideContents.filter((slide) => slide !== undefined);

    let index = 0;
    for (const slide of allSlides) {
      if (slide) {
        const css = await PdfExportService.getCustomTheme(slide.customTheme);
        const slideBg =
          slide.image && slide.layout !== SlideLayout.ImageLeft && slide.layout !== SlideLayout.ImageRight
            ? `background-image: url(${slide.image});`
            : ``;

        html += `

<div class="w-full h-full flex items-center justify-center" id="slide-${index + 1}">
${
  slide.theme === SlideTheme.default
    ? `<style type="text/tailwindcss">#slide-${index + 1} { ${defaultTheme} }</style>`
    : ``
}
${
  slide.theme === SlideTheme.minimal
    ? `<style type="text/tailwindcss">#slide-${index + 1} { ${minimalTheme} }</style>`
    : ``
}
${
  slide.theme === SlideTheme.monomi
    ? `<style type="text/tailwindcss">#slide-${index + 1} { ${monomiTheme} }</style>`
    : ``
}
${
  slide.theme === SlideTheme.unnamed
    ? `<style type="text/tailwindcss">#slide-${index + 1} { ${unnamedTheme} }</style>`
    : ``
}
${css ? `<style type="text/tailwindcss">#slide-${index + 1} { ${css} }</style>` : ``}
  <div class="slide ${slide.theme.toLowerCase()}" date-theme="${slide.theme.toLowerCase()}" data-layout="${slide.layout.toLowerCase()}" >
    <div class="slide__container">
      <div class="slide__layout ${slide.layout.toLowerCase()}" style="${slideBg}">
        ${
          slide.layout === SlideLayout.ImageLeft
            ? `<div class="slide__image_left" style="background-image: url(${slide.image});"></div>`
            : ``
        }
        
        <div class="slide__content">
          <div class="slide__content__inner">${slide.html}</div>
        </div>
      
        ${
          slide.layout === SlideLayout.ImageRight
            ? `<div class="slide__image_right" style="background-image: url(${slide.image});"></div>`
            : ``
        }
      </div>
    </div>
  </div>
</div>`;
      }

      index++;
    }

    html += `
      </body>
      </html>
    `;

    return html;
  }

  private static async generatePdfFromHtml(page: Page, htmlPath: string): Promise<string> {
    // Load the HTML file
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.emulateMedia({ media: "print" });

    // Generate the PDF
    const pdfPath = Uri.joinPath(PdfExportService.workspaceFolder?.uri as Uri, General.pdfExportFile).fsPath;
    await page.pdf({
      path: pdfPath,
      width: "960px",
      height: "540px",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
      preferCSSPageSize: true,
    });

    return pdfPath;
  }

  private static async getCustomTheme(themePath: string): Promise<string | undefined> {
    if (!themePath) {
      return undefined;
    }

    if (themePath.startsWith("https://")) {
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

  private static async insertCssVariables(css: string = ""): Promise<string> {
    const theme = await getTheme(undefined);
    if (!theme) {
      return css;
    }

    // Get the color variables from the theme
    const colors = Object.entries(theme.colors).reduce((acc, [key, value]) => {
      acc[key] = value as string;
      return acc;
    }, {} as Record<string, string>);

    // Get the font size and family from the editor settings
    // --vscode-editor-font-size
    const editorFontSize = workspace.getConfiguration("editor").get("fontSize") as number;
    // --vscode-editor-font-family
    const editorFontFamily = workspace.getConfiguration("editor").get("fontFamily") as string;

    // Add the colors to the top of the CSS
    let updatedCss = ":root {\n";
    updatedCss += `  --vscode-editor-font-size: ${editorFontSize}px;\n`;
    updatedCss += `  --vscode-editor-font-family: ${editorFontFamily};\n`;
    for (const [key, value] of Object.entries(colors)) {
      updatedCss += `  --vscode-${key.replace(/\./g, "-")}: ${value};\n`;
    }
    updatedCss += "}\n";
    updatedCss += css;

    return updatedCss;
  }
}
