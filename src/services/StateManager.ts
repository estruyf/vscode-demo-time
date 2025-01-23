import { StateKeys } from "../constants";
import { Extension } from "./Extension";

export class StateManager {
  public static async update(key: string, value: string): Promise<void> {
    const ext = Extension.getInstance();
    const stateVariables = ext.getState<{ [key: string]: string }>(StateKeys.variables) || {};
    stateVariables[key] = value;
    await ext.setState(StateKeys.variables, stateVariables);
  }
}
