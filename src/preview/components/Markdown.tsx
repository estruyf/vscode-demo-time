import * as React from 'react';
import { useRemark } from '../hooks/useRemark';
import { transformImageUrl, twoColumnFormatting } from '../utils';
import rehypePrettyCode from 'rehype-pretty-code';

export interface IMarkdownProps {
  content?: string;
  theme: any;
  webviewUrl: string | null;
  updateTemplate: (template: string) => void;
  updateSlideType: (template: string) => void;
  updateBgStyles: (styles: any) => void;
}

export const Markdown: React.FunctionComponent<IMarkdownProps> = ({
  content,
  theme,
  webviewUrl,
  updateTemplate,
  updateSlideType,
  updateBgStyles
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

    if (matter?.image) {
      const img = transformImageUrl(webviewUrl || "", matter?.image)
      updateBgStyles({
        color: 'white',
        backgroundImage: `url(${img})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
      });
    } else {
      updateBgStyles(undefined);
    }
  }, [matter, updateTemplate, updateSlideType]);

  React.useEffect(() => {
    if (content) {
      setMarkdown(twoColumnFormatting(content));
    }
  }, [content]);

  return (
    <>
      {markdown}
    </>
  );
};