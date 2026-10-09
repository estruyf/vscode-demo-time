import { describe, it, expect } from '@jest/globals';
import { getNextSceneButtonText } from '../src/utils/getNextSceneButtonText';

describe('getNextSceneButtonText', () => {
  it('shows the scene title when no custom text is set', () => {
    expect(getNextSceneButtonText('Create the API', undefined)).toBe('Create the API');
    expect(getNextSceneButtonText('Create the API', '')).toBe('Create the API');
  });

  it('shows the scene title when the custom text only contains whitespace', () => {
    expect(getNextSceneButtonText('Create the API', '   ')).toBe('Create the API');
  });

  it('shows the custom text instead of the scene title', () => {
    expect(getNextSceneButtonText('Create the API', 'Next')).toBe('Next');
    expect(getNextSceneButtonText('Create the API', ' $(arrow-right) Next ')).toBe(
      '$(arrow-right) Next',
    );
  });

  it('returns an empty string without a title or custom text', () => {
    expect(getNextSceneButtonText(undefined, undefined)).toBe('');
  });
});
