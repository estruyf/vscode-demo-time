import { COMMAND, Config, WebViewMessages } from '@demotime/common';
import { commands, Uri, workspace } from 'vscode';
import * as path from 'path';
import { Subscription, WebviewType } from '../models';
import { Extension } from '../services';
import { listSnippetFiles } from '../utils';
import { BaseWebview } from '../webview/BaseWebviewPanel';

interface DownloadSnippetPayload {
  snippetPath: string;
  content: string;
}

export class GalleryView extends BaseWebview {
  public static id: WebviewType = 'gallery';
  public static title: string = `${Config.title}: Snippet Gallery`;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.showGallery, GalleryView.show));
  }

  public static show() {
    if (GalleryView.isOpen) {
      GalleryView.reveal();
    } else {
      GalleryView.create();
    }
  }

  protected static onCreate() {
    GalleryView.isDisposed = false;
  }

  protected static onDispose() {
    GalleryView.isDisposed = true;
  }

  protected static async messageListener(message: any) {
    await super.messageListener(message);
    const { command, requestId, payload } = message;

    if (!command || !requestId) {
      return;
    }

    if (command === WebViewMessages.toVscode.gallery.getConfig) {
      const config = GalleryView.getGalleryConfig();
      GalleryView.postRequestMessage(command, requestId, config);
      return;
    }

    if (command === WebViewMessages.toVscode.gallery.getDownloadedSnippets) {
      const downloadedSnippets = await GalleryView.getDownloadedSnippets();
      GalleryView.postRequestMessage(command, requestId, downloadedSnippets);
      return;
    }

    if (command === WebViewMessages.toVscode.gallery.downloadSnippet && payload) {
      const result = await GalleryView.downloadSnippet(payload as DownloadSnippetPayload);
      GalleryView.postRequestMessage(command, requestId, result);
    }
  }

  private static getGalleryConfig() {
    const extension = Extension.getInstance();
    const isPreRelease = !extension.isProductionMode;

    return {
      isPreRelease,
      indexUrl: isPreRelease
        ? 'https://beta.demotime.show/gallery/index.json'
        : 'https://demotime.show/gallery/index.json',
      rawBaseUrl: isPreRelease
        ? 'https://raw.githubusercontent.com/estruyf/vscode-demo-time/refs/heads/dev'
        : 'https://raw.githubusercontent.com/estruyf/vscode-demo-time/refs/heads/main',
    };
  }

  private static async getDownloadedSnippets() {
    try {
      const snippets = await listSnippetFiles();
      return snippets.map((snippet) => snippet.path);
    } catch {
      return [];
    }
  }

  private static async downloadSnippet(payload: DownloadSnippetPayload) {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return { success: false, message: 'No workspace folder is open.' };
    }

    if (!payload?.snippetPath || !payload?.content) {
      return { success: false, message: 'Missing snippet path or content.' };
    }

    const normalizedSnippetPath = payload.snippetPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const relativeSnippetPath = normalizedSnippetPath.startsWith('gallery/')
      ? normalizedSnippetPath.slice('gallery/'.length)
      : normalizedSnippetPath;

    const targetUri = Uri.joinPath(workspaceFolder.uri, '.demo', 'snippets', relativeSnippetPath);

    try {
      const targetDir = Uri.file(path.dirname(targetUri.fsPath));
      await workspace.fs.createDirectory(targetDir);
      await workspace.fs.writeFile(targetUri, new TextEncoder().encode(payload.content));

      return {
        success: true,
        path: `.demo/snippets/${relativeSnippetPath}`,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }
}
