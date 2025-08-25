import { Extension } from "../services";

export const getSetting = <T>(key: string): T => {
  const ext = Extension.getInstance();
  const setting = ext.getSetting(key);
  return setting as T;
};
