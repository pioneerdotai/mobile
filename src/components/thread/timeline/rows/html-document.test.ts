import { describe, it, expect } from '@jest/globals';
import { runInNewContext } from 'node:vm';
import { measurement, prepare, layoutMeasurement } from './html-document';

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
    it('writes theme tokens for same-mode palette updates and mode changes', () => {
        const palette = {
            appearance: 'light' as const,
            background: '#fff', foreground: '#111', muted: '#777', border: '#ddd',
            accent: '#222', 'accent-foreground': '#fafafa',
        };
        const document = prepare('<input value="retained">', 'generation', palette);
        const script = document.slice(document.indexOf('<script>') + 8, document.indexOf('</script>'));
        const tokens = new Map<string, string>();
        const style = { colorScheme: '', setProperty: (key: string, value: string) => tokens.set(key, value) };
        const listeners = new Map<string, (event: { detail: unknown }) => void>();
        const host = {
            documentElement: { style },
            addEventListener: () => {},
        };
        const window: Record<string, unknown> = {
            addEventListener: (name: string, listener: (event: { detail: unknown }) => void) => listeners.set(name, listener),
        };
        window.top = window;
        runInNewContext(script, { window, document: host, requestAnimationFrame: () => 1 });
        expect(tokens.get('--pioneer-accent')).toBe('#222');
        for (const appearance of ['light', 'dark'] as const) {
            listeners.get('pioneer-theme')!({ detail: {
                ...palette, appearance, accent: '#456', 'accent-foreground': '#fed',
            } });
            expect(style.colorScheme).toBe(appearance);
            expect(tokens.get('--pioneer-accent')).toBe('#456');
            expect(tokens.get('--pioneer-accent-foreground')).toBe('#fed');
        }
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
            'accent-foreground': '#123',
        });
        expect(document.indexOf('--pioneer-background')).toBeLessThan(document.indexOf(html));
        expect(document.indexOf('const id="generation"')).toBeLessThan(document.indexOf(html));
    });
});
