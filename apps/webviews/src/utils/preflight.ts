import { ActProblem } from '@demotime/common';

// Preflight problems the act editor already reports with its own validation
const EDITOR_VALIDATED_CODES = ['preflight-missing-property', 'preflight-unknown-action'];

/**
 * The preflight problems without the ones the act editor's own validation already reports
 */
export const withoutEditorValidated = (problems: ActProblem[]) =>
  problems.filter((problem) => !EDITOR_VALIDATED_CODES.includes(problem.code));
