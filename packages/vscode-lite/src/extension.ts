import * as vscode from 'vscode';
import { DemoRunner } from './DemoRunner';
import { Slides } from './Slides';

export function activate(context: vscode.ExtensionContext) {
  console.log('Demo Time Lite is now active!');

  DemoRunner.registerCommands(context);
  Slides.registerCommands(context);
}

export function deactivate() {}
