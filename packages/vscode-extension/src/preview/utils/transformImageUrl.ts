export const transformImageUrl = (src: string, imagePath?: string) => {
  if (!imagePath) {
    return null;
  }

  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  return `${src.replace(/\/$/, "")}/${imagePath.replace(/^\//, "")}`;
};
