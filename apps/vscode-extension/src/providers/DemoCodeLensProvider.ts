import {
  CodeLens,
  CodeLensProvider,
  DocumentSelector,
  EventEmitter,
  Event,
  Position,
  Range,
  TextDocument,
  languages,
} from 'vscode';
import { parseTree, findNodeAtLocation } from 'jsonc-parser';
import { Extension } from '../services/Extension';
import { Subscription } from '../models';
import { COMMAND, Demo } from '@demotime/common';
import { DemoFileProvider } from '../services/DemoFileProvider';

interface SceneLocation {
  line: number;
  title: string;
  idx: number;
  demo: Demo;
  moveLocations: MoveLocation[];
}

interface MoveLocation {
  line: number;
  moveIdx: number;
  action: string;
}

export class DemoCodeLensProvider implements CodeLensProvider {
  private static instance: DemoCodeLensProvider;

  private _onDidChangeCodeLenses = new EventEmitter<void>();
  public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    const selector: DocumentSelector = [
      { pattern: '**/.demo/*.json', language: 'json' },
      { pattern: '**/.demo/*.json', language: 'jsonc' },
      { pattern: '**/.demo/*.yaml', language: 'yaml' },
      { pattern: '**/.demo/*.yml', language: 'yaml' },
    ];

    DemoCodeLensProvider.instance = new DemoCodeLensProvider();

    subscriptions.push(languages.registerCodeLensProvider(selector, DemoCodeLensProvider.instance));
  }

  public static refresh() {
    DemoCodeLensProvider.instance?._onDidChangeCodeLenses.fire();
  }

  public provideCodeLenses(document: TextDocument): CodeLens[] | null {
    const text = document.getText();
    if (!text.trim()) {
      return null;
    }

    const isYaml =
      document.languageId === 'yaml' ||
      document.fileName.endsWith('.yaml') ||
      document.fileName.endsWith('.yml');

    const parsed = DemoFileProvider.parseFileContent(text, document.uri);
    if (!parsed) {
      return null;
    }

    const demos = parsed.demos || [];
    if (demos.length === 0) {
      return null;
    }

    const sceneLocations = isYaml
      ? this.findYamlLocations(document, text, demos)
      : this.findJsonLocations(document, text, demos);

    return this.createCodeLenses(document, sceneLocations);
  }

  private createCodeLenses(document: TextDocument, sceneLocations: SceneLocation[]): CodeLens[] {
    const lenses: CodeLens[] = [];
    const filePath = document.uri.fsPath;

    for (const scene of sceneLocations) {
      const sceneRange = new Range(new Position(scene.line, 0), new Position(scene.line, 0));

      lenses.push(
        new CodeLens(sceneRange, {
          title: '$(play) Run Scene',
          command: COMMAND.runStep,
          tooltip: `Run all moves in "${scene.title}"`,
          arguments: [
            {
              filePath,
              idx: scene.idx,
              demo: scene.demo,
            },
          ],
        }),
      );

      for (const move of scene.moveLocations) {
        const moveRange = new Range(new Position(move.line, 0), new Position(move.line, 0));

        lenses.push(
          new CodeLens(moveRange, {
            title: '$(play) Run Move',
            command: COMMAND.runSingleMove,
            tooltip: `Run move: ${move.action}`,
            arguments: [
              {
                filePath,
                sceneIdx: scene.idx,
                step: scene.demo.steps[move.moveIdx],
              },
            ],
          }),
        );
      }
    }

    return lenses;
  }

  // --- JSON parsing using jsonc-parser AST ---

  private findJsonLocations(document: TextDocument, text: string, demos: Demo[]): SceneLocation[] {
    const root = parseTree(text);
    if (!root) {
      return [];
    }

    const locations: SceneLocation[] = [];

    // Try v3 "scenes" first, then v1/v2 "demos"
    let scenesNode = findNodeAtLocation(root, ['scenes']);
    const isV3 = !!scenesNode;
    if (!scenesNode) {
      scenesNode = findNodeAtLocation(root, ['demos']);
    }

    if (!scenesNode || scenesNode.type !== 'array' || !scenesNode.children) {
      return [];
    }

    for (let i = 0; i < scenesNode.children.length && i < demos.length; i++) {
      const sceneNode = scenesNode.children[i];
      const sceneLine = document.positionAt(sceneNode.offset).line;

      const movesKey = isV3 ? 'moves' : 'steps';
      const movesNode = findNodeAtLocation(sceneNode, [movesKey]);

      const moveLocations: MoveLocation[] = [];

      if (movesNode && movesNode.type === 'array' && movesNode.children) {
        for (let j = 0; j < movesNode.children.length && j < demos[i].steps.length; j++) {
          const moveNode = movesNode.children[j];
          const moveLine = document.positionAt(moveNode.offset).line;

          moveLocations.push({
            line: moveLine,
            moveIdx: j,
            action: demos[i].steps[j]?.action || 'unknown',
          });
        }
      }

      locations.push({
        line: sceneLine,
        title: demos[i].title || `Scene ${i + 1}`,
        idx: i,
        demo: demos[i],
        moveLocations,
      });
    }

    return locations;
  }

  // --- YAML parsing via line scanning ---

  private findYamlLocations(document: TextDocument, text: string, demos: Demo[]): SceneLocation[] {
    const lines = text.split('\n');
    const locations: SceneLocation[] = [];

    // Find the top-level array key: "scenes:" or "demos:"
    let arrayKeyLine = -1;
    let arrayKeyIndent = -1;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(\s*)(scenes|demos)\s*:/);
      if (match) {
        arrayKeyLine = i;
        arrayKeyIndent = match[1].length;
        break;
      }
    }

    if (arrayKeyLine < 0) {
      return [];
    }

    // Find scene array items: lines starting with "- " at the expected indent
    const sceneStarts: { line: number; indent: number }[] = [];
    let sceneItemIndent = -1;

    for (let i = arrayKeyLine + 1; i < lines.length; i++) {
      const line = lines[i];

      // Skip blank lines and comments
      if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
        continue;
      }

      const itemMatch = line.match(/^(\s*)-\s/);
      if (itemMatch) {
        const indent = itemMatch[1].length;

        // First array item determines the indent level
        if (sceneItemIndent < 0) {
          if (indent > arrayKeyIndent) {
            sceneItemIndent = indent;
            sceneStarts.push({ line: i, indent });
          }
          continue;
        }

        if (indent === sceneItemIndent) {
          sceneStarts.push({ line: i, indent });
        } else if (indent <= arrayKeyIndent) {
          // We've left the scenes array
          break;
        }
      } else {
        // Non-array-item line: check if we've exited the block
        const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
        if (lineIndent <= arrayKeyIndent && line.trim().length > 0) {
          break;
        }
      }
    }

    // For each scene, find its moves/steps array items
    for (let sceneIdx = 0; sceneIdx < sceneStarts.length && sceneIdx < demos.length; sceneIdx++) {
      const sceneStart = sceneStarts[sceneIdx];
      const sceneEnd =
        sceneIdx + 1 < sceneStarts.length ? sceneStarts[sceneIdx + 1].line : lines.length;

      const moveLocations = this.findYamlMoveLocations(
        lines,
        sceneStart.line,
        sceneEnd,
        sceneStart.indent,
        demos[sceneIdx],
      );

      locations.push({
        line: sceneStart.line,
        title: demos[sceneIdx].title || `Scene ${sceneIdx + 1}`,
        idx: sceneIdx,
        demo: demos[sceneIdx],
        moveLocations,
      });
    }

    return locations;
  }

  private findYamlMoveLocations(
    lines: string[],
    sceneStartLine: number,
    sceneEndLine: number,
    sceneIndent: number,
    demo: Demo,
  ): MoveLocation[] {
    const moveLocations: MoveLocation[] = [];

    // Find "moves:" or "steps:" within this scene block
    let movesKeyLine = -1;
    let movesKeyIndent = -1;

    for (let i = sceneStartLine + 1; i < sceneEndLine; i++) {
      const match = lines[i].match(/^(\s*)(moves|steps)\s*:/);
      if (match && match[1].length > sceneIndent) {
        movesKeyLine = i;
        movesKeyIndent = match[1].length;
        break;
      }
    }

    if (movesKeyLine < 0) {
      return moveLocations;
    }

    // Find move array items
    let moveItemIndent = -1;
    let moveIdx = 0;

    for (let i = movesKeyLine + 1; i < sceneEndLine; i++) {
      const line = lines[i];

      if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
        continue;
      }

      const itemMatch = line.match(/^(\s*)-\s/);
      if (itemMatch) {
        const indent = itemMatch[1].length;

        if (moveItemIndent < 0) {
          if (indent > movesKeyIndent) {
            moveItemIndent = indent;
            if (moveIdx < demo.steps.length) {
              moveLocations.push({
                line: i,
                moveIdx,
                action: demo.steps[moveIdx]?.action || 'unknown',
              });
              moveIdx++;
            }
          }
          continue;
        }

        if (indent === moveItemIndent) {
          if (moveIdx < demo.steps.length) {
            moveLocations.push({
              line: i,
              moveIdx,
              action: demo.steps[moveIdx]?.action || 'unknown',
            });
            moveIdx++;
          }
        } else if (indent <= movesKeyIndent) {
          break;
        }
      } else {
        const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
        if (lineIndent <= movesKeyIndent && line.trim().length > 0) {
          break;
        }
      }
    }

    return moveLocations;
  }
}
