/**
 * Entry point of `skills/demotime-code-demo/scripts/validate-act.mjs`.
 *
 * Bundled by `scripts/skills/build-skills.mjs`. Validates Demo Time act files against the JSON
 * schema and checks what the schema can't: files the moves read, placeholders the moves search
 * for, and duplicate scene IDs.
 */
import Ajv from 'ajv';
import { load as yamlLoad } from 'js-yaml';
import { parse as jsoncParse, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = `Demo Time act validator

Usage:
  node validate-act.mjs [act files...] [--root <workspace folder>] [--schema <schema.json>]

Without act files, all acts in <root>/.demo are validated. The root defaults to the current folder.
Exits with code 1 when an act has errors.
`;

const ACT_EXTENSIONS = ['.json', '.yaml', '.yml'];
const VARIABLES_FILE = 'variables.json';

/** Moves that need the file in `path` to exist when they run. */
const READS_PATH = new Set([
  'open',
  'markdownPreview',
  'imagePreview',
  'openSlide',
  'highlight',
  'selection',
  'positionCursor',
  'insert',
  'replace',
  'delete',
  'write',
  'rename',
  'move',
  'copy',
  'deleteFile',
]);

/** Moves that create or change the file in `path` (or `dest`). */
const WRITES_PATH = new Set(['create', 'insert', 'replace', 'delete', 'write', 'applyPatch']);
const WRITES_DEST = new Set(['copy', 'move', 'rename']);

interface Issue {
  level: 'error' | 'warning';
  location: string;
  message: string;
}

type Move = Record<string, unknown> & { action?: string };
type Scene = Record<string, unknown> & { moves?: Move[]; steps?: Move[] };

function getArg(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx === -1 ? undefined : args[idx + 1];
}

function findSchema(explicit: string | undefined): string {
  if (explicit) {
    return resolve(explicit);
  }
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  return join(scriptDir, '..', 'references', 'demo-time.schema.json');
}

function findActs(root: string): string[] {
  const demoFolder = join(root, '.demo');
  if (!existsSync(demoFolder)) {
    return [];
  }
  return readdirSync(demoFolder)
    .filter((name) => ACT_EXTENSIONS.includes(extname(name)) && name !== VARIABLES_FILE)
    .map((name) => join(demoFolder, name));
}

function parseAct(filePath: string, issues: Issue[], location: string): unknown {
  const content = readFileSync(filePath, 'utf8');
  if (extname(filePath) === '.json') {
    const errors: ParseError[] = [];
    const data = jsoncParse(content, errors, { allowTrailingComma: true });
    for (const error of errors) {
      issues.push({
        level: 'error',
        location: `${location} (offset ${error.offset})`,
        message: `Invalid JSON: ${printParseErrorCode(error.error)}`,
      });
    }
    return errors.length ? undefined : data;
  }

  try {
    return yamlLoad(content);
  } catch (error) {
    issues.push({ level: 'error', location, message: `Invalid YAML: ${(error as Error).message}` });
    return undefined;
  }
}

function hasVariable(value: string): boolean {
  return /\{[^}]+\}/.test(value);
}

function countOccurrences(text: string, search: string): number {
  let count = 0;
  let idx = text.indexOf(search);
  while (idx !== -1) {
    count++;
    idx = text.indexOf(search, idx + search.length);
  }
  return count;
}

function checkMoves(
  root: string,
  act: Record<string, unknown>,
  location: string,
  sceneIds: Map<string, string>,
  issues: Issue[],
) {
  const scenes = ((act.scenes ?? act.demos) as Scene[] | undefined) ?? [];
  // Files that a previous move creates or changes, so their state on disk says nothing about the
  // state at the time the move runs. The value is the file content when it is known (a `create`
  // move), or undefined when it isn't.
  const touched = new Map<string, string | undefined>();

  scenes.forEach((scene, sceneIdx) => {
    const sceneLocation = `${location} > scene ${sceneIdx + 1}${scene.title ? ` "${scene.title}"` : ''}`;

    if (typeof scene.id === 'string') {
      const previous = sceneIds.get(scene.id);
      if (previous) {
        issues.push({
          level: 'error',
          location: sceneLocation,
          message: `Duplicate scene id "${scene.id}" (also used by ${previous})`,
        });
      }
      sceneIds.set(scene.id, sceneLocation);
    }

    const notes = scene.notes as { path?: string } | undefined;
    if (notes?.path && !hasVariable(notes.path) && !existsSync(join(root, notes.path))) {
      issues.push({
        level: 'warning',
        location: sceneLocation,
        message: `Notes file "${notes.path}" does not exist`,
      });
    }

    const moves = scene.moves ?? scene.steps ?? [];
    moves.forEach((move, moveIdx) => {
      const moveLocation = `${sceneLocation} > move ${moveIdx + 1} (${move.action ?? 'no action'})`;
      checkMove(root, move, moveLocation, touched, issues);

      const path = typeof move.path === 'string' ? move.path : undefined;
      if (path && move.action && WRITES_PATH.has(move.action)) {
        touched.set(path, move.action === 'create' ? getCreateContent(root, move) : undefined);
      }
      if (typeof move.dest === 'string' && move.action && WRITES_DEST.has(move.action)) {
        touched.set(move.dest, path ? getFileContent(root, path, touched) : undefined);
      }
    });
  });
}

/** The content of a file when the move runs, or undefined when it can't be known. */
function getFileContent(
  root: string,
  path: string,
  touched: Map<string, string | undefined>,
): string | undefined {
  if (touched.has(path)) {
    return touched.get(path);
  }
  const filePath = join(root, path);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : undefined;
}

function getCreateContent(root: string, move: Move): string | undefined {
  if (typeof move.content === 'string') {
    return move.content;
  }
  if (typeof move.contentPath === 'string' && !hasVariable(move.contentPath)) {
    const contentPath = join(root, move.contentPath);
    return existsSync(contentPath) ? readFileSync(contentPath, 'utf8') : undefined;
  }
  return '';
}

function checkMove(
  root: string,
  move: Move,
  location: string,
  touched: Map<string, string | undefined>,
  issues: Issue[],
) {
  const action = move.action ?? '';
  const path = typeof move.path === 'string' ? move.path : undefined;

  for (const key of ['contentPath', 'patch'] as const) {
    const value = move[key];
    if (typeof value === 'string' && !hasVariable(value) && !existsSync(join(root, value))) {
      issues.push({ level: 'error', location, message: `${key} "${value}" does not exist` });
    }
  }

  if (path && !hasVariable(path) && READS_PATH.has(action)) {
    if (!existsSync(join(root, path)) && !touched.has(path)) {
      issues.push({
        level: 'warning',
        location,
        message: `"${path}" does not exist and no earlier move creates it`,
      });
    }
  }

  if (move.position !== undefined && move.startPlaceholder !== undefined) {
    issues.push({
      level: 'warning',
      location,
      message: '"position" and "startPlaceholder" are both set; "position" wins',
    });
  }

  for (const key of ['startPlaceholder', 'endPlaceholder'] as const) {
    const value = move[key];
    if (typeof value === 'string' && value.includes('\n')) {
      issues.push({
        level: 'error',
        location,
        message: `${key} must be a single line of text; Demo Time searches for it line by line`,
      });
    }
  }

  const start = typeof move.startPlaceholder === 'string' ? move.startPlaceholder : undefined;
  const end = typeof move.endPlaceholder === 'string' ? move.endPlaceholder : undefined;
  if (!path || !start || hasVariable(path)) {
    return;
  }

  const text = getFileContent(root, path, touched);
  if (text === undefined) {
    return;
  }

  const startIdx = text.indexOf(start);
  if (startIdx === -1) {
    issues.push({
      level: 'error',
      location,
      message: `startPlaceholder "${start}" is not found in "${path}"`,
    });
    return;
  }

  if (countOccurrences(text, start) > 1) {
    issues.push({
      level: 'warning',
      location,
      message: `startPlaceholder "${start}" occurs more than once in "${path}"; the first one is used`,
    });
  }

  if (end && text.indexOf(end, startIdx) === -1) {
    issues.push({
      level: 'error',
      location,
      message: `endPlaceholder "${end}" is not found after the startPlaceholder in "${path}"`,
    });
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(USAGE);
    return;
  }

  const root = resolve(getArg(args, '--root') ?? '.');
  const schemaPath = findSchema(getArg(args, '--schema'));
  const optionValues = new Set([getArg(args, '--root'), getArg(args, '--schema')]);
  const files = args
    .filter((arg) => !arg.startsWith('--') && !optionValues.has(arg))
    .map((file) => resolve(file));
  const acts = files.length ? files : findActs(root);

  if (acts.length === 0) {
    process.stderr.write(`No act files found in ${join(root, '.demo')}\n`);
    process.exit(1);
  }

  if (!existsSync(schemaPath)) {
    process.stderr.write(`Schema not found at ${schemaPath}. Pass it with --schema.\n`);
    process.exit(1);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));
  const issues: Issue[] = [];
  // Scene IDs must be unique over all acts, `runDemoById` and the API look them up by ID.
  const sceneIds = new Map<string, string>();

  for (const actPath of acts) {
    const location = relative(root, actPath) || basename(actPath);
    if (!existsSync(actPath)) {
      issues.push({ level: 'error', location, message: 'File does not exist' });
      continue;
    }

    const act = parseAct(actPath, issues, location);
    if (!act || typeof act !== 'object') {
      if (act !== undefined) {
        issues.push({ level: 'error', location, message: 'The act must be an object' });
      }
      continue;
    }

    if (!validate(act)) {
      // `if` errors only repeat that a `then` failed; the errors of the `then` itself say why.
      const errors = (validate.errors ?? []).filter((error) => error.keyword !== 'if');
      for (const error of errors) {
        const params = error.params as Record<string, unknown>;
        if (error.keyword === 'anyOf' || error.keyword === 'oneOf') {
          issues.push({
            level: 'error',
            location: `${location} ${error.instancePath || '/'}`,
            message:
              error.keyword === 'oneOf'
                ? 'must have exactly one of the property sets above'
                : 'must have one of the property sets above',
          });
          continue;
        }
        const extra =
          error.keyword === 'additionalProperties'
            ? ` ("${params.additionalProperty}")`
            : error.keyword === 'enum'
              ? ` (${(params.allowedValues as unknown[]).join(', ')})`
              : '';
        issues.push({
          level: 'error',
          location: `${location} ${error.instancePath || '/'}`,
          message: `${error.message ?? error.keyword}${extra}`,
        });
      }
    }

    const actObj = act as Record<string, unknown>;
    if (actObj.version !== 3) {
      issues.push({
        level: 'warning',
        location,
        message: 'Use "version": 3 with "scenes" and "moves" for new acts',
      });
    }

    checkMoves(root, actObj, location, sceneIds, issues);
  }

  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');

  for (const issue of [...errors, ...warnings]) {
    process.stdout.write(`${issue.level.toUpperCase()} ${issue.location}: ${issue.message}\n`);
  }

  process.stdout.write(
    `\nChecked ${acts.length} act file(s): ${errors.length} error(s), ${warnings.length} warning(s)\n`,
  );
  process.exit(errors.length ? 1 : 0);
}

main();
