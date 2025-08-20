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
import { ConfigEditorProvider } from './providers/ConfigEditorProvider';
import { SettingsView } from './settingsView/SettingsView';

/**
 * Activates the extension: initializes core singleton state, clears runtime variables, and registers all extension features and commands.
 *
 * This function is called by VS Code when the extension is activated. It obtains the Extension singleton, resets in-memory variable state, and registers UI panels, command handlers, providers, services, and URI/terminal integrations required for the extension to operate. After registration completes, it logs that the extension is active.
 *
 * @param context - The VS Code extension context supplied on activation.
 * @returns A promise that resolves once activation and all registrations have completed.
 */
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
  ConfigEditorProvider.register();
  SettingsView.register();
  TerminalService.register();

  console.log(`${Config.title} is active!`);
}

export function deactivate() {
  TerminalService.dispose();
}
