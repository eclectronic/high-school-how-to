import { Injectable } from '@angular/core';

/** Persisted placement for a single locker widget. col is 1-based. */
export interface GridItem {
  id: string;
  col: number;
  colSpan: number;
  order: number;
  minimized: boolean;
}

/** A GridItem with its computed vertical position added. */
export interface PackedItem extends GridItem {
  top: number;
}

/** Minimized widgets use a fixed title-bar height for packing purposes. */
export const MINIMIZED_HEIGHT_PX = 40;

@Injectable({
  providedIn: 'root',
})
export class LockerGridEngineService {
  /**
   * Place items top-to-bottom within their column range using an independent
   * height map per column. Items are sorted by `order` (then `col`) before
   * packing, so lower order values land higher in the grid.
   *
   * @param items       Items to pack (each must have a measured `height` in px,
   *                    or the caller uses heightMap externally — see below).
   * @param columnCount Number of columns in the current layout (1, 6, or 12).
   * @param heightMap   Optional current heights per column (length = columnCount).
   *                    Pass this when calling pack incrementally.
   * @returns Packed items with a `top` field (px from container top).
   */
  pack(
    items: (GridItem & { height: number })[],
    columnCount: number,
    heightMap?: number[],
  ): PackedItem[] {
    const colHeights = heightMap ? [...heightMap] : new Array<number>(columnCount).fill(0);
    const GAP = 16; // 1rem in pixels

    const sorted = [...items].sort((a, b) => a.order - b.order || a.col - b.col);

    return sorted.map((item) => {
      const startCol = Math.min(Math.max(item.col - 1, 0), columnCount - 1);
      const span = Math.min(item.colSpan, columnCount - startCol);
      const endCol = startCol + span - 1;

      // Find the maximum bottom edge across the spanned columns.
      let top = 0;
      for (let c = startCol; c <= endCol; c++) {
        top = Math.max(top, colHeights[c]);
      }

      const itemHeight = item.minimized ? MINIMIZED_HEIGHT_PX : item.height;
      const bottom = top + itemHeight + GAP;

      // Update height map for each spanned column.
      for (let c = startCol; c <= endCol; c++) {
        colHeights[c] = bottom;
      }

      return { ...item, top };
    });
  }

  /**
   * Reflow all items to fit within `newColCount` columns. Items that start
   * beyond the new column count are clamped. Items are re-packed from scratch
   * in order of `order`.
   */
  reflowForColumns(
    items: (GridItem & { height: number })[],
    newColCount: number,
  ): PackedItem[] {
    const adjusted = items.map((item) => {
      const col = Math.min(item.col, newColCount);
      const colSpan = Math.min(item.colSpan, newColCount - col + 1);
      return { ...item, col, colSpan };
    });
    return this.pack(adjusted, newColCount);
  }

  /**
   * Map an X offset within the container to a 1-based column number.
   *
   * @param xOffset       Horizontal offset from the container left edge (px).
   * @param containerWidth Total container width (px).
   * @param colCount      Number of columns.
   * @returns 1-based column number (clamped to [1, colCount]).
   */
  resolveDropColumn(xOffset: number, containerWidth: number, colCount: number): number {
    const colWidth = containerWidth / colCount;
    const col = Math.floor(xOffset / colWidth) + 1;
    return Math.min(Math.max(col, 1), colCount);
  }

  /**
   * Place a new item in the column (or column range) with the shortest total
   * height, using the provided height map.
   *
   * @param existingHeights  Heights per column from the current pack result.
   * @param colSpan          Width of the new item in columns.
   * @param colCount         Total columns.
   * @returns 1-based starting column for the new item.
   */
  autoLayout(existingHeights: number[], colSpan: number, colCount: number): number {
    let bestCol = 1;
    let bestHeight = Infinity;

    for (let startCol = 1; startCol <= colCount - colSpan + 1; startCol++) {
      let maxHeight = 0;
      for (let c = startCol - 1; c < startCol - 1 + colSpan; c++) {
        maxHeight = Math.max(maxHeight, existingHeights[c] ?? 0);
      }
      if (maxHeight < bestHeight) {
        bestHeight = maxHeight;
        bestCol = startCol;
      }
    }

    return bestCol;
  }
}
