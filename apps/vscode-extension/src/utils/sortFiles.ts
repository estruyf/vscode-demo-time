import { DemoFiles } from '@demotime/common';

export const sortFiles = (files: DemoFiles) => {
  return Object.keys(files).sort((a, b) =>
    a
      .toLowerCase()
      .localeCompare(b.toLowerCase(), undefined, { numeric: true, sensitivity: 'base' }),
  );
};
