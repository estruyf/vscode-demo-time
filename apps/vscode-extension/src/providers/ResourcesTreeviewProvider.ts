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
import { SponsorService } from '../services';

export class ResourcesTreeviewProvider implements TreeDataProvider<ResourceTreeItem> {
  private _onDidChangeTreeData = new EventEmitter<ResourceTreeItem | undefined>();
  public readonly onDidChangeTreeData: Event<ResourceTreeItem | undefined> =
    this._onDidChangeTreeData.event;

  getTreeItem(element: ResourceTreeItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  async getChildren(): Promise<ResourceTreeItem[]> {
    const resources: ResourceTreeItem[] = [
      new ResourceTreeItem(
        'Documentation',
        'Learn how to use Demo Time',
        {
          name: 'book',
          custom: false,
          color: new ThemeColor('symbolIcon.textForeground'),
        },
        COMMAND.documentation,
      ),
      new ResourceTreeItem(
        'Support Demo Time',
        'Sponsor the project ❤️',
        {
          name: 'heart',
          custom: false,
          color: new ThemeColor('charts.red'),
        },
        COMMAND.openSupportTheProject,
      ),
      new ResourceTreeItem(
        'Remote Control (PWA)',
        'Control your demos remotely',
        {
          name: 'device-mobile',
          custom: false,
          color: new ThemeColor('symbolIcon.variableForeground'),
        },
        COMMAND.openRemoteControl,
      ),
      new ResourceTreeItem(
        'PowerPoint Add-in',
        'Trigger demos from PowerPoint',
        {
          name: 'file-media',
          custom: false,
          color: new ThemeColor('symbolIcon.functionForeground'),
        },
        COMMAND.openPowerPointAddin,
      ),
    ];

    let isSponsor = false;
    try {
      isSponsor = SponsorService.getSponsorStatus();
    } catch {}
    if (isSponsor) {
      resources.unshift(
        new ResourceTreeItem(
          'Analytics Dashboard',
          'View your presentation analytics',
          {
            name: 'graph',
            custom: false,
            color: new ThemeColor('charts.blue'),
          },
          COMMAND.analyticsDashboard,
        ),
      );
    } else {
      resources.unshift(
        new ResourceTreeItem(
          'Get PRO Features',
          'Unlock all Demo Time features',
          {
            name: 'lock',
            custom: false,
            color: new ThemeColor('charts.red'),
          },
          COMMAND.showProFeatures,
        ),
      );
    }

    return resources;
  }

  update(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

export class ResourceTreeItem extends TreeItem {
  constructor(
    label: string,
    description: string,
    image: { name: string; custom: boolean; color?: ThemeColor },
    public commandId: string,
  ) {
    super(label, TreeItemCollapsibleState.None);

    this.label = label;
    this.description = description;
    this.tooltip = description;
    this.iconPath = new ThemeIcon(image.name, image.color);
    this.command = {
      command: commandId,
      title: label,
    };
    this.contextValue = 'demo-time.resource';
  }
}
