import { FileType, Uri, window, workspace } from 'vscode';
import { Extension, Notifications } from '../services';
import { General } from '../constants';
import { addStepsToDemo, chooseDemoFile, fileExists, getFileName, readFile, writeFile } from '.';
import { createPatch as createFilePatch } from 'diff';
import { Action, Step } from '../models';
import { Config } from '@demotime/common';

export const createPatch = async () => {
  const activeEditor = window.activeTextEditor;
  if (!activeEditor) {
    return;
  }
  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder) {
    return;
  }

  const text = activeEditor.document.getText();

  // Get all the snapshots
  const snapshotFolderPath = Uri.joinPath(
    wsFolder?.uri,
    General.demoFolder,
    General.snapshotsFolder,
  );
  const files = await workspace.findFiles(
    `**/${General.demoFolder}/${General.snapshotsFolder}/**/*`,
  );

  // Check the type of the file
  const filesOnly = [];
  for (const file of files) {
    const stat = await workspace.fs.stat(file);
    if (stat.type === FileType.File) {
      filesOnly.push(file);
    }
  }

  // Ask the user to select a file
  const options = filesOnly.map((file) => file.path.replace(snapshotFolderPath.path, ''));
  const selectedFile = await window.showQuickPick(options, {
    title: Config.title,
    placeHolder: 'Select a file to compare with',
  });

  if (!selectedFile) {
    return;
  }

  const selectedSnapshotPath = Uri.joinPath(snapshotFolderPath, selectedFile);
  const snapshot = await readFile(selectedSnapshotPath);

  const relFilePath = activeEditor.document.uri.path.replace(wsFolder.uri.path, '');
  const patch = createFilePatch(relFilePath, snapshot, text);

  const fileName = getFileName(activeEditor.document.uri);
  if (!fileName) {
    return;
  }

  // Remove the extension from the file name
  const fileParts = fileName.split('.');
  fileParts.pop();
  let patchName: string | undefined = fileParts.join('.');

  patchName = await window.showInputBox({
    prompt: 'Enter the name of the patch',
    value: patchName,
    ignoreFocusOut: true,
    title: Config.title,
    validateInput: async (value) => {
      value = `${value}.patch`;
      const newFilePath = Uri.joinPath(
        wsFolder.uri,
        General.demoFolder,
        General.patchesFolder,
        value,
      );
      if (await fileExists(newFilePath)) {
        return `Patch with name "${value}" already exists`;
      }
      return null;
    },
  });

  if (!patchName) {
    Notifications.error('Snapshot name is required');
    return;
  }

  patchName = `${patchName}.patch`;
  const patchFilePath = Uri.joinPath(
    wsFolder.uri,
    General.demoFolder,
    General.patchesFolder,
    patchName,
  );
  await writeFile(patchFilePath, patch);
  Notifications.info(`Patch ${patchName} created`);

  // Ask the user if they want to create a new demo starting from this file
  const createDemo = await window.showInformationMessage(
    'Do you want to create a demo step with this patch?',
    { modal: true },
    'Yes',
  );

  if (!createDemo) {
    return;
  }

  const demoFile = await chooseDemoFile();
  if (!demoFile) {
    return;
  }

  const version = demoFile.demo.version || 1;

  const contentPath =
    version === 2
      ? patchFilePath.path.replace(wsFolder.uri.path, '')
      : patchFilePath.path.replace(Uri.joinPath(wsFolder.uri, General.demoFolder).path, '');

  const patchPath =
    version === 2
      ? patchFilePath.path.replace(wsFolder.uri.path, '')
      : patchFilePath.path.replace(Uri.joinPath(wsFolder.uri, General.demoFolder).path, '');

  const steps: Step[] = [
    {
      action: Action.ApplyPatch,
      path: relFilePath,
      contentPath,
      patch: patchPath,
    },
    {
      action: Action.Open,
      path: relFilePath,
    },
  ];

  await addStepsToDemo(steps, demoFile);
};
