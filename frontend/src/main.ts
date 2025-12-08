import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const BASE_TILE_SIZE = 256;
const baseOuterWidth = window.outerWidth;
const baseInnerWidth = window.innerWidth;
const baseOuterInnerRatio =
  baseOuterWidth && baseInnerWidth ? baseOuterWidth / baseInnerWidth : 1;

const deriveScaleFromViewport = () => {
  if (!baseOuterInnerRatio || !window.outerWidth || !window.innerWidth) {
    return undefined;
  }

  const ratio = window.outerWidth / window.innerWidth;
  const scale = ratio / baseOuterInnerRatio;
  return Number.isFinite(scale) && scale > 0 ? scale : undefined;
};

const getZoomScale = () =>
  window.visualViewport?.scale ?? deriveScaleFromViewport() ?? window.devicePixelRatio ?? 1;

const updateBackgroundTileSize = () => {
  const zoomScale = getZoomScale();
  const computedSize = BASE_TILE_SIZE / zoomScale;
  document.documentElement.style.setProperty('--bg-tile-size', `${computedSize}px`);
};

updateBackgroundTileSize();
window.addEventListener('resize', updateBackgroundTileSize);
window.addEventListener('orientationchange', updateBackgroundTileSize);
window.visualViewport?.addEventListener('resize', updateBackgroundTileSize);

bootstrapApplication(App, appConfig).catch((err: unknown) => console.error(err));
