import { sleep } from '../src/utils/sleep';
import { describe, it, expect, jest } from '@jest/globals';

describe('sleep', () => {
  it('resolves after the specified delay', async () => {
    jest.useFakeTimers();
    const promise = sleep(1000);
    jest.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});
