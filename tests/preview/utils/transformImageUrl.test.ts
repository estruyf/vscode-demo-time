import { transformImageUrl } from '../../../src/preview/utils/transformImageUrl';

describe('transformImageUrl', () => {
  const baseSrc = 'https://example.com/assets';

  test('should return null if imagePath is not provided', () => {
    expect(transformImageUrl(baseSrc)).toBeNull();
  });

  test('should return imagePath if it starts with "http"', () => {
    const imagePath = 'http://cdn.com/image.jpg';
    expect(transformImageUrl(baseSrc, imagePath)).toBe(imagePath);
  });

  test('should return imagePath if it starts with "https"', () => {
    const imagePath = 'https://cdn.com/image.jpg';
    expect(transformImageUrl(baseSrc, imagePath)).toBe(imagePath);
  });

  test('should correctly join src with trailing slash and imagePath with leading slash', () => {
    const src = 'https://example.com/assets/';
    const imagePath = '/images/pic.png';
    expect(transformImageUrl(src, imagePath)).toBe('https://example.com/assets/images/pic.png');
  });

  test('should correctly join src without trailing slash and imagePath without leading slash', () => {
    const src = 'https://example.com/assets';
    const imagePath = 'images/pic.png';
    expect(transformImageUrl(src, imagePath)).toBe('https://example.com/assets/images/pic.png');
  });

  test('should correctly join src with trailing slash and imagePath without leading slash', () => {
    const src = 'https://example.com/assets/';
    const imagePath = 'images/pic.png';
    expect(transformImageUrl(src, imagePath)).toBe('https://example.com/assets/images/pic.png');
  });

  test('should correctly join src without trailing slash and imagePath with leading slash', () => {
    const src = 'https://example.com/assets';
    const imagePath = '/images/pic.png';
    expect(transformImageUrl(src, imagePath)).toBe('https://example.com/assets/images/pic.png');
  });
});
