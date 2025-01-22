import * as vscode from "vscode";
import { Extension } from "./services/Extension";
import { DemoPanel } from "./panels/DemoPanel";
import { DemoRunner } from "./services/DemoRunner";
import { DemoCreator } from "./services/DemoCreator";
import { DemoListeners } from "./services/DemoListeners";
import { DecoratorService } from "./services/DecoratorService";
import { DemoStatusBar } from "./services/DemoStatusBar";
import { PresenterView } from "./presenterView/PresenterView";
import { NotesService } from "./services/NotesService";
import { DemoApi } from "./services/DemoApi";
import { UriHandler } from "./services/UriHandler";
import { clearVariablesState } from "./utils";

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
  NotesService.registerCommands();
  DemoApi.register();
  UriHandler.register();

  console.log("Demo time is active!");
}

export function deactivate() {}
