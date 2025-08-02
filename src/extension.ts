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
import { Config } from './constants';

export async function activate(context: vscode.ExtensionContext) {
  Extension.getInstance(context);

  // Clearing the variable state when the extension starts
  clearVariablesState();

  DecoratorService.register();

  DemoPanel.register();
  DemoRunner.registerCommands();
  DemoCreator.registerCommands();
  DemoListeners.register();
  DemoStatusBar.register();
  Preview.register();
  PresenterView.register();
  DemoFileProvider.register();
  Slides.register();
  NotesService.registerCommands();
  TextTypingService.registerCommands();
  DemoApi.register();
  UriHandler.register();
  PdfExportService.register();
  ImportService.register();
  TerminalService.register();

  console.log(`${Config.title} is active!`);
}

export function deactivate() {}
