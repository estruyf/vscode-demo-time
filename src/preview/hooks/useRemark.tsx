import { type Components } from 'hast-util-to-jsx-runtime';
import { type Options as RemarkRehypeOptions } from 'mdast-util-to-hast';
import { type ReactElement, useCallback, useState } from 'react';
import { type Options as RemarkParseOptions } from 'remark-parse';
import { type PluggableList } from 'unified';
import { transformMarkdown } from '../../utils/transformMarkdown';
import { SlideMetadata } from '../../models';
import { renderToString } from 'react-dom/server';

export type UseRemarkOptions = {
  onError?: (err: Error) => void;
  rehypePlugins?: PluggableList;
  rehypeReactOptions?: {
    components?: Partial<Components>;
  };
  remarkParseOptions?: RemarkParseOptions;
  remarkPlugins?: PluggableList;
  remarRehypeOptions?: RemarkRehypeOptions;
};

export const useRemark = ({
  onError = () => { },
  // rehypePlugins = [[rehypeMermaid, { strategy: "inline-svg" }]],
  rehypePlugins = [],
  rehypeReactOptions,
  remarkParseOptions,
  remarkPlugins = [],
  remarRehypeOptions,
}: UseRemarkOptions = {}): {
  markdown: null | ReactElement,
  textContent: string,
  processMarkdown: (source: string, customPlugins?: PluggableList) => Promise<{
    reactContent: ReactElement | null,
    metadata: SlideMetadata | null,
  }>,
  setMarkdown: (source: string, customPlugins?: PluggableList, isDark?: boolean) => void,
  getMarkdown: (contents: string) => string,
  getFrontMatter: (contents: string) => string,
  matter: null | SlideMetadata,
} => {
  const [reactContent, setReactContent] = useState<null | ReactElement>(null);
  const [metadata, setMetadata] = useState<null | any>(null);
  const [textContent, setTextContent] = useState<string>('');

  /**
   * Processes a Markdown string and converts it into a React element along with extracted metadata.
   *
   * @param source - The Markdown source string to process.
   * @param customPlugins - An optional list of custom plugins to extend the processing pipeline.
   * @param isDark - A boolean indicating if the dark mode is enabled.
   * @returns An object containing:
   * - `reactContent`: The processed React element representation of the Markdown content.
   * - `metadata`: Extracted frontmatter metadata from the Markdown file, if available.
   * 
   * @throws Will call the `onError` handler if an error occurs during processing.
   */
  const processMarkdown = async (source: string, customPlugins?: PluggableList, isDark?: boolean): Promise<{
    reactContent: ReactElement | null,
    metadata: SlideMetadata | null,
  }> => {
    try {
      const vfile = await transformMarkdown(source, remarkParseOptions, remarRehypeOptions, remarkPlugins, [...rehypePlugins, ...(customPlugins || [])], rehypeReactOptions, { isWebComponent: true, isDark });
      return vfile;
    } catch (err) {
      onError(err as Error);
      return { reactContent: null, metadata: null };
    }
  };

  const setMarkdownSource = useCallback((source: string, customPlugins?: PluggableList, isDark?: boolean) => {
    processMarkdown(source, customPlugins, isDark).then(({ reactContent, metadata }) => {
      setReactContent(reactContent);
      setTextContent(renderToString(reactContent));
      setMetadata(metadata);
    });
  }, []);

  const getMarkdown = useCallback((contents: string) => {
    const frontmatterRegex = /^---[\s\S]*?---\n/;
    return contents.replace(frontmatterRegex, '');
  }, []);

  const getFrontMatter = useCallback((contents: string) => {
    const frontmatterRegex = /^---[\s\S]*?---\n/;
    const match = contents.match(frontmatterRegex);
    if (match) {
      return match[0];
    }
    return '';
  }, []);

  return {
    markdown: reactContent,
    textContent: textContent,
    processMarkdown: processMarkdown,
    setMarkdown: setMarkdownSource,
    getMarkdown: getMarkdown,
    getFrontMatter: getFrontMatter,
    matter: metadata,
  };
};