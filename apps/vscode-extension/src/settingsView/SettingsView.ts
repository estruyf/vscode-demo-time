import { commands } from 'vscode';
import { Subscription, WebviewType } from '../models';
import { Extension } from '../services';
import { openFilePicker, sleep } from '../utils';
import { COMMAND, WebViewMessages, Config } from '@demotime/common';
import { BaseWebview } from '../webview/BaseWebviewPanel';

export class SettingsView extends BaseWebview {
  public static id: WebviewType = 'settings';
  public static title: string = `${Config.title}: Settings`;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.showSettings, SettingsView.show));
  }

  public static show() {
    if (SettingsView.isOpen) {
      SettingsView.reveal();
    } else {
      SettingsView.create();
    }
  }

  protected static async messageListener(message: any) {
    const { command, requestId, payload } = message;

    if (!command) {
      return;
    }

    if (command === WebViewMessages.toVscode.settingsView.getSettings) {
      await SettingsView.getAllSettings(command, requestId);
    } else if (command === WebViewMessages.toVscode.settingsView.saveSettings) {
      await SettingsView.saveSettings(command, requestId, payload);
    } else if (command === WebViewMessages.toVscode.configEditor.filePicker) {
      await SettingsView.selectFile(command, requestId, payload);
    }
  }

  private static async selectFile(
    command: string,
    requestId: string,
    payload?: { fileTypes: string[] },
  ) {
    const filePath = await openFilePicker(payload?.fileTypes);
    if (!filePath) {
      SettingsView.postRequestMessage(command, requestId, null);
      return;
    }

    SettingsView.postRequestMessage(command, requestId, filePath);
  }

  private static async saveSettings(
    command: string,
    requestId: string,
    payload: Record<string, any>,
  ) {
    try {
      const ext = Extension.getInstance();
      const settings = payload;

      for (const [key, value] of Object.entries(settings)) {
        await ext.setSetting(key, value);
        await sleep(100); // Adding a small delay to ensure settings are saved properly
      }

      SettingsView.postRequestMessage(command, requestId, true);
    } catch (error) {
      console.error('Error saving settings:', error);
      SettingsView.postRequestMessage(command, requestId, false);
    }
  }

  private static async getAllSettings(command: string, requestId: string) {
    const ext = Extension.getInstance();
    const settingsObject = {
      defaultFileType: ext.getSetting(Config.defaultFileType),
      previousEnabled: ext.getSetting(Config.presentationMode.previousEnabled),
      highlightBorderColor: ext.getSetting(Config.highlight.borderColor),
      highlightBackground: ext.getSetting(Config.highlight.background),
      highlightBlur: ext.getSetting(Config.highlight.blur),
      highlightOpacity: ext.getSetting(Config.highlight.opacity),
      highlightZoomEnabled: ext.getSetting(Config.highlight.zoom),
      showClock: ext.getSetting(Config.clock.show),
      timer: ext.getSetting(Config.clock.timer),
      insertTypingMode: ext.getSetting(Config.insert.typingMode),
      insertTypingSpeed: ext.getSetting(Config.insert.typingSpeed),
      hackerTyperChunkSize: ext.getSetting(Config.insert.hackerTyperChunkSize),
      'api.enabled': ext.getSetting(Config.api.enabled),
      'api.port': ext.getSetting(Config.api.port),
      customTheme: ext.getSetting(Config.slides.customTheme),
      slideHeaderTemplate: ext.getSetting(Config.slides.slideHeaderTemplate),
      slideFooterTemplate: ext.getSetting(Config.slides.slideFooterTemplate),
      customWebComponents: ext.getSetting(Config.webcomponents.scripts),
      nextActionBehaviour: ext.getSetting(Config.demoRunner.nextActionBehaviour),
      openInConfigEditor: ext.getSetting(Config.configEditor.openInConfigEditor),
    };

    SettingsView.postRequestMessage(command, requestId, settingsObject);
  }
}
