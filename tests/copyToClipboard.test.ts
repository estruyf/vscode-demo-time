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
      contentPath: '',
    });
  });

  test('should include CopyToClipboard in Action enum', () => {
    expect(Action.CopyToClipboard).toBe('copyToClipboard');
  });
});