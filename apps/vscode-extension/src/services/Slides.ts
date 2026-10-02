import {
  commands,
  CompletionItem,
  CompletionItemKind,
  Hover,
  languages,
  MarkdownString,
  Position,
  Range,
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
  getRelPath,
  getSlidePropertyAtLine,
  getSlidePropertyCompletions,
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
  Action,
  Step,
  SlideParser,
  getDemosFromConfig,
  getVisibleSlides,
  isSlideHidden,
  Slide,
  SlidePlaceholders,
  getSlidePropertyMarkdown,
  getSlidePropertyTypeName,
  getSlidePropertyValues,
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
          const lines = document.getText().split(/\r?\n/);
          const match = getSlidePropertyAtLine(lines, position.line);
          if (!match) {
            return undefined;
          }

          return new Hover(
            new MarkdownString(getSlidePropertyMarkdown(match.key, match.property)),
            new Range(position.line, match.start, position.line, match.end),
          );
        },
      },
    );
  }

  private static registerCompletionProvider() {
    return languages.registerCompletionItemProvider(
      { language: 'markdown', scheme: 'file' },
      {
        provideCompletionItems(document, position) {
          const lines = document.getText().split(/\r?\n/);
          const completions = getSlidePropertyCompletions(lines, position.line, position.character);

          if (completions?.type === 'key') {
            return completions.suggestions.map(({ key, property, sortGroup }) => {
              const item = new CompletionItem(
                {
                  label: key,
                  description: property.layouts
                    ? `${property.layouts.join(', ')} layout`
                    : undefined,
                },
                CompletionItemKind.Property,
              );
              item.detail = getSlidePropertyTypeName(property);
              item.documentation = new MarkdownString(getSlidePropertyMarkdown(key, property));
              item.sortText = `${sortGroup}_${key}`;
              item.insertText = `${key}: `;
              if (getSlidePropertyValues(property).length > 0) {
                item.command = { command: 'editor.action.triggerSuggest', title: 'Suggest values' };
              }
              return item;
            });
          }

          if (completions?.type === 'value') {
            const { property, values } = completions;
            return values.map((value, idx) => {
              const item = new CompletionItem(
                value,
                property.type === 'boolean'
                  ? CompletionItemKind.Value
                  : CompletionItemKind.EnumMember,
              );
              item.sortText = `${idx}`.padStart(3, '0');
              if (property.default !== undefined && `${property.default}` === value) {
                item.detail = 'Default';
              }
              return item;
            });
          }

          return undefined;
        },
      },
      ':',
      ' ',
    );
  }
}
