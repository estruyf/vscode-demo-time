import { NotesService } from './NotesService';

export class ApiService {
  // ... existing API methods ...

  /**
   * API endpoint to get notes for current step
   */
  public static async getCurrentStepNotesEndpoint(): Promise<{ notes: string | null }> {
    const notes = await NotesService.getCurrentStepNotes();
    return { notes };
  }

  /**
   * API endpoint to get notes for a specific demo
   */
  public static async getDemoNotesEndpoint(demoId: string): Promise<{ notes: string | null }> {
    const notes = await NotesService.getDemoNotes(demoId);
    return { notes };
  }
}
