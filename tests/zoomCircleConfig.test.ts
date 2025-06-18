import { Config } from '../src/constants/Config';

describe('Config - Zoom Circle', () => {
  it('should have the correct zoom circle width configuration key', () => {
    expect(Config.slides.zoomCircleWidth).toBe('slideZoomCircleWidth');
  });

  it('should have all expected slide configuration keys', () => {
    expect(Config.slides).toHaveProperty('customTheme');
    expect(Config.slides).toHaveProperty('slideHeaderTemplate');
    expect(Config.slides).toHaveProperty('slideFooterTemplate');
    expect(Config.slides).toHaveProperty('zoomCircleWidth');
  });
});