import * as React from 'react';
import rehypePrettyCode from 'rehype-pretty-code';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { convertTemplateToHtml, SlideMetadata, twoColumnFormatting, WebViewMessages } from '@demotime/common';
import { renderToString } from 'react-dom/server';
import { usePrevious, useRemark } from '../../hooks';
import { transformImageUrl } from '../../utils';

export interface IMarkdownProps {
  filePath?: string;
  content?: string;
  matter?: SlideMetadata;
  vsCodeTheme: never;
  isDarkTheme: boolean;
  webviewUrl: string | null;
  videoUrl?: string;
  updateBgStyles: (styles: React.CSSProperties | undefined) => void;
}

export const Markdown: React.FunctionComponent<IMarkdownProps> = ({
  filePath,
  content,
  matter,
  vsCodeTheme,
  isDarkTheme,
  webviewUrl,
  videoUrl,
  updateBgStyles
}: React.PropsWithChildren<IMarkdownProps>) => {
  const prevContent = usePrevious(content);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [customTheme, setCustomTheme] = React.useState<string | undefined>(undefined);
  const [customLayout, setCustomLayout] = React.useState<string | undefined>(undefined);
  const [template, setTemplate] = React.useState<string | undefined>(undefined);
  const [currentLayoutPath, setCurrentLayoutPath] = React.useState<string | undefined>(undefined);

  const {
    markdown,
    textContent,
    setMarkdown,
    processMarkdown
  } = useRemark({
    rehypeReactOptions: {
      components: {
        img: ({ src, ...props }) => {
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
    // Clear previous template if layout path changed
    if (layout !== currentLayoutPath) {
      setTemplate(undefined);
      setCurrentLayoutPath(layout);
    }

    if (layout) {
      messageHandler.request<string>(WebViewMessages.toVscode.getFileContents, layout).then(async (templateHtml) => {
        if (templateHtml) {
          let crntSlideContent = textContent;
          if (!textContent && content) {
            const processedContent = await processMarkdown(content);
            crntSlideContent = renderToString(processedContent.reactContent);
          }

          const metadataWithUrl = { ...metadata, webViewUrl: webviewUrl || undefined };

          const html = convertTemplateToHtml(templateHtml, {
            metadata: metadataWithUrl,
            content: crntSlideContent,
          }, webviewUrl);

          setTemplate(html);
          setIsReady(true);
        }
      }).catch(() => {
        setIsReady(true);
      });
    } else {
      setIsReady(true);
    }
  }, [content, textContent, webviewUrl]);

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
    setTemplate(undefined);

    const cLayout = matter?.customLayout || undefined;
    updateCustomLayout(matter, cLayout);

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
  }, [isReady, prevContent, matter, updateCustomThemePath, updateBgStyles, webviewUrl]);

  React.useEffect(() => {
    if (content && content !== prevContent) {
      // Passing the theme here as it could be that the theme has been updated
      setMarkdown(twoColumnFormatting(content), [[rehypePrettyCode, { theme: vsCodeTheme ? vsCodeTheme : {} }]], isDarkTheme);
    }
  }, [content, vsCodeTheme, isDarkTheme]);

  // Set playback rate when video is ready
  React.useEffect(() => {
    if (videoRef.current && matter?.playbackRate) {
      videoRef.current.playbackRate = parseFloat(matter.playbackRate);
    }
  }, [matter?.playbackRate, videoUrl]);

  // Cleanup effect for video elements when component unmounts or slide changes
  React.useEffect(() => {
    return () => {
      // Stop all video elements when component unmounts or slide changes
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        video.pause();
        video.src = '';
        video.load(); // Reset the video element
      });
    };
  }, [filePath, matter?.customLayout]);

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (isReady) {
      // Sent a reveal message to the extension when the slide is ready.
      timeoutId = setTimeout(() => {
        messageHandler.send(WebViewMessages.toVscode.slideReady);
      }, 100);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isReady]);

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
          <div
            key={`custom-${filePath}-${matter?.customLayout}-${JSON.stringify(matter)}`}
            className={`slide__content__custom`}
            dangerouslySetInnerHTML={{ __html: template }}
          />
        ) : (
          <div
            key={`standard-${filePath}-${matter?.video || 'no-video'}`}
            className={`slide__content__inner`}
          >
            {
              (videoUrl) ? (
                <>
                  <video
                    ref={videoRef}
                    controls={matter?.controls}
                    autoPlay={matter?.autoplay || !matter?.controls}
                    loop={matter?.loop || !matter?.controls}
                    muted={matter?.muted || !matter?.controls}
                    playsInline={matter?.playsInline || !matter?.controls}
                    preload="auto"
                    src={videoUrl}
                    className='fixed inset-0 -z-1'></video>
                  <div className='z-10'>{markdown}</div>
                </>
              ) : (
                markdown
              )
            }
          </div>
        )
      }
    </>
  );
};
