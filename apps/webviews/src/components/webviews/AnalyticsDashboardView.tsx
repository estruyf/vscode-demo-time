import { useCallback, useEffect, useState } from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client';
import { EventData } from '@estruyf/vscode';
import { Loader } from 'vscrui';
import { BarChart3, Target, Video, Lightbulb, List, FolderOpen, Pause, AlertCircle } from 'lucide-react';
import { WebViewMessages } from '@demotime/common';
import { SessionInfo, SessionData, RecordingStatus } from '../../types/analytics';
import {
  SessionList,
  RecordingIndicator,
  StatCard,
  RecommendationCard,
  DemoBreakdown,
  FileActivity,
  PausesList,
  ErrorsSection,
  TimerStatusBadge,
} from '../analytics';
import { formatDuration } from '../../utils';
import { Button } from '../ui';

type TabType = 'scenes' | 'recommendations' | 'files' | 'narratives' | 'errors';

const AnalyticsDashboardView = () => {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isRecording: false,
    session: null,
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('scenes');

  const loadSessions = useCallback(async () => {
    try {
      const response = await messageHandler.request<SessionInfo[]>(
        WebViewMessages.toVscode.analyticsDashboard.getSessions,
      );
      setSessions(response || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    }
  }, []);

  const loadSessionSummary = useCallback(async (filename: string) => {
    setLoading(true);
    try {
      const response = await messageHandler.request<SessionData>(
        WebViewMessages.toVscode.analyticsDashboard.getSessionSummary,
        { filename },
      );
      setSessionData(response);
    } catch (error) {
      console.error('Failed to load session summary:', error);
      setSessionData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecordingStatus = useCallback(async () => {
    try {
      const response = await messageHandler.request<RecordingStatus>(
        WebViewMessages.toVscode.analyticsDashboard.getRecordingStatus,
      );
      setRecordingStatus(response || { isRecording: false, session: null });
    } catch (error) {
      console.error('Failed to load recording status:', error);
    }
  }, []);

  const handleDeleteSession = async (filename: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      messageHandler.send(WebViewMessages.toVscode.analyticsDashboard.deleteSession, {
        filename,
      });
      if (selectedSession?.filename === filename) {
        setSelectedSession(null);
        setSessionData(null);
      }
      await loadSessions();
    }
  };

  const handleExportSession = async (filename: string, format: 'markdown' | 'json') => {
    messageHandler.send(WebViewMessages.toVscode.analyticsDashboard.exportSession, {
      filename,
      format,
    });
  };

  const handleOpenFile = async (filename: string) => {
    messageHandler.send(WebViewMessages.toVscode.openFile, {
      filename
    });
  };

  useEffect(() => {
    loadSessions();
    loadRecordingStatus();

    function messageListener(message: MessageEvent<EventData<unknown>>) {
      const { command, payload } = message.data;

      if (command === WebViewMessages.toWebview.analyticsDashboard.updateSessions) {
        loadSessions();
      } else if (command === WebViewMessages.toWebview.analyticsDashboard.updateRecordingStatus) {
        setRecordingStatus(payload as RecordingStatus);
      }
    }

    Messenger.listen(messageListener);

    return () => {
      Messenger.unlisten(messageListener);
    };
  }, [loadSessions, loadRecordingStatus]);

  useEffect(() => {
    if (selectedSession) {
      loadSessionSummary(selectedSession.filename);
    }
  }, [selectedSession, loadSessionSummary]);

  if (sessions === null) {
    return <Loader />;
  }

  const tabs = [
    {
      id: 'scenes' as TabType,
      label: 'Scene Breakdown',
      icon: List,
      count: sessionData?.summary.demoBreakdown.length,
      description: 'Analyze time spent on each scene and action during your presentation'
    },
    {
      id: 'files' as TabType,
      label: 'File Activity',
      icon: FolderOpen,
      count: sessionData?.summary.fileBreakdown.length,
      description: 'See which files you focused on and identify your most-viewed code sections'
    },
    {
      id: 'narratives' as TabType,
      label: 'Longest Narratives',
      icon: Pause,
      count: sessionData?.summary.longestNarratives.length,
      description: 'These are the moments where you spent the most time on a single action or slide, typically indicating extended explanations, Q&A, or detailed discussions. Use this to identify which topics engage your audience most.'
    },
    {
      id: 'errors' as TabType,
      label: 'Errors',
      icon: AlertCircle,
      count: sessionData?.summary.errorSummary.totalErrors,
      description: 'Review errors encountered during the presentation and their recovery details'
    },
    {
      id: 'recommendations' as TabType,
      label: 'Recommendations',
      icon: Lightbulb,
      count: sessionData?.summary.recommendations.length,
      description: 'Get AI-powered suggestions to improve your presentation flow and timing'
    },
  ];

  return (
    <div className="h-screen flex flex-col">
      <header className="flex justify-between items-center p-4 border-b border-(--vscode-panel-border)">
        <h1 className="m-0 text-xl flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analytics Dashboard
        </h1>
        <RecordingIndicator isRecording={recordingStatus.isRecording} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-(--vscode-panel-border) overflow-y-auto">
          <div className="p-4">
            <h2 className="m-0 mb-3 text-sm font-semibold uppercase tracking-wide text-(--vscode-descriptionForeground)">
              Sessions
            </h2>
            <SessionList
              sessions={sessions}
              selectedSession={selectedSession}
              onSelectSession={(session) => {
                setSelectedSession(session);
                setActiveTab('scenes');
              }}
            />
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader />
            </div>
          ) : selectedSession && sessionData ? (
            <>
              {/* Session header */}
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="m-0 flex items-center gap-2 text-base">
                    {sessionData.summary.isDryRun ? (
                      <><Target className="w-4 h-4" /> Dry Run Session</>
                    ) : (
                      <><Video className="w-4 h-4" /> Live Session</>
                    )}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExportSession(selectedSession.filename, 'markdown')}
                      variant='primary'
                    >
                      Export Markdown
                    </Button>
                    <Button onClick={() => handleOpenFile(selectedSession.filename)}>
                      Open JSON
                    </Button>
                    <Button
                      className="danger"
                      onClick={() => handleDeleteSession(selectedSession.filename)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <StatCard label="Duration" value={formatDuration(sessionData.summary.totalDuration)} />
                  <StatCard label="Scenes" value={sessionData.summary.demoBreakdown.length} />
                  <StatCard label="Files" value={sessionData.summary.fileBreakdown.length} />
                </div>

                {/* Timer Status Badge */}
                <TimerStatusBadge
                  status={sessionData.summary.timerStatus}
                  actualDuration={sessionData.summary.totalDuration}
                  expectedDuration={sessionData.summary.expectedDuration}
                />
              </div>

              {/* Tabs */}
              <div className="border-b border-(--vscode-panel-border) bg-(--vscode-editor-background)">
                <nav className="flex gap-0 px-2" role="tablist">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const hasCount = tab.count !== undefined && tab.count > 0;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        role="tab"
                        aria-selected={isActive}
                        className={`
                          relative flex items-center gap-2 px-3 py-2.5 
                          border-b-2 transition-all cursor-pointer
                          ${isActive
                            ? 'border-(--vscode-focusBorder) text-(--vscode-foreground) font-medium'
                            : 'border-transparent text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) hover:bg-(--vscode-list-hoverBackground)/30'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm whitespace-nowrap">{tab.label}</span>
                        {hasCount && (
                          <span
                            className={`
                              inline-flex items-center justify-center min-w-5 h-5 px-1.5 
                              rounded-full text-xs font-semibold tabular-nums
                              ${isActive
                                ? 'bg-(--vscode-badge-background) text-(--vscode-badge-foreground)'
                                : 'bg-(--vscode-input-background) text-(--vscode-descriptionForeground)'
                              }
                            `}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Tab description */}
                <div className="mb-6 pb-4 border-b border-(--vscode-panel-border)">
                  <p className="m-0 text-sm text-(--vscode-descriptionForeground) leading-relaxed">
                    {tabs.find(tab => tab.id === activeTab)?.description}
                  </p>
                </div>

                {activeTab === 'scenes' && (
                  <DemoBreakdown demos={sessionData.summary.demoBreakdown} />
                )}

                {activeTab === 'recommendations' && (
                  sessionData.summary.recommendations.length > 0 ? (
                    <ul className="list-none p-0 m-0 flex flex-col gap-3">
                      {sessionData.summary.recommendations.map((rec, idx) => (
                        <RecommendationCard key={idx} recommendation={rec} />
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center justify-center h-full text-(--vscode-descriptionForeground)">
                      <p>No recommendations available</p>
                    </div>
                  )
                )}

                {activeTab === 'files' && (
                  sessionData.summary.fileBreakdown.length > 0 ? (
                    <FileActivity files={sessionData.summary.fileBreakdown} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-(--vscode-descriptionForeground)">
                      <p>No file activity data available</p>
                    </div>
                  )
                )}

                {activeTab === 'narratives' && (
                  sessionData.summary.longestNarratives.length > 0 ? (
                    <PausesList pauses={sessionData.summary.longestNarratives} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-(--vscode-descriptionForeground)">
                      <p>No narrative data available</p>
                    </div>
                  )
                )}

                {activeTab === 'errors' && (
                  <ErrorsSection
                    errorSummary={sessionData.summary.errorSummary}
                    errors={sessionData.session.errors}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-(--vscode-descriptionForeground)">
              <p>Select a session to view its analytics</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};


export default AnalyticsDashboardView;
