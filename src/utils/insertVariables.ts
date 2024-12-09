export const insertVariables = (text: string, variables: { [key: string]: any }) => {
  for (const key in variables) {
    let regex = new RegExp(`{${key}}`, "g");
    text = text.replace(regex, variables[key]);
  }
  return text;
};