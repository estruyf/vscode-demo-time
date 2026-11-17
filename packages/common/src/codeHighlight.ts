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
import { createHighlighter, type Highlighter, type ThemedToken } from 'shiki';
import { codeToKeyedTokens, syncTokenKeys, type KeyedTokensInfo } from 'shiki-magic-move/core';
import { type PluggableList } from 'unified';
import { visit } from 'unist-util-visit';
import { isAllLinesRange, parseCodeStepsMeta } from './utils/codeSteps';
import { type MagicMoveStep, parseMagicMoveMeta, parseMagicMoveSteps } from './utils/magicMove';

/**
 * The theme of `rehype-pretty-code` when there is no VS Code theme
 */
const DEFAULT_THEME = 'github-dark-dimmed';

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

const getText = (node: any): string =>
  node.type === 'text' ? node.value : (node.children || []).map(getText).join('');

const getLanguage = (code: any): string | undefined => {
  const className = code.properties?.className;
  const languageClass = (Array.isArray(className) ? className : [className]).find(
    (value: unknown) => typeof value === 'string' && value.startsWith('language-'),
  );
  return languageClass?.replace('language-', '');
};

const highlighters = new Map<string, Promise<Highlighter>>();

const getHighlighter = (theme: unknown) => {
  const themeToLoad = (
    theme && typeof theme === 'object' && Object.hasOwn(theme, 'tokenColors')
      ? theme
      : DEFAULT_THEME
  ) as Parameters<typeof createHighlighter>[0]['themes'][number];

  const key = JSON.stringify(themeToLoad);
  let highlighter = highlighters.get(key);
  if (!highlighter) {
    highlighter = createHighlighter({ themes: [themeToLoad], langs: [] });
    highlighters.set(key, highlighter);
  }
  return highlighter;
};

// Shiki's `FontStyle` flags
const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;
const FONT_STYLE_UNDERLINE = 4;
const FONT_STYLE_STRIKETHROUGH = 8;

const getFontStyle = (fontStyle?: number) => {
  if (!fontStyle || fontStyle < 0) {
    return undefined;
  }

  const style: Record<string, string> = {};
  if (fontStyle & FONT_STYLE_ITALIC) {
    style['font-style'] = 'italic';
  }
  if (fontStyle & FONT_STYLE_BOLD) {
    style['font-weight'] = 'bold';
  }
  const decorations = [
    fontStyle & FONT_STYLE_UNDERLINE ? 'underline' : '',
    fontStyle & FONT_STYLE_STRIKETHROUGH ? 'line-through' : '',
  ].filter(Boolean);
  if (decorations.length) {
    style['text-decoration'] = decorations.join(' ');
  }
  return style;
};

/**
 * Tokenizes the steps of a magic move block with the slide's code theme. Tokens that stay the
 * same between two steps get the same key, so the `dt-magic-move` component can move them.
 *
 * The keys are shortened and only the properties the renderer uses are kept, as the steps are
 * stored in an attribute of the element.
 */
export const getMagicMoveTokens = async (
  steps: MagicMoveStep[],
  theme?: unknown,
  lineNumbers = false,
) => {
  const highlighter = await getHighlighter(theme);
  const themeName = highlighter.getLoadedThemes()[0];

  await Promise.allSettled(
    Array.from(new Set(steps.map((step) => step.lang))).map(async (lang) =>
      highlighter.loadLanguage(lang as Parameters<Highlighter['loadLanguage']>[0]),
    ),
  );

  let previous: KeyedTokensInfo | undefined;
  const keyedSteps = steps.map((step) => {
    let tokens: KeyedTokensInfo;
    try {
      tokens = codeToKeyedTokens(
        highlighter,
        step.code,
        { lang: step.lang, theme: themeName },
        lineNumbers,
      );
    } catch {
      // An unknown language shows the code without colors
      tokens = codeToKeyedTokens(
        highlighter,
        step.code,
        { lang: 'plaintext', theme: themeName },
        lineNumbers,
      );
    }

    if (previous) {
      tokens = syncTokenKeys(previous, tokens).to;
    }
    previous = tokens;
    return tokens;
  });

  const keys = new Map<string, string>();
  const getKey = (key: string) => {
    if (!keys.has(key)) {
      keys.set(key, keys.size.toString(36));
    }
    return keys.get(key) as string;
  };

  return keyedSteps.map((step) => ({
    bg: step.bg,
    fg: step.fg,
    // `KeyedToken` extends Shiki's `ThemedToken`, but its types use `shiki/core`, which TypeScript
    // can't resolve with the `node` module resolution
    tokens: (step.tokens as (ThemedToken & { key: string; htmlClass?: string })[]).map((token) => {
      const isLineNumber = token.htmlClass === 'shiki-magic-move-line-number';
      return {
        // Line numbers keep their key in all steps, so they stay in place
        key: getKey(isLineNumber ? `ln-${token.content.trim()}` : token.key),
        content: token.content,
        color: token.color,
        bgColor: token.bgColor,
        htmlClass: token.htmlClass,
        htmlStyle: getFontStyle(token.fontStyle),
      };
    }),
  }));
};

/**
 * Turns a ` ````md magic-move ` block into a `dt-magic-move` element, which animates the changes
 * between the code blocks in the block. It needs to run before `rehype-pretty-code`.
 *
 * The element contains the last code block, so static renders (like the PDF export) show the last
 * step with the same options as other code blocks. The tokens of all steps are in its `steps`
 * attribute.
 */
export const rehypeMagicMove = (theme?: unknown) => async (tree: any) => {
  const blocks: { node: any; code: any; index: number; parent: any }[] = [];

  visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
    if (node.tagName !== 'pre' || !parent || index === undefined) {
      return;
    }

    const code = node.children?.find((child: any) => child.type === 'element');
    if (!code || code.tagName !== 'code') {
      return;
    }

    blocks.push({ node, code, index, parent });
    return 'skip';
  });

  for (const { code, index, parent } of blocks) {
    const meta = code.data?.meta ?? code.properties?.metastring;
    const parsed = parseMagicMoveMeta(getLanguage(code), meta);
    if (!parsed) {
      continue;
    }

    const steps = parseMagicMoveSteps(getText(code));
    if (steps.length === 0) {
      continue;
    }

    const tokens = await getMagicMoveTokens(steps, theme, parsed.lineNumbers);
    const lastStep = steps[steps.length - 1];

    parent.children[index] = {
      type: 'element',
      tagName: 'dt-magic-move',
      properties: {
        steps: JSON.stringify(tokens),
        clicks: `${parsed.clicks}`,
        duration: `${parsed.duration}`,
      },
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {
                className: [`language-${lastStep.lang}`],
                metastring: parsed.meta,
              },
              data: { meta: parsed.meta },
              children: [{ type: 'text', value: lastStep.code }],
            },
          ],
        },
      ],
    };
  }
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
 * line highlights, titles, line numbers, Shiki notations (`// [!code ++]`), click steps and
 * animated code changes (`magic-move`).
 * The slide preview, the PDF export and the slide screenshots all use these plugins.
 */
export const getCodeHighlightPlugins = (theme?: unknown): PluggableList => [
  [rehypeMagicMove, theme],
  rehypeCodeSteps,
  [rehypePrettyCode, getCodeHighlightOptions(theme)],
];
