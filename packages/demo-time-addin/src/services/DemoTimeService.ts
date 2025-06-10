interface SlideData {
  index: number;
  [key: string]: unknown;
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
  static async runCommand(serverUrl: string, commandId: string): Promise<void> {
    const url = serverUrl.replace(/\/$/, '');
    // const payload: CommandPayload = {
    //   id: commandId,
    //   bringToFront: true,
    // };

    // try {
    //   const response = await fetch(`${url}/api/runbyid`, {
    //     method: "POST",
    //     mode: "cors",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify(payload),
    //   });

    //   if (!response.ok) {
    //     const errorText = await response.text();
    //     throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorText}`);
    //   }

    //   return response;
    // } catch (error: any) {
    //   throw new Error(`Error running command: ${error.message}`);
    // }

    window.location.href = `${url}/api/runById?id=${commandId}&bringToFront=true`;
    // window.location.href = `vscode://eliostruyf.vscode-demo-time?command=${commandId}`;
    // window.open(`${url}/api/runById?id=${commandId}&bringToFront=true`);
    // window.open(`vscode://eliostruyf.vscode-demo-time?command=${commandId}`);
  }

  /**
   * Save settings to localStorage
   *
   * @param serverUrl - The server URL to save
   * @param commandId - The command ID to save
   */
  static saveSettings(serverUrl: string, commandId: string, slideId: number): void {
    this.setSetting('dtServerUrl', serverUrl);
    this.setSetting('dtCommandId', commandId);
    this.setSetting('dtAddInSlideId', slideId.toString());
  }

  /**
   * Load saved settings from localStorage
   *
   * @returns Object containing the saved settings
   */
  static loadSettings(): { serverUrl: string; commandId: string; slideId: number } {
    const slideIdStr = this.getSetting('dtAddInSlideId');
    const slideId = slideIdStr !== null ? parseInt(slideIdStr, 10) : -1;

    return {
      serverUrl: this.getSetting('dtServerUrl') || 'http://localhost:3710',
      commandId: this.getSetting('dtCommandId') || '',
      slideId: isNaN(slideId) ? -1 : slideId,
    };
  }

  /**
   * Checks whether the current Office document is in presentation (read) mode.
   *
   * This method uses the Office.js API to asynchronously determine if the document
   * is currently being presented (i.e., in "read" view). It resolves to `true` if
   * the document is in presentation mode, and `false` otherwise. If an error occurs
   * or the Office context is unavailable, it defaults to resolving `false`.
   *
   * @returns Promise<boolean> A promise that resolves to `true` if in presentation mode, otherwise `false`.
   */
  static checkPresentationMode(): Promise<boolean> {
    return new Promise((resolve) => {
      if (Office.context.document) {
        try {
          Office.context.document.getActiveViewAsync((viewResult) => {
            if (
              viewResult.status === Office.AsyncResultStatus.Succeeded &&
              viewResult.value === 'read'
            ) {
              resolve(true); // In presentation mode
            } else {
              resolve(false); // Not in presentation mode
            }
          });
        } catch (error) {
          console.error('Error checking presentation mode:', error);
          resolve(false); // Default to not in presentation mode on error
        }
      } else {
        resolve(false); // Default to not in presentation mode if Office.context.document is not available
      }
    });
  }

  static async getCurrentSlideIndex(): Promise<number | null> {
    return new Promise((resolve) => {
      Office.context.document.getSelectedDataAsync<{ slides?: SlideData[] }>(
        Office.CoercionType.SlideRange,
        (slideResult) => {
          if (
            slideResult.status === Office.AsyncResultStatus.Succeeded &&
            slideResult.value &&
            slideResult.value.slides &&
            slideResult.value.slides.length > 0
          ) {
            const currentSlide = slideResult.value.slides[0];
            const slideIndex = currentSlide.index;
            if (typeof slideIndex === 'number') {
              resolve(slideIndex);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  private static getSetting(name: string): string | null {
    return Office.context.document.settings.get(name) || null;
  }

  private static setSetting(name: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Office.context.document.settings.set(name, value);
      Office.context.document.settings.saveAsync((result: Office.AsyncResult<void>) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve();
        } else {
          reject(new Error(`Failed to save setting ${name}: ${result.error?.message}`));
        }
      });
    });
  }
}
