import {
  PresentationSession,
  AnalyticsSummary,
  FileBreakdownItem,
  NarrativeRecord,
  DemoBreakdownItem,
  ErrorSummary,
  Recommendation,
  TimerStatus,
  ActTimingInfo,
} from '@demotime/common';

/**
 * Service for generating analytics reports and summaries from session data.
 */
export class AnalyticsReporter {
  /**
   * Generates a comprehensive summary from a presentation session.
   */
  public static generateSummary(session: PresentationSession): AnalyticsSummary {
    const timerStatus = AnalyticsReporter.calculateTimerStatus(session);
    const expectedDuration = AnalyticsReporter.calculateExpectedDuration(session);

    return {
      sessionId: session.id,
      sessionDate: session.startTime,
      isDryRun: session.isDryRun,
      totalDuration: session.totalDuration || 0,
      timerStatus,
      globalTimerMinutes: session.globalTimerMinutes,
      actTimings: session.actTimings,
      expectedDuration,
      fileBreakdown: AnalyticsReporter.generateFileBreakdown(session),
      longestNarratives: AnalyticsReporter.findLongestNarratives(session),
      demoBreakdown: AnalyticsReporter.generateDemoBreakdown(session),
      errorSummary: AnalyticsReporter.generateErrorSummary(session),
      recommendations: AnalyticsReporter.generateRecommendations(session),
    };
  }

  /**
   * Generates file breakdown statistics.
   */
  private static generateFileBreakdown(session: PresentationSession): FileBreakdownItem[] {
    const totalDuration = session.totalDuration || 1; // Avoid division by zero

    return session.fileActivity
      .map((activity) => {
        const fileName = activity.filePath.split('/').pop() || activity.filePath;

        // Find hotspot lines (top 5 most viewed)
        const lineEntries = Object.entries(activity.lineHeatmap);
        const hotspotLines = lineEntries
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([line]) => parseInt(line, 10));

        return {
          filePath: activity.filePath,
          fileName,
          timeSpent: activity.totalTimeSpent,
          percentage: (activity.totalTimeSpent / totalDuration) * 100,
          openCount: activity.openCount,
          hotspotLines: hotspotLines.length > 0 ? hotspotLines : undefined,
        };
      })
      .sort((a, b) => b.timeSpent - a.timeSpent);
  }

  /**
   * Finds the longest narrative/speaking segments in the session.
   */
  private static findLongestNarratives(session: PresentationSession): NarrativeRecord[] {
    const narratives: NarrativeRecord[] = [];

    // Check segment narratives
    for (const segment of session.segments) {
      if (segment.narrativeDuration && segment.narrativeDuration > 0) {
        narratives.push({
          location: segment.sceneTitle || 'Unknown Scene',
          filePath: segment.actFilePath,
          duration: segment.narrativeDuration,
          timestamp: segment.startTime,
          context: `Scene ${segment.sceneIndex + 1}`,
        });
      }
    }

    // Check for extended narrative time between navigation events
    for (let i = 1; i < session.navigationSequence.length; i++) {
      const prev = session.navigationSequence[i - 1];
      const curr = session.navigationSequence[i];

      const gap = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
      if (gap > 5000) {
        // More than 5 seconds
        narratives.push({
          location: `After ${prev.type}`,
          filePath: prev.toFile || prev.fromFile,
          duration: gap,
          timestamp: curr.timestamp,
          context: `Transition to ${curr.type}`,
        });
      }
    }

    // Sort by duration and return top 10
    return narratives.sort((a, b) => b.duration - a.duration).slice(0, 10);
  }

  /**
   * Generates demo breakdown statistics.
   */
  private static generateDemoBreakdown(session: PresentationSession): DemoBreakdownItem[] {
    const totalDuration = session.totalDuration || 1;

    // Group segments by scene (slides are now in actionTimes)
    const sceneMap = new Map<
      string,
      {
        actFilePath?: string;
        sceneId?: string;
        sceneTitle: string;
        sceneIndex: number;
        segments: typeof session.segments;
      }
    >();

    for (const segment of session.segments) {
      const key = segment.sceneId || `${segment.sceneIndex}_${segment.sceneTitle}`;
      if (!sceneMap.has(key)) {
        sceneMap.set(key, {
          actFilePath: segment.actFilePath,
          sceneId: segment.sceneId,
          sceneTitle: segment.sceneTitle,
          sceneIndex: segment.sceneIndex,
          segments: [],
        });
      }
      sceneMap.get(key)!.segments.push(segment);
    }

    // Calculate stats for each scene
    return Array.from(sceneMap.values())
      .map((scene) => {
        const duration = scene.segments.reduce((sum, s) => sum + (s.duration || 0), 0);

        // Find errors that occurred during this scene
        const sceneErrors = session.errors.filter((e) =>
          scene.segments.some(
            (s) =>
              new Date(e.timestamp).getTime() >= new Date(s.startTime).getTime() &&
              (!s.endTime || new Date(e.timestamp).getTime() <= new Date(s.endTime).getTime()),
          ),
        );

        const hadErrors = sceneErrors.length > 0;

        // Collect all action details from segments
        const actionDetails: DemoBreakdownItem['actionDetails'] = [];
        for (const segment of scene.segments) {
          if (segment.actionTimes && segment.actionTimes.length > 0) {
            for (const action of segment.actionTimes) {
              actionDetails.push({
                type: action.type,
                slideIdx: action.slideIdx,
                slideTitle: action.slideTitle,
                duration: action.duration || 0,
              });
            }
          }
        }

        // Find timer info for this act
        const actTiming = session.actTimings?.find((a) => a.actFilePath === scene.actFilePath);

        return {
          actFilePath: scene.actFilePath,
          sceneId: scene.sceneId,
          sceneTitle: scene.sceneTitle,
          sceneIndex: scene.sceneIndex,
          duration,
          percentage: (duration / totalDuration) * 100,
          moveCount: scene.segments.length,
          avgMoveDuration: scene.segments.length > 0 ? duration / scene.segments.length : 0,
          hadErrors,
          errors: hadErrors ? sceneErrors : undefined,
          actTimerStatus: actTiming?.timerStatus,
          actConfiguredTimer: actTiming?.configuredTimer,
          actionDetails: actionDetails.length > 0 ? actionDetails : undefined,
        };
      })
      .sort((a, b) => {
        // First sort by actFilePath
        const fileCompare = (a.actFilePath || '').localeCompare(b.actFilePath || '');
        if (fileCompare !== 0) {
          return fileCompare;
        }
        // Then sort by sceneIndex
        return a.sceneIndex - b.sceneIndex;
      });
  }

  /**
   * Generates error summary statistics.
   */
  private static generateErrorSummary(session: PresentationSession): ErrorSummary {
    const byType: Record<string, number> = {};

    for (const error of session.errors) {
      byType[error.type] = (byType[error.type] || 0) + 1;
    }

    const recoveredErrors = session.errors.filter((e) => e.recovered).length;
    const totalRecoveryTime = session.errors.reduce((sum, e) => sum + (e.recoveryTime || 0), 0);

    return {
      totalErrors: session.errors.length,
      recoveredErrors,
      byType,
      totalRecoveryTime,
    };
  }

  /**
   * Generates recommendations based on session analysis.
   */
  private static generateRecommendations(session: PresentationSession): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for errors
    if (session.errors.length > 0) {
      const unrecoveredErrors = session.errors.filter((e) => !e.recovered);
      if (unrecoveredErrors.length > 0) {
        recommendations.push({
          type: 'error',
          priority: 'high',
          title: 'Unrecovered errors detected',
          description: `${unrecoveredErrors.length} error(s) occurred that weren't fully recovered from.`,
          suggestion: 'Review these error points and add safeguards or alternative paths.',
        });
      }
    }

    // Check for file time distribution
    const fileBreakdown = AnalyticsReporter.generateFileBreakdown(session);
    const dominantFile = fileBreakdown[0];
    if (dominantFile && dominantFile.percentage > 60) {
      recommendations.push({
        type: 'content',
        priority: 'low',
        title: 'Content concentration',
        description: `${Math.round(dominantFile.percentage)}% of time was spent in ${dominantFile.fileName}.`,
        relatedTo: dominantFile.filePath,
        suggestion: 'Consider if this balance is intentional or if other areas need more coverage.',
      });
    }

    // Check total duration
    const totalMinutes = (session.totalDuration || 0) / 60000;
    if (totalMinutes > 45) {
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        title: 'Long presentation',
        description: `Your presentation lasted ${Math.round(totalMinutes)} minutes.`,
        suggestion:
          'Consider breaking into segments or identifying areas to condense for audience engagement.',
      });
    }

    // Check timer compliance
    const timerStatus = AnalyticsReporter.calculateTimerStatus(session);
    const expectedDuration = AnalyticsReporter.calculateExpectedDuration(session);

    if (timerStatus === TimerStatus.SignificantlyOver && expectedDuration) {
      const overageMinutes = Math.round(((session.totalDuration || 0) - expectedDuration) / 60000);
      recommendations.push({
        type: 'timing',
        priority: 'high',
        title: 'Significantly over time',
        description: `Your presentation ran ${overageMinutes} minute(s) over the allocated time.`,
        suggestion:
          'Review the per-act breakdown to identify areas where you can trim content or speed up delivery.',
      });
    } else if (timerStatus === TimerStatus.SlightlyOver && expectedDuration) {
      const overageMinutes = Math.round(((session.totalDuration || 0) - expectedDuration) / 60000);
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        title: 'Slightly over time',
        description: `Your presentation ran ${overageMinutes} minute(s) over the allocated time.`,
        suggestion: 'Consider minor adjustments to stay within your time limit.',
      });
    }

    // Check per-act timer compliance
    if (session.actTimings) {
      for (const actTiming of session.actTimings) {
        if (actTiming.timerStatus === TimerStatus.SignificantlyOver && actTiming.configuredTimer) {
          const actName = actTiming.actFilePath.split('/').pop() || actTiming.actFilePath;
          const overageMinutes = Math.round(
            (actTiming.actualDuration - actTiming.configuredTimer * 60000) / 60000,
          );
          recommendations.push({
            type: 'timing',
            priority: 'medium',
            title: `Act over time: ${actName}`,
            description: `The act "${actName}" ran ${overageMinutes} minute(s) over its allocated ${actTiming.configuredTimer} minute timer.`,
            relatedTo: actTiming.actFilePath,
            suggestion: 'Focus on streamlining this portion of your presentation.',
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Calculates the overall timer status for the presentation.
   */
  private static calculateTimerStatus(session: PresentationSession): TimerStatus {
    const expectedDuration = AnalyticsReporter.calculateExpectedDuration(session);

    if (!expectedDuration) {
      return TimerStatus.NoTimer;
    }

    const actualDuration = session.totalDuration || 0;
    const overage = actualDuration - expectedDuration;
    const overagePercentage = (overage / expectedDuration) * 100;

    if (overage <= 0) {
      return TimerStatus.OnTime;
    } else if (overagePercentage < 10) {
      return TimerStatus.SlightlyOver;
    } else {
      return TimerStatus.SignificantlyOver;
    }
  }

  /**
   * Calculates the expected duration based on timer settings.
   * Returns the expected duration in milliseconds, or undefined if no timer is set.
   */
  private static calculateExpectedDuration(session: PresentationSession): number | undefined {
    // Global timer takes precedence as it represents the overall presentation target
    if (session.globalTimerMinutes && session.globalTimerMinutes > 0) {
      return session.globalTimerMinutes * 60000; // Convert to milliseconds
    }

    // If no global timer, check if we have per-act timings
    if (session.actTimings && session.actTimings.length > 0) {
      const totalConfiguredMinutes = session.actTimings.reduce((sum, act) => {
        return sum + (act.configuredTimer || 0);
      }, 0);

      if (totalConfiguredMinutes > 0) {
        return totalConfiguredMinutes * 60000; // Convert to milliseconds
      }
    }

    return undefined;
  }

  /**
   * Formats a duration in milliseconds to a human-readable string.
   */
  public static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Generates a text summary suitable for display or export.
   */
  public static generateTextSummary(summary: AnalyticsSummary): string {
    const lines: string[] = [];

    lines.push(`# Presentation Analytics Summary`);
    lines.push(`\nSession: ${summary.sessionId}`);
    lines.push(`Date: ${new Date(summary.sessionDate).toLocaleString()}`);
    lines.push(`Type: ${summary.isDryRun ? 'Dry Run' : 'Live Presentation'}`);
    lines.push(`Total Duration: ${AnalyticsReporter.formatDuration(summary.totalDuration)}`);

    lines.push(`\n## File Breakdown`);
    for (const file of summary.fileBreakdown.slice(0, 10)) {
      lines.push(
        `- ${file.fileName}: ${AnalyticsReporter.formatDuration(file.timeSpent)} (${file.percentage.toFixed(1)}%)`,
      );
    }

    lines.push(`\n## Scene Breakdown`);
    for (const scene of summary.demoBreakdown) {
      lines.push(
        `- ${scene.sceneTitle}: ${AnalyticsReporter.formatDuration(scene.duration)} (${scene.moveCount} moves)`,
      );
    }

    if (summary.longestNarratives.length > 0) {
      lines.push(`\n## Notable Narrative Segments`);
      for (const narrative of summary.longestNarratives.slice(0, 5)) {
        lines.push(
          `- ${narrative.location}: ${AnalyticsReporter.formatDuration(narrative.duration)}`,
        );
      }
    }

    if (summary.errorSummary.totalErrors > 0) {
      lines.push(`\n## Errors`);
      lines.push(`- Total: ${summary.errorSummary.totalErrors}`);
      lines.push(`- Recovered: ${summary.errorSummary.recoveredErrors}`);
    }

    if (summary.recommendations.length > 0) {
      lines.push(`\n## Recommendations`);
      for (const rec of summary.recommendations) {
        lines.push(`\n### ${rec.title} (${rec.priority})`);
        lines.push(rec.description);
        if (rec.suggestion) {
          lines.push(`💡 ${rec.suggestion}`);
        }
      }
    }

    return lines.join('\n');
  }
}
