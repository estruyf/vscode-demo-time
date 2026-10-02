import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CDPSession, Page } from 'playwright-core';

export interface RecordedFrame {
  /** Wall-clock time the frame was painted, in milliseconds since the epoch. */
  t: number;
  path: string;
}

/**
 * Records the VS Code window through the DevTools screencast. Frames go to disk as they arrive,
 * so a long play does not fill memory.
 */
export class Recorder {
  private cdp: CDPSession | undefined;
  private frames: RecordedFrame[] = [];
  private writes: Promise<void>[] = [];

  constructor(
    private readonly page: Page,
    private readonly dir: string,
    private readonly maxSize: { width: number; height: number },
  ) {
    mkdirSync(dir, { recursive: true });
  }

  public async start(): Promise<void> {
    const cdp = await this.page.context().newCDPSession(this.page);
    this.cdp = cdp;

    cdp.on('Page.screencastFrame', ({ data, sessionId, metadata }) => {
      const path = join(this.dir, `${String(this.frames.length).padStart(7, '0')}.jpg`);
      // `timestamp` is seconds since the epoch, like the event log's milliseconds.
      this.frames.push({ t: (metadata.timestamp ?? Date.now() / 1000) * 1000, path });
      this.writes.push(writeFile(path, Buffer.from(data, 'base64')));
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });

    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: this.maxSize.width,
      maxHeight: this.maxSize.height,
      everyNthFrame: 1,
    });
  }

  /** Stops recording and returns the frames, oldest first. */
  public async stop(): Promise<RecordedFrame[]> {
    if (this.cdp) {
      await this.cdp.send('Page.stopScreencast').catch(() => {});
      await this.cdp.detach().catch(() => {});
      this.cdp = undefined;
    }
    await Promise.all(this.writes);
    return [...this.frames].sort((a, b) => a.t - b.t);
  }
}
