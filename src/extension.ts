import * as vscode from "vscode";
import { Extension } from "./services/Extension";
import { DemoPanel } from "./panels/DemoPanel";
import { DemoRunner } from "./services/DemoRunner";

export function activate(context: vscode.ExtensionContext) {
  Extension.getInstance(context);

  DemoPanel.register();
  DemoRunner.registerCommands();

  console.log("Demo time is active!");
}

export function deactivate() {}
