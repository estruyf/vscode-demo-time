import { getUserInput } from "./getUserInput";

export const insertVariables = async (text: string, variables: { [key: string]: any }) => {
  for (const key in variables) {
    let regex = new RegExp(`{${key}}`, "g");
    if (key === "DT_INPUT" && !variables.DT_INPUT && text.includes(`{${key}}`)) {
      const input = await getUserInput("Please enter a value");

      variables.DT_INPUT = input || "";
    }
    text = text.replace(regex, variables[key]);
  }
  return text;
};
