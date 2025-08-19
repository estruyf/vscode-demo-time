import {
  commands,
  CompletionItem,
  CompletionItemKind,
  Hover,
  languages,
  Uri,
  window,
} from 'vscode';
import { Action, Step, Subscription } from '../models';
import { Extension } from './Extension';
import { COMMAND, Config, General, SlideLayout, SlideTheme, SlideTransition } from '../constants';
import {
  addStepsToDemo,
  chooseDemoFile,
  fileExists,
  getRelPath,
  parseWinPath,
  sanitizeFileName,
  upperCaseFirstLetter,
  writeFile,
} from '../utils';
import { ActionTreeItem } from '../providers/ActionTreeviewProvider';
import { DemoFileProvider } from './DemoFileProvider';
import { Preview } from '../preview/Preview';

export class Slides {
  private static frontmatterRegex = /^---(?:[^\r\n]*\r?\n)+?---/;

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

  private static async viewSlide(item: ActionTreeItem) {
    if (!item || !item.demoFilePath) {
      return;
    }

    const demoFiles = await DemoFileProvider.getFiles();
    if (!demoFiles) {
      return;
    }

    const executingDemos = demoFiles[item.demoFilePath].demos;
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
    Preview.show(getRelPath(parseWinPath(path)));
  }

  private static registerHoverProvider() {
    return languages.registerHoverProvider(
      { language: 'markdown', scheme: 'file' },
      {
        provideHover(document, position) {
          const text = document.getText();
          const frontmatterMatch = Slides.frontmatterRegex.exec(text);

          if (frontmatterMatch) {
            const frontmatterStart = text.indexOf(frontmatterMatch[0]);
            const frontmatterEnd = frontmatterStart + frontmatterMatch[0].length;

            const cursorOffset = document.offsetAt(position);
            if (cursorOffset >= frontmatterStart && cursorOffset <= frontmatterEnd) {
              const line = document.lineAt(position).text.trim();

              if (line.startsWith('theme:')) {
                const themes = Object.values(SlideTheme)
                  .map((theme) => `- \`${theme}\``)
                  .join('\n');
                return new Hover(
                  `Specifies the theme for the slide. Available options:\n${themes}`,
                );
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
              }
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

          // Check if the cursor is within the frontmatter section
          const text = document.getText();
          const frontmatterMatch = Slides.frontmatterRegex.exec(text);

          if (frontmatterMatch) {
            const frontmatterStart = text.indexOf(frontmatterMatch[0]);
            const frontmatterEnd = frontmatterStart + frontmatterMatch[0].length;

            const cursorOffset = document.offsetAt(position);
            if (cursorOffset >= frontmatterStart && cursorOffset <= frontmatterEnd) {
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
              }
            }
          }

          return undefined;
        },
      },
      ':',
      ' ',
    );
  }
}
