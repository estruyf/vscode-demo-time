import { workspace, window, StatusBarAlignment, StatusBarItem, commands, Uri } from 'vscode';
import { Extension } from './Extension';
import { Config } from '@demotime/common';
import { Server } from 'http';
import https from 'https';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Logger } from './Logger';
import { bringToFront, readFile, getDemoApiData } from '../utils';
import { COMMAND } from '@demotime/common';
import { DemoRunner } from './DemoRunner';
import { ScreenshotService } from './ScreenshotService';

export class DemoApi {
  private static statusBarItem: StatusBarItem;
  private static server: Server;
  private static httpsServer: https.Server;

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

    app.get('/', DemoApi.home);
    app.get('/preview', DemoApi.previewNextSlide);
    app.get('/api/demos', DemoApi.demos);
    app.get('/api/next', DemoApi.next);
    app.get('/api/previous', DemoApi.previous);
    app.get('/api/runById', DemoApi.runById);
    app.post('/api/runById', DemoApi.runById);
    app.post('/api/notes', DemoApi.notes);
    app.get('/api/screenshot', DemoApi.screenshot);
    app.get('/api/zoom-in', DemoApi.zoomIn);
    app.get('/api/zoom-out', DemoApi.zoomOut);

    const workspace = Extension.getInstance().workspaceFolder;
    if (workspace) {
      app.use('/.demo', express.static(Uri.joinPath(workspace.uri, '.demo').fsPath));
    }

    DemoApi.server = app.listen(port, () => {
      DemoApi.statusBarItem = window.createStatusBarItem('api', StatusBarAlignment.Left, 100005);
      DemoApi.statusBarItem.name = `${Config.title} - API`;
      DemoApi.statusBarItem.text = `$(dt-logo) API: ${port}`;

      const tooltipContent = `API is running on port ${port}. Click to open the API documentation.`;
      const apiUrl = `http://localhost:${port}`;

      DemoApi.statusBarItem.command = {
        title: 'Open API in VS Code',
        command: 'simpleBrowser.show',
        arguments: [apiUrl],
      };

      DemoApi.statusBarItem.tooltip = tooltipContent;
      DemoApi.statusBarItem.show();
    });
  }

  private static async home(req: Request, res: Response) {
    Logger.info('Received request for home');
    const ext = Extension.getInstance();

    try {
      let apiHtml = await readFile(Uri.joinPath(ext.extensionUri, 'assets', 'api', 'index.html'));
      apiHtml = apiHtml.replace(
        /{{API_URL}}/g,
        `http://localhost:${ext.getSetting<number>(Config.api.port)}`,
      );
      res.status(200).send(apiHtml);
    } catch (err) {
      Logger.error(`Failed to load API documentation - ${(err as Error).message}`);
      res.status(500).send('Failed to load API documentation');
    }
  }

  private static async demos(req: Request, res: Response) {
    Logger.info('Received request for demos');
    const apiData = await getDemoApiData();
    if (!apiData) {
      res.status(404).send('No demos found');
      return;
    }

    res.status(200).json(apiData);
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
    Logger.info('Received trigger for next demo');
    res.status(200).send('OK');

    const show = DemoApi.toFront(req);
    if (show) {
      await bringToFront();
    }

    await commands.executeCommand(COMMAND.start);
  }

  /**
   * Handles the request to trigger the previous demo.
   *
   * @param req - The request object.
   * @param res - The response object.
   *
   * @returns A promise that resolves when the demo has been brought to the front and the previous
   *          demo has been started.
   */
  private static async previous(req: Request, res: Response) {
    const isAllowed = DemoRunner.allowPrevious();
    if (!isAllowed) {
      res.status(403).send('Previous demo is not allowed at this time');
      return;
    }

    Logger.info('Received trigger for previous demo');
    res.status(200).send('OK');

    const show = DemoApi.toFront(req);
    if (show) {
      await bringToFront();
    }

    await commands.executeCommand(COMMAND.previous);
  }

  /**
   * Handles the execution of a demo by its ID based on the HTTP request method.
   *
   * @param req - The HTTP request object.
   * @param res - The HTTP response object.
   * @returns A promise that resolves when the command execution is complete.
   */
  private static async runById(req: Request, res: Response) {
    let id: string | undefined = undefined;
    const show = DemoApi.toFront(req);

    if (req.method === 'POST') {
      id = typeof req.body?.id === 'string' ? req.body.id : undefined;
    } else if (req.method === 'GET') {
      id = typeof req.query.id === 'string' ? req.query.id : undefined;
    } else {
      res.status(405).send('Method not allowed');
      return;
    }

    if (!id) {
      res.status(400).send('Missing demo ID');
      return;
    }

    Logger.info(`Received trigger for ID: ${id}`);
    res.status(200).send('OK');

    if (show) {
      await bringToFront();
    }

    await commands.executeCommand(COMMAND.runById, id);
  }

  /**
   * API endpoint to get the notes for a specific path.
   * @param req
   * @param res
   * @returns
   */
  private static async notes(req: Request, res: Response) {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const path = typeof req.body?.path === 'string' ? req.body.path : undefined;
    if (!path) {
      res.status(400).send('Missing notes path');
      return;
    }

    const workspaceFolder = Extension.getInstance().workspaceFolder;
    const notesPath = workspaceFolder ? Uri.joinPath(workspaceFolder.uri, path) : undefined;
    if (!notesPath) {
      res.status(404).send('Notes not found');
      return;
    }

    const notes = await readFile(notesPath);
    res.status(200).send(notes);
  }

  private static async screenshot(req: Request, res: Response) {
    if (req.method !== 'GET') {
      res.status(405).send('Method not allowed');
      return;
    }

    const screenshot = await ScreenshotService.getNextSlideScreenshot();
    if (!screenshot) {
      res.status(500).send('Failed to take screenshot');
      return;
    }

    res.status(200).send(screenshot);
  }

  private static async previewNextSlide(req: Request, res: Response) {
    if (req.method !== 'GET') {
      res.status(405).send('Method not allowed');
      return;
    }

    const html = await ScreenshotService.generate();
    if (!html) {
      res.status(500).send('Failed to take screenshot');
      return;
    }

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  }

  /**
   * Handles the request to zoom in.
   *
   * @param req - The request object.
   * @param res - The response object.
   */
  private static async zoomIn(req: Request, res: Response) {
    Logger.info('Received zoom in request');
    res.status(200).send('OK');
    await commands.executeCommand(`editor.action.fontZoomIn`);
  }

  /**
   * Handles the request to zoom out.
   *
   * @param req - The request object.
   * @param res - The response object.
   */
  private static async zoomOut(req: Request, res: Response) {
    Logger.info('Received zoom out request');
    res.status(200).send('OK');
    await commands.executeCommand(`editor.action.fontZoomOut`);
  }

  /**
   * Determines whether the request should bring the application to the front.
   *
   * @param req - The HTTP request object.
   * @returns A boolean indicating whether the application should be brought to the front.
   */
  private static toFront(req: Request) {
    if (req.method === 'POST') {
      return !!req.body.bringToFront;
    } else if (req.method === 'GET') {
      return req.query.bringToFront ? req.query.bringToFront === 'true' : false;
    }
    return false;
  }

  private static async stop() {
    Logger.info('Stopping API');
    DemoApi.server?.close();
    DemoApi.httpsServer?.close();
    DemoApi.statusBarItem?.hide();
  }
}
