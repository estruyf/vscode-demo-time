import { StateKeys } from "../constants";
import { Extension } from "../services/Extension";

export const clearVariablesState = async () => {
  const ext = Extension.getInstance();
  await ext.setState(StateKeys.variables, {});
};
