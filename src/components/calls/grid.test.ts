import { expect, it } from '@jest/globals';
import { callGridDimensions } from './grid';

it.each([
    [0, 800, 540, 1, 1],
    [1, 800, 540, 1, 1],
    [2, 800, 540, 2, 1],
    [2, 390, 740, 1, 2],
    [3, 800, 540, 2, 2],
    [4, 390, 740, 2, 2],
    [5, 800, 540, 3, 2],
    [8, 800, 540, 4, 2],
    [8, 540, 800, 2, 4],
    [5, 2000, 100, 5, 1],
    [5, 16, 16, 1, 5],
])('lays out %i participants at %i×%i using %i×%i slots', (count, width, height, columns, rows) => {
    expect(callGridDimensions(count, width, height)).toEqual({ columns, rows });
});

it('uses the available content size when insets change the grid aspect ratio', () => {
    expect(callGridDimensions(2, 640, 620, { top: 16, right: 50, bottom: 16, left: 50 })).toEqual({
        columns: 1,
        rows: 2,
    });
});
