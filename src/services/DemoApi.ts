import { workspace, window, StatusBarAlignment, StatusBarItem, commands } from "vscode";
import { Extension } from "./Extension";
import { COMMAND, Config } from "../constants";
import { Server } from "http";
import express from "express";
import { Logger } from "./Logger";
import { bringToFront } from "../utils";

export class DemoApi {
  private static statusBarItem: StatusBarItem;
  private static server: Server;
  
  static register() {
    const ext = Extension.getInstance();
    const enabled = ext.getSetting<boolean>(Config.api.enabled);

    if (enabled) {
      DemoApi.init();
    } else {
      DemoApi.stop();
    }

    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(`demoTime`)) {
        const enabled = ext.getSetting<boolean>(Config.api.enabled);

        if (enabled) {
          DemoApi.stop();
          DemoApi.init();
        } else {
          DemoApi.stop();
        }
      }
    });
  }

  private static async init() {
    const ext = Extension.getInstance();
    const port = ext.getSetting<number>(Config.api.port);
    if (!port) {
      return;
    }

    await DemoApi.start(port);
  }

  private static async start(port: number) {
    Logger.info(`Starting API on port ${port}`);
    const app = express();
    app.use(express.json());

    app.post('/api/trigger', async (req, res) => {
      const id = req.body?.id;
      if (!id) {
        res.status(400).send("Missing demo ID");
        return;
      }
      Logger.info(`Received trigger for ID: ${id}`);
      res.status(200).send("OK");

      bringToFront();
      await commands.executeCommand(COMMAND.runById, id);
    });
    
    DemoApi.server = app.listen(port, () => {
      DemoApi.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100001);
      DemoApi.statusBarItem.text = `$(dt-logo) API: ${port}`;
      DemoApi.statusBarItem.show();
    });
  }

  private static async stop() {
    Logger.info("Stopping API");
    DemoApi.server?.close();
    DemoApi.statusBarItem.hide();
  }
}