import * as React from 'react';
import { useRemark } from '../hooks/useRemark';
import { transformImageUrl, twoColumnFormatting } from '../utils';
import rehypePrettyCode from 'rehype-pretty-code';
import { usePrevious } from '../hooks/usePrevious';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '../../constants';

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
  const prevContent = usePrevious(content);
  const [customTheme, setCustomTheme] = React.useState<string | undefined>(undefined);

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



  const updateCustomThemePath = React.useCallback((customThemePath: string) => {
    if (!customThemePath) {
      setCustomTheme(undefined);
      return;
    }

    if (customThemePath.startsWith(`https://`)) {
      setCustomTheme(customThemePath);
    } else {
      messageHandler.request<string>(WebViewMessages.toVscode.parseFileUri, customThemePath).then((customThemeUri) => {
        setCustomTheme(customThemeUri);
      }).catch(() => {
        setCustomTheme(undefined);
      });
    }
  }, []);

  React.useEffect(() => {
    updateTheme(matter?.theme || "default");
    updateLayout(matter?.layout || "default");
    updateCustomThemePath(matter?.customTheme || undefined);

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
  }, [matter, updateTheme, updateLayout, updateCustomThemePath, updateBgStyles, webviewUrl]);

  React.useEffect(() => {
    if (content && content !== prevContent) {
      // Passing the theme here as it could be that the theme has been updated
      setMarkdown(twoColumnFormatting(content), [[rehypePrettyCode, { theme: vsCodeTheme ? vsCodeTheme : {} }]]);
    }
  }, [content, vsCodeTheme]);

  return (
    <>
      {customTheme && <link href={customTheme} rel="stylesheet" />}

      {markdown}
    </>
  );
};