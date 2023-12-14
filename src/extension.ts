import * as vscode from "vscode";
import { Extension } from "./services/Extension";
import { DemoPanel } from "./panels/DemoPanel";
import { DemoRunner } from "./services/DemoRunner";
import { DemoCreator } from "./services/DemoCreator";
import { DemoListeners } from "./services/DemoListeners";

export async function activate(context: vscode.ExtensionContext) {
  Extension.getInstance(context);

  DemoPanel.register();
  DemoRunner.registerCommands();
  DemoCreator.registerCommands();
  DemoListeners.register();

  console.log("Demo time is active!");
}

export function deactivate() {}
