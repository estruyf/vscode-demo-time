import * as vscode from 'vscode';
import { clearVariablesState } from './utils';
import {
  DecoratorService,
  DemoApi,
  DemoCreator,
  DemoListeners,
  DemoRunner,
  DemoStatusBar,
  Extension,
  DemoFileProvider,
  ImportService,
  NotesService,
  PdfExportService,
  Slides,
  UriHandler,
  TextTypingService,
  TerminalService,
} from './services';
import { DemoPanel } from './panels/DemoPanel';
import { Preview } from './preview/Preview';
import { PresenterView } from './presenterView/PresenterView';
import { ConfigEditorProvider } from './providers/ConfigEditorProvider';
import { SettingsView } from './settingsView/SettingsView';
import { Config } from '@demotime/common';
import { InputService } from './services/InputService';

export async function activate(context: vscode.ExtensionContext) {
  Extension.getInstance(context);

  // Clearing the variable state when the extension starts
  clearVariablesState();

  // Webviews
  SettingsView.register();
  PresenterView.register();
  Preview.register();

  // Services
  DecoratorService.register();
  DemoPanel.register();
  DemoRunner.registerCommands();
  DemoCreator.registerCommands();
  DemoListeners.register();
  DemoStatusBar.register();
  DemoFileProvider.register();
  Slides.register();
  NotesService.registerCommands();
  TextTypingService.registerCommands();
  DemoApi.register();
  UriHandler.register();
  PdfExportService.register();
  ImportService.register();
  ConfigEditorProvider.register();
  TerminalService.register();
  InputService.registerCommands();

  console.log(`${Config.title} is active!`);
}

export function deactivate() {
  TerminalService.dispose();
}
