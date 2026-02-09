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

  const resolvedVideoUrl = React.useMemo(() => {
    // Prefer explicit prop `videoUrl`, fall back to `matter.video`.
    const raw = videoUrl ?? matter?.video;
    if (!raw) { return undefined; }
    // Try to transform vscode file URIs to usable webview URLs
    return transformImageUrl(webviewUrl || "", raw) || raw;
  }, [videoUrl, matter?.video, webviewUrl]);

  const computedMuted = React.useMemo(() => {
    // If user explicitly set muted (true or 'true'), respect it.
    const explicit = matter && (matter.muted === true || matter.muted === 'true');
    if (explicit) { return true; }
    // Allow autoPlay by muting when autoPlay is requested or when controls are hidden.
    return Boolean(matter?.autoPlay) || !matter?.controls;
  }, [matter]);

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
  }, [matter?.playbackRate, resolvedVideoUrl]);

  // Cleanup effect for video elements when component unmounts or slide changes
  React.useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.src = '';
        v.load(); // Reset the video element
      }
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

  // Ensure the browser picks up the dynamically rendered source and respects autoPlay.
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedVideoUrl) { return; }

    // Ensure element properties are up-to-date
    video.muted = computedMuted;

    const setRateAndPlay = () => {
      if (matter?.playbackRate) {
        try {
          video.playbackRate = parseFloat(matter.playbackRate);
        } catch {
          // ignore invalid values
        }
      }

      if (Boolean(matter?.autoPlay) && computedMuted) {
        void video.play();
      }
    };

    // Attempt to set immediately (may be ignored until metadata loads)
    setRateAndPlay();

    // Also set when metadata is available to ensure playbackRate is applied
    video.addEventListener('loadedmetadata', setRateAndPlay);

    try {
      // Reload the media so the new `src`/`source` is picked up.
      video.load();
    } catch {
      // ignore
    }

    return () => {
      video.removeEventListener('loadedmetadata', setRateAndPlay);
    };
  }, [resolvedVideoUrl, isReady, computedMuted, matter?.autoPlay, matter?.playbackRate]);

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
              (resolvedVideoUrl) ? (
                <>
                  <video
                    ref={videoRef}
                    controls={matter?.controls}
                    autoPlay={matter?.autoPlay || !matter?.controls}
                    loop={matter?.loop || !matter?.controls}
                    muted={computedMuted}
                    playsInline={matter?.playsInline || !matter?.controls}
                    preload="auto"
                    src={resolvedVideoUrl}
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
