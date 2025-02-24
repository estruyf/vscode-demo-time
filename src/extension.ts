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
import { PresenterView } from "./presenterView/PresenterView";
import { Config } from "./constants";

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
  PresenterView.register();
  FileProvider.register();
  Slides.registerCommands();
  NotesService.registerCommands();
  DemoApi.register();
  UriHandler.register();

  console.log(`${Config.title} is active!`);
}

export function deactivate() {}
