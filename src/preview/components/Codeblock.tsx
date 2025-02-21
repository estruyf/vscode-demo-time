import * as React from 'react';
import { createHighlighter, bundledLanguages } from 'shiki';

export interface ICodeblockProps {
  theme: any;
  code?: string;
  className?: string;
}

export const Codeblock: React.FunctionComponent<ICodeblockProps> = ({
  code,
  className,
  theme
}: React.PropsWithChildren<ICodeblockProps>) => {
  const [highlightedCode, setHighlightedCode] = React.useState<string | undefined>(undefined);

  const createHighlighting = React.useCallback(() => {
    setTimeout(async () => {
      console.log('highlighting start');
      if (!code || !theme) {
        return;
      }

      const highlighter = await createHighlighter({
        themes: [theme],
        langs: Object.keys(bundledLanguages)
      });
      console.log('highlighting middle');

      const lang = className?.replace('language-', '') || 'plaintext';

      const html = highlighter.codeToHtml(code as string, {
        theme: theme.name,
        lang: lang
      });
      console.log('highlighting end');

      setHighlightedCode(html);
    }, 0);
  }, [code, theme, className]);

  React.useEffect(() => {
    createHighlighting();
  }, []);

  return (
    <>
      {highlightedCode && (
        <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      )}
    </>
  );
};