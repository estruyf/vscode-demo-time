import {
  ConfigurationTarget,
  ExtensionContext,
  ExtensionMode,
  SecretStorage,
  Uri,
  workspace,
} from 'vscode';
import { Config } from '../constants';

export class Extension {
  private static instance: Extension;

  private constructor(private ctx: ExtensionContext) {}

  /**
   * Creates the singleton instance for the extension.
   * @param ctx
   */
  public static getInstance(ctx?: ExtensionContext): Extension {
    if (!Extension.instance) {
      if (!ctx) {
        throw new Error(
          `${Config.title}: Extension not initialized. Call getInstance(ctx) from your activate() first.`,
        );
      }
      Extension.instance = new Extension(ctx);
    }

    return Extension.instance;
  }

  /**
   * Get the name of the extension
   */
  public get id(): string {
    return this.ctx.extension.id;
  }

  public get context(): ExtensionContext {
    return this.ctx;
  }

  /**
   * Get the name of the extension
   */
  public get name(): string {
    return this.ctx.extension.packageJSON.name;
  }

  /**
   * Get the display name of the extension
   */
  public get displayName(): string {
    return this.ctx.extension.packageJSON.displayName;
  }

  /**
   * Returns the extension's version
   */
  public get version(): string {
    return this.ctx.extension.packageJSON.version;
  }

  /**
   * Check if the extension is in production/development mode
   */
  public get isProductionMode(): boolean {
    return this.ctx.extensionMode === ExtensionMode.Production;
  }

  /**
   * Get the extension's subscriptions
   */
  public get subscriptions(): { dispose(): any }[] {
    return this.ctx.subscriptions;
  }

  /**
   * Get the extension's secrets
   */
  public get secrets(): SecretStorage {
    return this.ctx.secrets;
  }

  /**
   * Get the extension's path
   */
  public get extensionPath(): string {
    return this.ctx.extensionPath;
  }

  /**
   * Get the extension's URI
   */
  public get extensionUri(): Uri {
    return this.ctx.extensionUri;
  }

  /**
   * Gets the workspace folder.
   * @returns The first workspace folder or null if no workspace folders are available.
   */
  public get workspaceFolder() {
    const folders = workspace.workspaceFolders;
    if (!folders) {
      return null;
    }

    return folders[0];
  }

  /**
   * Retrieves the value associated with the specified key from the workspace state.
   * @param key - The key of the value to retrieve.
   * @returns The value associated with the specified key, or undefined if the key does not exist.
   */
  public getState<T>(key: string): T | undefined {
    return this.ctx.workspaceState.get(key);
  }

  /**
   * Sets the state of a key-value pair in the workspace state.
   * @param key - The key of the state.
   * @param value - The value to set for the state.
   * @returns A promise that resolves when the state is updated.
   */
  public async setState(key: string, value: any) {
    return await this.ctx.workspaceState.update(key, value);
  }

  /**
   * Get a config setting
   * @param key
   * @returns
   */
  public getSetting<T>(key: string): T | undefined {
    const extConfig = workspace.getConfiguration(Config.root);
    return extConfig.get<T>(key);
  }

  /**
   * Sets a configuration setting for the extension.
   * @param key - The configuration key.
   * @param value - The value to set.
   * @returns A promise that resolves when the configuration is updated.
   */
  public async setSetting<T>(
    key: string,
    value: T,
    target: ConfigurationTarget = ConfigurationTarget.Workspace,
  ): Promise<void> {
    const extConfig = workspace.getConfiguration(Config.root);
    await extConfig.update(key, value, target);
  }
}
