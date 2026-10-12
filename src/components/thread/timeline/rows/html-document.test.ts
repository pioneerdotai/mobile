import { describe, it, expect } from '@jest/globals';
import { measurement, prepare, rendererIntersects, layoutMeasurement } from './html-document';

describe('HTML renderer boundary', () => {
    const valid = { kind: 'pioneer-layout', instance: 'generation', width: 360, height: 4200 };
    it('accepts natural heights above viewport and rejects stale or foreign callbacks', () => {
        expect(measurement(JSON.stringify(valid), 'about:blank', 'generation', 360)).toBe(4200);
        expect(measurement(JSON.stringify(valid), 'about:blank', 'successor', 360)).toBeNull();
        expect(measurement(JSON.stringify(valid), 'about:blank', 'generation', 768)).toBeNull();
        expect(
            measurement(JSON.stringify(valid), 'https://foreign.test', 'generation', 360),
        ).toBeNull();
        expect(measurement('{bad', 'about:blank', 'generation', 360)).toBeNull();
        expect(
            measurement(JSON.stringify({ ...valid, height: 0 }), 'about:blank', 'generation', 360),
        ).toBeNull();
    });
    it('accepts modern Android opaque origin and fallback/iOS formats only for this mount', () => {
        for (const origin of ['null', '', 'about:blank']) {
            expect(measurement(JSON.stringify(valid), origin, 'generation', 360)).toBe(4200);
            expect(measurement(JSON.stringify(valid), origin, 'stale', 360)).toBeNull();
        }
        for (const origin of ['https://foreign.test', 'file:///data/private', 'null.evil'])
            expect(measurement(JSON.stringify(valid), origin, 'generation', 360)).toBeNull();
        expect(
            measurement(
                JSON.stringify({ ...valid, kind: 'arbitrary-operation' }),
                'null',
                'generation',
                360,
            ),
        ).toBeNull();
        expect(
            measurement(JSON.stringify({ ...valid, rpc: 'arbitrary' }), 'null', 'generation', 360),
        ).toBeNull();
        expect(measurement(' '.repeat(8193), 'null', 'generation', 360)).toBeNull();
    });
    it('retains a 100000px row with only 700px visible, including a partial 1px edge', () => {
        expect(rendererIntersects(700)).toBe(true);
        expect(rendererIntersects(1)).toBe(true);
        expect(rendererIntersects(0)).toBe(false);
        expect(rendererIntersects(-1)).toBe(false);
        expect(rendererIntersects(NaN)).toBe(false);
    });
    it('admits only bounded widget geometry for Android gesture ownership', () => {
        const raw = JSON.stringify({ ...valid, scrollRects: [[10, 20, 100, 120]] });
        expect(layoutMeasurement(raw, 'null', 'generation', 360)).toEqual({
            height: 4200,
            scrollRects: [[10, 20, 100, 120]],
        });
        expect(layoutMeasurement(raw, 'null', 'stale', 360)).toBeNull();
        expect(
            layoutMeasurement(
                JSON.stringify({ ...valid, scrollRects: Array(65).fill([0, 0, 1, 1]) }),
                'null',
                'generation',
                360,
            ),
        ).toBeNull();
        expect(
            layoutMeasurement(
                JSON.stringify({ ...valid, scrollRects: [[0, 0, 'native-operation', 1]] }),
                'null',
                'generation',
                360,
            ),
        ).toBeNull();
    });
    it('places host theme and generation before the first authored script', () => {
        const html = '<script>window.authored=true</script><p>Page</p>';
        const document = prepare(html, 'generation', {
            appearance: 'dark',
            background: '#000',
            foreground: '#fff',
            muted: '#888',
            border: '#222',
            accent: '#abc',
        });
        expect(document.indexOf('--pioneer-background')).toBeLessThan(document.indexOf(html));
        expect(document.indexOf('const id="generation"')).toBeLessThan(document.indexOf(html));
        expect(document).not.toContain('Authorization');
    });
});
