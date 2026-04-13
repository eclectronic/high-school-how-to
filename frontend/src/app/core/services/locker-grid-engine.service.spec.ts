import { TestBed } from '@angular/core/testing';
import { LockerGridEngineService, GridItem, MINIMIZED_HEIGHT_PX } from './locker-grid-engine.service';

type ItemInput = GridItem & { height: number };

function makeItem(overrides: Partial<ItemInput> & { id: string }): ItemInput {
  return {
    col: 1,
    colSpan: 4,
    order: 0,
    row: 0,
    minimized: false,
    height: 200,
    ...overrides,
  };
}

describe('LockerGridEngineService', () => {
  let service: LockerGridEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LockerGridEngineService);
  });

  describe('pack', () => {
    it('places first item at top = 0', () => {
      const items = [makeItem({ id: 'a', col: 1, colSpan: 4, order: 0, height: 200 })];
      const packed = service.pack(items, 12);
      expect(packed[0].top).toBe(0);
    });

    it('stacks two items in same column range sequentially', () => {
      const items = [
        makeItem({ id: 'a', col: 1, colSpan: 4, order: 0, height: 200 }),
        makeItem({ id: 'b', col: 1, colSpan: 4, order: 1, height: 100 }),
      ];
      const packed = service.pack(items, 12);
      // b must start below a (200 + 16 gap)
      expect(packed.find((p) => p.id === 'b')!.top).toBe(216);
    });

    it('packs items in adjacent non-overlapping columns independently', () => {
      // col 1-4 and col 5-8 should both start at top=0
      const items = [
        makeItem({ id: 'a', col: 1, colSpan: 4, order: 0, height: 200 }),
        makeItem({ id: 'b', col: 5, colSpan: 4, order: 1, height: 100 }),
      ];
      const packed = service.pack(items, 12);
      expect(packed.find((p) => p.id === 'a')!.top).toBe(0);
      expect(packed.find((p) => p.id === 'b')!.top).toBe(0);
    });

    it('sorts by order before packing', () => {
      const items = [
        makeItem({ id: 'b', col: 1, colSpan: 4, order: 1, height: 100 }),
        makeItem({ id: 'a', col: 1, colSpan: 4, order: 0, height: 200 }),
      ];
      const packed = service.pack(items, 12);
      // item with order=0 should be placed first (top=0)
      expect(packed.find((p) => p.id === 'a')!.top).toBe(0);
      expect(packed.find((p) => p.id === 'b')!.top).toBe(216);
    });

    it('uses MINIMIZED_HEIGHT_PX for minimized items', () => {
      const items = [
        makeItem({ id: 'a', col: 1, colSpan: 4, order: 0, height: 200, minimized: true }),
        makeItem({ id: 'b', col: 1, colSpan: 4, order: 1, height: 100 }),
      ];
      const packed = service.pack(items, 12);
      // b should be placed below minimized a
      expect(packed.find((p) => p.id === 'b')!.top).toBe(MINIMIZED_HEIGHT_PX + 16);
    });

    it('uses provided heightMap as starting heights', () => {
      const items = [makeItem({ id: 'a', col: 1, colSpan: 4, order: 0, height: 100 })];
      const heightMap = new Array(12).fill(0);
      heightMap[0] = 50;
      heightMap[1] = 50;
      heightMap[2] = 50;
      heightMap[3] = 50;
      const packed = service.pack(items, 12, 0, heightMap);
      expect(packed[0].top).toBe(50);
    });

    it('returns empty array for empty input', () => {
      expect(service.pack([], 12)).toEqual([]);
    });

    it('clamps col to 0 when item col exceeds columnCount', () => {
      const items = [makeItem({ id: 'a', col: 15, colSpan: 1, order: 0, height: 100 })];
      const packed = service.pack(items, 6);
      expect(packed[0].top).toBe(0);
    });
  });

  describe('reflowForColumns', () => {
    it('clamps col to newColCount', () => {
      const items = [makeItem({ id: 'a', col: 9, colSpan: 4, order: 0, height: 100 })];
      const packed = service.reflowForColumns(items, 6);
      expect(packed[0].col).toBeLessThanOrEqual(6);
    });

    it('ensures colSpan does not overflow', () => {
      const items = [makeItem({ id: 'a', col: 5, colSpan: 8, order: 0, height: 100 })];
      const packed = service.reflowForColumns(items, 6);
      expect(packed[0].col + packed[0].colSpan - 1).toBeLessThanOrEqual(6);
    });

    it('stacks all items in single column for colCount=1', () => {
      const items = [
        makeItem({ id: 'a', col: 1, colSpan: 4, order: 0, height: 100 }),
        makeItem({ id: 'b', col: 5, colSpan: 4, order: 1, height: 80 }),
      ];
      const packed = service.reflowForColumns(items, 1);
      const a = packed.find((p) => p.id === 'a')!;
      const b = packed.find((p) => p.id === 'b')!;
      expect(a.col).toBe(1);
      expect(b.col).toBe(1);
      expect(b.top).toBeGreaterThan(a.top);
    });
  });

  describe('resolveDropColumn', () => {
    it('maps x=0 to column 1', () => {
      expect(service.resolveDropColumn(0, 1200, 12)).toBe(1);
    });

    it('maps x at last quarter to correct column', () => {
      // containerWidth=1200, colCount=12, colWidth=100
      // xOffset=950 → floor(950/100)+1 = floor(9.5)+1 = 9+1 = 10
      expect(service.resolveDropColumn(950, 1200, 12)).toBe(10);
    });

    it('clamps result to 1 when x < 0', () => {
      expect(service.resolveDropColumn(-50, 1200, 12)).toBe(1);
    });

    it('clamps result to colCount when x >= containerWidth', () => {
      expect(service.resolveDropColumn(1300, 1200, 12)).toBe(12);
    });

    it('works correctly for 6 columns', () => {
      // containerWidth=600, colCount=6, colWidth=100
      // xOffset=250 → floor(250/100)+1 = 3
      expect(service.resolveDropColumn(250, 600, 6)).toBe(3);
    });
  });

  describe('autoLayout', () => {
    it('places item in shortest column when all are equal', () => {
      const heights = new Array(12).fill(0);
      const col = service.autoLayout(heights, 4, 12);
      expect(col).toBe(1);
    });

    it('places item in column range with shortest max height', () => {
      const heights = [300, 300, 300, 300, 100, 100, 100, 100, 200, 200, 200, 200];
      const col = service.autoLayout(heights, 4, 12);
      // columns 5-8 (0-indexed 4-7) have height 100 — best for colSpan=4
      expect(col).toBe(5);
    });

    it('handles colSpan=1', () => {
      const heights = [100, 50, 200, 300, 10, 100, 200, 80, 300, 100, 200, 150];
      const col = service.autoLayout(heights, 1, 12);
      // index 4 (height=10) is shortest
      expect(col).toBe(5);
    });

    it('returns 1 when colSpan equals colCount', () => {
      const heights = [100, 200, 300, 400, 50, 60];
      const col = service.autoLayout(heights, 6, 6);
      expect(col).toBe(1);
    });
  });
});
