import { TreeView, window } from 'vscode';
import {
  QuickActionsTreeviewProvider,
  QuickActionTreeItem,
} from '../providers/QuickActionsTreeviewProvider';

export class QuickActionsPanel {
  private static treeView: TreeView<QuickActionTreeItem>;
  private static quickActionsProvider: QuickActionsTreeviewProvider;

  public static register() {
    QuickActionsPanel.quickActionsProvider = new QuickActionsTreeviewProvider();
    QuickActionsPanel.treeView = window.createTreeView('demo-time-quick-actions', {
      treeDataProvider: QuickActionsPanel.quickActionsProvider,
    });
  }

  public static update() {
    QuickActionsPanel.quickActionsProvider.update();
  }

  public static updatePresentationMode(isPresentationMode: boolean) {
    QuickActionsPanel.quickActionsProvider.setPresentationMode(isPresentationMode);
    QuickActionsPanel.quickActionsProvider.update();
  }

  public static updateAutoProceed(isActive: boolean, isPaused: boolean, countdown: number) {
    QuickActionsPanel.quickActionsProvider.setAutoProceedState(isActive, isPaused, countdown);
    QuickActionsPanel.quickActionsProvider.update();
  }
}