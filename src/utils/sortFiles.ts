import { DemoFiles } from "../models";

export const sortFiles = (files: DemoFiles) => {
  return Object.keys(files).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase(), undefined, { numeric: true, sensitivity: "base" })
  );
};
