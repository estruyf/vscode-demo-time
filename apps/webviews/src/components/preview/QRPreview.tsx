import * as React from 'react';
import QRCode from 'qrcode';

export interface IQRPreviewProps {
  url: string;
  topText?: string;
  title?: string;
  description?: string;
  logo?: string;
}

const getCssVarColor = (name: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export const QRPreview: React.FunctionComponent<IQRPreviewProps> = ({
  url,
  topText,
  title,
  description,
  logo,
}: React.PropsWithChildren<IQRPreviewProps>) => {
  const [svgDataUrl, setSvgDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const qrDark = getCssVarColor('--vscode-editor-foreground', '#000000');
    const qrLight = getCssVarColor('--vscode-editor-background', '#ffffff');

    QRCode.toDataURL(url, {
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: qrDark,
        light: qrLight,
      },
      errorCorrectionLevel: 'H',
    }).then((dataUrl) => {
      if (!cancelled) {
        setSvgDataUrl(dataUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full px-6 py-10"
      style={{
        backgroundColor: 'var(--vscode-editor-background)',
        backgroundImage:
          'radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--vscode-textLink-foreground) 12%, transparent) 0%, transparent 46%), radial-gradient(circle at 88% 82%, color-mix(in srgb, var(--vscode-editor-foreground) 10%, transparent) 0%, transparent 42%)',
        color: 'var(--vscode-editor-foreground)',
      }}
    >
      <div className="w-full max-w-4xl px-10 py-10">
        <div className="flex flex-col items-center text-center gap-6">
          {
            topText && (
              <p
                className="text-xs uppercase tracking-[0.18em]"
                style={{ color: 'color-mix(in srgb, var(--vscode-editor-foreground) 60%, transparent)' }}
              >
                {topText}
              </p>
            )
          }

          <div className="w-full flex items-center justify-center gap-8 flex-wrap md:flex-nowrap">
            {logo && (
              <div
                className="rounded-3xl flex items-center justify-center text-sm shrink-0 p-4"
                style={{
                  width: 374,
                  height: 374,
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 14px 40px rgba(0, 0, 0, 0.22)',
                }}
              >
                <img
                  src={logo}
                  alt="logo"
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              </div>
            )}

            {svgDataUrl ? (
              <div
                className="rounded-3xl p-4 shrink-0"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 14px 40px rgba(0, 0, 0, 0.22)',
                }}
              >
                <img src={svgDataUrl} alt={`QR code for ${url}`} width={340} height={340} />
              </div>
            ) : (
              <div
                className="rounded-3xl flex items-center justify-center text-sm shrink-0"
                style={{
                  width: 340,
                  height: 340,
                  background: 'var(--vscode-panel-background)',
                  color: 'color-mix(in srgb, var(--vscode-editor-foreground) 70%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--vscode-editor-foreground) 16%, transparent)',
                }}
              >
                Generating…
              </div>
            )}
          </div>

          {title && (
            <p
              className="text-4xl font-semibold text-center mt-2"
              style={{ color: 'var(--vscode-editor-foreground)' }}
            >
              {title}
            </p>
          )}

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xl text-center break-all hover:opacity-100 transition-opacity max-w-2xl"
            style={{
              color: 'var(--vscode-textLink-foreground)',
              opacity: 0.9,
              textUnderlineOffset: '0.2em',
            }}
          >
            {url}
          </a>

          {description && (
            <p
              className="text-sm mt-1"
              style={{ color: 'color-mix(in srgb, var(--vscode-editor-foreground) 62%, transparent)' }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
