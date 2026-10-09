import { posix } from 'path';
import yaml from 'js-yaml';
import { applyPatch } from 'diff';
import { findNodeAtLocation, parse as jsonParse, parseTree, JSONPath } from 'jsonc-parser';
import { Action, ActProblem, isSnippetFileFormat, SlideParser, Step } from '@demotime/common';
import { General, StateKeys } from '../constants';
import { insertVariables } from './insertVariables';
import { parseSnippetContent } from './parseSnippetContent';

export type PreflightProblemCode =
  | 'preflight-missing-file'
  | 'preflight-outside-workspace'
  | 'preflight-destination-exists'
  | 'preflight-unknown-action'
  | 'preflight-missing-property'
  | 'preflight-unknown-scene'
  | 'preflight-patch-conflict'
  | 'preflight-slide-out-of-range'
  | 'preflight-missing-argument'
  | 'preflight-unset-variable'
  | 'preflight-invalid-snippet'
  | 'preflight-invalid-act';

export type PreflightProblemSeverity = 'error' | 'warning';

export interface PreflightProblem extends ActProblem {
  code: PreflightProblemCode;
  severity: PreflightProblemSeverity;
  /**
   * Zero-based position of the move (or its property) in the act file
   */
  line: number;
  character: number;
}

export interface PreflightAct {
  filePath: string;
  content: string;
}

export interface PreflightActResult {
  filePath: string;
  moves: number;
  problems: PreflightProblem[];
}

export interface PreflightHost {
  /**
   * Checks if a file exists, with the path relative to the workspace folder
   */
  fileExists: (path: string) => Promise<boolean>;
  /**
   * Reads a file, with the path relative to the workspace folder
   */
  readFile: (path: string) => Promise<string | undefined>;
  /**
   * Checks that a path relative to the workspace folder doesn't escape it
   */
  isInWorkspace: (path: string) => boolean;
  /**
   * The variables that are known before the play runs (`variables.json`)
   */
  variables?: Record<string, unknown>;
}

// Moves that open, change or remove the file in their `path`
const PATH_ACTIONS = new Set<Action>([
  Action.Open,
  Action.MarkdownPreview,
  Action.ImagePreview,
  Action.OpenSlide,
  Action.Copy,
  Action.Move,
  Action.Rename,
  Action.DeleteFile,
  Action.ApplyPatch,
  Action.Insert,
  Action.Highlight,
  Action.Selection,
  Action.Replace,
  Action.Delete,
  Action.PositionCursor,
  Action.Write,
  Action.ExecuteScript,
]);

// Moves that don't do anything without a `path`
const REQUIRES_PATH = new Set<Action>([
  ...[...PATH_ACTIONS].filter((action) => action !== Action.Write),
  Action.Create,
]);

// Moves that need a `position` or `startPlaceholder` in their file
const REQUIRES_POSITION = new Set<Action>([
  Action.Insert,
  Action.Highlight,
  Action.Selection,
  Action.Replace,
  Action.Delete,
  Action.PositionCursor,
]);

// Moves that read their content from the file in `contentPath`
const CONTENT_PATH_ACTIONS = new Set<Action>([
  Action.Create,
  Action.Insert,
  Action.Replace,
  Action.Write,
  Action.ApplyPatch,
  Action.CopyToClipboard,
]);

// Moves that can create or remove files in a way the check can't follow
const UNTRACKED_ACTIONS = new Set<Action>([
  Action.ExecuteTerminalCommand,
  Action.ExecuteScript,
  Action.ExecuteVSCodeCommand,
  Action.EditChat,
  Action.AgentChat,
  Action.CustomChat,
]);

const ACTIONS = new Set<string>(Object.values(Action));

// Variables that only get their value while the play runs
const RUNTIME_VARIABLE = new RegExp(
  `\\{(${StateKeys.prefix.state}|${StateKeys.prefix.script})[^}]*\\}|\\{(${StateKeys.prefix.input}|${StateKeys.prefix.clipboard})\\}`,
);

// The placeholders of a snippet, the same way the act editor finds the snippet arguments
const SNIPPET_PLACEHOLDER = /\{([a-zA-Z0-9_-]+)\}/g;

const URL_SCHEME = /^[a-z][a-z\d+.-]+:\/\//i;

interface PlayState {
  /**
   * Files that an earlier move creates (`true`) or removes (`false`)
   */
  files: Map<string, boolean>;
  /**
   * Whether an earlier move can create or remove files the check can't follow
   */
  hasUntrackedMoves: boolean;
  /**
   * The ids of the scenes in all acts
   */
  sceneIds: Set<string>;
  /**
   * The keys that earlier `setState` moves set
   */
  stateKeys: Set<string>;
  /**
   * The ids of earlier `executeScript` moves
   */
  scriptIds: Set<string>;
}

interface MoveContext {
  version: number;
  snippetPath?: string;
  /**
   * Snippet placeholders without a value, which are reported once at the snippet move
   */
  unsetPlaceholders?: Set<string>;
}

/**
 * A problem of a move, at a property of the move or at the move itself
 */
type MoveProblem = Omit<PreflightProblem, 'line' | 'character' | 'sceneIndex' | 'moveIndex'>;

interface ParsedAct {
  act: PreflightAct;
  config?: any;
  error?: string;
}

/**
 * Checks every move in the play without running it: the files it uses, the properties it needs,
 * the scenes and variables it refers to, and whether its patch applies. The acts are checked in
 * play order, so a file that an earlier move creates, copies or moves isn't reported as missing.
 */
export const getPreflightProblems = async (
  acts: PreflightAct[],
  host: PreflightHost,
): Promise<PreflightActResult[]> => {
  const parsedActs = acts.map(parseAct);

  const state: PlayState = {
    files: new Map(),
    hasUntrackedMoves: false,
    sceneIds: new Set(
      parsedActs.flatMap(({ config }) =>
        getScenes(config).scenes.flatMap((scene) =>
          typeof scene?.id === 'string' ? [scene.id] : [],
        ),
      ),
    ),
    stateKeys: new Set(),
    scriptIds: new Set(),
  };

  const results: PreflightActResult[] = [];
  for (const parsedAct of parsedActs) {
    results.push(await checkAct(parsedAct, host, state));
  }

  return results;
};

const parseAct = (act: PreflightAct): ParsedAct => {
  try {
    const config = /\.ya?ml$/i.test(act.filePath) ? yaml.load(act.content) : jsonParse(act.content);
    return { act, config: config && typeof config === 'object' ? config : undefined };
  } catch (error) {
    return { act, error: (error as Error).message };
  }
};

/**
 * Version 3 act files use scenes and moves, older ones use demos and steps
 */
const getScenes = (config: any): { scenesKey: string; scenes: any[] } => {
  const scenesKey = Array.isArray(config?.scenes) ? 'scenes' : 'demos';
  return { scenesKey, scenes: Array.isArray(config?.[scenesKey]) ? config[scenesKey] : [] };
};

const checkAct = async (
  { act, config, error }: ParsedAct,
  host: PreflightHost,
  state: PlayState,
): Promise<PreflightActResult> => {
  const result: PreflightActResult = { filePath: act.filePath, moves: 0, problems: [] };

  if (error) {
    result.problems.push({
      code: 'preflight-invalid-act',
      message: `The act file can't be parsed: ${error}`,
      severity: 'error',
      line: 0,
      character: 0,
    });
    return result;
  }

  const locate = createLocator(act.content, /\.ya?ml$/i.test(act.filePath));
  const { scenesKey, scenes } = getScenes(config);
  // Act files without a version are version 1, which resolves content paths from `.demo`
  const version = typeof config?.version === 'number' ? config.version : 1;

  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    const scene = scenes[sceneIndex];
    if (!scene || scene.disabled) {
      continue;
    }

    if (typeof scene.notes?.path === 'string') {
      const problem = await checkFile(
        resolveContentPath(scene.notes.path, version),
        `Notes file "${scene.notes.path}"`,
        host,
        state,
        true,
      );
      if (problem) {
        result.problems.push({
          ...problem,
          ...locate([scenesKey, sceneIndex, 'notes', 'path']),
          sceneIndex,
          property: 'notes',
        });
      }
    }

    const movesKey = Array.isArray(scene.moves) ? 'moves' : 'steps';
    const moves: Step[] = Array.isArray(scene[movesKey]) ? scene[movesKey] : [];

    for (let moveIndex = 0; moveIndex < moves.length; moveIndex++) {
      const move = moves[moveIndex];
      if (!move || typeof move !== 'object' || move.disabled) {
        continue;
      }

      result.moves++;
      const movePath: JSONPath = [scenesKey, sceneIndex, movesKey, moveIndex];
      const problems =
        move.action === Action.Snippet
          ? await checkSnippet(move, { version }, host, state)
          : await checkMove(move, { version }, host, state);

      result.problems.push(
        ...problems.map((problem) => ({
          ...problem,
          ...locate(problem.property ? [...movePath, problem.property] : movePath),
          sceneIndex,
          moveIndex,
        })),
      );
    }
  }

  return result;
};

const checkMove = async (
  move: Step,
  context: MoveContext,
  host: PreflightHost,
  state: PlayState,
): Promise<MoveProblem[]> => {
  const problems: MoveProblem[] = [];
  const action = move.action;
  const label = context.snippetPath
    ? `Snippet "${context.snippetPath}": the \`${action}\` move`
    : `The \`${action}\` move`;

  if (!action || !ACTIONS.has(action)) {
    problems.push({
      code: 'preflight-unknown-action',
      message: action
        ? `\`${action}\` isn't a Demo Time move, so it doesn't run.`
        : `${context.snippetPath ? `Snippet "${context.snippetPath}": a` : 'A'} move without an \`action\` doesn't run.`,
      severity: 'error',
      property: action ? 'action' : undefined,
    });
    return problems;
  }

  for (const property of getMissingProperties(move)) {
    problems.push({
      code: 'preflight-missing-property',
      message: `${label} is missing ${property}, so it doesn't run.`,
      severity: 'error',
    });
  }

  problems.push(...getUnsetVariables(move, label, state));

  const path = await getPathValue(move.path, host, context);
  const contentPath = await getPathValue(move.contentPath, host, context);
  const patch = await getPathValue(move.patch, host, context);
  const dest = await getPathValue(move.dest, host, context);

  let pathExists = false;
  if (path && PATH_ACTIONS.has(action) && !URL_SCHEME.test(path)) {
    const name = action === Action.ExecuteScript ? 'script file' : 'file';
    const problem = await checkFile(path, `${label} uses ${name} "${path}"`, host, state, false);
    if (problem) {
      problems.push({ ...problem, property: 'path' });
    } else {
      pathExists = true;
    }
  }

  let contentPathExists = false;
  if (contentPath && CONTENT_PATH_ACTIONS.has(action)) {
    const problem = await checkFile(
      resolveContentPath(contentPath, context.version),
      `${label} uses content file "${contentPath}"`,
      host,
      state,
      true,
    );
    if (problem) {
      problems.push({ ...problem, property: 'contentPath' });
    } else {
      contentPathExists = true;
    }
  }

  if (patch && action === Action.ApplyPatch) {
    const problem = await checkFile(
      resolveContentPath(patch, context.version),
      `${label} uses patch file "${patch}"`,
      host,
      state,
      true,
    );
    if (problem) {
      problems.push({ ...problem, property: 'patch' });
    } else if (!contentPath || contentPathExists) {
      problems.push(...(await checkPatch(move, patch, contentPath, context, label, host, state)));
    }
  }

  if (path && pathExists && action === Action.OpenSlide && move.slide !== undefined) {
    problems.push(...(await checkSlideNumber(move, path, label, host, state)));
  }

  if (action === Action.RunDemoById && move.id && !state.sceneIds.has(move.id)) {
    problems.push({
      code: 'preflight-unknown-scene',
      message: `${label} runs the scene with id \`${move.id}\`, which doesn't exist in any act.`,
      severity: 'error',
      property: 'id',
    });
  }

  const isFileMove = action === Action.Copy || action === Action.Move || action === Action.Rename;
  if (dest && isFileMove && !move.overwrite && (await exists(dest, host, state))) {
    problems.push({
      code: 'preflight-destination-exists',
      message: `${label} copies or moves the file to "${dest}", which already exists. The move fails unless \`overwrite\` is set to \`true\`.`,
      severity: 'warning',
      property: 'dest',
    });
  }

  // Keep track of what this move creates or removes, for the moves that follow
  if (path && action === Action.Create) {
    state.files.set(normalizePath(path), true);
  } else if (path && action === Action.DeleteFile) {
    state.files.set(normalizePath(path), false);
  } else if (path && dest && isFileMove) {
    state.files.set(normalizePath(dest), true);
    if (action !== Action.Copy) {
      state.files.set(normalizePath(path), false);
    }
  }

  if (action === Action.SetState && move.state?.key) {
    state.stateKeys.add(move.state.key);
  }

  if (action === Action.ExecuteScript && move.id) {
    state.scriptIds.add(move.id);
  }

  if (UNTRACKED_ACTIONS.has(action)) {
    state.hasUntrackedMoves = true;
  }

  return problems;
};

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

/**
 * The properties a move needs to run, which the runner otherwise skips the move for
 */
const getMissingProperties = (move: Step): string[] => {
  const missing: string[] = [];
  const need = (name: string, ...values: unknown[]) => {
    if (!values.some(hasValue)) {
      missing.push(name);
    }
  };

  const action = move.action;
  if (REQUIRES_PATH.has(action)) {
    need('`path`', move.path);
  }

  if (REQUIRES_POSITION.has(action) || (action === Action.Write && hasValue(move.path))) {
    need('`position` or `startPlaceholder`', move.position, move.startPlaceholder);
  }

  switch (action) {
    case Action.Copy:
    case Action.Move:
    case Action.Rename:
      need('`dest`', move.dest);
      break;
    case Action.ApplyPatch:
      need('`patch`', move.patch);
      break;
    case Action.ExecuteScript:
      need('`id`', move.id);
      need('`command`', move.command);
      break;
    case Action.RunDemoById:
      need('`id`', move.id);
      break;
    case Action.OpenWebsite:
    case Action.ShowQR:
      need('`url`', move.url);
      break;
    case Action.SetState:
      need('`state.key`', move.state?.key);
      need('`state.value`', move.state?.value);
      break;
    case Action.SetSetting:
      need('`setting.key`', move.setting?.key);
      break;
    case Action.SetTheme:
      need('`theme`', move.theme);
      break;
    case Action.ExecuteVSCodeCommand:
    case Action.ExecuteTerminalCommand:
      need('`command`', move.command);
      break;
    case Action.ShowInfoMessage:
      need('`message`', move.message);
      break;
    case Action.SendKeybinding:
      need('`keybinding`', move.keybinding);
      break;
    case Action.Snippet:
      need('`contentPath`', move.contentPath);
      break;
    case Action.TypeText:
      need('`content`', move.content);
      break;
    case Action.Insert:
    case Action.CopyToClipboard:
      need('`content` or `contentPath`', move.content, move.contentPath);
      break;
    case Action.Write:
      // Without a path, the move writes `content` at the cursor
      if (hasValue(move.path)) {
        need('`content` or `contentPath`', move.content, move.contentPath);
      } else {
        need('`content`', move.content);
      }
      break;
  }

  return missing;
};

/**
 * `{STATE_key}` and `{SCRIPT_id}` variables that no earlier `setState` or `executeScript` move sets
 */
const getUnsetVariables = (move: Step, label: string, state: PlayState): MoveProblem[] => {
  const problems: MoveProblem[] = [];
  const json = JSON.stringify(move);
  const reported = new Set<string>();

  const regex = new RegExp(
    `\\{(${StateKeys.prefix.state}|${StateKeys.prefix.script})([^}]+)\\}`,
    'g',
  );
  let match: RegExpExecArray | null;
  while ((match = regex.exec(json)) !== null) {
    const [variable, prefix, name] = match;
    if (reported.has(variable)) {
      continue;
    }
    reported.add(variable);

    const isState = prefix === StateKeys.prefix.state;
    if (isState ? state.stateKeys.has(name) : state.scriptIds.has(name)) {
      continue;
    }

    problems.push({
      code: 'preflight-unset-variable',
      message: isState
        ? `${label} uses \`${variable}\`, but no earlier \`setState\` move sets the \`${name}\` key, so the text \`${variable}\` stays as is.`
        : `${label} uses \`${variable}\`, but no earlier \`executeScript\` move has the id \`${name}\`, so the text \`${variable}\` stays as is.`,
      severity: 'warning',
    });
  }

  return problems;
};

/**
 * The runner applies the patch to the content of the move (the snapshot), not to the file, so
 * whether it applies doesn't depend on what earlier moves do
 */
const checkPatch = async (
  move: Step,
  patch: string,
  contentPath: string | undefined,
  context: MoveContext,
  label: string,
  host: PreflightHost,
  state: PlayState,
): Promise<MoveProblem[]> => {
  const patchPath = resolveContentPath(patch, context.version);
  const snapshotPath = contentPath ? resolveContentPath(contentPath, context.version) : undefined;

  // Files that an earlier move creates or changes can't be read yet
  if (state.files.has(normalizePath(patchPath))) {
    return [];
  }
  if (snapshotPath && state.files.has(normalizePath(snapshotPath))) {
    return [];
  }

  const patchContent = await host.readFile(patchPath);
  const snapshot = snapshotPath ? await host.readFile(snapshotPath) : move.content || '';
  if (!patchContent || snapshot === undefined) {
    return [];
  }

  let patched: string | false;
  try {
    patched = applyPatch(snapshot, patchContent);
  } catch {
    patched = false;
  }

  if (patched !== false) {
    return [];
  }

  return [
    {
      code: 'preflight-patch-conflict',
      message: `${label} applies patch "${patch}", which doesn't apply to ${contentPath ? `content file "${contentPath}"` : 'the `content` of the move'}.`,
      severity: 'error',
      property: 'patch',
    },
  ];
};

/**
 * The `slide` number of an `openSlide` move is 1-based, and counts the hidden slides as well
 */
const checkSlideNumber = async (
  move: Step,
  path: string,
  label: string,
  host: PreflightHost,
  state: PlayState,
): Promise<MoveProblem[]> => {
  const slide = Number(move.slide);
  if (!Number.isFinite(slide) || slide <= 1 || state.files.has(normalizePath(path))) {
    return [];
  }

  const markdown = await host.readFile(path);
  if (markdown === undefined) {
    return [];
  }

  const count = new SlideParser().parseSlides(markdown).length;
  if (slide <= count) {
    return [];
  }

  return [
    {
      code: 'preflight-slide-out-of-range',
      message: `${label} opens slide ${slide}, but "${path}" has ${count} slide${count === 1 ? '' : 's'}.`,
      severity: 'error',
      property: 'slide',
    },
  ];
};

/**
 * Expands a snippet the same way the runner does, and checks its arguments and moves
 */
const checkSnippet = async (
  move: Step,
  context: MoveContext,
  host: PreflightHost,
  state: PlayState,
): Promise<MoveProblem[]> => {
  const problems = getMissingProperties(move).map(
    (property): MoveProblem => ({
      code: 'preflight-missing-property',
      message: `The \`snippet\` move is missing ${property}, so it doesn't run.`,
      severity: 'error',
    }),
  );

  const contentPath = await getPathValue(move.contentPath, host, context);
  if (!contentPath) {
    return problems;
  }

  const snippetPath = resolveContentPath(contentPath, context.version);
  const problem = await checkFile(
    snippetPath,
    `The \`snippet\` move uses snippet file "${contentPath}"`,
    host,
    state,
    true,
  );
  if (problem) {
    return [...problems, { ...problem, property: 'contentPath' }];
  }

  let snippet = await host.readFile(snippetPath);
  if (snippet === undefined) {
    return problems;
  }

  const argumentProblems = getSnippetArgumentProblems(snippet, contentPath, move.args, host);
  problems.push(...argumentProblems.map(({ problem }) => problem));

  let moves: Step[];
  try {
    snippet = await insertVariables(snippet, move.args || {});
    snippet = await insertVariables(snippet, host.variables || {});
    moves = parseSnippetContent(snippet, contentPath);
  } catch (error) {
    return [
      ...problems,
      {
        code: 'preflight-invalid-snippet',
        message: (error as Error).message,
        severity: 'error',
        property: 'contentPath',
      },
    ];
  }

  for (const snippetMove of moves) {
    if (!snippetMove || typeof snippetMove !== 'object' || snippetMove.disabled) {
      continue;
    }

    const moveProblems = await checkMove(
      snippetMove,
      {
        ...context,
        snippetPath: contentPath,
        unsetPlaceholders: new Set(argumentProblems.map(({ name }) => name)),
      },
      host,
      state,
    );
    problems.push(...moveProblems.map((problem) => ({ ...problem, property: 'contentPath' })));
  }

  return problems;
};

/**
 * Snippet placeholders that the `args` of the move don't set, which stay in the snippet as text.
 * For a snippet with `fields`, only its fields are checked.
 */
const getSnippetArgumentProblems = (
  snippet: string,
  contentPath: string,
  args: unknown,
  host: PreflightHost,
): { name: string; problem: MoveProblem }[] => {
  const placeholders = new Set([...snippet.matchAll(SNIPPET_PLACEHOLDER)].map(([, name]) => name));
  const isSet = (name: string) =>
    (!!args && typeof args === 'object' && name in args) ||
    (!!host.variables && name in host.variables) ||
    RUNTIME_VARIABLE.test(`{${name}}`);

  let parsed: unknown;
  try {
    parsed = /\.ya?ml$/i.test(contentPath) ? yaml.load(snippet) : jsonParse(snippet);
  } catch {
    parsed = undefined;
  }

  const fields =
    isSnippetFileFormat(parsed) && parsed.fields?.length
      ? parsed.fields.map(({ name, required }) => ({ name, required: !!required }))
      : [...placeholders].map((name) => ({ name, required: false }));

  return fields
    .filter(({ name }) => placeholders.has(name) && !isSet(name))
    .map(({ name, required }) => ({
      name,
      problem: {
        code: 'preflight-missing-argument',
        message: `The snippet "${contentPath}" uses the ${required ? 'required ' : ''}\`${name}\` argument, which the \`args\` of the move don't set, so the text \`{${name}}\` stays as is.`,
        severity: required ? 'error' : 'warning',
        property: 'args',
      },
    }));
};

/**
 * Checks a file a move needs, with the path relative to the workspace folder
 */
const checkFile = async (
  path: string,
  description: string,
  host: PreflightHost,
  state: PlayState,
  mustBeInWorkspace: boolean,
): Promise<MoveProblem | undefined> => {
  if (mustBeInWorkspace && !host.isInWorkspace(path)) {
    return {
      code: 'preflight-outside-workspace',
      message: `${description}, which is outside the workspace folder. Demo Time only reads files in the workspace.`,
      severity: 'error',
    };
  }

  if (await exists(path, host, state)) {
    return;
  }

  if (state.files.get(normalizePath(path)) === false) {
    return {
      code: 'preflight-missing-file',
      message: `${description}, but an earlier move deletes or moves this file.`,
      severity: 'error',
    };
  }

  // An earlier terminal command, script or Copilot move might create the file
  return {
    code: 'preflight-missing-file',
    message: `${description}, which doesn't exist.`,
    severity: state.hasUntrackedMoves ? 'warning' : 'error',
    missingFile: normalizePath(path),
  };
};

const exists = async (path: string, host: PreflightHost, state: PlayState) => {
  const tracked = state.files.get(normalizePath(path));
  if (typeof tracked === 'boolean') {
    return tracked;
  }

  return host.fileExists(path);
};

/**
 * Inserts the known variables in a path. Returns `undefined` when the path is empty, depends on a
 * variable that only gets its value while the play runs, or on a snippet argument without value.
 */
const getPathValue = async (value: unknown, host: PreflightHost, context: MoveContext) => {
  if (typeof value !== 'string' || !value.trim()) {
    return;
  }

  const path = host.variables ? await insertVariables(value, host.variables) : value;
  if (RUNTIME_VARIABLE.test(path)) {
    return;
  }

  if ([...(context.unsetPlaceholders || [])].some((name) => path.includes(`{${name}}`))) {
    return;
  }

  return path;
};

/**
 * Content, patch, snippet and notes paths of version 1 act files are relative to the `.demo` folder
 */
const resolveContentPath = (path: string, version: number) =>
  version >= 2 ? path : posix.join(General.demoFolder, path);

const normalizePath = (path: string) =>
  posix.normalize(path.replace(/\\/g, '/')).replace(/^(\.\/|\/)+/, '');

/**
 * Creates a function that returns the position of a JSON path in the act file. When the path
 * doesn't exist (for example a property set by a snippet), it returns the closest parent.
 */
const createLocator = (content: string, isYaml: boolean) => {
  const lineStarts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }

  if (isYaml) {
    const lines = content.split('\n');
    return (path: JSONPath) => findYamlLocation(lines, path);
  }

  const root = parseTree(content);
  return (path: JSONPath) => {
    if (!root) {
      return { line: 0, character: 0 };
    }

    for (let length = path.length; length > 0; length--) {
      const node = findNodeAtLocation(root, path.slice(0, length));
      if (node) {
        const offset = node.parent?.type === 'property' ? node.parent.offset : node.offset;
        let line = 0;
        while (line + 1 < lineStarts.length && lineStarts[line + 1] <= offset) {
          line++;
        }
        return { line, character: offset - lineStarts[line] };
      }
    }

    return { line: 0, character: 0 };
  };
};

interface YamlBlock {
  start: number;
  end: number;
  indent: number;
}

const getIndent = (line: string) => line.length - line.trimStart().length;

const isContentLine = (line: string) => {
  const trimmed = line.trim();
  return trimmed !== '' && !trimmed.startsWith('#') && trimmed !== '---';
};

const getBlockIndent = (lines: string[], start: number, end: number) => {
  for (let i = start; i < end; i++) {
    if (isContentLine(lines[i])) {
      return getIndent(lines[i]);
    }
  }
  return -1;
};

/**
 * Finds a JSON path in a block style YAML document, by following the indentation
 */
export const findYamlLocation = (
  lines: string[],
  path: JSONPath,
): { line: number; character: number } => {
  let location = { line: 0, character: 0 };
  let block: YamlBlock = {
    start: 0,
    end: lines.length,
    indent: getBlockIndent(lines, 0, lines.length),
  };

  for (const segment of path) {
    if (block.indent < 0) {
      break;
    }

    if (typeof segment === 'string') {
      const keyRegex = new RegExp(
        `^(["']?)${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\s*:(?=\\s|$)`,
      );

      let keyLine = -1;
      for (let i = block.start; i < block.end; i++) {
        const line = lines[i];
        // The first line of a list item starts with the dash
        const isKeyLine =
          i === block.start || (isContentLine(line) && getIndent(line) === block.indent);
        if (isKeyLine && keyRegex.test(line.slice(block.indent))) {
          keyLine = i;
          break;
        }
      }

      if (keyLine < 0) {
        break;
      }

      location = { line: keyLine, character: block.indent };

      // The value ends at the next key on the same level, a list can be on the key's level
      let end = block.end;
      for (let i = keyLine + 1; i < block.end; i++) {
        const line = lines[i];
        if (!isContentLine(line)) {
          continue;
        }
        const indent = getIndent(line);
        if (indent < block.indent || (indent === block.indent && !line.trim().startsWith('-'))) {
          end = i;
          break;
        }
      }

      block = { start: keyLine + 1, end, indent: getBlockIndent(lines, keyLine + 1, end) };
    } else {
      const dashIndent = block.indent;
      const items: number[] = [];
      for (let i = block.start; i < block.end; i++) {
        const line = lines[i];
        if (isContentLine(line) && getIndent(line) === dashIndent && line.trim().startsWith('-')) {
          items.push(i);
        }
      }

      const itemLine = items[segment];
      if (itemLine === undefined) {
        break;
      }

      location = { line: itemLine, character: dashIndent };

      const end = items[segment + 1] ?? block.end;
      const dash = /^(\s*)-(\s+)\S/.exec(lines[itemLine]);
      block = dash
        ? { start: itemLine, end, indent: dash[1].length + 1 + dash[2].length }
        : { start: itemLine + 1, end, indent: getBlockIndent(lines, itemLine + 1, end) };
    }
  }

  return location;
};
