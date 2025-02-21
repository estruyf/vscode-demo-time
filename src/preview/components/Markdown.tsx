import * as React from 'react';
import { useRemark } from '../hooks/useRemark';
import { transformImageUrl } from '../utils';
import rehypePrettyCode from 'rehype-pretty-code';

export interface IMarkdownProps {
  content?: string;
  theme: any;
  webviewUrl: string | null;
}

export const Markdown: React.FunctionComponent<IMarkdownProps> = ({
  content,
  theme,
  webviewUrl
}: React.PropsWithChildren<IMarkdownProps>) => {
  const [markdown, setMarkdown] = useRemark({
    rehypePlugins: [
      [rehypePrettyCode, {
        theme: theme ? theme : {},
      }]
    ],
    rehypeReactOptions: {
      components: {
        h1: ({ node, ...props }) => <h1 className="text-4xl mb-6" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-3xl" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-2xl" {...props} />,
        p: ({ node, ...props }) => <p className="leading-relaxed" {...props} />,
        a: ({ node, ...props }) => <a className="text-[var(--vscode-textLink-foreground)] underline" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc ml-6" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal ml-6" {...props} />,
        li: ({ node, ...props }) => <li className="mb-2" {...props} />,
        pre: ({ node, ...props }) => <pre className="bg-[var(--vscode-editor-background)]" {...props} />,
        code: ({ node, ...props }) => <code className="inline-block px-1 rounded-[2px]" {...props} />,
        img: ({ node, src, ...props }) => {
          const fullSrc = transformImageUrl(webviewUrl || "", src);
          if (!fullSrc) {
            return null;
          }
          return <img
            className="max-w-full h-auto mb-4"
            {...props}
            src={fullSrc}
            alt={props.alt || ''}
          />;
        },
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-[var(--vscode-textBlockQuote-border)] bg-[var(--vscode-textBlockQuote-background)] p-2"
            {...props}
          />
        ),
      }
    }
  });

  React.useEffect(() => {
    if (content) {
      setMarkdown(content);
    }
  }, [content]);

  return (
    <>
      {markdown}
    </>
  );
};