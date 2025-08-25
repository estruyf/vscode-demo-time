import { commands, Uri, window } from "vscode";
import { COMMAND } from "../constants";
import { Notifications } from "./Notifications";

export class UriHandler {
  /**
   * Register the URI handler
   */
  public static register() {
    window.registerUriHandler({
      handleUri(uri: Uri) {
        const queryParams = new URLSearchParams(uri.query);
        if (!queryParams.has("command")) {
          return;
        }

        let command = queryParams.get("command");
        if (!command) {
          return;
        }

        command = command.toLowerCase();

        if (command === "next") {
          commands.executeCommand(COMMAND.start);
        } else if (command === "runbyid") {
          const id = queryParams.get("id");
          if (!id) {
            return;
          }

          commands.executeCommand(COMMAND.runById, id);
        } else {
          Notifications.error(`Unknown command: ${command}`);
        }
      },
    });
  }
}
