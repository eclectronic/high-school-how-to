import { hexToHsl, hslToHex } from '../../shared/color-picker/color-utils';

export interface Palette {
  name: string;
  label: string;
  colors: { TODO: string; NOTES: string; TIMER: string };
  gradients: { TODO: string; NOTES: string; TIMER: string };
}

export const PALETTES: Palette[] = [
  {
    name: 'ocean',
    label: 'Ocean',
    colors:    { TODO: '#a7c7e7', NOTES: '#b5ead7', TIMER: '#ade8f4' },
    gradients: {
      TODO:  'linear-gradient(135deg, #bdd6ee 0%, #a7c7e7 45%, #93b8dc 100%)',
      NOTES: 'linear-gradient(135deg, #c8f0e0 0%, #b5ead7 45%, #9edcc8 100%)',
      TIMER: 'linear-gradient(135deg, #c2eef8 0%, #ade8f4 45%, #96dcea 100%)',
    },
  },
  {
    name: 'sunset',
    label: 'Sunset',
    colors:    { TODO: '#ffb4b4', NOTES: '#ffd8a8', TIMER: '#ffb6d9' },
    gradients: {
      TODO:  'linear-gradient(135deg, #ffc8c8 0%, #ffb4b4 45%, #f9a0a0 100%)',
      NOTES: 'linear-gradient(135deg, #ffe4be 0%, #ffd8a8 45%, #f5c88e 100%)',
      TIMER: 'linear-gradient(135deg, #ffc8e2 0%, #ffb6d9 45%, #f5a0c8 100%)',
    },
  },
  {
    name: 'forest',
    label: 'Forest',
    colors:    { TODO: '#b5e8b5', NOTES: '#d4e89e', TIMER: '#dec89e' },
    gradients: {
      TODO:  'linear-gradient(135deg, #c8f0c8 0%, #b5e8b5 45%, #9edd9e 100%)',
      NOTES: 'linear-gradient(135deg, #e0f0b0 0%, #d4e89e 45%, #c2da88 100%)',
      TIMER: 'linear-gradient(135deg, #e8d6b0 0%, #dec89e 45%, #d0b888 100%)',
    },
  },
  {
    name: 'candy',
    label: 'Candy',
    colors:    { TODO: '#c3b1e1', NOTES: '#ffb3d9', TIMER: '#a7d8f0' },
    gradients: {
      TODO:  'linear-gradient(135deg, #d2c4ea 0%, #c3b1e1 45%, #b09ed6 100%)',
      NOTES: 'linear-gradient(135deg, #ffc4e2 0%, #ffb3d9 45%, #f59ec8 100%)',
      TIMER: 'linear-gradient(135deg, #bae2f5 0%, #a7d8f0 45%, #92cce5 100%)',
    },
  },
];

export const DEFAULT_PALETTE_NAME = 'ocean';

export function getPalette(name: string): Palette {
  return PALETTES.find(p => p.name === name) ?? PALETTES[0];
}

export function getPaletteGradient(palette: Palette, appType: string): string {
  return (palette.gradients as Record<string, string>)[appType]
    ?? (palette.colors as Record<string, string>)[appType]
    ?? '#888';
}

/**
 * Derives a triadic color theme from a locker background color.
 * The three app panes get vivid, distinct hues spaced ~120° apart on the color wheel,
 * anchored to the locker color's hue family.
 */
export function deriveThemeFromColor(hex: string): Palette {
  const [h] = hexToHsl(hex);

  // Triadic hue spacing; pastel post-it saturation/lightness
  const vibrS = 0.55;
  const vibrL = 0.82;

  const hTodo  = h;
  const hNotes = (h + 130) % 360;
  const hTimer = (h + 245) % 360;

  const solid = (hue: number) => hslToHex(hue, vibrS, vibrL);

  const gradient = (hue: number) => {
    const light = hslToHex(hue, Math.max(0, vibrS - 0.1), Math.min(1, vibrL + 0.18));
    const mid   = hslToHex(hue, vibrS, vibrL);
    const dark  = hslToHex(hue, Math.min(1, vibrS + 0.05), Math.max(0, vibrL - 0.10));
    return `linear-gradient(135deg, ${light} 0%, ${mid} 45%, ${dark} 100%)`;
  };

  return {
    name: 'dynamic',
    label: 'Dynamic',
    colors:    { TODO: solid(hTodo),    NOTES: solid(hNotes),    TIMER: solid(hTimer) },
    gradients: { TODO: gradient(hTodo), NOTES: gradient(hNotes), TIMER: gradient(hTimer) },
  };
}
