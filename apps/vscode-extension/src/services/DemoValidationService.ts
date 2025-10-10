import * as vscode from 'vscode';
import {
  ExtensionContext,
  DiagnosticCollection,
  languages,
  workspace,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  Range,
  Position,
  Uri,
  CodeActionProvider,
  CodeActionContext,
  CodeAction,
  CodeActionKind,
  WorkspaceEdit,
  TextEdit,
  window,
} from 'vscode';
import { DemoFileProvider } from './DemoFileProvider';
import { Demo, DemoConfig } from '@demotime/common';
import { General } from '../constants';
import { parseWinPath } from '../utils';

export class DemoValidationService {
  private static diagnosticCollection: DiagnosticCollection;
  private static registered = false;

  /**
   * Register the validation service with VS Code
   */
  public static register(ctx: ExtensionContext): void {
    if (DemoValidationService.registered) {
      return;
    }

    // Create diagnostic collection for demo validation
    DemoValidationService.diagnosticCollection = languages.createDiagnosticCollection('demo-time');
    ctx.subscriptions.push(DemoValidationService.diagnosticCollection);

    // Register code action provider for quick fixes
    const codeActionProvider = languages.registerCodeActionsProvider(
      [{ scheme: 'file', pattern: `**/${General.demoFolder}/*.{json,yaml,yml}` }],
      new DemoCodeActionProvider(),
    );
    ctx.subscriptions.push(codeActionProvider);

    // Register command to manually fix duplicate IDs
    const fixDuplicateIdsCommand = vscode.commands.registerCommand(
      'demoTime.fixDuplicateIds',
      DemoValidationService.fixDuplicateIdsInActiveFile,
    );
    ctx.subscriptions.push(fixDuplicateIdsCommand);

    // Listen for file changes and validate demo files
    const onDidSave = workspace.onDidSaveTextDocument(DemoValidationService.validateDocument);
    const onDidOpen = workspace.onDidOpenTextDocument(DemoValidationService.validateDocument);
    const onDidCreate = workspace.onDidCreateFiles((e) => {
      e.files.forEach((file) => {
        workspace.openTextDocument(file).then(DemoValidationService.validateDocument);
      });
    });

    ctx.subscriptions.push(onDidSave, onDidOpen, onDidCreate);

    // Validate all existing demo files on startup
    DemoValidationService.validateAllDemoFiles();

    DemoValidationService.registered = true;
  }

  /**
   * Validate a single document if it's a demo file
   */
  private static async validateDocument(document: TextDocument): Promise<void> {
    const fileName = parseWinPath(document.fileName);

    // Only validate files in the demo folder
    if (!fileName.includes(General.demoFolder)) {
      return;
    }

    // Only validate JSON and YAML files
    if (!fileName.endsWith('.json') && !fileName.endsWith('.yaml') && !fileName.endsWith('.yml')) {
      return;
    }

    await DemoValidationService.validateDemoFile(document);
  }

  /**
   * Validate all demo files in the workspace
   */
  private static async validateAllDemoFiles(): Promise<void> {
    try {
      const files = await DemoFileProvider.getFiles();

      if (!files) {
        return;
      }

      // DemoFiles is an object with filePath as key and DemoConfig as value
      for (const filePath of Object.keys(files)) {
        try {
          const uri = Uri.file(filePath);
          const document = await workspace.openTextDocument(uri);
          await DemoValidationService.validateDemoFile(document);
        } catch (error) {
          console.error(`Error validating demo file ${filePath}:`, error);
        }
      }
    } catch (error) {
      console.error('Error validating all demo files:', error);
    }
  }

  /**
   * Validate a single demo file and report diagnostics
   */
  private static async validateDemoFile(document: TextDocument): Promise<void> {
    const diagnostics: Diagnostic[] = [];

    try {
      // Parse the demo file content
      const content = await DemoFileProvider.getFile(document.uri);

      if (!content || !content.demos) {
        return;
      }

      // Check for duplicate demo IDs within this file
      const seenIds = new Map<string, { index: number; position: Position }>();
      const demos = content.demos;

      demos.forEach((demo: Demo, index: number) => {
        if (!demo.id) {
          return;
        }

        const existingDemo = seenIds.get(demo.id);
        if (existingDemo) {
          // Add diagnostic for duplicate ID at the current position
          const position = DemoValidationService.findDemoPosition(document, index, 'id');
          const lineEnd = new Position(position.line, document.lineAt(position.line).text.length);
          const diagnostic = new Diagnostic(
            new Range(new Position(position.line, 0), lineEnd),
            `Duplicate demo ID "${demo.id}" found. Demo IDs must be unique within a file. First occurrence at line ${existingDemo.position.line + 1}.`,
            DiagnosticSeverity.Error,
          );
          diagnostic.source = 'demo-time';
          diagnostic.code = 'duplicate-demo-id';
          diagnostics.push(diagnostic);

          // Also add diagnostic at the first occurrence
          const firstLineEnd = new Position(
            existingDemo.position.line,
            document.lineAt(existingDemo.position.line).text.length,
          );
          const firstOccurrenceDiagnostic = new Diagnostic(
            new Range(new Position(existingDemo.position.line, 0), firstLineEnd),
            `Duplicate demo ID "${demo.id}" found. This ID is also used at line ${position.line + 1}.`,
            DiagnosticSeverity.Error,
          );
          firstOccurrenceDiagnostic.source = 'demo-time';
          firstOccurrenceDiagnostic.code = 'duplicate-demo-id';
          diagnostics.push(firstOccurrenceDiagnostic);
        } else {
          const position = DemoValidationService.findDemoPosition(document, index, 'id');
          seenIds.set(demo.id, { index, position });
        }
      });

      // Check for duplicate IDs across all demo files
      await DemoValidationService.checkGlobalDuplicateIds(document, content, diagnostics);
    } catch (error) {
      // Add diagnostic for parsing errors
      const diagnostic = new Diagnostic(
        new Range(new Position(0, 0), new Position(0, 0)),
        `Error parsing demo file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        DiagnosticSeverity.Error,
      );
      diagnostic.source = 'demo-time';
      diagnostic.code = 'parse-error';
      diagnostics.push(diagnostic);
    }

    // Set diagnostics for this document
    DemoValidationService.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Check for duplicate demo IDs across all demo files in the workspace
   */
  private static async checkGlobalDuplicateIds(
    currentDocument: TextDocument,
    currentContent: DemoConfig,
    diagnostics: Diagnostic[],
  ): Promise<void> {
    try {
      const allFiles = await DemoFileProvider.getFiles();
      const globalIds = new Map<string, string>(); // id -> file path

      if (!allFiles) {
        return;
      }

      // First, collect all IDs from other files
      for (const filePath of Object.keys(allFiles)) {
        if (filePath === currentDocument.uri.fsPath) {
          continue; // Skip current file
        }

        try {
          const content = allFiles[filePath];
          if (content && content.demos) {
            content.demos.forEach((demo: Demo) => {
              if (demo.id) {
                globalIds.set(demo.id, filePath);
              }
            });
          }
        } catch (error) {
          // Skip files that can't be parsed
          continue;
        }
      }

      // Check if any IDs in current file conflict with global IDs
      if (currentContent.demos) {
        currentContent.demos.forEach((demo: Demo, index: number) => {
          if (demo.id && globalIds.has(demo.id)) {
            const conflictingFile = globalIds.get(demo.id);
            const relativePath = workspace.asRelativePath(conflictingFile || '');
            const position = DemoValidationService.findDemoPosition(currentDocument, index, 'id');
            const lineEnd = new Position(
              position.line,
              currentDocument.lineAt(position.line).text.length,
            );

            const diagnostic = new Diagnostic(
              new Range(new Position(position.line, 0), lineEnd),
              `Demo ID "${demo.id}" conflicts with a demo in ${relativePath}. Demo IDs must be unique across all demo files.`,
              DiagnosticSeverity.Error,
            );
            diagnostic.source = 'demo-time';
            diagnostic.code = 'global-duplicate-demo-id';
            diagnostics.push(diagnostic);
          }
        });
      }
    } catch (error) {
      console.error('Error checking global duplicate IDs:', error);
    }
  }

  /**
   * Find the position of a demo property in the document
   */
  private static findDemoPosition(
    document: TextDocument,
    demoIndex: number,
    property: string,
  ): Position {
    const text = document.getText();
    const lines = text.split('\n');
    const isYaml = document.fileName.endsWith('.yaml') || document.fileName.endsWith('.yml');

    let currentDemoIndex = -1;
    let insideDemosArray = false;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const trimmedLine = line.trim();

      // Detect start of demos array
      if (trimmedLine.includes('"demos"') || trimmedLine.includes('demos:')) {
        insideDemosArray = true;
        continue;
      }

      if (!insideDemosArray) {
        continue;
      }

      // Detect start of a new demo
      let isNewDemo = false;
      if (isYaml) {
        // YAML: look for "- id:" or "- title:" or just "- " at start of line (accounting for indentation)
        if (
          trimmedLine.startsWith('- ') &&
          (trimmedLine.includes('id:') || trimmedLine.includes('title:') || trimmedLine === '-')
        ) {
          isNewDemo = true;
        }
      } else {
        // JSON: look for opening brace that starts a demo object
        if (trimmedLine === '{') {
          isNewDemo = true;
        }
      }

      if (isNewDemo) {
        currentDemoIndex++;

        if (currentDemoIndex === demoIndex) {
          // Found the target demo, now look for the property
          return this.findPropertyInDemo(lines, lineNum, property, isYaml);
        }
      }
    }

    // Fallback to beginning of file
    return new Position(0, 0);
  }

  /**
   * Find a specific property within a demo object
   */
  private static findPropertyInDemo(
    lines: string[],
    startLine: number,
    property: string,
    isYaml: boolean,
  ): Position {
    for (let lineNum = startLine; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const trimmedLine = line.trim();

      // Stop searching if we hit the next demo or end of current demo
      if (lineNum > startLine) {
        if (isYaml) {
          if (
            trimmedLine.startsWith('- ') &&
            (trimmedLine.includes('id:') || trimmedLine.includes('title:'))
          ) {
            break; // Start of next demo
          }
        } else {
          if (trimmedLine === '}' || trimmedLine === '},') {
            break; // End of current demo
          }
        }
      }

      // Look for the property
      if (isYaml) {
        if (trimmedLine.startsWith(`${property}:`) || trimmedLine.startsWith(`- ${property}:`)) {
          const columnIndex = line.indexOf(`${property}:`);
          return new Position(lineNum, Math.max(0, columnIndex));
        }
      } else {
        if (trimmedLine.includes(`"${property}"`)) {
          const columnIndex = line.indexOf(`"${property}"`);
          return new Position(lineNum, Math.max(0, columnIndex));
        }
      }
    }

    // If property not found, return the demo start position
    const indentation = lines[startLine].length - lines[startLine].trimStart().length;
    return new Position(startLine, indentation);
  }

  /**
   * Clear all diagnostics
   */
  public static clearDiagnostics(): void {
    if (DemoValidationService.diagnosticCollection) {
      DemoValidationService.diagnosticCollection.clear();
    }
  }

  /**
   * Generate a unique demo ID for the given demos array
   */
  public static generateUniqueId(demos: Demo[], baseId?: string): string {
    const usedIds = new Set(demos.map((demo) => demo.id).filter(Boolean));

    if (!baseId) {
      baseId = 'demo';
    }

    // If baseId is not used, return it
    if (!usedIds.has(baseId)) {
      return baseId;
    }

    // Find the next available ID with incremental suffix
    let counter = 1;
    let newId = `${baseId}-${counter}`;

    while (usedIds.has(newId)) {
      counter++;
      newId = `${baseId}-${counter}`;
    }

    return newId;
  }

  /**
   * Command to fix duplicate IDs in the active file
   */
  public static async fixDuplicateIdsInActiveFile(): Promise<void> {
    const activeEditor = window.activeTextEditor;

    if (!activeEditor) {
      window.showErrorMessage('No active editor found');
      return;
    }

    const document = activeEditor.document;
    const fileName = parseWinPath(document.fileName);

    // Only process demo files
    if (!fileName.includes(General.demoFolder)) {
      window.showErrorMessage('Active file is not in the demo folder');
      return;
    }

    if (!fileName.endsWith('.json') && !fileName.endsWith('.yaml') && !fileName.endsWith('.yml')) {
      window.showErrorMessage('Active file is not a JSON or YAML demo file');
      return;
    }

    try {
      const content = await DemoFileProvider.getFile(document.uri);

      if (!content || !content.demos) {
        window.showErrorMessage('No demo content found in the active file');
        return;
      }

      // Find and fix duplicate IDs
      const seenIds = new Set<string>();
      let hasChanges = false;
      let changedCount = 0;

      content.demos.forEach((demo) => {
        if (!demo.id) {
          return;
        }

        if (seenIds.has(demo.id)) {
          const oldId = demo.id;
          const newId = DemoValidationService.generateUniqueId(content.demos, demo.id);
          demo.id = newId;
          hasChanges = true;
          changedCount++;
          console.log(`Changed duplicate ID "${oldId}" to "${newId}"`);
        } else {
          seenIds.add(demo.id);
        }
      });

      if (!hasChanges) {
        window.showInformationMessage('No duplicate demo IDs found');
        return;
      }

      // Apply the changes
      const newContent = DemoFileProvider.formatFileContent(content, document.uri);
      const fullRange = new Range(
        new Position(0, 0),
        document.lineAt(document.lineCount - 1).range.end,
      );

      const edit = new WorkspaceEdit();
      edit.set(document.uri, [TextEdit.replace(fullRange, newContent)]);

      const success = await workspace.applyEdit(edit);

      if (success) {
        window.showInformationMessage(
          `Fixed ${changedCount} duplicate demo ID${changedCount > 1 ? 's' : ''}`,
        );
      } else {
        window.showErrorMessage('Failed to apply changes');
      }
    } catch (error) {
      window.showErrorMessage(
        `Error fixing duplicate IDs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Dispose of the service
   */
  public static dispose(): void {
    if (DemoValidationService.diagnosticCollection) {
      DemoValidationService.diagnosticCollection.dispose();
    }
    DemoValidationService.registered = false;
  }
}

/**
 * Code Action Provider for demo validation quick fixes
 */
class DemoCodeActionProvider implements CodeActionProvider {
  public async provideCodeActions(
    document: TextDocument,
    range: Range,
    context: CodeActionContext,
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'demo-time') {
        continue;
      }

      if (
        diagnostic.code === 'duplicate-demo-id' ||
        diagnostic.code === 'global-duplicate-demo-id'
      ) {
        // Create quick fix to regenerate unique ID
        const action = new CodeAction('Generate unique demo ID', CodeActionKind.QuickFix);

        action.diagnostics = [diagnostic];
        action.edit = await this.createRegenerateIdEdit(document);

        if (action.edit) {
          actions.push(action);
        }
      }
    }

    return actions;
  }

  private async createRegenerateIdEdit(document: TextDocument): Promise<WorkspaceEdit | undefined> {
    try {
      // Parse the current file content
      const content = await DemoFileProvider.getFile(document.uri);

      if (!content || !content.demos) {
        return undefined;
      }

      // Find duplicate IDs and generate new ones
      const seenIds = new Set<string>();
      const edits: TextEdit[] = [];
      let hasChanges = false;

      content.demos.forEach((demo) => {
        if (!demo.id) {
          return;
        }

        if (seenIds.has(demo.id)) {
          // Generate a new unique ID
          const newId = DemoValidationService.generateUniqueId(content.demos, demo.id);
          demo.id = newId;
          hasChanges = true;
        } else {
          seenIds.add(demo.id);
        }
      });

      if (!hasChanges) {
        return undefined;
      }

      // Create the workspace edit to replace the entire file content
      const workspaceEdit = new WorkspaceEdit();
      const newContent = DemoFileProvider.formatFileContent(content, document.uri);
      const fullRange = new Range(
        new Position(0, 0),
        document.lineAt(document.lineCount - 1).range.end,
      );

      workspaceEdit.set(document.uri, [TextEdit.replace(fullRange, newContent)]);

      return workspaceEdit;
    } catch (error) {
      console.error('Error creating regenerate ID edit:', error);
      return undefined;
    }
  }
}
