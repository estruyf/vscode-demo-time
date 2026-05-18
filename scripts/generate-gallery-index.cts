import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, relative } from 'path';

const REPO_ROOT = join(__dirname, '..');
const GALLERY_DIR = join(REPO_ROOT, 'gallery');
const OUTPUT_FILE = join(REPO_ROOT, 'docs', 'public', 'gallery', 'index.json');

interface SnippetField {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  default?: string | number | boolean;
}

interface GallerySnippet {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  fields: SnippetField[];
  path: string;
}

interface GallerySnippetFull extends GallerySnippet {
  steps: unknown[];
}

const REQUIRED_FIELDS: (keyof GallerySnippetFull)[] = [
  'id',
  'name',
  'description',
  'author',
  'version',
  'tags',
  'fields',
  'steps',
];

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
const PLACEHOLDER_REGEX = /\{([A-Z0-9_]+)\}/g;

/**
 * Recursively find all .json files in a directory, excluding index.json
 */
async function findSnippetFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  if (!existsSync(dir)) {
    console.error(`❌ Gallery directory not found: ${dir}`);
    process.exit(1);
  }

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const nested = await findSnippetFiles(fullPath);
      files.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json') {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Derive the expected snippet ID from its file path relative to gallery/
 */
function deriveId(filePath: string): string {
  const rel = relative(GALLERY_DIR, filePath);
  // Remove .json extension and normalize separators
  return rel.replace(/\\/g, '/').replace(/\.json$/, '');
}

/**
 * Extract all {PLACEHOLDER} names from a steps array (recursively, as JSON string)
 */
function extractPlaceholders(steps: unknown[]): Set<string> {
  const json = JSON.stringify(steps);
  const placeholders = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_REGEX.exec(json)) !== null) {
    placeholders.add(match[1]);
  }

  return placeholders;
}

/**
 * Validate a snippet file and return errors
 */
function validateSnippet(snippet: GallerySnippetFull, expectedId: string): string[] {
  const errors: string[] = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (snippet[field] === undefined || snippet[field] === null) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // Stop early if missing required fields to avoid further errors
  if (errors.length > 0) {
    return errors;
  }

  // ID must match file path
  if (snippet.id !== expectedId) {
    errors.push(`"id" mismatch: expected "${expectedId}", got "${snippet.id}"`);
  }

  // Version must be semver
  if (!SEMVER_REGEX.test(snippet.version)) {
    errors.push(`"version" must follow semver (e.g. "1.0.0"), got "${snippet.version}"`);
  }

  // Tags must be a non-empty array of strings
  if (!Array.isArray(snippet.tags) || snippet.tags.length === 0) {
    errors.push(`"tags" must be a non-empty array`);
  }

  // Steps must be a non-empty array
  if (!Array.isArray(snippet.steps) || snippet.steps.length === 0) {
    errors.push(`"steps" must be a non-empty array`);
  }

  // Fields must be an array (can be empty if no placeholders)
  if (!Array.isArray(snippet.fields)) {
    errors.push(`"fields" must be an array`);
    return errors;
  }

  // Validate each field entry
  const definedFieldNames = new Set<string>();
  for (const field of snippet.fields) {
    if (!field.name) {
      errors.push(`A field entry is missing "name"`);
      continue;
    }
    if (definedFieldNames.has(field.name)) {
      errors.push(`Duplicate field name: "${field.name}"`);
    }
    definedFieldNames.add(field.name);

    if (!['string', 'number', 'boolean'].includes(field.type)) {
      errors.push(
        `Field "${field.name}" has invalid type "${field.type}" — must be string, number, or boolean`,
      );
    }

    if (field.required === undefined) {
      errors.push(`Field "${field.name}" is missing "required"`);
    }

    if (field.required === true && field.default !== undefined) {
      errors.push(`Field "${field.name}" is required but also has a default value — remove one`);
    }
  }

  // Every {PLACEHOLDER} in steps must have a matching field entry
  const placeholders = extractPlaceholders(snippet.steps);
  for (const placeholder of placeholders) {
    if (!definedFieldNames.has(placeholder)) {
      errors.push(`Placeholder "{${placeholder}}" used in steps but not defined in "fields"`);
    }
  }

  // Every field must be used as a {PLACEHOLDER} in steps
  for (const fieldName of definedFieldNames) {
    if (!placeholders.has(fieldName)) {
      errors.push(`Field "${fieldName}" is defined but never used as a placeholder in steps`);
    }
  }

  return errors;
}

async function main() {
  console.log('🔍 Scanning gallery directory...\n');

  const files = await findSnippetFiles(GALLERY_DIR);

  if (files.length === 0) {
    console.warn('⚠️  No snippet files found in gallery/');
    process.exit(0);
  }

  const index: GallerySnippet[] = [];
  const errors: { file: string; errors: string[] }[] = [];

  for (const file of files.sort()) {
    const expectedId = deriveId(file);
    const repoRelativePath = relative(REPO_ROOT, file).replace(/\\/g, '/');
    const raw = await readFile(file, 'utf-8');

    let snippet: GallerySnippetFull;
    try {
      snippet = JSON.parse(raw);
    } catch {
      errors.push({ file, errors: ['Invalid JSON — could not parse file'] });
      continue;
    }

    const validationErrors = validateSnippet(snippet, expectedId);
    if (validationErrors.length > 0) {
      errors.push({ file, errors: validationErrors });
      continue;
    }

    // Strip steps — index only contains metadata + fields
    const { steps: _steps, ...metadata } = snippet;
    index.push({
      ...metadata,
      path: repoRelativePath,
    });

    console.log(`  ✅ ${expectedId} (v${snippet.version})`);
  }

  // Report validation errors
  if (errors.length > 0) {
    console.error('\n❌ Validation failed for the following snippets:\n');
    for (const { file, errors: errs } of errors) {
      const relPath = relative(process.cwd(), file);
      console.error(`  ${relPath}`);
      for (const err of errs) {
        console.error(`    • ${err}`);
      }
    }
    process.exit(1);
  }

  // Write index file for docs/public (used by docs CI/CD deploy)
  const content = JSON.stringify(index, null, 2) + '\n';
  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, content, 'utf-8');

  console.log(
    `\n✅ index.json generated with ${index.length} snippet${index.length === 1 ? '' : 's'}`,
  );
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
