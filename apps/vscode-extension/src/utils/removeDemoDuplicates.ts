import { DemoCache } from '@demotime/common';

export const removeDemoDuplicates = (demo: DemoCache[]): DemoCache[] => {
  // Sort by idx as number
  demo = demo.sort((a, b) => a.idx - b.idx);
  // Filter the unique idx
  const uniqueDemos = demo.filter((demo, idx, arr) => {
    if (idx === 0) {
      return true;
    }

    return demo.idx !== arr[idx - 1].idx;
  });

  return uniqueDemos;
};
