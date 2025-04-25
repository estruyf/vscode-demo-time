import * as React from 'react';
import { useRemark } from '../hooks/useRemark';
import { transformImageUrl, twoColumnFormatting } from '../utils';
import rehypePrettyCode from 'rehype-pretty-code';
import { usePrevious } from '../hooks/usePrevious';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { SlideTransition, WebViewMessages } from '../../constants';
import { renderToString } from 'react-dom/server';
import { convertTemplateToHtml } from '../../utils/convertTemplateToHtml';
import { SlideMetadata } from '../../models';
import { SlideParser } from '../../services/SlideParser';

export interface IMarkdownProps {
  filePath?: string;
  content?: string;
  vsCodeTheme: any;
  isDarkTheme: boolean;
  webviewUrl: string | null;
  updateTheme: (theme: string) => void;
  updateLayout: (layout: string) => void;
  updateBgStyles: (styles: any) => void;
}

export const Markdown: React.FunctionComponent<IMarkdownProps> = ({
  filePath,
  content,
  vsCodeTheme,
  isDarkTheme,
  webviewUrl,
  updateTheme,
  updateLayout,
  updateBgStyles
}: React.PropsWithChildren<IMarkdownProps>) => {
  const prevFilePath = usePrevious(filePath);
  const prevContent = usePrevious(content);
  const [isReady, setIsReady] = React.useState(false);
  const [customTheme, setCustomTheme] = React.useState<string | undefined>(undefined);
  const [customLayout, setCustomLayout] = React.useState<string | undefined>(undefined);
  const [transition, setTransition] = React.useState<SlideTransition | undefined>(undefined);
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

  const updateCustomLayout = React.useCallback((metadata: SlideMetadata, layout?: string) => {
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

  const updateCustomThemePath = React.useCallback((customThemePath?: string) => {
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
    setTransition(matter?.transition || undefined);
    setTemplate(undefined);

    const cLayout = matter?.customLayout || undefined;
    updateCustomLayout(matter, cLayout);

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
      // Split content into individual slides using the "---" delimiter
      console.log('Splitting content into slides...');
      const parser = new SlideParser();
      const slides = parser.parseSlides(content);

      console.log('Parsed slides:', slides);


      // Passing the theme here as it could be that the theme has been updated
      setMarkdown(twoColumnFormatting(content), [[rehypePrettyCode, { theme: vsCodeTheme ? vsCodeTheme : {} }]], isDarkTheme);
    }
  }, [content, vsCodeTheme, isDarkTheme]);

  if (!isReady) {
    return null;
  }

  if (customLayout && !template) {
    return null;
  }

  return (
    <>
      {customTheme && <link href={customTheme} rel="stylesheet" />}

      {
        template ? (
          <div key={filePath} className={`slide__content__custom ${transition || ""}`} dangerouslySetInnerHTML={{ __html: template }} />
        ) : (
          <div key={filePath} className={`slide__content__inner ${transition || ""}`}>{markdown}</div>
        )
      }
    </>
  );
};