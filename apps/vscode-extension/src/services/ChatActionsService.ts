import { Step } from '@demotime/common';
import { commands } from 'vscode';
import { InteractionService } from './InteractionService';
import { platform } from 'os';

// Ref: https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts
export class ChatActionsService {
  static async openChat() {
    // Open the Chat view using the correct command
    await commands.executeCommand('workbench.action.chat.open');
  }

  static async newChat() {
    // Open a new chat session using the correct command
    await commands.executeCommand('workbench.action.chat.open');
    await commands.executeCommand('workbench.action.chat.newChat');
  }

  static async askChat(step: Step) {
    // Open a new chat in ask mode with a prompt
    await commands.executeCommand('workbench.action.chat.open');
    await commands.executeCommand('workbench.action.chat.openask', {
      query: step.message || '',
    });
  }

  static async editChat(step: Step) {
    // Open a new chat in edit mode with a prompt
    await commands.executeCommand('workbench.action.chat.open');
    await commands.executeCommand('workbench.action.chat.openedit', {
      query: step.message || '',
    });
  }

  static async agentChat(step: Step) {
    // Open a new chat in agent mode with a prompt
    await commands.executeCommand('workbench.action.chat.open');
    await commands.executeCommand('workbench.action.chat.openagent', {
      query: step.message || '',
    });
  }

  static async customChat(step: Step) {
    // Open a new chat with a custom mode and prompt
    await commands.executeCommand('workbench.action.chat.open', {
      mode: step.mode,
      query: step.message || '',
    });
  }

  static async closeChat() {
    // Close the Chat view using the correct command
    await commands.executeCommand('workbench.action.closeAuxiliaryBar');
  }

  static async cancelChat() {
    const osPlatform = platform();
    if (osPlatform === 'darwin') {
      // Simulate Command+Esc on macOS (meta+Escape) using the InteractionService helper
      await InteractionService.pressKey('ESCAPE', 53, 'Escape', { meta: true });
    } else if (osPlatform === 'win32') {
      // Simulate alt+backspace on Windows using the InteractionService helper
      await InteractionService.pressKey('BACKSPACE', 8, 'Backspace', { alt: true });
    } else {
      // Simulate Ctrl+Esc on Linux using the InteractionService helper
      await InteractionService.pressKey('ESCAPE', 9, 'ESCAPE', { ctrl: true });
    }
  }
}
