import { ExtensionContext, ExtensionMode, SecretStorage, workspace } from "vscode";

export class Extension {
  private static instance: Extension;

  private constructor(private ctx: ExtensionContext) {}

  /**
   * Creates the singleton instance for the extension.
   * @param ctx
   */
  public static getInstance(ctx?: ExtensionContext): Extension {
    if (!Extension.instance && ctx) {
      Extension.instance = new Extension(ctx);
    }

    return Extension.instance;
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
}
