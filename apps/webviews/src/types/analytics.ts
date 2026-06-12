export interface SessionInfo {
  filename: string;
  type: string;
  date: string;
  isDryRun: boolean;
}

export interface SessionData {
  session: import('@demotime/common').PresentationSession;
  summary: import('@demotime/common').AnalyticsSummary;
}

export interface RecordingStatus {
  isRecording: boolean;
  session: import('@demotime/common').PresentationSession | null;
}
