import { Uri, window } from 'vscode';
import { Config, General, Templates } from '../constants';
import { Extension, FileProvider, TemplateCreator } from '../services';
import { sanitizeFileName } from './sanitizeFileName';
import { fileExists } from './fileExists';

export const createDemoFile = async (openFile = false) => {
  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder) {
    return;
  }

  const option = await window.showQuickPick(
    [
      'Create empty demo file',
      ...Templates.map((template) => `Create demo file from template: ${template}`),
    ],
    {
      title: 'Select how to create the demo file',
      placeHolder: 'Choose an option',
    },
  );

  if (!option) {
    return;
  }

  if (option !== 'Create empty demo file') {
    const templateName = option.replace('Create demo file from template: ', '');
    const template = Templates.find((t) => t === templateName);
    if (!template) {
      window.showErrorMessage(`Template "${templateName}" not found.`);
      return;
    }

    await TemplateCreator.createTemplate(templateName);
    return;
  }

  const demoName = await window.showInputBox({
    title: Config.title,
    placeHolder: 'Enter the name of the demo file',
    validateInput: async (value) => {
      value = sanitizeFileName(value);
      if (!value) {
        return 'File name is required';
      }

      const newFilePath = Uri.joinPath(wsFolder.uri, General.demoFolder, value);
      if (await fileExists(newFilePath)) {
        return `Demo file with name "${value}" already exists`;
      }
      return null;
    },
  });

  if (!demoName) {
    return;
  }

  const file = await FileProvider.createFile(demoName.trim());
  if (!file) {
    return;
  }

  if (openFile) {
    await window.showTextDocument(file);
  }

  return file;
};
