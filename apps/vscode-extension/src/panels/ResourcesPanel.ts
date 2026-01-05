import { TreeView, window } from 'vscode';
import {
  ResourcesTreeviewProvider,
  ResourceTreeItem,
} from '../providers/ResourcesTreeviewProvider';

export class ResourcesPanel {
  private static treeView: TreeView<ResourceTreeItem>;
  private static resourcesProvider: ResourcesTreeviewProvider;

  public static register() {
    ResourcesPanel.resourcesProvider = new ResourcesTreeviewProvider();
    ResourcesPanel.treeView = window.createTreeView('demo-time-resources', {
      treeDataProvider: ResourcesPanel.resourcesProvider,
    });
  }

  public static update() {
    ResourcesPanel.resourcesProvider.update();
  }
}
