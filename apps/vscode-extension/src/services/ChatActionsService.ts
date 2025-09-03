import { commands, window } from 'vscode';

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

  static async askChat(step: any) {
    // Open a new chat in ask mode with a prompt
    await commands.executeCommand('workbench.action.chat.open');
    await commands.executeCommand('workbench.action.chat.newChat', {
      mode: 'ask',
      query: step.message || '',
    });
  }

  static async editChat(step: any) {
    // Open a new chat in edit mode with a prompt
    await commands.executeCommand('workbench.action.chat.open');
    await commands.executeCommand('workbench.action.chat.newChat', {
      mode: 'edit',
      query: step.message || '',
    });
  }

  static async agentChat(step: any) {
    // Open a new chat in agent mode with a prompt
    await commands.executeCommand('workbench.action.chat.open');
    await commands.executeCommand('workbench.action.chat.newChat', {
      mode: 'agent',
      query: step.message || '',
    });
  }

  static async closeChat() {
    // Close the Chat view using the correct command
    await commands.executeCommand('workbench.action.closeAuxiliaryBar');
  }
}
