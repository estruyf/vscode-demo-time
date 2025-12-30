import { useCallback, useEffect, useState } from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client';
import { EventData } from '@estruyf/vscode';
import { Loader, Button } from 'vscrui';
import { BarChart3, Target, Video, Lightbulb } from 'lucide-react';
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
} from '../analytics';
import { formatDuration } from '../../utils';

const AnalyticsDashboardView = () => {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isRecording: false,
    session: null,
  });
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex flex-col h-screen p-4 box-border text-[var(--vscode-foreground)] bg-[var(--vscode-editor-background)]">
      <header className="flex justify-between items-center mb-4">
        <h1 className="m-0 text-2xl flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Analytics Dashboard
        </h1>
        <RecordingIndicator isRecording={recordingStatus.isRecording} />
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <aside className="w-[280px] flex-shrink-0 bg-[var(--vscode-sideBar-background)] border border-[var(--vscode-panel-border)] rounded p-4 overflow-y-auto">
          <h2 className="m-0 mb-4 text-base border-b border-[var(--vscode-panel-border)] pb-2">
            Sessions
          </h2>
          <SessionList
            sessions={sessions}
            selectedSession={selectedSession}
            onSelectSession={setSelectedSession}
          />
        </aside>

        <main className="flex-1 bg-[var(--vscode-sideBar-background)] border border-[var(--vscode-panel-border)] rounded p-4 overflow-y-auto">
          {loading ? (
            <Loader />
          ) : selectedSession && sessionData ? (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h2 className="m-0 flex items-center gap-2">
                  {sessionData.summary.isDryRun ? (
                    <><Target className="w-5 h-5" /> Dry Run Session</>
                  ) : (
                    <><Video className="w-5 h-5" /> Live Session</>
                  )}
                </h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExportSession(selectedSession.filename, 'markdown')}
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

              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
                <StatCard label="Duration" value={formatDuration(sessionData.summary.totalDuration)} />
                <StatCard label="Scenes" value={sessionData.summary.demoBreakdown.length} />
                <StatCard label="Files" value={sessionData.summary.fileBreakdown.length} />
              </div>

              {sessionData.summary.recommendations.length > 0 && (
                <section>
                  <h3 className="m-0 mb-3 text-lg flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Recommendations
                  </h3>
                  <ul className="list-none p-0 m-0 flex flex-col gap-3">
                    {sessionData.summary.recommendations.map((rec, idx) => (
                      <RecommendationCard key={idx} recommendation={rec} />
                    ))}
                  </ul>
                </section>
              )}

              <DemoBreakdown
                demos={sessionData.summary.demoBreakdown}
              />

              <FileActivity
                files={sessionData.summary.fileBreakdown}
              />

              <PausesList
                pauses={sessionData.summary.longestNarratives}
              />

              <ErrorsSection
                errorSummary={sessionData.summary.errorSummary}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--vscode-descriptionForeground)]">
              <p>Select a session to view its analytics</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};


export default AnalyticsDashboardView;
