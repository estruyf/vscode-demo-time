import { type Components } from 'hast-util-to-jsx-runtime';
import { type Options as RemarkRehypeOptions } from 'mdast-util-to-hast';
import { type ReactElement, useCallback, useState } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import rehypeRaw from 'rehype-raw';
import rehypeReact from 'rehype-react';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse, { type Options as RemarkParseOptions } from 'remark-parse';
import remarkToRehype from 'remark-rehype';
import { matter } from 'vfile-matter';
import { type PluggableList, unified } from 'unified';

export type UseRemarkOptions = {
  onError?: (err: Error) => void;
  rehypePlugins?: PluggableList;
  rehypeReactOptions?: {
    components?: Partial<Components>;
  };
  remarkParseOptions?: RemarkParseOptions;
  remarkPlugins?: PluggableList;
  remarkToRehypeOptions?: RemarkRehypeOptions;
};

export const useRemark = ({
  onError = () => { },
  rehypePlugins = [],
  rehypeReactOptions,
  remarkParseOptions,
  remarkPlugins = [],
  remarkToRehypeOptions,
}: UseRemarkOptions = {}): {
  markdown: null | ReactElement,
  setMarkdown: (source: string) => void,
  matter: null | any,
} => {
  const [reactContent, setReactContent] = useState<null | ReactElement>(null);
  const [metadata, setMetadata] = useState<null | any>(null);

  const setMarkdownSource = useCallback((source: string) => {
    unified()
      .use(remarkParse, remarkParseOptions)
      .use(remarkToRehype, {
        ...remarkToRehypeOptions,
        allowDangerousHtml: true,
      })
      .use(rehypeRaw)
      .use(remarkPlugins)
      .use(rehypePlugins)
      .use(rehypeReact, {
        ...rehypeReactOptions,
        Fragment: jsxRuntime.Fragment,
        jsx: jsxRuntime.jsx,
        jsxs: jsxRuntime.jsxs,
      })
      .use(remarkFrontmatter)
      .use(() => (_, file) => {
        try {
          matter(file);
        } catch (err) {
          // Catch error and ignore it
        }
      })
      .process(source)
      .then((vfile) => {
        setReactContent(vfile.result as ReactElement);
        setMetadata(vfile.data?.matter || {});
      })
      .catch(onError);
  }, []);

  return {
    markdown: reactContent,
    setMarkdown: setMarkdownSource,
    matter: metadata,
  };
};