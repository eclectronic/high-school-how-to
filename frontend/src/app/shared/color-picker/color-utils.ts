/**
 * WCAG relative luminance calculation.
 * Returns a luminance value between 0 (black) and 1 (white).
 */
export function relativeLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Returns '#000000' or '#ffffff' for auto-contrast against the given background hex.
 * Uses the WCAG luminance formula.
 */
export function autoContrastColor(backgroundHex: string): '#000000' | '#ffffff' {
  try {
    const lum = relativeLuminance(backgroundHex);
    // WCAG AA contrast ratio threshold: white on backgrounds with luminance < 0.18
    return lum > 0.18 ? '#000000' : '#ffffff';
  } catch {
    return '#000000';
  }
}

/**
 * Calculates the WCAG contrast ratio between two colors.
 * Returns a value between 1 and 21.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Checks whether a string is a valid solid hex color (#rrggbb or #rgb). */
export function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/** Checks whether a string is a CSS gradient. */
export function isGradient(value: string): boolean {
  return value.includes('gradient(');
}

/** Extracts the first hex color from a gradient string for luminance calculation. */
export function firstHexFromGradient(gradient: string): string | null {
  const match = gradient.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  return match ? match[0] : null;
}

/** Default color palette used for auto-assigning card colors. */
export const DEFAULT_PALETTE: string[] = [
  '#fffef8', '#fef3c7', '#fde68a', '#fcd34d',
  '#fef2f2', '#fecdd3', '#fda4af', '#fbcfe8',
  '#ede9fe', '#ddd6fe', '#c7d2fe', '#bfdbfe',
  '#dcfce7', '#bbf7d0', '#a7f3d0', '#e0f2fe',
];

const LS_HISTORY_KEY = 'hsht_colorHistory';

export function loadColorHistory(): string[] {
  try {
    const stored = localStorage.getItem(LS_HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) return parsed.slice(0, 16);
    }
  } catch { /* ignore */ }
  return [];
}

export function addToColorHistory(color: string, history: string[]): string[] {
  const filtered = history.filter(c => c !== color);
  return [color, ...filtered].slice(0, 16);
}

export function saveColorHistory(history: string[]): void {
  try {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history));
  } catch { /* ignore */ }
}
