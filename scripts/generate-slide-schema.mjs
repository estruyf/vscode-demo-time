#!/usr/bin/env node
/**
 * Generates the slide front matter JSON schema and documentation from `SLIDE_PROPERTIES` in
 * `packages/common/src/constants/SlideProperties.ts`:
 *
 * - `docs/public/slide.schema.json`, published as https://demotime.show/slide.schema.json
 * - the reference tables in `docs/src/content/docs/slides/front-matter.mdx`, between the
 *   `slide-properties:start` and `slide-properties:end` comments
 *
 * The `slideFrontmatterSchema` test fails when these files are out of date.
 *
 * Usage: npm run slides:schema
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SCHEMA_FILE = join(ROOT, 'docs', 'public', 'slide.schema.json');
const DOCS_FILE = join(ROOT, 'docs', 'src', 'content', 'docs', 'slides', 'front-matter.mdx');
const START = '{/* slide-properties:start */}';
const END = '{/* slide-properties:end */}';

const { build } = await import('esbuild');
const prettier = await import('prettier');

const result = await build({
  entryPoints: [join(ROOT, 'packages', 'common', 'src', 'utils', 'slideFrontmatterSchema.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const { getSlideFrontmatterSchema, getSlideFrontmatterTables } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
);

const prettierConfig = JSON.parse(readFileSync(join(ROOT, '.prettierrc.json'), 'utf8'));
const format = (text, filepath) => prettier.format(text, { ...prettierConfig, filepath });

writeFileSync(
  SCHEMA_FILE,
  await format(JSON.stringify(getSlideFrontmatterSchema(), null, 2), SCHEMA_FILE),
);

const docs = readFileSync(DOCS_FILE, 'utf8');
const start = docs.indexOf(START);
const end = docs.indexOf(END);
if (start === -1 || end < start) {
  throw new Error(`Add the ${START} and ${END} comments to ${DOCS_FILE}`);
}
writeFileSync(
  DOCS_FILE,
  await format(
    `${docs.slice(0, start + START.length)}\n\n${getSlideFrontmatterTables()}\n\n${docs.slice(end)}`,
    DOCS_FILE,
  ),
);

console.log(
  'Updated docs/public/slide.schema.json and docs/src/content/docs/slides/front-matter.mdx',
);
