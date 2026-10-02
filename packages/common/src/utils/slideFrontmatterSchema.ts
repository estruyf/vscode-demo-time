import { SlideLayout } from '../constants/SlideLayout';
import {
  SLIDE_PROPERTIES,
  SlideProperty,
  SlidePropertyInheritance,
} from '../constants/SlideProperties';

export const DOCS_URL = 'https://demotime.show';
export const SLIDE_SCHEMA_URL = `${DOCS_URL}/slide.schema.json`;

const INHERITANCE: Record<SlidePropertyInheritance, { short: string; long: string }> = {
  always: {
    short: 'Every slide',
    long: "applies to every slide of the file, and slides can't use another value.",
  },
  fallback: {
    short: "Slides that don't set it",
    long: "applies to every slide of the file that doesn't set its own value.",
  },
  firstSlide: {
    short: 'First slide only',
    long: 'only applies to the first slide.',
  },
};

const LAYOUT_NAMES: Partial<Record<SlideLayout, string>> = {
  [SlideLayout.Video]: 'Video layout',
  [SlideLayout.AnimatedSVG]: 'Animated SVG layout',
};

const code = (value: string | number | boolean) => `\`${value}\``;

/**
 * Gets the YAML type of a property, like `boolean` or `string`
 */
export const getSlidePropertyTypeName = (property: SlideProperty): string => {
  switch (property.type) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'enum':
      return property.values?.every((value) => value === 'true' || value === 'false')
        ? 'boolean'
        : 'string';
    case 'file':
      return property.allowUrl ? 'path or URL' : 'path';
    case 'template':
      return 'Handlebars template';
    default:
      return 'string';
  }
};

/**
 * Gets the default of a property in markdown, or `undefined` when it has none
 */
export const getSlidePropertyDefault = (property: SlideProperty): string | undefined => {
  if (property.default !== undefined) {
    return code(property.default);
  }
  return property.defaultDescription;
};

/**
 * Gets the values to suggest for a property: its enum values, or `true` and `false`
 */
export const getSlidePropertyValues = (property: SlideProperty): readonly string[] => {
  if (property.type === 'enum') {
    return property.values || [];
  }
  if (property.type === 'boolean') {
    return ['true', 'false'];
  }
  return [];
};

/**
 * Describes a property in markdown, for the hover in the editor.
 */
export const getSlidePropertyMarkdown = (key: string, property: SlideProperty): string => {
  const lines = [`**${key}** (${getSlidePropertyTypeName(property)})`, '', property.description];

  const details: string[] = [];
  if (property.type === 'enum' && property.values) {
    details.push(`Values: ${property.values.map(code).join(', ')}`);
  }
  const defaultValue = getSlidePropertyDefault(property);
  if (defaultValue) {
    details.push(`Default: ${defaultValue}`);
  }
  if (property.layouts) {
    details.push(`Layouts: ${property.layouts.map(code).join(', ')}`);
  }
  details.push(`In the document front matter, it ${INHERITANCE[property.inheritance].long}`);

  lines.push('', details.join('  \n'));
  if (property.docs) {
    lines.push('', `[Documentation](${DOCS_URL}${property.docs})`);
  }

  return lines.join('\n');
};

/**
 * Gets the JSON schema of the slide front matter, which is published as
 * https://demotime.show/slide.schema.json
 */
export const getSlideFrontmatterSchema = () => {
  const properties: Record<string, Record<string, unknown>> = {};

  for (const [key, property] of Object.entries(SLIDE_PROPERTIES)) {
    const defaultValue = getSlidePropertyDefault(property);
    const description = [
      property.description,
      ...(property.default === undefined && defaultValue ? [`Default: ${defaultValue}.`] : []),
    ].join(' ');

    properties[key] = {
      ...getJsonSchemaType(property),
      description,
      markdownDescription: description,
      ...(property.default !== undefined ? { default: property.default } : {}),
      ...(property.aliasOf ? { deprecated: true } : {}),
      'x-demotime': {
        inheritance: property.inheritance,
        ...(property.layouts ? { layouts: property.layouts } : {}),
        ...(property.aliasOf ? { aliasOf: property.aliasOf } : {}),
        ...(property.docs ? { docs: `${DOCS_URL}${property.docs}` } : {}),
      },
    };
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema',
    $id: SLIDE_SCHEMA_URL,
    title: 'Demo Time - Slide front matter',
    description:
      'The front matter properties of a Demo Time slide. Custom layouts, headers and footers can read other properties too. `x-demotime.inheritance` tells how a property in the document front matter applies to the other slides of the file: `always` (every slide), `fallback` (slides that do not set it) or `firstSlide` (only the first slide).',
    type: 'object',
    properties,
    additionalProperties: true,
  };
};

const getJsonSchemaType = (property: SlideProperty): Record<string, unknown> => {
  switch (property.type) {
    case 'boolean':
      return { type: 'boolean' };
    case 'number':
      return { type: 'number' };
    case 'enum': {
      // YAML reads `true` and `false` as booleans
      const values = (property.values || []).map((value) =>
        value === 'true' ? true : value === 'false' ? false : value,
      );
      return values.every((value) => typeof value === 'string')
        ? { type: 'string', enum: values }
        : { enum: values };
    }
    case 'file':
      return property.allowUrl ? { type: 'string', format: 'uri-reference' } : { type: 'string' };
    default:
      return { type: 'string' };
  }
};

/**
 * Gets the front matter reference tables for the documentation, in markdown: one for the
 * properties of every layout, and one per layout with its own properties.
 */
export const getSlideFrontmatterTables = (): string => {
  const entries = Object.entries(SLIDE_PROPERTIES);
  const sections: { title: string; entries: [string, SlideProperty][] }[] = [
    { title: 'All layouts', entries: entries.filter(([, property]) => !property.layouts) },
    ...Object.entries(LAYOUT_NAMES).map(([layout, title]) => ({
      title: title as string,
      entries: entries.filter(([, property]) => property.layouts?.includes(layout as SlideLayout)),
    })),
  ];

  return sections
    .map(({ title, entries: sectionEntries }) =>
      [
        `### ${title}`,
        '',
        '| Property | Type | Default | Document front matter applies to | Description |',
        '| --- | --- | --- | --- | --- |',
        ...sectionEntries.map(([key, property]) => {
          const description = [
            property.description,
            ...(property.type === 'enum' && property.values
              ? [`Values: ${property.values.map(code).join(', ')}.`]
              : []),
            ...(property.docs ? [`[More](${property.docs})`] : []),
          ].join(' ');
          return `| ${[
            code(key),
            getSlidePropertyTypeName(property),
            getSlidePropertyDefault(property) || '-',
            INHERITANCE[property.inheritance].short,
            description,
          ]
            .map((cell) => cell.replace(/\|/g, '\\|'))
            .join(' | ')} |`;
        }),
      ].join('\n'),
    )
    .join('\n\n');
};
