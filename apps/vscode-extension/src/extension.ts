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
  SponsorService,
  UriHandler,
  TextTypingService,
  TerminalService,
  ResourceService,
  ThemeBuilderService,
} from './services';
import { DemoPanel } from './panels/DemoPanel';
import { ResourcesPanel } from './panels/ResourcesPanel';
import { Preview } from './preview/Preview';
import { PresenterView } from './presenterView/PresenterView';
import { ConfigEditorProvider } from './providers/ConfigEditorProvider';
import { SettingsView } from './settingsView/SettingsView';
import { Config } from '@demotime/common';
import { InputService } from './services/InputService';
import { Overview } from './overview/Overview';

export async function activate(context: vscode.ExtensionContext) {
  Extension.getInstance(context);

  ResourceService.registerCommands();

  // Clearing the variable state when the extension starts
  clearVariablesState();

  // Webviews
  SettingsView.register();
  PresenterView.register();
  Preview.register();
  Overview.register();
  ConfigEditorProvider.register();

  // Services
  DecoratorService.register();
  DemoPanel.register();
  ResourcesPanel.register();
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
  TerminalService.register();
  InputService.registerCommands();
  SponsorService.init(context);
  ThemeBuilderService.register();

  console.log(`${Config.title} is active!`);
}

export function deactivate() {
  TerminalService.dispose();
}
