import { workspace, window, StatusBarAlignment, StatusBarItem, commands } from "vscode";
import { Extension } from "./Extension";
import { COMMAND, Config } from "../constants";
import { Server } from "http";
import express, { Request, Response } from "express";
import cors from "cors";
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

  /**
   * Starts the Demo API server on the specified port.
   *
   * @param {number} port - The port number on which the API server will listen.
   * @returns {Promise<void>} A promise that resolves when the server has started.
   */
  private static async start(port: number): Promise<void> {
    Logger.info(`Starting API on port ${port}`);
    const app = express();
    app.use(express.json());
    app.use(cors());

    app.get("/api/next", DemoApi.next);
    app.get("/api/runById", DemoApi.runById);
    app.post("/api/runById", DemoApi.runById);

    DemoApi.server = app.listen(port, () => {
      DemoApi.statusBarItem = window.createStatusBarItem("api", StatusBarAlignment.Left, 100005);
      DemoApi.statusBarItem.name = "Demo Time - API";
      DemoApi.statusBarItem.text = `$(dt-logo) API: ${port}`;
      DemoApi.statusBarItem.show();
    });
  }

  /**
   * Handles the request to trigger the next demo.
   *
   * @param req - The request object.
   * @param res - The response object.
   *
   * @returns A promise that resolves when the demo has been brought to the front and started.
   */
  private static async next(req: Request, res: Response) {
    Logger.info("Received trigger for next demo");
    res.status(200).send("OK");

    const show = DemoApi.toFront(req);
    if (show) {
      await bringToFront();
    }

    await commands.executeCommand(COMMAND.start);
  }

  /**
   * Handles the execution of a demo by its ID based on the HTTP request method.
   *
   * @param req - The HTTP request object.
   * @param res - The HTTP response object.
   * @returns A promise that resolves when the command execution is complete.
   */
  private static async runById(req: Request, res: Response) {
    let id = undefined;
    const show = DemoApi.toFront(req);

    if (req.method === "POST") {
      id = req.body.id;
    } else if (req.method === "GET") {
      id = req.query.id;
    } else {
      res.status(405).send("Method not allowed");
      return;
    }

    if (!id) {
      res.status(400).send("Missing demo ID");
      return;
    }

    Logger.info(`Received trigger for ID: ${id}`);
    res.status(200).send("OK");

    if (show) {
      await bringToFront();
    }

    await commands.executeCommand(COMMAND.runById, id);
  }

  /**
   * Determines whether the request should bring the application to the front.
   *
   * @param req - The HTTP request object.
   * @returns A boolean indicating whether the application should be brought to the front.
   */
  private static toFront(req: Request) {
    if (req.method === "POST") {
      return !!req.body.bringToFront;
    } else if (req.method === "GET") {
      return req.query.bringToFront ? req.query.bringToFront === "true" : false;
    }
  }

  private static async stop() {
    Logger.info("Stopping API");
    DemoApi.server?.close();
    DemoApi.statusBarItem.hide();
  }
}
