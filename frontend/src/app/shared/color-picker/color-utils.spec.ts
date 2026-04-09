import {
  autoContrastColor, relativeLuminance, contrastRatio, isHexColor, isGradient,
  firstHexFromGradient, addToColorHistory,
} from './color-utils';

describe('color-utils', () => {
  describe('relativeLuminance', () => {
    it('returns 1 for white', () => {
      expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 3);
    });

    it('returns 0 for black', () => {
      expect(relativeLuminance('#000000')).toBeCloseTo(0, 3);
    });

    it('returns intermediate value for mid-grey', () => {
      const l = relativeLuminance('#808080');
      expect(l).toBeGreaterThan(0);
      expect(l).toBeLessThan(1);
    });
  });

  describe('autoContrastColor', () => {
    it('returns black for light backgrounds', () => {
      expect(autoContrastColor('#fffef8')).toBe('#000000');
      expect(autoContrastColor('#fef3c7')).toBe('#000000');
      expect(autoContrastColor('#ffffff')).toBe('#000000');
    });

    it('returns white for dark backgrounds', () => {
      expect(autoContrastColor('#2d1a10')).toBe('#ffffff');
      expect(autoContrastColor('#000000')).toBe('#ffffff');
      expect(autoContrastColor('#1a1a2e')).toBe('#ffffff');
    });

    it('handles invalid hex gracefully', () => {
      const result = autoContrastColor('not-a-color');
      expect(result).toBeDefined();
    });
  });

  describe('contrastRatio', () => {
    it('returns 21 for black on white', () => {
      expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    });

    it('returns 1 for same color', () => {
      expect(contrastRatio('#808080', '#808080')).toBeCloseTo(1, 3);
    });

    it('detects low contrast', () => {
      // Light grey on white — low contrast
      expect(contrastRatio('#dddddd', '#ffffff')).toBeLessThan(4.5);
    });
  });

  describe('isHexColor', () => {
    it('accepts 6-digit hex', () => expect(isHexColor('#fffef8')).toBeTrue());
    it('accepts 3-digit hex', () => expect(isHexColor('#fff')).toBeTrue());
    it('rejects gradient', () => expect(isHexColor('linear-gradient(135deg, #a, #b)')).toBeFalse());
    it('rejects plain text', () => expect(isHexColor('red')).toBeFalse());
  });

  describe('isGradient', () => {
    it('detects linear-gradient', () => expect(isGradient('linear-gradient(135deg, #a, #b)')).toBeTrue());
    it('rejects plain hex', () => expect(isGradient('#fffef8')).toBeFalse());
  });

  describe('firstHexFromGradient', () => {
    it('extracts first hex from gradient', () => {
      const result = firstHexFromGradient('linear-gradient(135deg, #6aabdf 0%, #2368b0 100%)');
      expect(result).toBe('#6aabdf');
    });

    it('returns null when no hex found', () => {
      expect(firstHexFromGradient('linear-gradient(135deg, red, blue)')).toBeNull();
    });
  });

  describe('addToColorHistory', () => {
    it('prepends new color', () => {
      const result = addToColorHistory('#new', ['#old']);
      expect(result[0]).toBe('#new');
      expect(result[1]).toBe('#old');
    });

    it('moves existing color to front', () => {
      const result = addToColorHistory('#b', ['#a', '#b', '#c']);
      expect(result[0]).toBe('#b');
      expect(result.filter(c => c === '#b').length).toBe(1); // no duplicate
    });

    it('limits to 16 colors', () => {
      const existing = Array.from({ length: 16 }, (_, i) => `#${i.toString().padStart(6, '0')}`);
      const result = addToColorHistory('#aaaaaa', existing);
      expect(result.length).toBe(16);
    });
  });

});
