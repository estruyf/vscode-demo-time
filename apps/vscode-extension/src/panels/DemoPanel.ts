import { ThemeColor, TreeItem, TreeView, commands, window } from 'vscode';
import { ContextKeys } from '../constants/ContextKeys';
import { DemoFileProvider } from '../services/DemoFileProvider';
import { Subscription } from '../models';
import { ActionTreeItem, ActionTreeviewProvider } from '../providers/ActionTreeviewProvider';
import { DemoRunner } from '../services/DemoRunner';
import { COMMAND, Action, DemoFileCache, DemoFiles, DemoConfig } from '@demotime/common';
import { parseWinPath, setContext, sortFiles } from '../utils';
import { DemoStatusBar } from '../services/DemoStatusBar';
import { Extension } from '../services/Extension';

export class DemoPanel {
  private static treeView: TreeView<TreeItem>;
  private static demoActionsProvider: ActionTreeviewProvider;
  private static demoFiles: DemoFiles | null | undefined;
  private static executingDemoFile: DemoFileCache;

  public static register() {
    DemoPanel.init();

    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.collapseAll, DemoPanel.collapseAll));
    subscriptions.push(commands.registerCommand(COMMAND.treeviewFind, DemoPanel.find));
  }

  public static get crntExecutingDemoFile(): DemoFileCache {
    return DemoPanel.executingDemoFile;
  }

  public static async find() {
    if (!DemoPanel.treeView) {
      return;
    }

    await DemoPanel.treeView.reveal(undefined as any, { focus: true });
    commands.executeCommand('list.find');
  }

  public static async update() {
    await DemoPanel.setDemoFiles();
    await DemoPanel.setExecutingDemoFile();

    DemoPanel.demoActionsProvider.update();
    DemoStatusBar.update();
  }

  public static updateTitle(title: string) {
    if (this.treeView) {
      this.treeView.title = title;
    }
  }

  public static updateMessage(message?: string) {
    if (this.treeView) {
      this.treeView.message = message;
    }
  }

  /**
   * Retrieves a list of demo commands organized by demo files.
   *
   * @returns {ActionTreeItem[]} An array of `ActionTreeItem` objects representing the demo commands.
   */
  public static getDemos(): ActionTreeItem[] {
    const demoFiles = DemoPanel.demoFiles;
    const executingDemoFile = DemoPanel.executingDemoFile;

    if (!demoFiles) {
      return [];
    }

    const demoKeys = sortFiles(demoFiles);

    const accountCommands: ActionTreeItem[] = [];

    for (const path of demoKeys) {
      const demos = (demoFiles as any)[path] as DemoConfig;

      const crntDemo = DemoRunner.currentDemo;
      const demoSteps = demos.demos.map((demo, idx, allDemos) => {
        let hasExecuted = false;
        if (executingDemoFile?.filePath === path) {
          hasExecuted = !!executingDemoFile.demo.find((d) =>
            d.id ? d.id === demo.id : d.idx === idx,
          );
        }

        let isActive = false;
        if (crntDemo && executingDemoFile?.filePath === path) {
          isActive =
            typeof crntDemo.id !== 'undefined'
              ? crntDemo.id === demo.id
              : crntDemo.title === demo.title;
        }

        let ctxValue = 'demo-time.step';
        if (idx === 0) {
          ctxValue = 'demo-time.firstStep';
        } else if (idx === allDemos.length - 1) {
          ctxValue = 'demo-time.lastStep';
        }

        const hasNotes = demo.notes?.path ? true : false;
        if (hasNotes) {
          ctxValue += ` ${ContextKeys.hasNotes}`;
        }

        if (demo.steps.find((step) => step.action === Action.OpenSlide)) {
          ctxValue += ` ${ContextKeys.isSlide}`;
        }

        // If demo is disabled, visually indicate and disable interaction
        let label = `${idx + 1}. ${demo.title}`;
        let description = demo.description ? demo.description.replace(/\s+/g, ' ') : undefined;
        let icon;
        let command = COMMAND.runStep;
        let disabled = false;
        if (demo.disabled) {
          description = (description ? description + ' ' : '') + '[Disabled]';
          icon = {
            name: 'circle-slash',
            color: new ThemeColor('disabledForeground'),
            custom: false,
          };
          command = '';
          ctxValue += ' demo-time.disabled';
          disabled = true;
        } else {
          // Use normal icons if not disabled
          const icons = { start: 'run', end: 'pass-filled' };
          if (demo.icons?.start) {
            icons.start = demo.icons.start;
          }
          if (demo.icons?.end) {
            icons.end = demo.icons.end;
          }
          icon = {
            name: hasExecuted ? icons.end : icons.start,
            color: hasExecuted
              ? new ThemeColor('notebookStatusSuccessIcon.foreground')
              : new ThemeColor('disabledForeground'),
            custom: false,
          };
        }

        return new ActionTreeItem(
          label,
          description,
          icon,
          undefined,
          command,
          {
            filePath: path,
            idx: idx,
            demo: demo,
          },
          ctxValue,
          undefined,
          parseWinPath(path),
          idx,
          demo.notes?.path,
          demo.title,
          isActive,
          hasExecuted,
          disabled,
          demo.id || undefined,
        );
      });

      accountCommands.push(
        new ActionTreeItem(
          demos.title,
          path.split('/').pop() as string,
          {
            name: executingDemoFile.filePath === path ? 'play-circle' : 'folder',
            custom: false,
            color:
              executingDemoFile.filePath === path
                ? new ThemeColor('notebookStatusSuccessIcon.foreground')
                : undefined,
          },
          undefined,
          undefined,
          undefined,
          'demo-time.file',
          demoSteps.length > 0
            ? demoSteps
            : [new ActionTreeItem('No demo steps defined', '', undefined, undefined, undefined)],
          parseWinPath(path),
        ),
      );
    }

    return accountCommands;
  }

  /**
   * Set the welcome view its context
   */
  public static showWelcome(show = true) {
    setContext(ContextKeys.showWelcome, show);
  }

  /**
   * Initialize the command panel
   */
  public static async init() {
    const demoFiles = await DemoPanel.setDemoFiles();
    if (!demoFiles) {
      DemoPanel.showWelcome();
      return;
    }

    await DemoPanel.setExecutingDemoFile();
    DemoPanel.registerTreeview();
  }

  /**
   * Retrieves the demo files
   * @returns {Promise<boolean>} True if demo files are available, false otherwise
   */
  private static async setDemoFiles(): Promise<boolean> {
    const demoFiles = await DemoFileProvider.getFiles();
    DemoPanel.demoFiles = demoFiles;
    return !!demoFiles;
  }

  /**
   * Retrieves the executing demo file
   */
  private static async setExecutingDemoFile() {
    DemoPanel.executingDemoFile = await DemoRunner.getExecutedDemoFile();
  }

  /**
   * Register all the treeviews
   */
  private static async registerTreeview() {
    DemoPanel.demoActionsProvider = new ActionTreeviewProvider();
    DemoPanel.demoActionsProvider.update();
    this.treeView = window.createTreeView('demo-time', {
      treeDataProvider: DemoPanel.demoActionsProvider,
      showCollapseAll: true,
    });
  }

  /**
   * Collapses all items in the "demo-time" tree view.
   *
   * @private
   */
  private static collapseAll() {
    commands.executeCommand('workbench.actions.treeView.demo-time.collapseAll');
  }
}
