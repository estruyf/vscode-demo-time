import { Config } from "../constants";
import { Extension } from "../services/Extension";

const DEFAULT_LINE_INSERTION_DELAY = 25;

export const getLineInsertionSpeed = (actionDelay?: number) => {
  let lineSpeed = Extension.getInstance().getSetting<number>(Config.insert.speed);

  if (typeof actionDelay !== "undefined") {
    lineSpeed = actionDelay;
  }

  return typeof lineSpeed !== "undefined" ? lineSpeed : DEFAULT_LINE_INSERTION_DELAY;
};
