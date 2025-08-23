import { Uri, window } from 'vscode';
import { General, Templates } from '../constants';
import { DemoFileProvider, Extension, TemplateCreator } from '../services';
import { DemoFileType } from '../models';
import { sanitizeFileName } from './sanitizeFileName';
import { fileExists } from './fileExists';
import { ConfigEditorProvider } from '../providers/ConfigEditorProvider';
import { Config } from '@demotime/common';

export const createDemoFile = async () => {
  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder) {
    return;
  }

  const options = [
    {
      label: 'Create empty demo file',
      detail: 'Blank demo file',
    },
    ...Templates.map((sample) => ({
      label: sample.id,
      detail: sample.description || 'Use this sample to create a demo file',
    })),
  ];

  const option = await window.showQuickPick(options, {
    title: 'Select how to create the demo file',
    placeHolder: 'Choose an option',
  });

  if (!option) {
    return;
  }

  if (option.label !== 'Create empty demo file') {
    const sampleName = option.label;
    const sample = Templates.find((s) => s.id === sampleName);
    if (!sample) {
      window.showErrorMessage(`Sample "${sampleName}" not found.`);
      return;
    }

    await TemplateCreator.createTemplate(sampleName);
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

      // Get the configured file type and extension
      const ext = Extension.getInstance();
      const fileType = ext.getSetting<DemoFileType>(Config.defaultFileType) ?? 'json';
      const fileExtension = fileType === 'yaml' ? '.yaml' : '.json';

      // Add extension if not already present
      if (!value.endsWith('.json') && !value.endsWith('.yaml') && !value.endsWith('.yml')) {
        value += fileExtension;
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

  const file = await DemoFileProvider.createFile(demoName.trim());
  if (!file) {
    return;
  }

  ConfigEditorProvider.openInConfigEditor(file);

  return file;
};
