export const sanitizeFileName = (fileName: string) => {
  if (fileName) {
    if (!fileName.endsWith(".json")) {
      fileName = `${fileName}.json`;
    }

    fileName = fileName.replace(/ /g, "-");
    fileName = fileName.toLowerCase();
  }
  return fileName;
};
