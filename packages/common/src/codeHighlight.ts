/**
 * The code block plugins import Shiki, which has a dynamic import for every language and theme.
 * This file is not part of the `@demotime/common` index, so bundles that only need the other
 * utils (like the web components for the PDF export) don't get those chunks. Import it from
 * `@demotime/common/out/codeHighlight`.
 */
import rehypePrettyCode, { type Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';
import {
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import { type PluggableList } from 'unified';
import { visit } from 'unist-util-visit';
import { isAllLinesRange, parseCodeStepsMeta } from './utils/codeSteps';

/**
 * Turns a code block with steps, like ` ```ts {1-2|4-6|all} `, into a `dt-code-steps` element
 * around the code block. It needs to run before `rehype-pretty-code`.
 *
 * The code block gets the highlight of the last step, so static renders (like the PDF export)
 * show the final step. The `dt-code-steps` component changes the highlight on every click.
 */
export const rehypeCodeSteps = () => (tree: any) => {
  visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
    if (node.tagName !== 'pre' || !parent || index === undefined) {
      return;
    }

    const code = node.children?.find((child: any) => child.type === 'element');
    if (!code || code.tagName !== 'code') {
      return;
    }

    const meta = code.data?.meta ?? code.properties?.metastring;
    const parsed = parseCodeStepsMeta(meta);
    if (!parsed) {
      return;
    }

    const lastStep = parsed.steps[parsed.steps.length - 1];
    const hasFocus = !isAllLinesRange(lastStep);
    const newMeta = [hasFocus ? `{${lastStep}}` : '', parsed.meta].filter(Boolean).join(' ');

    code.data = { ...(code.data || {}), meta: newMeta };
    if (code.properties?.metastring !== undefined) {
      code.properties.metastring = newMeta;
    }

    const properties: Record<string, string> = {
      steps: parsed.steps.join('|'),
      clicks: `${parsed.clicks}`,
    };
    if (hasFocus) {
      properties['data-focus'] = '';
    }

    parent.children[index] = {
      type: 'element',
      tagName: 'dt-code-steps',
      properties,
      children: [node],
    };

    // The `pre` element is now inside `dt-code-steps`, there is nothing more to visit in it
    return 'skip';
  });
};

/**
 * The options of `rehype-pretty-code` for the code blocks on slides.
 */
export const getCodeHighlightOptions = (theme?: unknown): RehypePrettyCodeOptions => ({
  theme: (theme ? theme : {}) as RehypePrettyCodeOptions['theme'],
  transformers: [
    transformerNotationDiff({ matchAlgorithm: 'v3' }),
    transformerNotationFocus({ matchAlgorithm: 'v3' }),
    transformerNotationHighlight({ matchAlgorithm: 'v3' }),
    transformerNotationErrorLevel({ matchAlgorithm: 'v3' }),
    transformerNotationWordHighlight({ matchAlgorithm: 'v3' }),
  ],
});

/**
 * The rehype plugins for the code blocks on slides: syntax highlighting with the VS Code theme,
 * line highlights, titles, line numbers, Shiki notations (`// [!code ++]`) and click steps.
 * The slide preview, the PDF export and the slide screenshots all use these plugins.
 */
export const getCodeHighlightPlugins = (theme?: unknown): PluggableList => [
  rehypeCodeSteps,
  [rehypePrettyCode, getCodeHighlightOptions(theme)],
];
