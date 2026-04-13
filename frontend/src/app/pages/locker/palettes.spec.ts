import { getPalette, PALETTES, DEFAULT_PALETTE_NAME, deriveThemeFromColor } from './palettes';

describe('getPalette', () => {
  it('returns the ocean palette when given "ocean"', () => {
    const palette = getPalette('ocean');
    expect(palette.name).toBe('ocean');
    expect(palette.label).toBe('Ocean');
  });

  it('returns the default palette (first) when given an unknown name', () => {
    const palette = getPalette('unknown');
    expect(palette).toBe(PALETTES[0]);
  });

  it('default palette name is "ocean"', () => {
    expect(DEFAULT_PALETTE_NAME).toBe('ocean');
    expect(getPalette(DEFAULT_PALETTE_NAME)).toBe(PALETTES[0]);
  });

  it('all 4 palettes have TODO, NOTES, and TIMER color and gradient keys', () => {
    expect(PALETTES.length).toBe(4);
    for (const palette of PALETTES) {
      expect(palette.colors.TODO).toBeDefined();
      expect(palette.colors.NOTES).toBeDefined();
      expect(palette.colors.TIMER).toBeDefined();
      expect(palette.gradients.TODO).toBeDefined();
      expect(palette.gradients.NOTES).toBeDefined();
      expect(palette.gradients.TIMER).toBeDefined();
    }
  });

  it('each palette color value is a valid hex string', () => {
    const hexPattern = /^#[0-9a-fA-F]{3,8}$/;
    for (const palette of PALETTES) {
      for (const color of Object.values(palette.colors)) {
        expect(color).toMatch(hexPattern);
      }
    }
  });
});

describe('deriveThemeFromColor', () => {
  const hexPattern = /^#[0-9a-fA-F]{6}$/;

  it('returns a palette with TODO, NOTES, TIMER color and gradient keys', () => {
    const theme = deriveThemeFromColor('#3d8ed4');
    expect(theme.colors.TODO).toBeDefined();
    expect(theme.colors.NOTES).toBeDefined();
    expect(theme.colors.TIMER).toBeDefined();
    expect(theme.gradients.TODO).toBeDefined();
    expect(theme.gradients.NOTES).toBeDefined();
    expect(theme.gradients.TIMER).toBeDefined();
  });

  it('produces valid hex colors for a vivid input', () => {
    const theme = deriveThemeFromColor('#3d8ed4');
    for (const color of Object.values(theme.colors)) {
      expect(color).toMatch(hexPattern);
    }
  });

  it('produces valid hex colors for a pastel input', () => {
    const theme = deriveThemeFromColor('#fde68a');
    for (const color of Object.values(theme.colors)) {
      expect(color).toMatch(hexPattern);
    }
  });

  it('produces valid hex colors for the default locker color', () => {
    const theme = deriveThemeFromColor('#f5ede0');
    for (const color of Object.values(theme.colors)) {
      expect(color).toMatch(hexPattern);
    }
  });

  it('gradients are CSS linear-gradient strings', () => {
    const theme = deriveThemeFromColor('#7048c0');
    for (const grad of Object.values(theme.gradients)) {
      expect(grad).toContain('linear-gradient');
    }
  });

  it('TODO, NOTES, TIMER colors are all distinct from each other', () => {
    const theme = deriveThemeFromColor('#1e9648');
    expect(theme.colors.TODO).not.toBe(theme.colors.NOTES);
    expect(theme.colors.NOTES).not.toBe(theme.colors.TIMER);
    expect(theme.colors.TODO).not.toBe(theme.colors.TIMER);
  });
});
