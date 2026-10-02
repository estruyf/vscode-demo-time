import { GallerySnippetIndexEntry, WebViewMessages } from '@demotime/common';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { ArrowDownToLine, Check, Download, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../layout';
import { Button } from '../ui/Button';

interface GalleryConfig {
  isPreRelease: boolean;
  indexUrl: string;
  rawBaseUrl: string;
}

interface DownloadResponse {
  success: boolean;
  path?: string;
  message?: string;
}

type GallerySnippetEntry = GallerySnippetIndexEntry & {
  actions?: string[];
};

const GalleryView = () => {
  const [config, setConfig] = useState<GalleryConfig | null>(null);
  const [snippets, setSnippets] = useState<GallerySnippetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedSnippetPaths, setDownloadedSnippetPaths] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string>('');

  const getWorkspaceSnippetPath = (snippetPath: string) => {
    const normalizedSnippetPath = snippetPath
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/^gallery\//, '');

    return `.demo/snippets/${normalizedSnippetPath}`;
  };

  const fetchSnippets = async () => {
    setLoading(true);
    setError(null);
    setStatus('');

    try {
      const galleryConfig = await messageHandler.request<GalleryConfig>(
        WebViewMessages.toVscode.gallery.getConfig,
      );
      setConfig(galleryConfig);

      const downloaded = await messageHandler.request<string[]>(
        WebViewMessages.toVscode.gallery.getDownloadedSnippets,
      );
      setDownloadedSnippetPaths(new Set(Array.isArray(downloaded) ? downloaded : []));

      const response = await fetch(galleryConfig.indexUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch gallery index: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as GallerySnippetEntry[];
      setSnippets(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError((fetchError as Error).message);
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, []);

  const filteredSnippets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return snippets;
    }

    return snippets.filter((snippet) => {
      const haystack = [
        snippet.id,
        snippet.name,
        snippet.description || '',
        snippet.author || '',
        ...(snippet.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [snippets, search]);

  const downloadSnippet = async (snippet: GallerySnippetEntry) => {
    if (!config) {
      return;
    }

    setDownloadingId(snippet.id);
    setStatus('');

    try {
      const downloadUrl = `${config.rawBaseUrl}/${snippet.path}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download snippet: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();
      const result = await messageHandler.request<DownloadResponse>(
        WebViewMessages.toVscode.gallery.downloadSnippet,
        {
          snippetPath: snippet.path,
          content,
        },
      );

      if (result?.success) {
        const downloadedPath = getWorkspaceSnippetPath(snippet.path);
        setDownloadedSnippetPaths((prev) => {
          const next = new Set(prev);
          next.add(downloadedPath);
          return next;
        });
        setStatus(`Downloaded ${snippet.name} to ${result.path}`);
      } else {
        throw new Error(result?.message || 'Unable to save snippet in workspace.');
      }
    } catch (downloadError) {
      setStatus(`Failed to download ${snippet.name}: ${(downloadError as Error).message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const previewSnippet = (snippet: GallerySnippetEntry) => {
    if (!config) {
      return;
    }

    const previewUrl = `${config.rawBaseUrl}/${snippet.path}`;
    messageHandler.send(WebViewMessages.toVscode.runCommand, {
      command: 'workbench.action.browser.open',
      args: previewUrl,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader
        title="Snippet Gallery"
        subtitle={
          config
            ? `Source: ${config.isPreRelease ? 'Beta' : 'Stable'} gallery feed`
            : 'Browse reusable snippets and download them into your workspace'
        }
        showValidation={false}
        onToggleValidation={() => { }}
        fileControls={null}
        actionControls={
          <Button variant="secondary" icon={RefreshCw} onClick={fetchSnippets}>
            Refresh
          </Button>
        }
        autoSaveStatus={undefined}
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search snippets by name, id, description, or tags"
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-demo-time-accent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {status && (
          <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
            {status}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-sm text-gray-600 dark:text-gray-300">
            Loading gallery snippets...
          </div>
        ) : filteredSnippets.length === 0 ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-sm text-gray-600 dark:text-gray-300">
            No snippets found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSnippets.map((snippet) => {
              const isDownloaded = downloadedSnippetPaths.has(getWorkspaceSnippetPath(snippet.path));

              return (
                <div
                  key={snippet.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{snippet.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{snippet.id}</p>
                      {isDownloaded && (
                        <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                          <Check className="h-3 w-3" />
                          Downloaded
                        </span>
                      )}
                    </div>
                    <Button
                      variant="dark"
                      size="sm"
                      icon={downloadingId === snippet.id ? RefreshCw : ArrowDownToLine}
                      onClick={() => downloadSnippet(snippet)}
                      disabled={downloadingId !== null}
                      title={isDownloaded ? 'Re-download snippet' : 'Download snippet'}
                      className={downloadingId === snippet.id ? 'opacity-80' : ''}
                    >
                      {downloadingId === snippet.id ? 'Downloading...' : isDownloaded ? 'Re-download' : 'Download'}
                    </Button>
                  </div>

                  {snippet.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">{snippet.description}</p>
                  )}

                  {snippet.actions && snippet.actions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Actions ({snippet.actions.length})
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {snippet.actions.map((action) => (
                          <span
                            key={`${snippet.id}-${action}`}
                            className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {(snippet.tags || []).map((tag) => (
                      <span
                        key={`${snippet.id}-${tag}`}
                        className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>Author: {snippet.author || 'Unknown'}</p>
                    <p>Version: {snippet.version || 'Unknown'}</p>
                    <p>Fields: {snippet.fields?.length || 0}</p>
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1 text-demo-time-accent hover:underline"
                      onClick={() => previewSnippet(snippet)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview source
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Download className="h-3.5 w-3.5" />
          Downloaded snippets are saved to .demo/snippets/&lt;id&gt;.json in your workspace.
        </div>
      </div>
    </div>
  );
};

export default GalleryView;
