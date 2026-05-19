import {
  Event,
  EventEmitter,
  ProviderResult,
  ThemeColor,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';
import { COMMAND } from '@demotime/common';

type QuickAction = {
  label: string;
  description: string;
  icon: string;
  color?: string;
  command: string;
};

export class QuickActionsTreeviewProvider implements TreeDataProvider<QuickActionTreeItem> {
  private isPresentationMode = false;
  private isAutoProceedActive = false;
  private isAutoProceedPaused = false;
  private autoProceedCountdown = 0;
  private _onDidChangeTreeData = new EventEmitter<QuickActionTreeItem | undefined>();
  public readonly onDidChangeTreeData: Event<QuickActionTreeItem | undefined> =
    this._onDidChangeTreeData.event;

  public setPresentationMode(isPresentationMode: boolean): void {
    this.isPresentationMode = isPresentationMode;
  }

  public setAutoProceedState(isActive: boolean, isPaused: boolean, countdown: number): void {
    this.isAutoProceedActive = isActive;
    this.isAutoProceedPaused = isPaused;
    this.autoProceedCountdown = countdown;
  }

  getTreeItem(element: QuickActionTreeItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  getChildren(): ProviderResult<QuickActionTreeItem[]> {
    const presentationAction: QuickAction = this.isPresentationMode
      ? {
          label: 'Stop Presentation Mode',
          description: 'Leave presentation mode',
          icon: 'debug-stop',
          color: 'charts.red',
          command: COMMAND.togglePresentationMode,
        }
      : {
          label: 'Start Presentation Mode',
          description: 'Enter presentation mode',
          icon: 'play',
          color: 'charts.green',
          command: COMMAND.togglePresentationMode,
        };

    const autoProceedAction: QuickAction | null = this.isAutoProceedActive
      ? this.isAutoProceedPaused
        ? {
            label: 'Resume Auto-Proceed',
            description: 'Resume auto-advance countdown',
            icon: 'play-circle',
            color: 'charts.green',
            command: COMMAND.resumeAutoProceed,
          }
        : {
            label: `Pause Auto-Proceed`,
            description: `Next scene in ${this.autoProceedCountdown}s — click to pause`,
            icon: 'debug-pause',
            color: 'charts.yellow',
            command: COMMAND.pauseAutoProceed,
          }
      : null;

    const actions: QuickAction[] = [
      presentationAction,
      ...(autoProceedAction ? [autoProceedAction] : []),
      {
        label: 'Start Timer',
        description: 'Start countdown timer for your session',
        icon: 'watch',
        color: 'charts.yellow',
        command: COMMAND.startCountdown,
      },
      {
        label: 'Open Presenter View',
        description: 'Show presenter notes and controls',
        icon: 'open-preview',
        command: COMMAND.showPresenterView,
      },
      {
        label: 'Reset Demo State',
        description: 'Clear highlights and reset runner state',
        icon: 'discard',
        color: 'charts.orange',
        command: COMMAND.reset,
      },
      {
        label: 'Export Slides to PDF',
        description: 'Export your presentation to a PDF file',
        icon: 'file-pdf',
        command: COMMAND.exportToPdf,
      },
      {
        label: 'Find in Acts & Scenes',
        description: 'Focus and search in the Acts & Scenes tree',
        icon: 'search',
        command: COMMAND.treeviewFind,
      },
      {
        label: 'Create Act File',
        description: 'Create a new act file in the .demo folder',
        icon: 'new-file',
        command: COMMAND.createDemoFile,
      },
      {
        label: 'Open Overview',
        description: 'Open the Demo Time overview panel',
        icon: 'home',
        command: COMMAND.showOverview,
      },
      {
        label: 'Open Settings',
        description: 'Open Demo Time settings panel',
        icon: 'settings-gear',
        command: COMMAND.showSettings,
      },
      {
        label: 'Open PRO Features',
        description: 'Discover or unlock PRO capabilities',
        icon: 'lock',
        color: 'charts.red',
        command: COMMAND.showProFeatures,
      },
      {
        label: 'Open Documentation',
        description: 'Read docs, guides, and references',
        icon: 'book',
        command: COMMAND.documentation,
      },
      {
        label: 'Support the Project',
        description: 'Sponsor Demo Time development',
        icon: 'heart',
        color: 'charts.red',
        command: COMMAND.openSupportTheProject,
      },
    ];

    return actions.map((action) => new QuickActionTreeItem(action));
  }

  update(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

export class QuickActionTreeItem extends TreeItem {
  constructor(action: QuickAction) {
    super(action.label, TreeItemCollapsibleState.None);

    this.label = action.label;
    this.description = action.description;
    this.tooltip = action.description;
    this.iconPath = new ThemeIcon(
      action.icon,
      action.color ? new ThemeColor(action.color) : undefined,
    );
    this.command = {
      command: action.command,
      title: action.label,
    };
    this.contextValue = 'demo-time.quick-action';
  }
}