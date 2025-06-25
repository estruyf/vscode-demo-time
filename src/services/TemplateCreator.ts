import { Uri, WorkspaceFolder, window } from 'vscode';
import { Extension, FileProvider } from '.';
import { writeFile } from '../utils';
import { General, Templates } from '../constants';
import { Notifications } from './Notifications';
import { Action } from '../models';

export class TemplateCreator {
  public static async createTemplate(templateName: string): Promise<void> {
    const included = Templates.includes(templateName);
    if (!included) {
      Notifications.error(`Template "${templateName}" not found.`);
      return;
    }

    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder) {
      Notifications.error('No workspace folder found. Please open a workspace.');
      return;
    }

    // Call the appropriate template method based on the template name
    switch (templateName) {
      case 'Template 1':
        return this.createTemplate1(wsFolder);
      case 'Template 2':
        return this.createTemplate2(wsFolder);
      default:
        Notifications.error(`Template "${templateName}" not implemented.`);
    }
  }

  /**
   * Creates Template 1: Hello World Demo
   * Simple intro with a slide and code highlight
   */
  public static async createTemplate1(wsFolder: WorkspaceFolder): Promise<void> {
    const template = {
      $schema: 'https://demotime.show/demo-time.schema.json',
      title: 'Hello World Demo',
      description: 'Simple intro with a slide and code highlight.',
      version: 2,
      demos: [
        {
          title: 'Show the slide',
          description: 'Show a slide and highlight a function in code.',
          steps: [
            {
              action: 'openSlide',
              path: '.demo/slides/intro-start.md',
            },
          ],
        },
        {
          title: 'Highlight the code',
          description: 'Highlight the `helloWorld` function in the code.',
          steps: [
            {
              action: 'open',
              path: 'index.js',
            },
            {
              action: 'highlight',
              path: 'index.js',
              position: '1:3',
            },
          ],
        },
        {
          title: 'Show the end slide',
          description: 'Show the end slide.',
          steps: [
            {
              action: 'openSlide',
              path: '.demo/slides/intro-end.md',
            },
          ],
        },
      ],
    };

    const demoFile = await FileProvider.createFile(
      'hello-world-demo.json',
      JSON.stringify(template, null, 2),
    );

    const slideContent = `---
theme: default
layout: intro
---

# Hello 👋

Welcome to **Demo Time**!
`;

    await writeFile(
      Uri.joinPath(wsFolder.uri, General.demoFolder, General.slidesFolder, `intro-start.md`),
      slideContent,
    );

    const endSlideContent = `---
theme: default
layout: default
---

## What did we do?

- Opened a slide
- Highlighted the \`helloWorld\` function in the code
- Showed the end slide
`;

    await writeFile(
      Uri.joinPath(wsFolder.uri, General.demoFolder, General.slidesFolder, 'intro-end.md'),
      endSlideContent,
    );

    const jsFileContent = `function sayHello() {
  console.log("Hello, Demo Time!");
}

sayHello();`;

    await writeFile(Uri.joinPath(wsFolder.uri, 'index.js'), jsFileContent);

    if (demoFile) {
      await window.showTextDocument(demoFile);
    }

    Notifications.info('Template 1 created successfully');
  }

  /**
   * Creates Template 2: Advanced Demo
   * Demonstrates opening a slide and adding a function in TypeScript
   */
  public static async createTemplate2(wsFolder: WorkspaceFolder): Promise<void> {
    const template = {
      $schema: 'https://demotime.show/demo-time.schema.json',
      title: 'Advanced Demo: TypeScript Function Walkthrough',
      description:
        'A guided demo showing how to add and highlight a new function in a TypeScript file, with themed slides and VS Code integration.',
      version: 2,
      demos: [
        {
          title: 'Introduction Slide',
          description:
            'Display the opening slide to introduce the advanced demo and set the initial theme.',
          steps: [
            {
              action: Action.SetTheme,
              theme: 'Default Dark Modern',
            },
            {
              action: Action.OpenSlide,
              path: '.demo/slides/advanced-start.md',
            },
          ],
        },
        {
          title: 'Implement multiply() in math.ts',
          description:
            'Switch to a light theme, open math.ts, and highlight where to add the multiply() function. Also, show the file in the explorer.',
          steps: [
            {
              action: Action.SetTheme,
              theme: 'Default Light Modern',
            },
            {
              action: Action.Open,
              path: 'math.ts',
            },
            {
              action: Action.ExecuteVSCodeCommand,
              command: 'workbench.files.action.showActiveFileInExplorer',
            },
            {
              action: Action.Highlight,
              path: 'math.ts',
              startPlaceholder: 'export function add(x: number, y: number): number {',
              endPlaceholder: '}',
            },
          ],
        },
        {
          title: 'Review and Recap',
          description:
            'Show a slide summarizing the steps taken and what was accomplished in the demo.',
          steps: [
            {
              action: Action.SetTheme,
              theme: 'Default Dark Modern',
            },
            {
              action: Action.OpenSlide,
              path: '.demo/slides/advanced-end.md',
            },
          ],
        },
        {
          title: 'Reset Theme',
          description: 'Return the editor theme to its default state to clean up after the demo.',
          steps: [
            {
              action: Action.UnsetTheme,
            },
          ],
        },
      ],
    };

    const demoFile = await FileProvider.createFile(
      'advanced-demo.json',
      JSON.stringify(template, null, 2),
    );

    const slidesFolderUri = Uri.joinPath(wsFolder.uri, General.demoFolder, General.slidesFolder);

    const startSlideContent = `---
theme: default
layout: intro
---

# Advanced Demo 🚀

Let's get started with an advanced demo!
`;

    await writeFile(Uri.joinPath(slidesFolderUri, 'advanced-start.md'), startSlideContent);

    const endSlideContent = `---
theme: default
layout: default
---

## What did we do?

- Opened a slide
- Added a \`multiply()\` function in TypeScript
- Highlighted the new code
- Set a theme for the slide and change it when opening code
- Undo the theme changes at the end
- Trigger a Visual Studio Code command to show the file in the explorer

Great job!
    `;

    await writeFile(Uri.joinPath(slidesFolderUri, 'advanced-end.md'), endSlideContent);

    const mathTsContent = `export function add(x: number, y: number): number {
    return x + y;
}

export function multiply(x: number, y: number): number {
    return x * y;
}
    `;

    await writeFile(Uri.joinPath(wsFolder.uri, 'math.ts'), mathTsContent);

    if (demoFile) {
      await window.showTextDocument(demoFile);
    }
    Notifications.info('Template 2 created successfully');
  }
}
