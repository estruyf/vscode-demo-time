import * as vscode from 'vscode';

interface DemoAction {
  title: string;
  command: string;
  args?: any[];
}

export class DemoRunner {
  private static actions: DemoAction[] = [];
  private static currentActionIndex = 0;

  public static registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand('demo-time-lite.start', async () => {
        if (this.actions.length === 0) {
          await this.loadActions();
        }
        this.runNextAction();
      })
    );
  }

  private static async loadActions() {
    // Placeholder for loading actions from a .demo file
    // For now, using dummy actions
    this.actions = [
      { title: 'Show Info Message', command: 'workbench.action.showInformationMessage', args: ['Hello from Demo Time Lite!'] },
      { title: 'Create New Untitled File', command: 'workbench.action.files.newUntitledFile' }
    ];
    this.currentActionIndex = 0;
    vscode.window.showInformationMessage('Demo actions loaded (dummy data)');
  }

  private static runNextAction() {
    if (this.currentActionIndex < this.actions.length) {
      const action = this.actions[this.currentActionIndex];
      vscode.window.showInformationMessage(`Running: ${action.title}`);
      if (action.command) {
        vscode.commands.executeCommand(action.command, ...(action.args || []));
      }
      this.currentActionIndex++;
    } else {
      vscode.window.showInformationMessage('Demo finished!');
      this.actions = []; // Reset actions
      this.currentActionIndex = 0;
    }
  }
}
