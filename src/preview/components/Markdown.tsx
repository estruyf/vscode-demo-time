import * as React from 'react';
import { useRemark } from '../hooks/useRemark';
import { transformImageUrl, twoColumnFormatting } from '../utils';
import rehypePrettyCode from 'rehype-pretty-code';

export interface IMarkdownProps {
  content?: string;
  vsCodeTheme: any;
  webviewUrl: string | null;
  updateTheme: (theme: string) => void;
  updateLayout: (layout: string) => void;
  updateBgStyles: (styles: any) => void;
}

export const Markdown: React.FunctionComponent<IMarkdownProps> = ({
  content,
  vsCodeTheme,
  webviewUrl,
  updateTheme,
  updateLayout,
  updateBgStyles
}: React.PropsWithChildren<IMarkdownProps>) => {
  const {
    markdown,
    setMarkdown,
    matter
  } = useRemark({
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
    updateTheme(matter?.theme || "default");
    updateLayout(matter?.layout || "default");

    if (matter?.image) {
      const img = transformImageUrl(webviewUrl || "", matter?.image);
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
  }, [matter, updateTheme, updateLayout]);

  React.useEffect(() => {
    if (content) {
      // Passing the theme here as it could be that the theme has been updated
      setMarkdown(twoColumnFormatting(content), [[rehypePrettyCode, { theme: vsCodeTheme ? vsCodeTheme : {} }]]);
    }
  }, [content, vsCodeTheme]);

  return (
    <>
      {markdown}
    </>
  );
};