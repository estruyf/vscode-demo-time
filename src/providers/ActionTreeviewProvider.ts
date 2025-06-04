import {
  Event,
  EventEmitter,
  ProviderResult,
  ThemeColor,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
} from 'vscode';
import { Extension } from '../services/Extension';
import { DemoPanel } from '../panels/DemoPanel';

export class ActionTreeviewProvider implements TreeDataProvider<any> {
  private _onDidChangeTreeData = new EventEmitter<TreeItem | undefined>();
  public readonly onDidChangeTreeData: Event<TreeItem | undefined> =
    this._onDidChangeTreeData.event;

  actions: ActionTreeItem[];

  constructor() {
    this.actions = DemoPanel.getDemos();
  }

  getParent(element: ActionTreeItem) {
    if (element) {
      return Promise.resolve(element);
    }
    return Promise.resolve(undefined);
  }

  getTreeItem(element: ActionTreeItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  getChildren(element?: ActionTreeItem): ProviderResult<TreeItem[]> {
    return element && (element as any).children
      ? Promise.resolve((element as any).children)
      : Promise.resolve(this.actions);
  }

  update(): void {
    this.actions = DemoPanel.getDemos();
    this._onDidChangeTreeData.fire(undefined);
  }
}

export class ActionTreeItem extends TreeItem {
  constructor(
    label: string,
    description?: string,
    image?: { name: string; custom: boolean; color?: ThemeColor },
    collapsibleState?: TreeItemCollapsibleState,
    command?: any,
    args?: any,
    contextValue?: string,
    private children?: ActionTreeItem[],
    public demoFilePath?: string,
    public stepIndex?: number,
    public notes?: string,
    public originalLabel?: string,
    public isActive?: boolean,
  ) {
    super(label, children ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None);

    const ext = Extension.getInstance();
    const extPath = ext.extensionPath;

    this.label = label;
    this.description = `${isActive ? `←` : ``} ${description || ''}`;
    this.tooltip = description || label;

    this.iconPath = image
      ? !image.custom
        ? new ThemeIcon(image.name, image.color)
        : {
            light: Uri.joinPath(Uri.file(extPath), 'assets', 'icons', 'light', `${image.name}.svg`)
              .fsPath,
            dark: Uri.joinPath(Uri.file(extPath), 'assets', 'icons', 'dark', `${image.name}.svg`)
              .fsPath,
          }
      : undefined;

    this.command = command
      ? {
          command: command,
          title: label,
          arguments: [args],
        }
      : undefined;

    this.contextValue = contextValue;

    this.children = children;
  }
}
