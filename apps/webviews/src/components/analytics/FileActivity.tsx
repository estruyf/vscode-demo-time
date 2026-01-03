import React from 'react';
import { FolderOpen, Eye } from 'lucide-react';
import { Card } from '../ui/Card';
import { FileBreakdownItem } from '@demotime/common';

interface FileActivityProps {
  files: FileBreakdownItem[];
}

export const FileActivity: React.FC<FileActivityProps> = ({ files }) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex flex-col gap-3">
        {files.slice(0, 10).map((file, idx) => (
          <Card
            key={idx}
            className="p-4 transition-all hover:shadow-lg hover:border-(--vscode-focusBorder)"
          >
            {/* File header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <div className="font-semibold text-base mb-1 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--vscode-badge-background) text-(--vscode-badge-foreground) text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-mono text-sm">{file.fileName}</span>
                </div>
                {file.filePath && file.filePath !== file.fileName && (
                  <div className="text-xs text-(--vscode-descriptionForeground) ml-8 font-mono">
                    {file.filePath}
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mb-2">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-(--vscode-descriptionForeground)" />
                <span className="text-xs text-(--vscode-descriptionForeground) uppercase tracking-wide">Opened</span>
                <span className="font-semibold text-sm">{file.openCount}x</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-1.5 bg-(--vscode-editor-background) rounded-full overflow-hidden mb-2">
              <div
                className="absolute inset-y-0 left-0 bg-(--vscode-progressBar-background) rounded-full transition-all"
                style={{ width: `${Math.min(file.percentage, 100)}%` }}
              />
            </div>

            {/* Hotspot lines */}
            {file.hotspotLines && file.hotspotLines.length > 0 && (
              <div className="mt-3 pt-3 border-t border-(--vscode-panel-border)">
                <div className="text-xs font-semibold text-(--vscode-descriptionForeground) mb-2 uppercase tracking-wide">
                  Most Viewed Lines
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {file.hotspotLines.slice(0, 10).map((line, lineIdx) => (
                    <span
                      key={lineIdx}
                      className="inline-flex items-center px-2 py-1 rounded bg-(--vscode-editor-background) text-xs font-mono font-semibold border border-(--vscode-panel-border)"
                    >
                      L{line}
                    </span>
                  ))}
                  {file.hotspotLines.length > 10 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs text-(--vscode-descriptionForeground)">
                      +{file.hotspotLines.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
};
