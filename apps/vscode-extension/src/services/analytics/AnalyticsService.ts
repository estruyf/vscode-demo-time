import {
  PresentationSession,
  SegmentAnalytics,
  FileActivityRecord,
  TerminalCommandRecord,
  ErrorRecord,
  NavigationEvent,
  AnalyticsSummary,
  AnalyticsConfig,
  DEFAULT_ANALYTICS_CONFIG,
  Demo,
  Step,
  Config,
  ActionTime,
  ActTimingInfo,
  TimerStatus,
} from '@demotime/common';
import { v4 as uuidv4 } from 'uuid';
import { AnalyticsStorage } from './AnalyticsStorage';
import { AnalyticsReporter } from './AnalyticsReporter';
import { Logger } from '../Logger';
import { Extension } from '../Extension';
import { DemoFileProvider } from '../DemoFileProvider';
import { Uri } from 'vscode';

/**
 * Main analytics service that orchestrates all tracking during a presentation.
 * This is the primary interface for starting, stopping, and managing analytics.
 */
export class AnalyticsService {
  private static currentSession: PresentationSession | null = null;
  private static config: AnalyticsConfig = { ...DEFAULT_ANALYTICS_CONFIG };
  private static autoSaveInterval: NodeJS.Timeout | null = null;
  private static currentSegment: SegmentAnalytics | null = null;
  private static fileActivityMap: Map<string, FileActivityRecord> = new Map();
  private static lastEventTime: number = Date.now();
  /** Track per-act timing and timers */
  private static actFileTimers: Map<
    string,
    { configuredTimer?: number; startTime: number; totalDuration: number }
  > = new Map();

  /**
   * Loads analytics configuration from VS Code settings.
   */
  public static loadConfigFromSettings(): void {
    const ext = Extension.getInstance();
    AnalyticsService.config = {
      enabled:
        ext.getSetting<boolean>(Config.analytics.enabled) ?? DEFAULT_ANALYTICS_CONFIG.enabled,
      narrativeThreshold: DEFAULT_ANALYTICS_CONFIG.narrativeThreshold,
      trackCursorMovements: DEFAULT_ANALYTICS_CONFIG.trackCursorMovements,
      trackScrollEvents: DEFAULT_ANALYTICS_CONFIG.trackScrollEvents,
      trackTerminalCommands: DEFAULT_ANALYTICS_CONFIG.trackTerminalCommands,
      autoSaveInterval:
        ext.getSetting<number>(Config.analytics.autoSaveInterval) ??
        DEFAULT_ANALYTICS_CONFIG.autoSaveInterval,
    };
  }

  /**
   * Checks if analytics is currently recording.
   */
  public static isRecording(): boolean {
    return AnalyticsService.currentSession !== null;
  }

  /**
   * Gets the current session if one is active.
   */
  public static getCurrentSession(): PresentationSession | null {
    return AnalyticsService.currentSession;
  }

  /**
   * Updates the analytics configuration.
   */
  public static setConfig(config: Partial<AnalyticsConfig>): void {
    AnalyticsService.config = { ...AnalyticsService.config, ...config };
  }

  /**
   * Gets the current analytics configuration.
   */
  public static getConfig(): AnalyticsConfig {
    // Load from settings first
    AnalyticsService.loadConfigFromSettings();
    return { ...AnalyticsService.config };
  }

  /**
   * Starts a new analytics recording session (Play).
   */
  public static async startSession(
    presentationTitle: string = 'Presentation',
    isDryRun: boolean = true,
  ): Promise<string> {
    // End any existing session first
    if (AnalyticsService.currentSession) {
      await AnalyticsService.endSession();
    }

    const sessionId = uuidv4();
    const now = new Date().toISOString();

    // Get global timer setting
    const ext = Extension.getInstance();
    const globalTimerMinutes = ext.getSetting<number>(Config.clock.timer);

    AnalyticsService.currentSession = {
      id: sessionId,
      startTime: now,
      presentationTitle,
      isDryRun,
      globalTimerMinutes,
      segments: [],
      fileActivity: [],
      terminalCommands: [],
      errors: [],
      navigationSequence: [],
    };

    AnalyticsService.fileActivityMap.clear();
    AnalyticsService.actFileTimers.clear();
    AnalyticsService.lastEventTime = Date.now();

    // Start auto-save if configured
    if (AnalyticsService.config.autoSaveInterval > 0) {
      AnalyticsService.autoSaveInterval = setInterval(
        () => AnalyticsService.autoSave(),
        AnalyticsService.config.autoSaveInterval,
      );
    }

    // Record session start navigation event
    AnalyticsService.recordNavigationEvent({
      timestamp: now,
      type: 'demoStart',
      details: {
        sceneTitle: presentationTitle,
      },
    });

    Logger.info(`Analytics session started: ${sessionId}`);
    return sessionId;
  }

  /**
   * Ends the current analytics session and saves the data.
   */
  public static async endSession(): Promise<AnalyticsSummary | null> {
    if (!AnalyticsService.currentSession) {
      return null;
    }

    const session = AnalyticsService.currentSession;
    const endTime = new Date().toISOString();

    // End any current segment
    if (AnalyticsService.currentSegment) {
      AnalyticsService.endSegment();
    }

    // Finalize session
    session.endTime = endTime;
    session.totalDuration = new Date(endTime).getTime() - new Date(session.startTime).getTime();

    // Convert file activity map to array
    session.fileActivity = Array.from(AnalyticsService.fileActivityMap.values());

    // Calculate act timings with timer status
    session.actTimings = await AnalyticsService.calculateActTimings();

    // Record session end navigation event
    AnalyticsService.recordNavigationEvent({
      timestamp: endTime,
      type: 'demoEnd',
    });

    // Stop auto-save
    if (AnalyticsService.autoSaveInterval) {
      clearInterval(AnalyticsService.autoSaveInterval);
      AnalyticsService.autoSaveInterval = null;
    }

    // Save session
    await AnalyticsStorage.saveSession(session);

    // Generate summary for return (not persisted to disk)
    const summary = AnalyticsReporter.generateSummary(session);

    Logger.info(`Analytics session ended: ${session.id}, duration: ${session.totalDuration}ms`);

    // Clear state
    AnalyticsService.currentSession = null;
    AnalyticsService.currentSegment = null;
    AnalyticsService.fileActivityMap.clear();

    return summary;
  }

  /**
   * Starts tracking a new segment (Move - a step execution).
   * @param actFilePath - Path to the Act (demo file)
   * @param actTitle - Title of the Act (demo file)
   * @param scene - The Scene (demo) being executed
   * @param sceneIndex - Index of the Scene in the Act
   * @param move - The Move (step) being executed
   * @param moveIndex - Index of the Move within the Scene
   */
  public static startSegment(
    actFilePath: string,
    actTitle: string,
    scene: Demo,
    sceneIndex: number,
    move: Step,
    moveIndex: number,
  ): string {
    if (!AnalyticsService.currentSession) {
      return '';
    }

    // Track this act file's timing
    AnalyticsService.trackActTiming(actFilePath);

    const now = new Date().toISOString();
    const nowTimestamp = Date.now();

    // Finalize any existing segment first
    // The duration is from when it started to now (when the next step begins)
    if (AnalyticsService.currentSegment) {
      const segment = AnalyticsService.currentSegment;
      segment.endTime = now;
      segment.duration = nowTimestamp - new Date(segment.startTime).getTime();

      // Finalize last actionTime if exists
      if (segment.actionTimes && segment.actionTimes.length > 0) {
        const lastAction = segment.actionTimes[segment.actionTimes.length - 1];
        if (lastAction.timestamp && !lastAction.duration) {
          lastAction.duration = nowTimestamp - new Date(lastAction.timestamp).getTime();
        }
      }

      // Detect if there was narrative/speaking time before this new step
      const narrativeDuration = AnalyticsService.detectNarrativeDuration();
      if (narrativeDuration > 0) {
        segment.narrativeDuration = narrativeDuration;
        // Subtract the narrative time from the segment duration to get actual interaction time
        segment.duration = Math.max(0, segment.duration - narrativeDuration);
      }

      AnalyticsService.currentSession.segments.push(segment);
    }

    const segmentId = uuidv4();

    AnalyticsService.currentSegment = {
      segmentId,
      actFilePath,
      actTitle,
      sceneId: scene.id,
      sceneIndex,
      sceneTitle: scene.title,
      startTime: now,
    };

    AnalyticsService.lastEventTime = nowTimestamp;

    return segmentId;
  }

  /**
   * Ends the current segment and adds it to the session.
   * This is called when the session ends or when an error occurs.
   */
  public static endSegment(narrativeDuration?: number): void {
    if (!AnalyticsService.currentSession || !AnalyticsService.currentSegment) {
      return;
    }

    const segment = AnalyticsService.currentSegment;
    const endTime = new Date().toISOString();
    const nowTimestamp = Date.now();

    segment.endTime = endTime;
    segment.duration = nowTimestamp - new Date(segment.startTime).getTime();

    // Finalize last actionTime if exists
    if (segment.actionTimes && segment.actionTimes.length > 0) {
      const lastAction = segment.actionTimes[segment.actionTimes.length - 1];
      if (lastAction.timestamp && !lastAction.duration) {
        lastAction.duration = nowTimestamp - new Date(lastAction.timestamp).getTime();
      }
    }

    if (narrativeDuration !== undefined) {
      segment.narrativeDuration = narrativeDuration;
    }

    AnalyticsService.currentSession.segments.push(segment);
    AnalyticsService.currentSegment = null;
  }

  /**
   * Records a file open event.
   */
  public static recordFileOpen(filePath: string): void {
    if (!AnalyticsService.currentSession) {
      return;
    }

    const now = new Date().toISOString();
    const normalizedPath = AnalyticsService.normalizePath(filePath);

    // Get or create file activity record
    let activity = AnalyticsService.fileActivityMap.get(normalizedPath);
    if (!activity) {
      activity = {
        filePath: normalizedPath,
        totalTimeSpent: 0,
        lineHeatmap: {},
        openCount: 0,
        scrollEvents: [],
        highlights: [],
        firstOpenTime: now,
      };
      AnalyticsService.fileActivityMap.set(normalizedPath, activity);
    }

    activity.openCount++;
    activity.lastActiveTime = now;

    // Record navigation event
    AnalyticsService.recordNavigationEvent({
      timestamp: now,
      type: 'fileOpen',
      toFile: normalizedPath,
    });
  }

  /**
   * Records a file close event.
   */
  public static recordFileClose(filePath: string): void {
    if (!AnalyticsService.currentSession) {
      return;
    }

    const now = new Date().toISOString();
    const normalizedPath = AnalyticsService.normalizePath(filePath);

    // Update time spent
    const activity = AnalyticsService.fileActivityMap.get(normalizedPath);
    if (activity && activity.lastActiveTime) {
      const timeSpent = new Date(now).getTime() - new Date(activity.lastActiveTime).getTime();
      activity.totalTimeSpent += timeSpent;
    }

    // Record navigation event
    AnalyticsService.recordNavigationEvent({
      timestamp: now,
      type: 'fileClose',
      fromFile: normalizedPath,
    });
  }

  /**
   * Records a highlight event.
   */
  public static recordHighlight(
    filePath: string,
    startLine: number,
    endLine: number,
    zoomLevel?: number,
  ): void {
    if (!AnalyticsService.currentSession) {
      return;
    }

    const now = new Date().toISOString();
    const normalizedPath = AnalyticsService.normalizePath(filePath);

    // Get or create file activity record
    let activity = AnalyticsService.fileActivityMap.get(normalizedPath);
    if (!activity) {
      activity = {
        filePath: normalizedPath,
        totalTimeSpent: 0,
        lineHeatmap: {},
        openCount: 1,
        scrollEvents: [],
        highlights: [],
        firstOpenTime: now,
      };
      AnalyticsService.fileActivityMap.set(normalizedPath, activity);
    }

    // Record highlight (duration will be updated when next action occurs)
    activity.highlights.push({
      timestamp: now,
      lineRange: { start: startLine, end: endLine },
      duration: 0, // Will be calculated later
      zoomLevel,
    });

    // Update line heatmap
    for (let line = startLine; line <= endLine; line++) {
      activity.lineHeatmap[line] = (activity.lineHeatmap[line] || 0) + 1;
    }

    // Record navigation event
    AnalyticsService.recordNavigationEvent({
      timestamp: now,
      type: 'highlight',
      toFile: normalizedPath,
      details: {
        lineRange: { start: startLine, end: endLine },
        zoomLevel,
      },
    });

    AnalyticsService.lastEventTime = Date.now();
  }

  /**
   * Records a scroll event.
   */
  public static recordScroll(
    filePath: string,
    direction: 'up' | 'down',
    linesScrolled: number,
    visibleStart?: number,
    visibleEnd?: number,
  ): void {
    if (!AnalyticsService.currentSession || !AnalyticsService.config.trackScrollEvents) {
      return;
    }

    const now = new Date().toISOString();
    const normalizedPath = AnalyticsService.normalizePath(filePath);

    const activity = AnalyticsService.fileActivityMap.get(normalizedPath);
    if (activity) {
      // Calculate dwell time from last event
      const dwellTime = Date.now() - AnalyticsService.lastEventTime;

      activity.scrollEvents.push({
        timestamp: now,
        direction,
        linesScrolled,
        dwellTime,
        visibleRange:
          visibleStart !== undefined && visibleEnd !== undefined
            ? { start: visibleStart, end: visibleEnd }
            : undefined,
      });

      // Record navigation event
      AnalyticsService.recordNavigationEvent({
        timestamp: now,
        type: 'scroll',
        toFile: normalizedPath,
        details: {
          lineRange:
            visibleStart !== undefined && visibleEnd !== undefined
              ? { start: visibleStart, end: visibleEnd }
              : undefined,
        },
      });
    }

    AnalyticsService.lastEventTime = Date.now();
  }

  /**
   * Records a terminal command execution.
   */
  public static recordTerminalCommand(
    command: string,
    terminalId?: string,
    wasError: boolean = false,
    exitCode?: number,
    duration?: number,
  ): void {
    if (!AnalyticsService.currentSession || !AnalyticsService.config.trackTerminalCommands) {
      return;
    }

    const now = new Date().toISOString();

    AnalyticsService.currentSession.terminalCommands.push({
      timestamp: now,
      command,
      terminalId,
      duration,
      exitCode,
      wasError,
    });

    // Record navigation event
    AnalyticsService.recordNavigationEvent({
      timestamp: now,
      type: 'terminalFocus',
    });
  }

  /**
   * Records an error event.
   */
  public static recordError(type: ErrorRecord['type'], message: string, context?: string): void {
    if (!AnalyticsService.currentSession) {
      return;
    }

    const now = new Date().toISOString();

    AnalyticsService.currentSession.errors.push({
      timestamp: now,
      type,
      message,
      recovered: false, // Will be updated if recovery is detected
      context,
    });
  }

  /**
   * Marks the last error as recovered.
   */
  public static markErrorRecovered(recoveryTime: number): void {
    if (!AnalyticsService.currentSession) {
      return;
    }

    const errors = AnalyticsService.currentSession.errors;
    if (errors.length > 0) {
      const lastError = errors[errors.length - 1];
      lastError.recovered = true;
      lastError.recoveryTime = recoveryTime;
    }
  }

  /**
   * Records a slide open event and adds it to the current segment's actionTimes.
   * @param slidePath - Path to the slide file/content
   * @param slideIndex - Index of the slide
   * @param slideTitle - Title of the slide (optional)
   */
  public static recordSlideOpen(slidePath: string, slideIndex?: number, slideTitle?: string): void {
    if (!AnalyticsService.currentSession || !AnalyticsService.currentSegment) {
      return;
    }

    const now = new Date().toISOString();
    const nowTimestamp = Date.now();

    // If there are previous actionTimes, finalize the last one's duration
    const actionTimes = AnalyticsService.currentSegment.actionTimes || [];
    if (actionTimes.length > 0) {
      const lastAction = actionTimes[actionTimes.length - 1];
      if (lastAction.timestamp) {
        lastAction.duration = nowTimestamp - new Date(lastAction.timestamp).getTime();
      }
    }

    // Add new slide action to current segment
    const newAction: ActionTime = {
      type: 'slide',
      slideIdx: slideIndex,
      slideTitle:
        slideTitle || `No title (Slide ${slideIndex !== undefined ? slideIndex + 1 : '?'})`,
      duration: 0, // Will be calculated when next action starts or segment ends
      timestamp: now,
    };

    if (!AnalyticsService.currentSegment.actionTimes) {
      AnalyticsService.currentSegment.actionTimes = [];
    }
    AnalyticsService.currentSegment.actionTimes.push(newAction);

    AnalyticsService.lastEventTime = nowTimestamp;

    // Record navigation event
    AnalyticsService.recordNavigationEvent({
      timestamp: now,
      type: 'slideOpen',
      details: {
        slidePath,
        slideIndex,
      },
    });
  }

  /**
   * Records a navigation event.
   */
  private static recordNavigationEvent(event: NavigationEvent): void {
    if (!AnalyticsService.currentSession) {
      return;
    }

    AnalyticsService.currentSession.navigationSequence.push(event);
  }

  /**
   * Normalizes a file path for consistent storage.
   */
  private static normalizePath(filePath: string): string {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (workspaceFolder) {
      const workspacePath = workspaceFolder.uri.fsPath;
      if (filePath.startsWith(workspacePath)) {
        return filePath.substring(workspacePath.length + 1);
      }
    }
    return filePath;
  }

  /**
   * Auto-saves the current session.
   */
  private static async autoSave(): Promise<void> {
    if (!AnalyticsService.currentSession) {
      return;
    }

    // Update file activity
    AnalyticsService.currentSession.fileActivity = Array.from(
      AnalyticsService.fileActivityMap.values(),
    );

    await AnalyticsStorage.saveSession(AnalyticsService.currentSession);
    Logger.info('Analytics auto-saved');
  }

  /**
   * Detects if there was narrative/speaking time since the last event.
   * Returns the narrative duration if it exceeds the threshold, otherwise 0.
   */
  public static detectNarrativeDuration(): number {
    const timeSinceLastEvent = AnalyticsService.getTimeSinceLastEvent();
    if (timeSinceLastEvent >= AnalyticsService.config.narrativeThreshold) {
      return timeSinceLastEvent;
    }
    return 0;
  }

  /**
   * Tracks timing for an act (demo file) when a segment starts.
   */
  private static async trackActTiming(actFilePath: string): Promise<void> {
    if (!AnalyticsService.actFileTimers.has(actFilePath)) {
      // Load the demo file to get its timer configuration
      let configuredTimer: number | undefined;
      try {
        const demoFile = await DemoFileProvider.getFile(Uri.file(actFilePath));
        configuredTimer = demoFile?.timer;
      } catch (error) {
        Logger.error(`Failed to load demo file for timer: ${actFilePath} - ${error}`);
      }

      AnalyticsService.actFileTimers.set(actFilePath, {
        configuredTimer,
        startTime: Date.now(),
        totalDuration: 0,
      });
    }
  }

  /**
   * Calculates act timings with timer status for all acts in the session.
   */
  private static async calculateActTimings(): Promise<ActTimingInfo[]> {
    const actTimings: ActTimingInfo[] = [];

    // Calculate total duration per act from segments
    const actDurations = new Map<string, number>();
    if (AnalyticsService.currentSession) {
      for (const segment of AnalyticsService.currentSession.segments) {
        const actPath = segment.actFilePath || 'unknown';
        const currentDuration = actDurations.get(actPath) || 0;
        actDurations.set(actPath, currentDuration + (segment.duration || 0));
      }
    }

    // Build ActTimingInfo for each act
    for (const [actFilePath, actData] of AnalyticsService.actFileTimers.entries()) {
      const actualDuration = actDurations.get(actFilePath) || 0;

      // Calculate timer status
      let timerStatus: TimerStatus;
      if (!actData.configuredTimer || actData.configuredTimer <= 0) {
        timerStatus = TimerStatus.NoTimer;
      } else {
        const expectedDuration = actData.configuredTimer * 60000; // Convert minutes to ms
        const overage = actualDuration - expectedDuration;
        const overagePercentage = (overage / expectedDuration) * 100;

        if (overage <= 0) {
          timerStatus = TimerStatus.OnTime;
        } else if (overagePercentage < 10) {
          timerStatus = TimerStatus.SlightlyOver;
        } else {
          timerStatus = TimerStatus.SignificantlyOver;
        }
      }

      actTimings.push({
        actFilePath,
        configuredTimer: actData.configuredTimer,
        actualDuration,
        timerStatus,
      });
    }

    return actTimings;
  }

  /**
   * Gets time since last event in milliseconds.
   */
  private static getTimeSinceLastEvent(): number {
    return Date.now() - AnalyticsService.lastEventTime;
  }

  /**
   * Updates the last event time (to be called after user interactions).
   */
  public static updateLastEventTime(): void {
    AnalyticsService.lastEventTime = Date.now();
  }
}
