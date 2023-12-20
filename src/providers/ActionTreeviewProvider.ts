import { join } from "path";
import {
  Event,
  ProviderResult,
  ThemeColor,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { Extension } from "../services/Extension";

export class ActionTreeviewProvider implements TreeDataProvider<any> {
  onDidChangeTreeData?: Event<TreeItem | null | undefined> | undefined;

  actions: ActionTreeItem[];

  constructor(actions: ActionTreeItem[] = []) {
    this.actions = [...actions];
  }

  getTreeItem(element: ActionTreeItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  getChildren(element?: ActionTreeItem | undefined): ProviderResult<TreeItem[]> {
    return element && (element as any).children
      ? Promise.resolve((element as any).children)
      : Promise.resolve(this.actions);
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
    public stepIndex?: number
  ) {
    super(label, children ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None);

    const ext = Extension.getInstance();
    const extPath = ext.extensionPath;

    this.label = label;
    this.description = description;

    this.iconPath = image
      ? !image.custom
        ? new ThemeIcon(image.name, image.color)
        : {
            light: join(extPath, "assets", "icons", "light", `${image.name}.svg`),
            dark: join(extPath, "assets", "icons", "dark", `${image.name}.svg`),
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
