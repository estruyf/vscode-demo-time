import { Uri, ViewColumn, WebviewPanel } from 'vscode';
import { WebviewType } from '../models';
import { Extension } from '../services';
import { Config, WebViewMessages } from '@demotime/common';
import { BaseWebview } from '../webview/BaseWebviewPanel';
import { General } from '../constants';
import { fileExists, readFile, writeFile, sanitizeFileName } from '../utils';

export class ThemeBuilderPanel extends BaseWebview {
  public static id: WebviewType = 'themeBuilder';
  public static title: string = `${Config.title}: Theme Builder`;

  /**
   * Render the theme builder panel
   */
  public static async render() {
    if (ThemeBuilderPanel.isOpen) {
      ThemeBuilderPanel.reveal();
    } else {
      await ThemeBuilderPanel.create();
    }
  }

  protected static onCreate() {
    ThemeBuilderPanel.isDisposed = false;
  }

  protected static onDispose() {
    ThemeBuilderPanel.isDisposed = true;
  }

  protected static async messageListener(message: any) {
    const { command, requestId, payload } = message;

    if (!command) {
      return;
    }

    switch (command) {
      case WebViewMessages.toVscode.themeBuilder.getExistingThemes:
        await ThemeBuilderPanel.getExistingThemes(command, requestId);
        break;
      case WebViewMessages.toVscode.themeBuilder.getExistingLayouts:
        await ThemeBuilderPanel.getExistingLayouts(command, requestId);
        break;
      case WebViewMessages.toVscode.themeBuilder.loadTheme:
        await ThemeBuilderPanel.loadTheme(command, requestId, payload);
        break;
      case WebViewMessages.toVscode.themeBuilder.loadLayout:
        await ThemeBuilderPanel.loadLayout(command, requestId, payload);
        break;
      case WebViewMessages.toVscode.themeBuilder.saveTheme:
        await ThemeBuilderPanel.saveTheme(command, requestId, payload);
        break;
      case WebViewMessages.toVscode.themeBuilder.saveLayout:
        await ThemeBuilderPanel.saveLayout(command, requestId, payload);
        break;
      case WebViewMessages.toVscode.themeBuilder.getPreviewHtml:
        await ThemeBuilderPanel.getPreviewHtml(command, requestId, payload);
        break;
    }
  }

  /**
   * Get list of existing themes
   */
  private static async getExistingThemes(command: string, requestId: string) {
    try {
      const wsFolder = Extension.getInstance().workspaceFolder;
      if (!wsFolder) {
        ThemeBuilderPanel.postRequestMessage(command, requestId, []);
        return;
      }

      const slidesFolder = Uri.joinPath(wsFolder.uri, General.demoFolder, General.slidesFolder);
      const themeFiles: { name: string; path: string }[] = [];

      // Look for CSS files in slides folder
      try {
        const files = await Extension.getInstance().context.fs.readDirectory(slidesFolder);
        for (const [file, type] of files) {
          if (type === 1 && file.endsWith('.css')) {
            // File type
            themeFiles.push({
              name: file.replace('.css', ''),
              path: file,
            });
          }
        }
      } catch (error) {
        // Folder might not exist yet
      }

      ThemeBuilderPanel.postRequestMessage(command, requestId, themeFiles);
    } catch (error) {
      console.error('Error getting existing themes:', error);
      ThemeBuilderPanel.postRequestMessage(command, requestId, []);
    }
  }

  /**
   * Get list of existing layouts
   */
  private static async getExistingLayouts(command: string, requestId: string) {
    try {
      const wsFolder = Extension.getInstance().workspaceFolder;
      if (!wsFolder) {
        ThemeBuilderPanel.postRequestMessage(command, requestId, []);
        return;
      }

      const layoutsFolder = Uri.joinPath(wsFolder.uri, General.demoFolder, 'layouts');
      const layoutFiles: { name: string; path: string }[] = [];

      // Look for HBS/Handlebars files in layouts folder
      try {
        const files = await Extension.getInstance().context.fs.readDirectory(layoutsFolder);
        for (const [file, type] of files) {
          if (type === 1 && (file.endsWith('.hbs') || file.endsWith('.handlebars'))) {
            // File type
            layoutFiles.push({
              name: file.replace(/\.(hbs|handlebars)$/, ''),
              path: file,
            });
          }
        }
      } catch (error) {
        // Folder might not exist yet
      }

      ThemeBuilderPanel.postRequestMessage(command, requestId, layoutFiles);
    } catch (error) {
      console.error('Error getting existing layouts:', error);
      ThemeBuilderPanel.postRequestMessage(command, requestId, []);
    }
  }

  /**
   * Load a theme file
   */
  private static async loadTheme(command: string, requestId: string, payload: { name: string }) {
    try {
      const wsFolder = Extension.getInstance().workspaceFolder;
      if (!wsFolder) {
        ThemeBuilderPanel.postRequestMessage(command, requestId, null);
        return;
      }

      const themePath = Uri.joinPath(
        wsFolder.uri,
        General.demoFolder,
        General.slidesFolder,
        `${payload.name}.css`,
      );

      if (!(await fileExists(themePath))) {
        ThemeBuilderPanel.postRequestMessage(command, requestId, null);
        return;
      }

      const content = await readFile(themePath);
      ThemeBuilderPanel.postRequestMessage(command, requestId, {
        name: payload.name,
        content: content?.toString() || '',
      });
    } catch (error) {
      console.error('Error loading theme:', error);
      ThemeBuilderPanel.postRequestMessage(command, requestId, null);
    }
  }

  /**
   * Load a layout file
   */
  private static async loadLayout(command: string, requestId: string, payload: { name: string }) {
    try {
      const wsFolder = Extension.getInstance().workspaceFolder;
      if (!wsFolder) {
        ThemeBuilderPanel.postRequestMessage(command, requestId, null);
        return;
      }

      const layoutPath = Uri.joinPath(
        wsFolder.uri,
        General.demoFolder,
        'layouts',
        `${payload.name}.hbs`,
      );

      if (!(await fileExists(layoutPath))) {
        ThemeBuilderPanel.postRequestMessage(command, requestId, null);
        return;
      }

      const content = await readFile(layoutPath);
      ThemeBuilderPanel.postRequestMessage(command, requestId, {
        name: payload.name,
        content: content?.toString() || '',
      });
    } catch (error) {
      console.error('Error loading layout:', error);
      ThemeBuilderPanel.postRequestMessage(command, requestId, null);
    }
  }

  /**
   * Save a theme file
   */
  private static async saveTheme(
    command: string,
    requestId: string,
    payload: { name: string; content: string },
  ) {
    try {
      const wsFolder = Extension.getInstance().workspaceFolder;
      if (!wsFolder) {
        ThemeBuilderPanel.postRequestMessage(command, requestId, { success: false });
        return;
      }

      const fileName = sanitizeFileName(payload.name, '.css');
      const themePath = Uri.joinPath(
        wsFolder.uri,
        General.demoFolder,
        General.slidesFolder,
        fileName,
      );

      await writeFile(themePath, payload.content);

      ThemeBuilderPanel.postRequestMessage(command, requestId, {
        success: true,
        path: fileName,
      });
    } catch (error) {
      console.error('Error saving theme:', error);
      ThemeBuilderPanel.postRequestMessage(command, requestId, { success: false });
    }
  }

  /**
   * Save a layout file
   */
  private static async saveLayout(
    command: string,
    requestId: string,
    payload: { name: string; content: string },
  ) {
    try {
      const wsFolder = Extension.getInstance().workspaceFolder;
      if (!wsFolder) {
        ThemeBuilderPanel.postRequestMessage(command, requestId, { success: false });
        return;
      }

      // Ensure layouts folder exists
      const layoutsFolder = Uri.joinPath(wsFolder.uri, General.demoFolder, 'layouts');
      if (!(await fileExists(layoutsFolder))) {
        await Extension.getInstance().context.fs.createDirectory(layoutsFolder);
      }

      const fileName = sanitizeFileName(payload.name, '.hbs');
      const layoutPath = Uri.joinPath(layoutsFolder, fileName);

      await writeFile(layoutPath, payload.content);

      ThemeBuilderPanel.postRequestMessage(command, requestId, {
        success: true,
        path: fileName,
      });
    } catch (error) {
      console.error('Error saving layout:', error);
      ThemeBuilderPanel.postRequestMessage(command, requestId, { success: false });
    }
  }

  /**
   * Get preview HTML for a slide with custom theme/layout
   * Note: This generates HTML for preview in a sandboxed iframe.
   * The content comes from the authenticated user's own files.
   */
  private static async getPreviewHtml(
    command: string,
    requestId: string,
    payload: { css?: string; html?: string },
  ) {
    try {
      // Sanitize CSS: Remove potentially dangerous patterns
      const sanitizedCss = (payload.css || '')
        .replace(/@import\s*[^;]*;?/gi, '/* @import blocked */')
        .replace(/javascript:/gi, '/* javascript: blocked */')
        .replace(/expression\s*\(/gi, '/* expression() blocked */');

      // Sanitize HTML: Remove script tags and event handlers
      // Note: This is basic sanitization. For production use, consider a library like DOMPurify.
      const sanitizedHtml = (payload.html || '<h1>Preview</h1><p>Add your HTML content to see the preview</p>')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '<!-- script blocked -->')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '<!-- iframe blocked -->')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
        .replace(/javascript:/gi, '');

      // Generate a simple preview HTML
      const previewHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src 'self';">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    .slide {
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      box-sizing: border-box;
    }
    ${sanitizedCss}
  </style>
</head>
<body>
  <div class="slide">
    ${sanitizedHtml}
  </div>
</body>
</html>
      `;

      ThemeBuilderPanel.postRequestMessage(command, requestId, { html: previewHtml });
    } catch (error) {
      console.error('Error generating preview HTML:', error);
      ThemeBuilderPanel.postRequestMessage(command, requestId, { html: '' });
    }
  }
}
