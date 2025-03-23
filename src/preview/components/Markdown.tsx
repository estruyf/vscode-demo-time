import * as React from 'react';
import { useRemark } from '../hooks/useRemark';
import { transformImageUrl, twoColumnFormatting } from '../utils';
import rehypePrettyCode from 'rehype-pretty-code';
import { usePrevious } from '../hooks/usePrevious';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '../../constants';
import { renderToString } from 'react-dom/server';
import { convertTemplateToHtml } from '../../utils/convertTemplateToHtml';

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
  const [isReady, setIsReady] = React.useState(false);
  const [customTheme, setCustomTheme] = React.useState<string | undefined>(undefined);
  const [customLayout, setCustomLayout] = React.useState<string | undefined>(undefined);
  const [template, setTemplate] = React.useState<string | undefined>(undefined);

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

  const prevMatter = usePrevious(JSON.stringify(matter));

  const updateCustomLayout = React.useCallback((layout: string, metadata: any) => {
    if (layout) {
      messageHandler.request<string>(WebViewMessages.toVscode.getFileContents, layout).then(async (templateHtml) => {
        if (templateHtml) {
          let html = await convertTemplateToHtml(templateHtml, {
            metadata,
            content: renderToString(markdown),
          });

          // Replace all the `<style>` tags with `<style type="text/tailwindcss">`
          html = html.replace(/<style>/g, '<style type="text/tailwindcss">');

          setTemplate(html);
          setIsReady(true);
        }
      }).catch(() => {
        setIsReady(true);
      });
    } else {
      setIsReady(true);
    }
  }, [content, markdown]);

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
    if (!matter) {
      setIsReady(false);
      return;
    }

    if (prevMatter === JSON.stringify(matter)) {
      return;
    }

    setIsReady(false);
    setCustomLayout(undefined);
    setCustomTheme(undefined);
    setTemplate(undefined);

    const cLayout = matter?.customLayout || undefined;
    updateCustomLayout(cLayout, matter);

    updateTheme(matter?.theme || "default");
    updateLayout(cLayout || matter?.layout || "default");
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
  }, [isReady, prevContent, matter, updateTheme, updateLayout, updateCustomThemePath, updateBgStyles, webviewUrl]);

  React.useEffect(() => {
    if (content && content !== prevContent) {
      // Passing the theme here as it could be that the theme has been updated
      setMarkdown(twoColumnFormatting(content), [[rehypePrettyCode, { theme: vsCodeTheme ? vsCodeTheme : {} }]]);
    }
  }, [content, vsCodeTheme]);

  if (!isReady) {
    return null;
  }

  if (customLayout && !template) {
    return null;
  }

  if (template) {
    return (
      <>
        {customTheme && <link href={customTheme} rel="stylesheet" />}

        <div className='slide__content__custom' dangerouslySetInnerHTML={{ __html: template }} />
      </>
    );
  }

  return (
    <>
      {customTheme && <link href={customTheme} rel="stylesheet" />}

      <div className='slide__content__inner'>{markdown}</div>
    </>
  );
};