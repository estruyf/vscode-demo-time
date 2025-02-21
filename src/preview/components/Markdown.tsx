import * as React from 'react';
import { useRemark } from '../hooks/useRemark';
import { transformImageUrl } from '../utils';
import rehypePrettyCode from 'rehype-pretty-code';

export interface IMarkdownProps {
  content?: string;
  theme: any;
  webviewUrl: string | null;
  updateTemplate: (template: string) => void;
  updateSlideType: (template: string) => void;
}

export const Markdown: React.FunctionComponent<IMarkdownProps> = ({
  content,
  theme,
  webviewUrl,
  updateTemplate,
  updateSlideType,
}: React.PropsWithChildren<IMarkdownProps>) => {
  const {
    markdown,
    setMarkdown,
    matter
  } = useRemark({
    rehypePlugins: [
      [rehypePrettyCode, {
        theme: theme ? theme : {},
      }]
    ],
    rehypeReactOptions: {
      components: {
        img: ({ node, src, ...props }) => {
          const fullSrc = transformImageUrl(webviewUrl || "", src);
          if (!fullSrc) {
            return null;
          }
          return <img
            {...props}
            src={fullSrc}
            alt={props.alt || ''}
          />;
        }
      }
    }
  });

  React.useEffect(() => {
    updateTemplate(matter?.template || "default");
    updateSlideType(matter?.layout || "default");
  }, [matter, updateTemplate, updateSlideType]);

  React.useEffect(() => {
    if (content) {
      setMarkdown(content);
    }
  }, [content]);

  return (
    <div>
      {markdown}
    </div>
  );
};