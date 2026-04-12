import { Injectable } from '@angular/core';

/** Persisted placement for a single locker widget. col is 1-based, row is 0-based. */
export interface GridItem {
  id: string;
  col: number;
  colSpan: number;
  order: number;
  row: number;
  minimized: boolean;
}

/** A GridItem with its computed vertical position added. */
export interface PackedItem extends GridItem {
  top: number;
}

/** Minimized widgets use a fixed title-bar height for packing purposes. */
export const MINIMIZED_HEIGHT_PX = 40;

/** A widget with free-form pixel coordinates. */
export interface FreeItem {
  id: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

/** A FreeItem with packed pixel coordinates assigned by shelfPack(). */
export type PackedFreeItem = FreeItem;

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
    cellSize: number = 0,
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

      // If the item has a row hint and cellSize is set, use it as a minimum.
      if (item.row > 0 && cellSize > 0) {
        top = Math.max(top, item.row * cellSize);
      }

      const itemHeight = item.minimized ? MINIMIZED_HEIGHT_PX : item.height;
      const bottom = top + itemHeight + GAP;
      // Snap the column floor to the nearest row-grid boundary so adjacent
      // column groups stay aligned. Items land at their natural pixel position;
      // only the starting floor for the next item is snapped.
      const snappedBottom = cellSize > 0 ? Math.ceil(bottom / cellSize) * cellSize : bottom;

      // Update height map for each spanned column.
      for (let c = startCol; c <= endCol; c++) {
        colHeights[c] = snappedBottom;
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
   * Given the current packed layout and a cursor Y position (relative to the
   * grid container), determine the insertion index for the dragged card among
   * all non-dragged cards sorted by their visual top position.
   *
   * Compares the cursor Y against the vertical midpoint of each card. The
   * insertion index is the position of the first card whose midpoint is below
   * the cursor (i.e., insert before that card). Returns `others.length` when
   * the cursor is below all cards (insert at end).
   *
   * @param packedItems  Current packed layout (includes the dragged card).
   * @param cursorY      Cursor Y offset from the container top edge (px).
   * @param heightMap    Map of card id → measured height in px.
   * @param draggedId    ID of the card being dragged (excluded from comparison).
   * @returns 0-based insertion index in the sorted sequence of non-dragged cards.
   */
  resolveDropIndex(
    packedItems: PackedItem[],
    cursorY: number,
    heightMap: Map<string, number>,
    draggedId: string,
  ): number {
    const others = [...packedItems]
      .filter(p => p.id !== draggedId)
      .sort((a, b) => a.top - b.top);

    for (let i = 0; i < others.length; i++) {
      const h = others[i].minimized ? MINIMIZED_HEIGHT_PX : (heightMap.get(others[i].id) ?? 200);
      if (cursorY < others[i].top + h / 2) return i;
    }
    return others.length;
  }

  /**
   * Shelf-pack free-form items into a compact layout within a container.
   * Items are sorted by their current posY, then posX (preserving visual order).
   * Each item is placed left-to-right in a row; when an item doesn't fit the
   * current row, a new row is started below the tallest item in the current row.
   * Items wider than containerWidth are clamped to containerWidth.
   *
   * @param items         Items to pack (posX/posY are the current positions).
   * @param containerWidth Width of the container in pixels.
   * @param gap           Gap between items in pixels (default 16).
   * @returns New array with updated posX/posY for each item (original objects are not mutated).
   */
  shelfPack(items: FreeItem[], containerWidth: number, gap = 16): PackedFreeItem[] {
    const sorted = [...items].sort((a, b) => a.posY - b.posY || a.posX - b.posX);

    let rowX = 0;
    let rowY = 0;
    let rowHeight = 0;

    return sorted.map((item) => {
      const w = Math.min(item.width, containerWidth);

      // Wrap to next row if the item doesn't fit.
      if (rowX > 0 && rowX + w > containerWidth) {
        rowY += rowHeight + gap;
        rowX = 0;
        rowHeight = 0;
      }

      const packed: PackedFreeItem = { ...item, posX: rowX, posY: rowY, width: w };
      rowX += w + gap;
      rowHeight = Math.max(rowHeight, item.height);

      return packed;
    });
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
