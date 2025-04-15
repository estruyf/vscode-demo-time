import { ExtensionContext } from "vscode";
import { Extension } from "../services/Extension";
import { clearVariablesState } from "../utils/clearVariablesState";
import { DemoPanel } from "../panels/DemoPanel";

export async function activate(context: ExtensionContext) {
  console.log(`PROCESS`, process.env);
  Extension.getInstance(context);

  clearVariablesState();

  DemoPanel.register();

  console.log("Extension is activated");
}
