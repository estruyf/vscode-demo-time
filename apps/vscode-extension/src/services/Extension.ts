import {
  ConfigurationTarget,
  ExtensionContext,
  ExtensionMode,
  SecretStorage,
  Uri,
  workspace,
} from 'vscode';
import { Config } from '@demotime/common';

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

  /**
   * Backs up VS Code workspace settings.
   * @param sections - Optional array of section names to backup. If empty, common demo-related settings are backed up.
   * @param target - Configuration target to backup from.
   * @returns A promise that resolves when the backup is complete.
   */
  public async backupSettings(
    sections: string[] = [], 
    target: ConfigurationTarget = ConfigurationTarget.Workspace
  ): Promise<void> {
    try {
      const backup: Record<string, Record<string, any>> = {};
      
      // Define common settings that are typically changed during demos
      const commonDemoSettings = [
        { section: 'workbench', keys: ['statusBar.visible', 'activityBar.location', 'colorTheme', 'sideBar.location'] },
        { section: 'editor', keys: ['fontSize', 'fontFamily', 'tabSize', 'wordWrap', 'minimap.enabled'] },
        { section: 'files', keys: ['autoSave', 'exclude'] },
        { section: 'terminal', keys: ['integrated.fontSize', 'integrated.shell.windows'] },
        { section: 'explorer', keys: ['openEditors.visible'] },
        { section: Config.root, keys: [] } // Demo Time settings - will backup all
      ];
      
      // Determine which sections to process
      let sectionsToProcess = commonDemoSettings;
      if (sections.length > 0) {
        sectionsToProcess = sections.map(sectionName => ({ section: sectionName, keys: [] }));
      }
      
      // Backup settings for each section
      for (const { section, keys } of sectionsToProcess) {
        const config = workspace.getConfiguration(section);
        const sectionBackup: Record<string, any> = {};
        
        if (keys.length > 0) {
          // Backup specific keys
          for (const key of keys) {
            const inspection = config.inspect(key);
            if (inspection) {
              let valueToStore: any = undefined;
              
              if (target === ConfigurationTarget.Workspace && inspection.workspaceValue !== undefined) {
                valueToStore = inspection.workspaceValue;
              } else if (target === ConfigurationTarget.Global && inspection.globalValue !== undefined) {
                valueToStore = inspection.globalValue;
              } else if (target === ConfigurationTarget.WorkspaceFolder && inspection.workspaceFolderValue !== undefined) {
                valueToStore = inspection.workspaceFolderValue;
              } else {
                // Store the current effective value and its source
                valueToStore = {
                  value: config.get(key),
                  source: 'effective'
                };
              }
              
              if (valueToStore !== undefined) {
                sectionBackup[key] = valueToStore;
              }
            }
          }
        } else {
          // For sections without specific keys (like demo time settings), try to backup common ones
          const commonKeys = ['fontSize', 'fontFamily', 'visible', 'location', 'enabled', 'theme'];
          for (const key of commonKeys) {
            const inspection = config.inspect(key);
            if (inspection) {
              let valueToStore: any = undefined;
              
              if (target === ConfigurationTarget.Workspace && inspection.workspaceValue !== undefined) {
                valueToStore = inspection.workspaceValue;
              } else if (target === ConfigurationTarget.Global && inspection.globalValue !== undefined) {
                valueToStore = inspection.globalValue;
              }
              
              if (valueToStore !== undefined) {
                sectionBackup[key] = valueToStore;
              }
            }
          }
        }
        
        if (Object.keys(sectionBackup).length > 0) {
          backup[section] = sectionBackup;
        }
      }
      
      // Store backup in workspace state
      const backupKey = `settingsBackup_${target}`;
      await this.setState(backupKey, {
        backup,
        timestamp: new Date().toISOString(),
        target,
        originalSections: sections
      });
      
    } catch (error) {
      throw new Error(`Failed to backup settings: ${error}`);
    }
  }

  /**
   * Restores previously backed up VS Code settings.
   * @param target - Configuration target that was used for backup.
   * @returns A promise that resolves when the restore is complete.
   */
  public async restoreSettings(target: ConfigurationTarget = ConfigurationTarget.Workspace): Promise<void> {
    try {
      const backupKey = `settingsBackup_${target}`;
      const backupData = this.getState<{
        backup: Record<string, Record<string, any>>;
        timestamp: string;
        target: ConfigurationTarget;
        originalSections: string[];
      }>(backupKey);
      
      if (!backupData || !backupData.backup) {
        throw new Error('No settings backup found. Please run backupSettings action first.');
      }
      
      const { backup } = backupData;
      
      // Restore settings for each section
      for (const [section, settings] of Object.entries(backup)) {
        if (settings && typeof settings === 'object') {
          const config = workspace.getConfiguration(section);
          
          for (const [key, value] of Object.entries(settings)) {
            try {
              // Handle both simple values and objects with source info
              const valueToRestore = (value && typeof value === 'object' && value.source) ? value.value : value;
              await config.update(key, valueToRestore, target);
              // Small delay to ensure settings are applied properly
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
              console.warn(`Failed to restore setting ${section}.${key}:`, error);
              // Continue with other settings even if one fails
            }
          }
        }
      }
      
    } catch (error) {
      throw new Error(`Failed to restore settings: ${error}`);
    }
  }

  /**
   * Clears the settings backup.
   * @param target - Configuration target backup to clear.
   * @returns A promise that resolves when the backup is cleared.
   */
  public async clearSettingsBackup(target: ConfigurationTarget = ConfigurationTarget.Workspace): Promise<void> {
    const backupKey = `settingsBackup_${target}`;
    await this.setState(backupKey, undefined);
  }
}
