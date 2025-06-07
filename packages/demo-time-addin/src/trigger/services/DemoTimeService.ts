interface CommandPayload {
  id: string;
  bringToFront: boolean;
}

/**
 * Service for interacting with the Demo Time API
 */
export class DemoTimeService {
  /**
   * Run a command on the server
   *
   * @param serverUrl - The server URL
   * @param commandId - The command ID to run
   * @returns Promise with the response
   */
  static async runCommand(serverUrl: string, commandId: string): Promise<Response> {
    const url = serverUrl.replace(/\/$/, "");
    const payload: CommandPayload = {
      id: commandId,
      bringToFront: true,
    };

    return fetch(`${url}/api/runbyid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Save settings to localStorage
   *
   * @param serverUrl - The server URL to save
   * @param commandId - The command ID to save
   */
  static saveSettings(serverUrl: string, commandId: string, slideId: string): void {
    this.setSetting("dtServerUrl", serverUrl);
    this.setSetting("dtCommandId", commandId);
    this.setSetting("dtAddInSlideId", slideId);
  }

  /**
   * Load saved settings from localStorage
   *
   * @returns Object containing the saved settings
   */
  static loadSettings(): { serverUrl: string; commandId: string; slideId: string } {
    return {
      serverUrl: this.getSetting("dtServerUrl") || "http://localhost:3710",
      commandId: this.getSetting("dtCommandId") || "",
      slideId: this.getSetting("dtAddInSlideId") || "",
    };
  }

  static getSetting(name: string): string | null {
    return Office.context.document.settings.get(name) || null;
  }

  static setSetting(name: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Office.context.document.settings.set(name, value);
      Office.context.document.settings.saveAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve();
        } else {
          reject(new Error(`Failed to save setting ${name}: ${result.error.message}`));
        }
      });
    });
  }
}
