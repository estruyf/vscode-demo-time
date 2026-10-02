import { commands, ConfigurationTarget, workspace } from 'vscode';
import { Subscription, WebviewType } from '../models';
import { EngageTimeService, Extension } from '../services';
import { openFile, openFilePicker, sleep } from '../utils';
import {
  COMMAND,
  WebViewMessages,
  Config,
  ISettingsViewData,
  SETTINGS_CATALOG,
} from '@demotime/common';
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

  protected static onCreate() {
    SettingsView.isDisposed = false;
  }

  protected static onDispose() {
    SettingsView.isDisposed = true;
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
    } else if (command === WebViewMessages.toVscode.openFile && payload) {
      await openFile(payload);
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
      const config = workspace.getConfiguration(Config.root);

      for (const [key, value] of Object.entries(payload)) {
        const definition = SETTINGS_CATALOG.find((setting) => setting.key === key);
        if (!definition) {
          continue;
        }

        if (definition.secret) {
          await EngageTimeService.setApiKey(value);
        } else {
          const target = definition.userSettings
            ? ConfigurationTarget.Global
            : ConfigurationTarget.Workspace;
          const inspect = config.inspect(key);
          // A setting back at its default is removed from the settings file, unless the user
          // settings have another value that it would fall back to
          const isDefault =
            value === undefined ||
            value === null ||
            JSON.stringify(value) === JSON.stringify(inspect?.defaultValue);
          const hasUserValue =
            target === ConfigurationTarget.Workspace && inspect?.globalValue !== undefined;
          await ext.setSetting(key, isDefault && !hasUserValue ? undefined : value, target);
        }
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
    const config = workspace.getConfiguration(Config.root);
    const settings: Record<string, unknown> = {};
    const defaults: Record<string, unknown> = {};

    for (const { key, secret } of SETTINGS_CATALOG) {
      if (secret) {
        settings[key] = (await EngageTimeService.getApiKey()) || '';
        defaults[key] = '';
      } else {
        settings[key] = ext.getSetting(key);
        defaults[key] = config.inspect(key)?.defaultValue;
      }
    }

    SettingsView.postRequestMessage(command, requestId, {
      settings,
      defaults,
    } as unknown as ISettingsViewData);
  }
}
