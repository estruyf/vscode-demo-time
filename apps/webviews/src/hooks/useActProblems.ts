import { useContext } from 'react';
import { ActProblem } from '@demotime/common';
import { PreflightContext } from '../providers/PreflightProvider';

/**
 * The preflight problems of a scene, or of a move when `moveIndex` is set
 */
export const useActProblems = (sceneIndex?: number | null, moveIndex?: number): ActProblem[] => {
  const problems = useContext(PreflightContext);

  if (sceneIndex === undefined || sceneIndex === null) {
    return [];
  }

  return problems.filter(
    (problem) =>
      problem.sceneIndex === sceneIndex &&
      (moveIndex === undefined || problem.moveIndex === moveIndex),
  );
};
