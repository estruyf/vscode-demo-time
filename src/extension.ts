import * as vscode from "vscode";
import { clearVariablesState } from "./utils";
import {
  DecoratorService,
  DemoApi,
  DemoCreator,
  DemoListeners,
  DemoRunner,
  DemoStatusBar,
  Extension,
  FileProvider,
  NotesService,
  Slides,
  UriHandler,
} from "./services";
import { DemoPanel } from "./panels/DemoPanel";
import { Preview } from "./preview/Preview";
import { PresenterView } from "./presenterView/PresenterView";
import { Config } from "./constants";
import { PdfExportService } from "./services/PdfExportService";

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
  FileProvider.register();
  Slides.register();
  NotesService.registerCommands();
  DemoApi.register();
  UriHandler.register();
  PdfExportService.register();

  console.log(`${Config.title} is active!`);
}

export function deactivate() {}
