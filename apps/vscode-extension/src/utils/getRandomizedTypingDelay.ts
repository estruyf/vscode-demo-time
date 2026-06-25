/**
 * Applies a semi-random "human" variation to a character typing delay.
 *
 * The returned delay is the base delay plus a random extra amount of up to
 * `randomnessPercentage`% of the base delay. This makes character-by-character
 * typing feel less robotic. See https://github.com/estruyf/vscode-demo-time/issues/295.
 *
 * @param baseDelay - The base delay in milliseconds between characters.
 * @param randomnessPercentage - The maximum percentage (0-100) of extra delay to add.
 * @returns The randomized delay in milliseconds.
 */
export const getRandomizedTypingDelay = (
  baseDelay: number,
  randomnessPercentage?: number,
): number => {
  if (!baseDelay || baseDelay <= 0 || !randomnessPercentage || randomnessPercentage <= 0) {
    return baseDelay;
  }

  const percentage = Math.min(randomnessPercentage, 100) / 100;
  const jitter = Math.random() * baseDelay * percentage;
  const delay = Math.round(baseDelay + jitter);
  console.log(
    `getRandomizedTypingDelay: baseDelay=${baseDelay}, randomnessPercentage=${randomnessPercentage}, jitter=${jitter.toFixed(2)}, totalDelay=${delay}`,
  );
  return delay;
};
