/**
 * Service for tracking command execution state across the application
 */
export class ExecutionTrackingService {
  private static executedCommands: Map<number, boolean> = new Map();

  /**
   * Check if a command has been executed for a specific slide
   *
   * @param slideId The slide ID to check
   * @returns Boolean indicating if the command has been executed
   */
  public static isCommandExecuted(slideId: number | null): boolean {
    if (slideId === null) {
      return false;
    }
    return this.executedCommands.get(slideId) || false;
  }

  /**
   * Mark a command as executed for a specific slide
   *
   * @param slideId The slide ID to mark as executed
   */
  public static markCommandExecuted(slideId: number | null): void {
    if (slideId !== null) {
      this.executedCommands.set(slideId, true);
      console.log(`Marked command for slide ${slideId} as executed`);
    }
  }

  /**
   * Reset the execution status for a specific slide
   *
   * @param slideId The slide ID to reset
   */
  public static resetExecution(slideId: number | null): void {
    if (slideId !== null) {
      this.executedCommands.set(slideId, false);
      console.log(`Reset execution status for slide ${slideId}`);
    }
  }

  /**
   * Reset all execution states
   */
  public static resetAllExecutions(): void {
    this.executedCommands.clear();
    console.log("Reset all execution statuses");
  }

  /**
   * Reset execution status for all slides except the specified one
   *
   * @param currentSlideId The slide ID to preserve
   */
  public static resetOtherExecutions(currentSlideId: number | null): void {
    if (currentSlideId === null) {
      this.resetAllExecutions();
      return;
    }

    // Create a new map with only the current slide's state
    const currentState = this.executedCommands.get(currentSlideId) || false;
    this.executedCommands.clear();
    this.executedCommands.set(currentSlideId, currentState);
    console.log(`Kept execution state for slide ${currentSlideId}, reset others`);
  }
}
