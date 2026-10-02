import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { join, relative, sep } from 'path';

export type AiSkillsTool = 'copilot' | 'claude' | 'agents';
export type AiSkillsScope = 'project' | 'user';

export interface AiSkillsTarget {
  tool: AiSkillsTool;
  label: string;
  /** Skills folder, relative to the workspace folder */
  projectFolder: string;
  /** Skills folder, relative to the home folder */
  userFolder: string;
}

export const AI_SKILLS_TARGETS: AiSkillsTarget[] = [
  {
    tool: 'copilot',
    label: 'GitHub Copilot',
    projectFolder: '.github/skills',
    userFolder: '.copilot/skills',
  },
  {
    tool: 'claude',
    label: 'Claude Code',
    projectFolder: '.claude/skills',
    userFolder: '.claude/skills',
  },
  {
    tool: 'agents',
    label: 'Other agents',
    projectFolder: '.agents/skills',
    userFolder: '.agents/skills',
  },
];

/** All Demo Time skills use this prefix, so they never overwrite skills of the user. */
export const AI_SKILL_PREFIX = 'demotime-';
/** Written in every installed skill folder, with the extension version that installed it. */
export const AI_SKILL_MARKER = '.demotime-skill.json';

export interface InstalledAiSkill {
  name: string;
  version: string;
}

export const getAiSkillsFolder = (
  target: AiSkillsTarget,
  scope: AiSkillsScope,
  workspaceRoot: string,
  homeDir: string,
): string => {
  return scope === 'project'
    ? join(workspaceRoot, target.projectFolder)
    : join(homeDir, target.userFolder);
};

/**
 * Shows a skills folder relative to the workspace folder, or with `~` for the home folder.
 */
export const getAiSkillsFolderLabel = (
  folder: string,
  workspaceRoot: string | undefined,
  homeDir: string,
): string => {
  if (workspaceRoot && folder.startsWith(workspaceRoot + sep)) {
    return relative(workspaceRoot, folder).split(sep).join('/');
  }
  if (folder.startsWith(homeDir + sep)) {
    return `~/${relative(homeDir, folder).split(sep).join('/')}`;
  }
  return folder;
};

const isDirectory = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
};

const fileExists = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
};

/**
 * Returns the names of the Demo Time skills in a folder: `demotime-*` folders with a `SKILL.md`.
 */
export const getAiSkillNames = async (folder: string): Promise<string[]> => {
  if (!(await isDirectory(folder))) {
    return [];
  }

  const names: string[] = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      entry.name.startsWith(AI_SKILL_PREFIX) &&
      (await fileExists(join(folder, entry.name, 'SKILL.md')))
    ) {
      names.push(entry.name);
    }
  }
  return names.sort();
};

/**
 * Returns the Demo Time skills that the extension installed in a folder. Skills without a marker
 * were installed another way (for instance with the Claude Code plugin) and are left alone.
 */
export const getInstalledAiSkills = async (folder: string): Promise<InstalledAiSkill[]> => {
  const installed: InstalledAiSkill[] = [];
  for (const name of await getAiSkillNames(folder)) {
    try {
      const marker = JSON.parse(await readFile(join(folder, name, AI_SKILL_MARKER), 'utf8'));
      if (typeof marker?.version === 'string') {
        installed.push({ name, version: marker.version });
      }
    } catch {
      // No marker, not installed by the extension
    }
  }
  return installed;
};

/**
 * Copies the bundled skills to a skills folder. Only the Demo Time skill folders are replaced, and
 * skills that a previous version installed but that no longer exist are removed.
 *
 * @returns The names of the installed skills
 */
export const installAiSkills = async (
  bundledFolder: string,
  targetFolder: string,
  version: string,
): Promise<string[]> => {
  const skills = await getAiSkillNames(bundledFolder);
  if (skills.length === 0) {
    throw new Error(`No AI skills found in ${bundledFolder}`);
  }

  await mkdir(targetFolder, { recursive: true });

  for (const previous of await getInstalledAiSkills(targetFolder)) {
    if (!skills.includes(previous.name)) {
      await rm(join(targetFolder, previous.name), { recursive: true, force: true });
    }
  }

  for (const skill of skills) {
    const destination = join(targetFolder, skill);
    await rm(destination, { recursive: true, force: true });
    await cp(join(bundledFolder, skill), destination, { recursive: true });
    await writeFile(
      join(destination, AI_SKILL_MARKER),
      `${JSON.stringify({ version }, null, 2)}\n`,
      'utf8',
    );
  }

  return skills;
};

/**
 * Returns the skills folders with Demo Time skills that another version of the extension installed.
 */
export const getOutdatedAiSkillsFolders = async (
  folders: string[],
  version: string,
): Promise<string[]> => {
  const outdated: string[] = [];
  for (const folder of folders) {
    const installed = await getInstalledAiSkills(folder);
    if (installed.some((skill) => skill.version !== version)) {
      outdated.push(folder);
    }
  }
  return outdated;
};
