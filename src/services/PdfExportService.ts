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
import { General } from "../constants";

export class PdfExportService {
  private static workspaceFolder: WorkspaceFolder | undefined;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    PdfExportService.init();

    subscriptions.push(commands.registerCommand("demo-time.exportToPdf", PdfExportService.exportToPdf));
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
                content: content,
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
          // await workspace.fs.delete(tempHtmlOutputPath);
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

    throw new Error(
      "Playwright not found. Please install Playwright to export slides to PDF `npm i playwright-chromium -D`."
    );
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
          return {
            html: vfile,
            theme: theme,
          };
        } catch (error) {
          console.error("Error processing slide content:", (error as Error).message);
          return;
        }
      })
    );

    const extensionPath = Extension.getInstance().extensionPath;
    const exportStyles = await readFile(Uri.joinPath(Uri.parse(extensionPath), "assets", "styles", "export.css"));
    const css = await PdfExportService.updateColorsInCss(exportStyles);

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
    slideContents
      .filter((slide) => slide !== undefined)
      .forEach((slide, index) => {
        if (slide) {
          html += `<div class="slide ${slide.theme.toLowerCase()}" id="slide-${index + 1}">
  ${slide.html}
</div>`;
        }
      });

    html += `
      </body>
      </html>
    `;

    return html;
  }

  private static async generatePdfFromHtml(page: Page, htmlPath: string): Promise<void> {
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
  }

  private static async updateColorsInCss(css: string): Promise<string> {
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
