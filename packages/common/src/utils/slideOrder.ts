/**
 * A copy of `items` with the item at `fromIndex` moved to `toIndex` (the index it ends up at).
 */
export const moveArrayItem = <T>(items: readonly T[], fromIndex: number, toIndex: number): T[] => {
  const result = [...items];
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item);
  return result;
};

/**
 * The index a slide ends up at when it is dropped in the gap before `insertionIndex` (0..length).
 */
export const getDropIndex = (fromIndex: number, insertionIndex: number): number =>
  insertionIndex > fromIndex ? insertionIndex - 1 : insertionIndex;
