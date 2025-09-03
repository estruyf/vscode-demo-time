import { Action, Step } from '@demotime/common';
import { DemoConfig, Demo } from '../types/demo';
import { getRequiredFields } from './actionHelpers';

export interface ValidationError {
  field: string;
  message: string;
  demoIndex?: number;
  stepIndex?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateConfig = (config: DemoConfig): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate main config
  if (!config.title?.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  // Validate demos
  (config.demos || []).forEach((demo, demoIndex) => {
    const demoErrors = validateDemo(demo, demoIndex);
    errors.push(...demoErrors.errors);
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateDemo = (demo: Demo, demoIndex?: number): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate demo title
  if (!demo.title?.trim()) {
    errors.push({
      field: 'title',
      message: 'Demo title is required',
      demoIndex,
    });
  }

  // Validate steps
  demo.steps.forEach((step, stepIndex) => {
    const stepErrors = validateStep(step, demoIndex, stepIndex);
    errors.push(...stepErrors.errors);
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateStep = (
  step: Step,
  demoIndex?: number,
  stepIndex?: number,
): ValidationResult => {
  const errors: ValidationError[] = [];
  const requiredFields = getRequiredFields(step.action);

  // Check basic required fields
  requiredFields.forEach((field) => {
    if (!isFieldValid(step, field)) {
      errors.push({
        field,
        message: `${getFieldLabel(field)} is required for ${step.action} action`,
        demoIndex,
        stepIndex,
      });
    }
  });

  // Custom validation rules for specific actions
  switch (step.action) {
    case Action.Create:
      // Content and contentPath are mutually exclusive but both are optional
      if (step.content && step.contentPath) {
        errors.push({
          field: 'content',
          message: 'Cannot specify both content and contentPath',
          demoIndex,
          stepIndex,
        });
      }
      break;

    case Action.Insert:
    case Action.Replace:
      // Must have either content OR contentPath
      if (!step.content && !step.contentPath) {
        errors.push({
          field: 'content',
          message: 'Either content or contentPath is required',
          demoIndex,
          stepIndex,
        });
      }
      if (step.content && step.contentPath) {
        errors.push({
          field: 'content',
          message: 'Cannot specify both content and contentPath',
          demoIndex,
          stepIndex,
        });
      }
      // Must have either position OR both startPlaceholder and endPlaceholder
      if (!step.position && !step.startPlaceholder) {
        errors.push({
          field: 'position',
          message: 'Either position or both startPlaceholder and endPlaceholder are required',
          demoIndex,
          stepIndex,
        });
      }
      if (typeof step.insertTypingSpeed !== 'undefined' && step.insertTypingSpeed < 0) {
        errors.push({
          field: 'insertTypingSpeed',
          message: 'Insert typing speed must be a positive number',
          demoIndex,
          stepIndex,
        });
      }
      break;

    case Action.Highlight:
      // Must have either position OR both startPlaceholder and endPlaceholder
      if (!step.position && (!step.startPlaceholder || !step.endPlaceholder)) {
        errors.push({
          field: 'position',
          message: 'Either position or both startPlaceholder and endPlaceholder are required',
          demoIndex,
          stepIndex,
        });
      }
      if (typeof step.zoom !== 'undefined' && step.zoom < 0) {
        errors.push({
          field: 'zoom',
          message: 'Zoom level must be a positive number',
          demoIndex,
          stepIndex,
        });
      }
      break;

    case Action.CopyToClipboard:
      // Must have either content OR contentPath, but not both
      if (!step.content && !step.contentPath) {
        errors.push({
          field: 'content',
          message: 'Either content or contentPath is required',
          demoIndex,
          stepIndex,
        });
      }
      if (step.content && step.contentPath) {
        errors.push({
          field: 'content',
          message: 'Cannot specify both content and contentPath',
          demoIndex,
          stepIndex,
        });
      }
      break;

    case Action.ExecuteScript:
      // All three fields are required
      if (!step.id?.trim()) {
        errors.push({
          field: 'id',
          message: 'Script ID is required',
          demoIndex,
          stepIndex,
        });
      }
      if (!step.command?.trim()) {
        errors.push({
          field: 'command',
          message: 'Command is required',
          demoIndex,
          stepIndex,
        });
      }
      if (!step.path?.trim()) {
        errors.push({
          field: 'path',
          message: 'Path is required',
          demoIndex,
          stepIndex,
        });
      }
      break;

    case Action.SetSetting:
      if (!step.setting?.key?.trim() || step.setting?.value === undefined) {
        errors.push({
          field: 'setting',
          message: 'Both setting key and value are required',
          demoIndex,
          stepIndex,
        });
      }
      break;

    case Action.SetState:
      if (!step.state?.key?.trim() || !step.state?.value?.trim()) {
        errors.push({
          field: 'state',
          message: 'Both state key and value are required',
          demoIndex,
          stepIndex,
        });
      }
      break;

    case Action.WaitForTimeout:
      if (typeof step.timeout !== 'number' || step.timeout <= 0) {
        errors.push({
          field: 'timeout',
          message: 'Timeout must be a positive number',
          demoIndex,
          stepIndex,
        });
      }
      break;

    case Action.OpenSlide:
      if (typeof step.slide === 'number' && step.slide <= 0) {
        errors.push({
          field: 'slide',
          message: 'Slide must be a positive number',
          demoIndex,
          stepIndex,
        });
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const isFieldValid = (step: Step, field: string): boolean => {
  const value = step[field as keyof Step];

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'object') {
    // For setting and state objects
    if (field === 'setting') {
      const setting = value as { key: string; value: string };
      return setting.key?.trim().length > 0 && setting.value !== undefined;
    }
    if (field === 'state') {
      const state = value as { key: string; value: string };
      return state.key?.trim().length > 0 && state.value?.trim().length > 0;
    }
  }

  return true;
};

const getFieldLabel = (field: string): string => {
  const labelMap: Record<string, string> = {
    path: 'Path',
    content: 'Content',
    contentPath: 'Content Path',
    position: 'Position',
    command: 'Command',
    message: 'Message',
    timeout: 'Timeout',
    theme: 'Theme',
    setting: 'Setting',
    state: 'State',
    url: 'URL',
    id: 'ID',
    args: 'Arguments',
    dest: 'Destination',
  };

  return labelMap[field] || field.charAt(0).toUpperCase() + field.slice(1);
};

export const getValidationSummary = (result: ValidationResult): string => {
  if (result.isValid) {
    return 'All fields are valid';
  }

  const errorCount = result.errors.length;
  return `${errorCount} validation error${errorCount !== 1 ? 's' : ''} found`;
};
