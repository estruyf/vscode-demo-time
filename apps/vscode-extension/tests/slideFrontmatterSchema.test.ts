import {
  getSlideFrontmatterSchema,
  getSlideFrontmatterTables,
  getSlidePropertyMarkdown,
  SLIDE_PROPERTIES,
} from '@demotime/common';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..', '..');
const OUTDATED = 'Run `npm run slides:schema` to update the generated files.';

// Ignores the column padding that prettier adds to the tables
const normalizeTable = (markdown: string) =>
  markdown
    .split('\n')
    .map((line) =>
      line
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim().replace(/^-{3,}$/, '---'))
        .join('|'),
    )
    .filter((line) => line.trim() !== '')
    .join('\n');

describe('slide front matter schema', () => {
  it('matches docs/public/slide.schema.json', () => {
    const published = JSON.parse(
      readFileSync(join(ROOT, 'docs', 'public', 'slide.schema.json'), 'utf8'),
    );
    expect({ published, hint: OUTDATED }).toEqual({
      published: getSlideFrontmatterSchema(),
      hint: OUTDATED,
    });
  });

  it('matches the tables of the front matter reference', () => {
    const docs = readFileSync(
      join(ROOT, 'docs', 'src', 'content', 'docs', 'slides', 'front-matter.mdx'),
      'utf8',
    );
    const tables = docs
      .split('{/* slide-properties:start */}')[1]
      ?.split('{/* slide-properties:end */}')[0];

    expect({ tables: normalizeTable(tables || ''), hint: OUTDATED }).toEqual({
      tables: normalizeTable(getSlideFrontmatterTables()),
      hint: OUTDATED,
    });
  });

  it('describes every property', () => {
    for (const [key, property] of Object.entries(SLIDE_PROPERTIES)) {
      expect({ key, hasDescription: !!property.description.trim() }).toEqual({
        key,
        hasDescription: true,
      });
      if (property.type === 'enum') {
        expect(property.values?.length).toBeGreaterThan(0);
      }
      if (property.aliasOf) {
        expect(SLIDE_PROPERTIES[property.aliasOf]).toBeDefined();
      }
    }
  });

  it('describes a property for the hover', () => {
    const markdown = getSlidePropertyMarkdown(
      'controlsPosition',
      SLIDE_PROPERTIES.controlsPosition,
    );

    expect(markdown).toContain('**controlsPosition** (string)');
    expect(markdown).toContain(
      'Values: `topLeft`, `topRight`, `bottomLeft`, `bottomRight`, `none`',
    );
    expect(markdown).toContain('Default: `bottomRight`');
    expect(markdown).toContain('Layouts: `animated`');
    expect(markdown).toContain(
      "In the document front matter, it applies to every slide of the file that doesn't set its own value.",
    );
    expect(markdown).toContain('[Documentation](https://demotime.show/slides/layouts/animated/)');
  });

  it('lists booleans as values in the schema of the progress property', () => {
    const schema = getSlideFrontmatterSchema();

    expect(schema.properties.progress).toMatchObject({ enum: [true, false, 'top', 'bottom'] });
    expect(schema.properties.autoPlay).toMatchObject({
      deprecated: true,
      'x-demotime': { aliasOf: 'autoplay' },
    });
  });
});
