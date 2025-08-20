import { Config } from "../constants";
import { DemoCache } from "../models";
import { getSetting } from "./getSetting";

export const removeDemosForCurrentPosition = (demos: DemoCache[], currentIdx: number) => {
  // Remove demos with a higher index than the current executed demo if setting is 'currentPosition'
  const nextActionBehaviour = getSetting(Config.demoRunner.nextActionBehaviour);
  if (nextActionBehaviour === "currentPosition") {
    demos = demos.filter((d) => d.idx <= currentIdx);
  }
  return demos;
};
