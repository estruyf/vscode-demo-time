import {
  commands,
  Disposable,
  Range,
  TextDocument,
  TextEditor,
  TextEditorDecorationType,
  window,
  workspace,
} from 'vscode';
import { Extension } from './Extension';
import { Config, COMMAND } from '@demotime/common';
import { Logger } from './Logger';

interface RedactionMatch {
  range: Range;
  maskedText: string;
}

/**
 * Sensitive key names commonly found in configuration files.
 * Used to detect values that should be redacted.
 */
const SENSITIVE_KEY_PATTERN =
  /(?:[a-z0-9]+[_-])*(?:password|passwd|secret|token|api[_-]?key|apikey|access[_-]?key|auth|credential|private[_-]?key|client[_-]?secret|connection[_-]?string|database[_-]?url|db[_-]?password)(?:[_-][a-z0-9]+)*/i;

/**
 * Built-in regex patterns for detecting sensitive data across all file types.
 */
const BUILTIN_PATTERNS: { pattern: RegExp; groupIndex: number }[] = [
  // .env style: KEY=VALUE (captures the value part)
  {
    pattern:
      /^[ \t]*(?:export\s+)?(?:(?:[A-Z0-9]+[_-])*(?:PASSWORD|PASSWD|SECRET|TOKEN|API[_-]?KEY|APIKEY|ACCESS[_-]?KEY|AUTH|CREDENTIAL|PRIVATE[_-]?KEY|CLIENT[_-]?SECRET|CONNECTION[_-]?STRING|DATABASE[_-]?URL|DB[_-]?PASSWORD)(?:[_-][A-Z0-9]+)*)\s*=\s*(.+)$/gim,
    groupIndex: 1,
  },
  // Generic .env values (any KEY=VALUE where value is quoted or long enough to be a secret)
  {
    pattern: /^[ \t]*(?:export\s+)?\w+\s*=\s*(["'][^"'\n]{8,}["'])$/gim,
    groupIndex: 1,
  },
  // JWT tokens (eyJ...)
  {
    pattern: /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+)\b/g,
    groupIndex: 1,
  },
  // Bearer / Basic auth tokens
  {
    pattern: /(?:Bearer|Basic)\s+([A-Za-z0-9+/=_-]{20,})/gi,
    groupIndex: 1,
  },
  // GitHub token formats (classic and fine-grained)
  {
    pattern: /\b((?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}))\b/g,
    groupIndex: 1,
  },
  // Email addresses
  {
    pattern: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    groupIndex: 1,
  },
  // Connection strings
  {
    pattern: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|mssql|redis|amqp):\/\/[^\s"'`,;)}\]]+/gi,
    groupIndex: 0,
  },
];

/**
 * Patterns for structured config files (JSON, YAML, TOML, properties) where
 * we detect sensitive keys and redact their values.
 */
const STRUCTURED_FILE_PATTERNS: { pattern: RegExp; groupIndex: number }[] = [
  // JSON: "sensitiveKey": "value"
  {
    pattern: new RegExp(`"(?:${SENSITIVE_KEY_PATTERN.source})\\w*"\\s*:\\s*"([^"]+)"`, 'gim'),
    groupIndex: 1,
  },
  // YAML: sensitiveKey: value (unquoted or quoted)
  {
    pattern: new RegExp(
      `^[ \\t]*(?:${SENSITIVE_KEY_PATTERN.source})\\w*\\s*:\\s*['"]?([^'"\\n#]+)['"]?`,
      'gim',
    ),
    groupIndex: 1,
  },
  // Properties/INI: sensitiveKey = value
  {
    pattern: new RegExp(`^[ \\t]*(?:${SENSITIVE_KEY_PATTERN.source})\\w*\\s*[=:]\\s*(.+)$`, 'gim'),
    groupIndex: 1,
  },
];

/**
 * File extensions/languages where redaction should apply.
 */
const REDACTABLE_LANGUAGES = new Set([
  'dotenv',
  'ini',
  'properties',
  'json',
  'jsonc',
  'yaml',
  'toml',
  'shellscript',
  'bat',
  'powershell',
  'plaintext',
  'markdown',
  'typescript',
  'javascript',
  'python',
  'java',
  'csharp',
  'go',
  'rust',
  'php',
  'ruby',
  'xml',
  'html',
]);

export class RedactionService {
  private static decorator: TextEditorDecorationType | undefined;
  private static isActive = false;
  private static disposables: Disposable[] = [];

  /**
   * Register the redaction service and its commands.
   */
  public static register() {
    const ext = Extension.getInstance();

    const toggleCmd = commands.registerCommand(COMMAND.toggleRedaction, () => {
      RedactionService.toggle();
    });

    ext.subscriptions.push(toggleCmd);
  }

  /**
   * Enable redaction mode - decorates all visible editors.
   */
  public static enable() {
    if (RedactionService.isActive) {
      return;
    }

    const enabled = Extension.getInstance().getSetting<boolean>(Config.redaction.enabled);
    if (!enabled) {
      return;
    }

    RedactionService.isActive = true;
    RedactionService.createDecorator();
    RedactionService.applyToAllEditors();
    RedactionService.registerListeners();

    Logger.info('Redaction mode enabled');
  }

  /**
   * Disable redaction mode - remove all decorations.
   */
  public static disable() {
    if (!RedactionService.isActive) {
      return;
    }

    RedactionService.isActive = false;
    RedactionService.clearAllDecorations();
    RedactionService.disposeListeners();

    Logger.info('Redaction mode disabled');
  }

  /**
   * Toggle redaction mode on/off.
   */
  public static toggle() {
    if (RedactionService.isActive) {
      RedactionService.disable();
    } else {
      // When toggling manually, force-enable regardless of setting
      RedactionService.isActive = true;
      RedactionService.createDecorator();
      RedactionService.applyToAllEditors();
      RedactionService.registerListeners();

      Logger.info('Redaction mode enabled (manual toggle)');
    }
  }

  /**
   * Whether redaction mode is currently active.
   */
  public static isEnabled(): boolean {
    return RedactionService.isActive;
  }

  /**
   * Create the text editor decoration type for masking sensitive values.
   * Uses letterSpacing trick to hide original text and overlay masked chars.
   */
  private static createDecorator() {
    if (RedactionService.decorator) {
      RedactionService.decorator.dispose();
    }

    RedactionService.decorator = window.createTextEditorDecorationType({
      opacity: '0',
      letterSpacing: '-1000em',
    });
  }

  /**
   * Apply redaction decorations to all currently visible text editors.
   */
  private static applyToAllEditors() {
    for (const editor of window.visibleTextEditors) {
      RedactionService.applyToEditor(editor);
    }
  }

  /**
   * Apply redaction decorations to a single editor.
   */
  private static applyToEditor(editor: TextEditor) {
    if (!RedactionService.isActive || !RedactionService.decorator) {
      return;
    }

    const document = editor.document;
    const matches = RedactionService.findSensitiveData(document);

    if (matches.length === 0) {
      editor.setDecorations(RedactionService.decorator, []);
      return;
    }

    const decorations = matches.map((match) => ({
      range: match.range,
      renderOptions: {
        after: {
          contentText: match.maskedText,
          color: 'var(--vscode-editor-foreground)',
          fontStyle: 'normal',
        },
      },
    }));

    editor.setDecorations(RedactionService.decorator, decorations);
  }

  /**
   * Clear decorations from all visible editors.
   */
  private static clearAllDecorations() {
    if (RedactionService.decorator) {
      for (const editor of window.visibleTextEditors) {
        editor.setDecorations(RedactionService.decorator, []);
      }
      RedactionService.decorator.dispose();
      RedactionService.decorator = undefined;
    }
  }

  /**
   * Register listeners for editor changes while redaction mode is active.
   */
  private static registerListeners() {
    RedactionService.disposeListeners();

    const onEditorChange = window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        RedactionService.applyToEditor(editor);
      }
    });

    const onDocumentChange = workspace.onDidChangeTextDocument((e) => {
      const editor = window.visibleTextEditors.find(
        (ed) => ed.document.uri.toString() === e.document.uri.toString(),
      );
      if (editor) {
        RedactionService.applyToEditor(editor);
      }
    });

    const onVisibleEditorsChange = window.onDidChangeVisibleTextEditors((editors) => {
      for (const editor of editors) {
        RedactionService.applyToEditor(editor);
      }
    });

    RedactionService.disposables.push(onEditorChange, onDocumentChange, onVisibleEditorsChange);

    const ext = Extension.getInstance();
    ext.subscriptions.push(onEditorChange, onDocumentChange, onVisibleEditorsChange);
  }

  /**
   * Dispose all active listeners.
   */
  private static disposeListeners() {
    for (const disposable of RedactionService.disposables) {
      disposable.dispose();
    }
    RedactionService.disposables = [];
  }

  /**
   * Find all sensitive data in a document that should be redacted.
   */
  private static findSensitiveData(document: TextDocument): RedactionMatch[] {
    const text = document.getText();
    const matches: RedactionMatch[] = [];
    const languageId = document.languageId;
    const fileName = document.fileName;

    // Apply built-in patterns
    for (const { pattern, groupIndex } of BUILTIN_PATTERNS) {
      RedactionService.findPatternMatches(document, text, pattern, groupIndex, matches);
    }

    // Apply structured file patterns for config-like files
    const isStructured =
      ['json', 'jsonc', 'yaml', 'ini', 'properties', 'toml'].includes(languageId) ||
      /\.(json|ya?ml|toml|properties|ini|conf)$/i.test(fileName);

    if (isStructured) {
      for (const { pattern, groupIndex } of STRUCTURED_FILE_PATTERNS) {
        RedactionService.findPatternMatches(document, text, pattern, groupIndex, matches);
      }
    }

    // Apply custom user patterns
    const customPatterns =
      Extension.getInstance().getSetting<string[]>(Config.redaction.customPatterns) || [];

    for (const patternStr of customPatterns) {
      try {
        const regex = new RegExp(patternStr, 'gim');
        RedactionService.findPatternMatches(document, text, regex, 0, matches);
      } catch (e) {
        Logger.warning(`Invalid custom redaction pattern: ${patternStr}`);
      }
    }

    return RedactionService.deduplicateMatches(matches);
  }

  /**
   * Find matches for a single pattern and add them to the matches array.
   */
  private static findPatternMatches(
    document: TextDocument,
    text: string,
    pattern: RegExp,
    groupIndex: number,
    matches: RedactionMatch[],
  ) {
    // Reset regex state
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const capturedGroup = match[groupIndex] || fullMatch;

      // Calculate the offset of the captured group within the full match
      const groupOffset = groupIndex > 0 ? fullMatch.indexOf(capturedGroup) : 0;
      const startOffset = match.index + Math.max(0, groupOffset);
      const endOffset = startOffset + capturedGroup.length;

      // Skip very short matches (likely false positives)
      if (capturedGroup.length < 3) {
        continue;
      }

      const startPos = document.positionAt(startOffset);
      const endPos = document.positionAt(endOffset);
      const range = new Range(startPos, endPos);

      const maskedText = '•'.repeat(Math.min(capturedGroup.length, 20));

      matches.push({ range, maskedText });
    }
  }

  /**
   * Remove duplicate/overlapping matches, keeping the longer match.
   */
  private static deduplicateMatches(matches: RedactionMatch[]): RedactionMatch[] {
    if (matches.length <= 1) {
      return matches;
    }

    // Sort by start position
    matches.sort((a, b) => {
      const lineDiff = a.range.start.line - b.range.start.line;
      if (lineDiff !== 0) return lineDiff;
      return a.range.start.character - b.range.start.character;
    });

    const result: RedactionMatch[] = [matches[0]];

    for (let i = 1; i < matches.length; i++) {
      const current = matches[i];
      const previous = result[result.length - 1];

      // Check if current overlaps with previous
      if (
        current.range.start.isBefore(previous.range.end) ||
        current.range.start.isEqual(previous.range.start)
      ) {
        // Keep the longer match
        if (current.range.end.isAfter(previous.range.end)) {
          result[result.length - 1] = current;
        }
      } else {
        result.push(current);
      }
    }

    return result;
  }
}
