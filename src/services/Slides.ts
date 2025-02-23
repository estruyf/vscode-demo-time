import { commands, Uri, window } from "vscode";
import { Action, Step, Subscription } from "../models";
import { Extension } from "./Extension";
import { COMMAND, Config, General, SlideLayout } from "../constants";
import { addStepsToDemo, fileExists, sanitizeFileName, upperCaseFirstLetter, writeFile } from "../utils";
import { ActionTreeItem } from "../providers/ActionTreeviewProvider";
import { FileProvider } from "./FileProvider";
import { DemoRunner } from "./DemoRunner";

export class Slides {
  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(commands.registerCommand(COMMAND.createSlide, Slides.createSlide));
    subscriptions.push(commands.registerCommand(COMMAND.viewSlide, Slides.viewSlide));
  }

  public static async createSlide() {
    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder) {
      return;
    }

    const slideTitle = await window.showInputBox({
      title: Config.title,
      placeHolder: "What is the title of the slide?",
      validateInput: async (value) => {
        if (!value) {
          return "File name is required";
        }

        const newFilePath = Uri.joinPath(
          wsFolder.uri,
          General.demoFolder,
          General.slidesFolder,
          sanitizeFileName(value, ".md")
        );
        if (await fileExists(newFilePath)) {
          return `Slide with name "${value}" already exists`;
        }
        return null;
      },
    });

    if (!slideTitle) {
      return;
    }

    const filePath = Uri.joinPath(
      wsFolder.uri,
      General.demoFolder,
      General.slidesFolder,
      `${sanitizeFileName(slideTitle, ".md")}`
    );

    // Ask for the layout type
    const layout = await window.showQuickPick(
      Object.values(SlideLayout).map((v) => upperCaseFirstLetter(v)),
      {
        title: Config.title,
        placeHolder: "Select a layout for the slide",
      }
    );

    if (!layout) {
      return;
    }

    const content = `---
template: default
layout: ${layout.toLowerCase()}
---

# ${slideTitle}`;

    await writeFile(filePath, content);

    await window.showTextDocument(filePath);

    const addStep = await window.showInformationMessage(
      `Slide "${slideTitle}" created. Do you want to add it as a new step to the demo?`,
      { modal: true },
      "Yes",
      "No"
    );

    if (addStep === "No") {
      return;
    }

    const relFilePath = filePath.path.replace(wsFolder.uri.path, "");
    const steps: Step[] = [
      {
        action: Action.OpenSlide,
        path: relFilePath,
      },
    ];

    await addStepsToDemo(steps, slideTitle, "");
  }

  private static async viewSlide(item: ActionTreeItem) {
    if (!item || !item.demoFilePath) {
      return;
    }

    const demoFiles = await FileProvider.getFiles();
    if (!demoFiles) {
      return;
    }

    const executingDemos = demoFiles[item.demoFilePath].demos;
    const crntDemo = executingDemos.find((_, idx) => idx === item.stepIndex);
    if (!crntDemo) {
      return;
    }

    const slidePath = crntDemo.steps.find((step) => step.action === Action.OpenSlide)?.path;
    if (!slidePath) {
      return;
    }

    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder) {
      return;
    }

    const slideUri = Uri.joinPath(wsFolder.uri, slidePath);
    const slideExists = await fileExists(slideUri);
    if (!slideExists) {
      return;
    }

    await window.showTextDocument(slideUri);
  }
}
