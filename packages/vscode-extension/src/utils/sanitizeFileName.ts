export const sanitizeFileName = (fileName: string, fileExt = ".json") => {
  if (fileName) {
    if (!fileName.endsWith(fileExt)) {
      fileName = `${fileName}${fileExt}`;
    }

    fileName = fileName.replace(/ /g, "-");
    fileName = fileName.toLowerCase();
  }
  return fileName;
};
