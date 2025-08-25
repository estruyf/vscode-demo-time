import { Config } from '../constants';
import { Extension } from '../services/Extension';

const DEFAULT_INSERTION_DELAY = 25;

export const getInsertionSpeed = (actionDelay?: number) => {
  let insertionSpeed = Extension.getInstance().getSetting<number>(Config.insert.typingSpeed);

  if (typeof actionDelay !== 'undefined') {
    insertionSpeed = actionDelay;
  }

  return typeof insertionSpeed !== 'undefined' ? insertionSpeed : DEFAULT_INSERTION_DELAY;
};
