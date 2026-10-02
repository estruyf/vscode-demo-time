import {
  commands,
  CompletionItem,
  CompletionItemKind,
  Hover,
  languages,
  Position,
  Range,
  TextDocument,
  Uri,
  window,
  workspace,
  WorkspaceEdit,
  WorkspaceFolder,
} from 'vscode';
import { Subscription } from '../models';
import { Extension } from './Extension';
import { General } from '../constants';
import {
  addStepsToDemo,
  chooseDemoFile,
  fileExists,
  getAbsolutePath,
  getFrontmatterRange,
  getRelPath,
  isPathInWorkspace,
  parseWinPath,
  readFile,
  sanitizeFileName,
  setSlideHidden,
  setSlideNotes,
  upperCaseFirstLetter,
  writeFile,
} from '../utils';
import { ActionTreeItem } from '../providers/ActionTreeviewProvider';
import { DemoFileProvider } from './DemoFileProvider';
import { SlidePreviewSync } from './SlidePreviewSync';
import { Notifications } from './Notifications';
import { Preview } from '../preview/Preview';
import {
  COMMAND,
  Config,
  SlideLayout,
  SlideTheme,
  SlideTransition,
  Action,
  Step,
  SlideParser,
  getDemosFromConfig,
  getVisibleSlides,
  isSlideHidden,
  Slide,
  SlidePlaceholders,
} from '@demotime/common';

export class Slides {
  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(commands.registerCommand(COMMAND.createSlide, Slides.createSlide));
    subscriptions.push(commands.registerCommand(COMMAND.viewSlide, Slides.viewSlide));
    subscriptions.push(commands.registerCommand(COMMAND.openSlidePreview, Slides.openSlidePreview));

    subscriptions.push(Slides.registerCompletionProvider());
    subscriptions.push(Slides.registerHoverProvider());
  }

  public static async createSlide() {
    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder) {
      return;
    }

    const slideTitle = await window.showInputBox({
      title: Config.title,
      placeHolder: 'What is the title of the slide?',
      validateInput: async (value) => {
        if (!value) {
          return 'File name is required';
        }

        const newFilePath = Uri.joinPath(
          wsFolder.uri,
          General.demoFolder,
          General.slidesFolder,
          sanitizeFileName(value, '.md'),
        );
        if (await fileExists(newFilePath)) {
          return `Slide with name "${value}" already exists`;
        }
        return null;
      },
    });

    if (!slideTitle) {
      return;
    }

    const filePath = Uri.joinPath(
      wsFolder.uri,
      General.demoFolder,
      General.slidesFolder,
      `${sanitizeFileName(slideTitle, '.md')}`,
    );

    // Ask for the layout type
    const layout = await window.showQuickPick(
      Object.values(SlideLayout).map((v) => upperCaseFirstLetter(v)),
      {
        title: Config.title,
        placeHolder: 'Select a layout for the slide',
      },
    );

    if (!layout) {
      return;
    }

    const content = `---
theme: default
layout: ${layout.toLowerCase()}
---

# ${slideTitle}`;

    await writeFile(filePath, content);

    await window.showTextDocument(filePath);

    const addStep = await window.showInformationMessage(
      `Slide "${slideTitle}" created. Do you want to add it as a new step to the demo?`,
      { modal: true },
      'Yes',
    );

    if (!addStep) {
      return;
    }

    const relFilePath = filePath.path.replace(wsFolder.uri.path, '');
    const steps: Step[] = [
      {
        action: Action.OpenSlide,
        path: relFilePath,
      },
    ];

    const demoFile = await chooseDemoFile();
    await addStepsToDemo(steps, demoFile, slideTitle, '', {
      start: 'vm',
      end: 'pass-filled',
    });
  }

  /**
   * Counts the slides of all act files. Hidden slides (`hide: true`) are not counted.
   */
  public static async getTotalSlides(): Promise<number> {
    // Get all act files and count all slides
    const demoFiles = await DemoFileProvider.getFiles();
    let totalSlides = 0;
    if (demoFiles) {
      for (const demoFile of Object.values(demoFiles)) {
        const demos = getDemosFromConfig(demoFile as any);
        for (const demo of demos) {
          for (const step of demo.steps) {
            if (step.action === 'openSlide' && step.path) {
              try {
                // Read file content
                let fileUri;
                const wsFolder = Extension.getInstance().workspaceFolder;
                if (wsFolder) {
                  fileUri = Uri.joinPath(wsFolder.uri, step.path);

                  // Verify the resolved path is contained within the workspace
                  if (!isPathInWorkspace(fileUri, wsFolder)) {
                    totalSlides++; // Count as 1 slide fallback for invalid paths
                    continue;
                  }
                } else {
                  fileUri = Uri.file(step.path);
                }
                const fileContent = await readFile(fileUri);
                if (fileContent) {
                  // Parse slides from markdown content
                  const parser = new SlideParser();
                  const slides = parser.parseSlides(fileContent);
                  totalSlides += getVisibleSlides(slides).length;
                }
              } catch {
                // If file can't be read, count as 1 slide fallback
                totalSlides++;
              }
            }
          }
        }
      }
    }
    return totalSlides;
  }

  /**
   * Gets the values of the header and footer placeholders that don't come from the front matter:
   * the slide number over all acts, the total number of slides, the act and scene that open the
   * slide, and the presentation title. Hidden slides (`hide: true`) are not counted and have no
   * slide number.
   * @param filePath Relative file path to the slide markdown file
   * @param localSlideIdx Local slide index (0-based)
   * @param scene The scene that opened the slide. When more scenes open the same file, this one is
   * used for `sceneTitle` and `actTitle`.
   */
  public static async getSlidePlaceholders(
    filePath: string,
    localSlideIdx: number,
    scene?: { id?: string; title?: string },
  ): Promise<SlidePlaceholders> {
    // The preview sends a webview URL, which can have encoded characters like `%20`
    try {
      filePath = decodeURIComponent(filePath);
    } catch {
      // Keep the path as is
    }
    filePath = parseWinPath(filePath);
    const demoFiles = await DemoFileProvider.getFiles();
    const wsFolder = Extension.getInstance().workspaceFolder;

    let totalSlides = 0;
    let crntSlideIdx: number | null = null;
    // The first move that opens the file gives the slide number
    let isNumbered = false;
    let match: { actTitle?: string; sceneTitle?: string; isScene: boolean } | undefined;

    for (const demoFile of Object.values(demoFiles || {})) {
      const demos = getDemosFromConfig(demoFile as any);
      for (const demo of demos) {
        for (const step of demo.steps) {
          if (step.action !== Action.OpenSlide || !step.path) {
            continue;
          }

          const stepPath = parseWinPath(step.path).replace(/^\.\//, '');
          const isFile =
            filePath === stepPath ||
            filePath.endsWith(`/${stepPath}`) ||
            filePath === parseWinPath(step.path);
          if (isFile) {
            const isScene =
              !!scene &&
              (scene.id ? scene.id === demo.id : !!scene.title && scene.title === demo.title);
            if (!match || (isScene && !match.isScene)) {
              match = { actTitle: (demoFile as any)?.title, sceneTitle: demo.title, isScene };
            }
          }

          const slides = await Slides.readSlides(step.path, wsFolder);
          if (!slides) {
            // Count as one slide when the file can't be read
            if (isFile && localSlideIdx === 0 && !isNumbered) {
              crntSlideIdx = totalSlides + 1;
              isNumbered = true;
            }
            totalSlides++;
            continue;
          }

          for (let i = 0; i < slides.length; i++) {
            const hidden = isSlideHidden(slides[i]);
            if (isFile && i === localSlideIdx && !isNumbered) {
              crntSlideIdx = hidden ? null : totalSlides + 1;
              isNumbered = true;
            }
            if (!hidden) {
              totalSlides++;
            }
          }
        }
      }
    }

    const presentationTitle =
      Extension.getInstance().getSetting<string>(Config.slides.presentationTitle) || wsFolder?.name;

    return {
      crntSlideIdx,
      totalSlides,
      actTitle: match?.actTitle,
      sceneTitle: match?.sceneTitle,
      presentationTitle,
    };
  }

  /**
   * Reads and parses the slides of an `openSlide` move.
   * @returns The slides, or `undefined` when the path is outside the workspace or can't be read
   */
  private static async readSlides(
    path: string,
    wsFolder: WorkspaceFolder | null | undefined,
  ): Promise<Slide[] | undefined> {
    let fileUri;
    if (wsFolder) {
      fileUri = Uri.joinPath(wsFolder.uri, path);

      // Verify the resolved path is contained within the workspace
      if (!isPathInWorkspace(fileUri, wsFolder)) {
        return undefined;
      }
    } else {
      fileUri = Uri.file(path);
    }

    try {
      const fileContent = await readFile(fileUri);
      if (!fileContent) {
        return undefined;
      }
      return new SlideParser().parseSlides(fileContent);
    } catch {
      return undefined;
    }
  }

  /**
   * Adds or removes `hide: true` in the frontmatter of a slide and saves the file, which updates
   * the slide preview.
   * @param filePath Relative file path to the slide markdown file
   * @param slideIndex Local slide index (0-based)
   * @param hidden Whether the slide should be hidden
   */
  public static async setSlideHidden(filePath: string, slideIndex: number, hidden: boolean) {
    await Slides.updateSlideFile(filePath, (content) => {
      const newContent = setSlideHidden(content, slideIndex, hidden);
      if (newContent === undefined) {
        Notifications.error(`Slide ${slideIndex + 1} was not found in "${filePath}".`);
      }
      return newContent;
    });
  }

  /**
   * Sets the `<!-- notes ... -->` block of a slide and saves the file, which updates the slide
   * preview.
   * @param filePath Relative file path to the slide markdown file
   * @param slideIndex Local slide index (0-based)
   * @param notes The speaker notes, empty to remove them
   */
  public static async setSlideNotes(filePath: string, slideIndex: number, notes: string) {
    await Slides.updateSlideFile(filePath, (content) => {
      const newContent = setSlideNotes(content, slideIndex, notes);
      if (newContent === undefined) {
        Notifications.error(
          `The notes of slide ${slideIndex + 1} in "${filePath}" could not be updated.`,
        );
      }
      return newContent;
    });
  }

  /**
   * Updates a slide file with the content returned by `update`, and saves it.
   */
  private static async updateSlideFile(
    filePath: string,
    update: (content: string) => string | undefined,
  ) {
    const fileUri = getAbsolutePath(parseWinPath(filePath));
    const document = await workspace.openTextDocument(fileUri);
    const crntContent = document.getText();
    const newContent = update(crntContent);
    if (newContent === undefined) {
      return;
    }

    if (newContent === crntContent) {
      return;
    }

    // Only replace the changed lines, so an open editor keeps its cursor and scroll position
    const crntLines = crntContent.split(/\r?\n/);
    const newLines = newContent.split(/\r?\n/);
    let startLine = 0;
    while (
      startLine < crntLines.length &&
      startLine < newLines.length &&
      crntLines[startLine] === newLines[startLine]
    ) {
      startLine++;
    }
    let crntEnd = crntLines.length;
    let newEnd = newLines.length;
    while (
      crntEnd > startLine &&
      newEnd > startLine &&
      crntLines[crntEnd - 1] === newLines[newEnd - 1]
    ) {
      crntEnd--;
      newEnd--;
    }

    const edit = new WorkspaceEdit();
    if (crntEnd < crntLines.length) {
      const eol = crntContent.includes('\r\n') ? '\r\n' : '\n';
      edit.replace(
        fileUri,
        new Range(new Position(startLine, 0), new Position(crntEnd, 0)),
        newLines
          .slice(startLine, newEnd)
          .map((line) => `${line}${eol}`)
          .join(''),
      );
    } else {
      // The last line changed
      edit.replace(
        fileUri,
        new Range(document.positionAt(0), document.positionAt(crntContent.length)),
        newContent,
      );
    }
    await workspace.applyEdit(edit);
    await document.save();
  }

  private static async viewSlide(item: ActionTreeItem) {
    if (!item || !item.demoFilePath) {
      return;
    }

    const demoFiles = await DemoFileProvider.getFiles();
    if (!demoFiles) {
      return;
    }

    const executingDemos = getDemosFromConfig(demoFiles[item.demoFilePath] as any);
    const crntDemo = executingDemos.find((_, idx) => idx === item.stepIndex);
    if (!crntDemo) {
      return;
    }

    const slidePath = crntDemo.steps.find((step) => step.action === Action.OpenSlide)?.path;
    if (!slidePath) {
      return;
    }

    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder) {
      return;
    }

    const slideUri = Uri.joinPath(wsFolder.uri, slidePath);
    const slideExists = await fileExists(slideUri);
    if (!slideExists) {
      return;
    }

    await window.showTextDocument(slideUri);
  }

  private static async openSlidePreview() {
    const editor = window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
      return;
    }

    const path = editor.document.uri.fsPath;
    // Opens at the slide under the cursor; `show` takes a 1-based slide number
    const slideIndex = SlidePreviewSync.getCursorSlideIndex(editor);
    Preview.show(
      getRelPath(parseWinPath(path)),
      undefined,
      slideIndex !== undefined ? slideIndex + 1 : undefined,
    );
  }

  private static registerHoverProvider() {
    return languages.registerHoverProvider(
      { language: 'markdown', scheme: 'file' },
      {
        provideHover(document, position) {
          if (Slides.isInFrontmatter(document, position)) {
            const line = document.lineAt(position).text.trim();

            if (line.startsWith('theme:')) {
              const themes = Object.values(SlideTheme)
                .map((theme) => `- \`${theme}\``)
                .join('\n');
              return new Hover(`Specifies the theme for the slide. Available options:\n${themes}`);
            } else if (line.startsWith('layout:')) {
              const layouts = Object.values(SlideLayout)
                .map((layout) => `- \`${layout}\``)
                .join('\n');
              return new Hover(
                `Specifies the layout for the slide. Available options:\n${layouts}`,
              );
            } else if (line.startsWith('customTheme:')) {
              return new Hover(
                'Specifies a custom theme for the slide. Provide a relative path or URL to a CSS file.',
              );
            } else if (line.startsWith('image:')) {
              return new Hover(
                'Specifies the image URL or path for the slide. Provide a relative path to the image file.',
              );
            } else if (line.startsWith('customLayout:')) {
              return new Hover(
                'Specifies a custom layout for the slide. Provide a relative path to the Handlebars template.',
              );
            } else if (line.startsWith('transition:')) {
              const transitions = Object.values(SlideTransition)
                .map((transition) => `- \`${transition}\``)
                .join('\n');
              return new Hover(
                `Specifies the transition for the slide. Available options:\n${transitions}`,
              );
            } else if (line.startsWith('autoAdvanceAfter:')) {
              return new Hover(
                `Specifies the time (in seconds) to wait before advancing to the next slide.`,
              );
            } else if (line.startsWith('hide:')) {
              return new Hover(
                'Hides the slide while presenting. Hidden slides are skipped by navigation and not counted in the slide numbers, but you can still open them from the slide navigator.',
              );
            } else if (line.startsWith('progress:')) {
              return new Hover(
                'Shows or hides the progress bar on the slide, overriding the `demoTime.slideProgressBar` setting. Use `true`, `false`, `top` or `bottom`.',
              );
            }
          }

          return undefined;
        },
      },
    );
  }

  private static registerCompletionProvider() {
    return languages.registerCompletionItemProvider(
      { language: 'markdown', scheme: 'file' },
      {
        provideCompletionItems(document, position) {
          const linePrefix = document.lineAt(position).text.substring(0, position.character);

          // Check if the cursor is within a frontmatter block
          if (Slides.isInFrontmatter(document, position)) {
            if (!linePrefix.includes(':')) {
              // Provide suggestions for frontmatter keys
              return [
                new CompletionItem(
                  {
                    label: 'image',
                    description: 'Image URL or path',
                  },
                  CompletionItemKind.Property,
                ),
                new CompletionItem(
                  {
                    label: 'theme',
                    description: 'Theme for the slide',
                  },
                  CompletionItemKind.Property,
                ),
                new CompletionItem(
                  {
                    label: 'layout',
                    description: 'Layout for the slide',
                  },
                  CompletionItemKind.Property,
                ),
                new CompletionItem(
                  {
                    label: 'customTheme',
                    description: 'Relative path or URL to a CSS file for custom theme',
                  },
                  CompletionItemKind.Property,
                ),
                new CompletionItem(
                  {
                    label: 'customLayout',
                    description: 'Relative path to the Handlebars template',
                  },
                  CompletionItemKind.Property,
                ),
                new CompletionItem(
                  {
                    label: 'transition',
                    description: 'Transition for the slide',
                  },
                  CompletionItemKind.Property,
                ),
                new CompletionItem(
                  {
                    label: 'autoAdvanceAfter',
                    description:
                      'Time in seconds to wait before advancing to the next slide or demo',
                  },
                  CompletionItemKind.Property,
                ),
                new CompletionItem(
                  {
                    label: 'hide',
                    description: 'Skip the slide while presenting',
                  },
                  CompletionItemKind.Property,
                ),
                new CompletionItem(
                  {
                    label: 'progress',
                    description: 'Show or hide the progress bar',
                  },
                  CompletionItemKind.Property,
                ),
              ];
            } else if (linePrefix.startsWith('theme:')) {
              return Object.values(SlideTheme).map((theme) => {
                return new CompletionItem(theme, CompletionItemKind.EnumMember);
              });
            } else if (linePrefix.startsWith('layout:')) {
              return Object.values(SlideLayout).map((layout) => {
                return new CompletionItem(layout, CompletionItemKind.EnumMember);
              });
            } else if (linePrefix.startsWith('transition:')) {
              return Object.values(SlideTransition).map((transition) => {
                return new CompletionItem(transition, CompletionItemKind.EnumMember);
              });
            } else if (linePrefix.startsWith('hide:')) {
              return ['true', 'false'].map((value) => {
                return new CompletionItem(value, CompletionItemKind.Value);
              });
            } else if (linePrefix.startsWith('progress:')) {
              return ['true', 'false', 'top', 'bottom'].map((value) => {
                return new CompletionItem(value, CompletionItemKind.Value);
              });
            }
          }

          return undefined;
        },
      },
      ':',
      ' ',
    );
  }

  /**
   * Checks if the position is inside the document frontmatter or the frontmatter of any slide
   */
  private static isInFrontmatter(document: TextDocument, position: Position) {
    const lines = document.getText().split(/\r?\n/);
    return !!getFrontmatterRange(lines, position.line);
  }
}
