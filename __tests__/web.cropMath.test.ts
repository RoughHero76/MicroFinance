import {describe, expect, it} from '@jest/globals';
import {
  A4_PORTRAIT,
  fitSize,
  initialBox,
  moveBox,
  outputFor,
  resizeBox,
  type Box,
} from '@/lib/cropMath';

const display = {w: 400, h: 300};

describe('initialBox', () => {
  it('covers 90% and is centred when free', () => {
    const b = initialBox(display, null);
    expect(b.w).toBeCloseTo(360);
    expect(b.h).toBeCloseTo(270);
    expect(b.x).toBeCloseTo(20);
    expect(b.y).toBeCloseTo(15);
  });

  it('is square for 1:1, limited by the short side', () => {
    const b = initialBox(display, 1);
    expect(b.w).toBeCloseTo(b.h);
    expect(b.h).toBeCloseTo(270);
    expect(b.x + b.w / 2).toBeCloseTo(200);
  });

  it('keeps the A4 shape', () => {
    const b = initialBox(display, A4_PORTRAIT);
    expect(b.w / b.h).toBeCloseTo(A4_PORTRAIT);
    expect(b.h).toBeLessThanOrEqual(270 + 0.001);
  });
});

describe('moveBox', () => {
  const box: Box = {x: 50, y: 50, w: 100, h: 100};
  it('moves', () => expect(moveBox(box, 10, -5, display)).toMatchObject({x: 60, y: 45}));
  it('stays inside every edge', () => {
    expect(moveBox(box, -999, -999, display)).toMatchObject({x: 0, y: 0});
    expect(moveBox(box, 999, 999, display)).toMatchObject({x: 300, y: 200});
  });
});

describe('resizeBox, free', () => {
  const box: Box = {x: 100, y: 100, w: 100, h: 100};
  it('moves one edge at a time', () => {
    expect(resizeBox(box, 'e', 30, 99, display, null)).toEqual({x: 100, y: 100, w: 130, h: 100});
    expect(resizeBox(box, 'w', -30, 99, display, null)).toEqual({x: 70, y: 100, w: 130, h: 100});
    expect(resizeBox(box, 'n', 99, -20, display, null)).toEqual({x: 100, y: 80, w: 100, h: 120});
  });
  it('never gets smaller than the minimum or leaves the picture', () => {
    expect(resizeBox(box, 'e', -500, 0, display, null).w).toBe(40);
    expect(resizeBox(box, 'se', 500, 500, display, null)).toMatchObject({w: 300, h: 200});
  });
});

describe('resizeBox, fixed shape', () => {
  const box: Box = {x: 100, y: 100, w: 100, h: 100};
  it('keeps 1:1 and the opposite corner in place', () => {
    const b = resizeBox(box, 'se', 40, 0, display, 1);
    expect(b).toMatchObject({x: 100, y: 100, w: 140, h: 140});
    const c = resizeBox(box, 'nw', -40, 0, display, 1);
    expect(c).toMatchObject({x: 60, y: 60, w: 140, h: 140});
  });
  it('stops at the picture edge', () => {
    const b = resizeBox(box, 'se', 999, 0, display, 1);
    expect(b.x + b.w).toBeLessThanOrEqual(400);
    expect(b.y + b.h).toBeLessThanOrEqual(300);
    expect(b.w).toBeCloseTo(b.h);
  });
  it('holds the A4 shape', () => {
    const b = resizeBox({x: 100, y: 50, w: 106, h: 150}, 'se', 20, 0, display, A4_PORTRAIT);
    expect(b.w / b.h).toBeCloseTo(A4_PORTRAIT);
  });
});

describe('outputFor', () => {
  it('saves profile photos as squares of at most 512px', () => {
    const o = outputFor({x: 0, y: 0, w: 200, h: 200}, display, {w: 4000, h: 3000}, 'profile');
    expect(o).toMatchObject({sx: 0, sy: 0, sw: 2000, sh: 2000, w: 512, h: 512});
  });
  it('does not enlarge a small profile crop', () => {
    const o = outputFor({x: 0, y: 0, w: 100, h: 100}, display, {w: 800, h: 600}, 'profile');
    expect(o.w).toBe(200);
  });
  it('shrinks documents to a long edge of 1600px, keeping the shape', () => {
    const o = outputFor({x: 20, y: 15, w: 360, h: 270}, display, {w: 4000, h: 3000}, 'document');
    expect(Math.max(o.w, o.h)).toBe(1600);
    expect(o.w / o.h).toBeCloseTo(4 / 3, 2);
  });
  it('leaves a small document alone', () => {
    const o = outputFor({x: 0, y: 0, w: 400, h: 300}, display, {w: 800, h: 600}, 'document');
    expect(o).toMatchObject({w: 800, h: 600});
  });
});

describe('fitSize', () => {
  it('fits inside the limits without enlarging', () => {
    expect(fitSize({w: 4000, h: 3000}, 560, 380)).toEqual({w: 507, h: 380});
    expect(fitSize({w: 200, h: 100}, 560, 380)).toEqual({w: 200, h: 100});
  });
});
