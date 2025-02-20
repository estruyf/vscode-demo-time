import { type Components } from 'hast-util-to-jsx-runtime';
import { type Options as RemarkRehypeOptions } from 'mdast-util-to-hast';
import { type ReactElement, useCallback, useState } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import rehypeReact from 'rehype-react';
import remarkParse, { type Options as RemarkParseOptions } from 'remark-parse';
import remarkToRehype from 'remark-rehype';
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
}: UseRemarkOptions = {}): [null | ReactElement, (source: string) => void] => {
  const [reactContent, setReactContent] = useState<null | ReactElement>(null);

  const setMarkdownSource = useCallback((source: string) => {
    unified()
      .use(remarkParse, remarkParseOptions)
      .use(remarkPlugins)
      .use(remarkToRehype, remarkToRehypeOptions)
      .use(rehypePlugins)
      .use(rehypeReact, {
        ...rehypeReactOptions,
        Fragment: jsxRuntime.Fragment,
        jsx: jsxRuntime.jsx,
        jsxs: jsxRuntime.jsxs,
      })
      .process(source)
      .then((vfile) => setReactContent(vfile.result as ReactElement))
      .catch(onError);
  }, []);

  return [reactContent, setMarkdownSource];
};