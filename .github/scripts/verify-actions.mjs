import { readFile } from "fs/promises";


const getActionOptions = await readFile("src/utils/getActionOptions.ts", "utf8");
const getActionTemplate = await readFile("src/utils/getActionTemplate.ts", "utf8");

const actionsTxt = await readFile("src/models/Action.ts", "utf8");

const actionsData = actionsTxt.split("\n").slice(2);
const actions = [];
for (let action of actionsData) {
  if (action.includes("=")) {
    actions.push(`Action.${action.split("=")[0].trim()}`);
  }
}

const options = [];
const templates = [];
for (let action of actions) {
  if (!getActionOptions.includes(action)) {
    options.push(action);
  }
  if (!getActionTemplate.includes(action)) {
    templates.push(action);
  }
}

if (options.length > 0) {
  console.error("The following actions are missing from getActionOptions.ts");
  console.error(options);
}

if (templates.length > 0) {
  console.error("The following actions are missing from getActionTemplate.ts");
  console.error(templates);
}

if (options.length === 0 && templates.length === 0) {
  console.log("All actions are accounted for in getActionOptions.ts and getActionTemplate.ts");
}

if (options.length > 0 || templates.length > 0) {
  process.exit(1);
}
