import { commands, Uri, workspace, WorkspaceFolder } from 'vscode';
import { Notifications } from './Notifications';
import { Step } from '@demotime/common';

export class FileActionService {
  /**
   * Opens the specified file in the editor using the VS Code command API.
   *
   * @param fileUri - The URI of the file to open.
   * @returns A promise that resolves when the file has been opened.
   */
  public static async open(fileUri: Uri, focusToTop: boolean = true): Promise<void> {
    await commands.executeCommand('vscode.open', fileUri);
    if (focusToTop) {
      await commands.executeCommand('revealLine', { lineNumber: 0, at: 'top' });
    }
  }

  /**
   * Copies a file from the specified URI to a new destination within the workspace folder.
   *
   * @param workspaceFolder - The workspace folder where the file will be copied.
   * @param fileUri - The URI of the file to be copied.
   * @param step - The step object containing the destination path.
   * @returns A promise that resolves when the copy operation is complete.
   * @throws Will throw an error if the destination is not specified or if the copy operation fails.
   */
  public static async copy(
    workspaceFolder: WorkspaceFolder,
    fileUri: Uri,
    step: Step,
  ): Promise<void> {
    if (!step.dest) {
      Notifications.error('No destination specified');
      return;
    }

    try {
      const newUri = Uri.joinPath(workspaceFolder.uri, step.dest);
      await workspace.fs.copy(fileUri, newUri, { overwrite: !!step.overwrite });
    } catch (error) {
      Notifications.error((error as Error).message);
    }
  }

  /**
   * Renames a file within the specified workspace folder.
   *
   * @param workspaceFolder - The workspace folder containing the file to be renamed.
   * @param fileUri - The URI of the file to be renamed.
   * @param step - The step containing the destination path for the renamed file.
   * @returns A promise that resolves when the file has been renamed.
   *
   * @throws Will throw an error if the destination is not specified or if the rename operation fails.
   */
  public static async rename(
    workspaceFolder: WorkspaceFolder,
    fileUri: Uri,
    step: Step,
  ): Promise<void> {
    if (!step.dest) {
      Notifications.error('No destination specified');
      return;
    }

    try {
      const newUri = Uri.joinPath(workspaceFolder.uri, step.dest);
      await workspace.fs.rename(fileUri, newUri, { overwrite: !!step.overwrite });
    } catch (error) {
      Notifications.error((error as Error).message);
    }
  }

  /**
   * Deletes a file from the given workspace folder.
   *
   * @param fileUri - The URI of the file to be deleted.
   * @returns A promise that resolves when the file has been deleted.
   * @throws Will throw an error if the file deletion fails.
   */
  public static async delete(fileUri: Uri): Promise<void> {
    try {
      await workspace.fs.delete(fileUri);
    } catch (error) {
      Notifications.error((error as Error).message);
    }
  }
}
