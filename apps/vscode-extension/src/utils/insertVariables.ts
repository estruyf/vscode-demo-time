import { StateKeys } from '../constants';
import { getUserInput } from './getUserInput';

export const insertVariables = async (
  text: string,
  variables: { [key: string]: any },
  skipClipboard: boolean = true,
) => {
  for (const key in variables) {
    let regex = new RegExp(`{${key}}`, 'g');
    if (key === StateKeys.prefix.clipboard && skipClipboard === true) {
      continue;
    }
    if (
      key === StateKeys.prefix.input &&
      !variables[StateKeys.prefix.input] &&
      text.includes(`{${key}}`)
    ) {
      const input = await getUserInput('Please enter a value');

      variables[StateKeys.prefix.input] = input || '';
    }

    // Escape the variable value to ensure it's valid when inserted into JSON strings
    let value = variables[key];
    if (typeof value === 'string' && /^\s*[{[]/.test(text) && /[}\]]\s*$/.test(text)) {
      // Escape backslashes, quotes, and control characters for JSON compatibility
      value = value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    }

    text = text.replace(regex, value);
  }
  return text;
};
