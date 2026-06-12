import { commands } from 'vscode';
import { Extension } from './Extension';
import { Config } from '@demotime/common';

export class ZoomService {
  /**
   * Zooms in the editor by executing the zoomIn command.
   * @param zoomCount - The number of times to zoom in. If not provided, uses the zoom setting or defaults to 1.
   */
  public static async zoomIn(zoomCount?: number): Promise<void> {
    const count = zoomCount || Extension.getInstance().getSetting<number>(Config.zoom) || 1;

    for (let i = 0; i < count; i++) {
      await commands.executeCommand('workbench.action.zoomIn');
    }
  }

  /**
   * Zooms out the editor by executing the zoomOut command.
   * @param zoomCount - The number of times to zoom out. If not provided, uses the zoom setting or defaults to 1.
   */
  public static async zoomOut(zoomCount?: number): Promise<void> {
    const count = zoomCount || Extension.getInstance().getSetting<number>(Config.zoom) || 1;

    for (let i = 0; i < count; i++) {
      await commands.executeCommand('workbench.action.zoomOut');
    }
  }

  /**
   * Resets the editor zoom level to the default.
   */
  public static async zoomReset(): Promise<void> {
    await commands.executeCommand('workbench.action.zoomReset');
  }
}
