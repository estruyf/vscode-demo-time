import { Step } from '@demotime/common';
import { getFieldsForAction } from './actionHelpers';

/**
 * Cleans up step properties that are not relevant to the current action.
 * This function removes all properties except for 'action', 'disabled', and
 * properties that are valid for the current action type.
 *
 * @param step - The step to clean up
 * @returns A new step object with only relevant properties
 */
export const cleanupStepProperties = (step: Step): Step => {
  if (!step.action) {
    return step;
  }

  // Get the valid fields for the current action
  const validFields = getFieldsForAction(step.action);

  // Always keep these base properties
  const baseProperties: (keyof Step)[] = ['action', 'disabled'];

  // Combine base properties with action-specific valid fields
  const allowedProperties = [...baseProperties, ...validFields];

  // Create a new step object with only allowed properties
  const cleanedStep: Partial<Step> = { action: step.action };

  // Copy over only the allowed properties that exist in the original step
  allowedProperties.forEach((prop) => {
    if (prop in step && step[prop as keyof Step] !== undefined) {
      (cleanedStep as Record<string, unknown>)[prop] = step[prop as keyof Step];
    }
  });

  return cleanedStep as Step;
};

/**
 * Validates if a step has any properties that are not relevant to its current action.
 *
 * @param step - The step to validate
 * @returns true if the step has invalid properties, false otherwise
 */
export const hasInvalidProperties = (step: Step): boolean => {
  if (!step.action) {
    return false;
  }

  const validFields = getFieldsForAction(step.action);
  const baseProperties: (keyof Step)[] = ['action', 'disabled'];
  const allowedProperties = [...baseProperties, ...validFields];

  // Check if any property in the step is not in the allowed list
  const stepProperties = Object.keys(step) as (keyof Step)[];

  return stepProperties.some(
    (prop) => !allowedProperties.includes(prop) && step[prop] !== undefined,
  );
};

/**
 * Gets a list of invalid properties for a given step.
 *
 * @param step - The step to analyze
 * @returns Array of property names that are not valid for the current action
 */
export const getInvalidProperties = (step: Step): string[] => {
  if (!step.action) {
    return [];
  }

  const validFields = getFieldsForAction(step.action);
  const baseProperties: (keyof Step)[] = ['action', 'disabled'];
  const allowedProperties = [...baseProperties, ...validFields];

  const stepProperties = Object.keys(step) as (keyof Step)[];

  return stepProperties.filter(
    (prop) => !allowedProperties.includes(prop) && step[prop] !== undefined,
  );
};
