import { Action } from '../src/models/Action';
import { getActionTemplate } from '../src/utils/getActionTemplate';

describe('CopyToClipboard Action', () => {
  test('should generate correct template for CopyToClipboard action', () => {
    const mockAction = {
      label: Action.CopyToClipboard,
      description: 'Copy text to clipboard',
    };

    const template = getActionTemplate(mockAction);

    expect(template).toEqual({
      action: Action.CopyToClipboard,
      content: '',
    });
  });

  test('should include CopyToClipboard in Action enum', () => {
    expect(Action.CopyToClipboard).toBe('copyToClipboard');
  });

  test('should have expected action properties in template', () => {
    const mockAction = {
      label: Action.CopyToClipboard,
      description: 'Copy text to clipboard',
    };

    const template = getActionTemplate(mockAction);

    // Verify the template has the expected structure
    expect(template).toHaveProperty('action');
    expect(template).toHaveProperty('content');
    expect(template.action).toBe(Action.CopyToClipboard);
    expect(typeof template.content).toBe('string');
  });
});
