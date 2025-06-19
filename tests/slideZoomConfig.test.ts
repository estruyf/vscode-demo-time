import { Config } from '../src/constants/Config';

describe('Config - Slide Zoom', () => {
  it('should have the correct zoom level configuration key', () => {
    expect(Config.slides.zoomLevel).toBe('slideZoomLevel');
  });

  it('should have all expected slide configuration keys', () => {
    expect(Config.slides).toHaveProperty('customTheme');
    expect(Config.slides).toHaveProperty('slideHeaderTemplate');
    expect(Config.slides).toHaveProperty('slideFooterTemplate');
    expect(Config.slides).toHaveProperty('zoomLevel');
  });
});