export type Palette = {
    appearance: 'light' | 'dark';
    background: string;
    foreground: string;
    muted: string;
    border: string;
    accent: string;
    'accent-foreground': string;
};
export function prepare(html: string, instance: string, palette: Palette): string {
    // Prepend before any authored script/paint; Android's before-load hook is
    // deliberately unnecessary. The only bridge operation is DOM measurement.
    const script = `(()=>{if(window.top!==window)return;const id=${JSON.stringify(instance)};let scheduled=false,last='';const apply=p=>{const r=document.documentElement;r.style.colorScheme=p.appearance;for(const k of ['background','foreground','muted','border','accent','accent-foreground'])r.style.setProperty('--pioneer-'+k,p[k]);schedule()};const measure=()=>{scheduled=false;const b=document.body;if(!b)return;const br=b.getBoundingClientRect();let bottom=Math.max(br.bottom+window.scrollY,br.top+window.scrollY+b.scrollHeight);for(const e of b.children){const r=e.getBoundingClientRect();bottom=Math.max(bottom,r.bottom+window.scrollY)}const scrollRects=[];for(const e of b.querySelectorAll('*')){if(scrollRects.length===64)break;const style=getComputedStyle(e);if(style.visibility!=='visible'||style.pointerEvents==='none')continue;const vertical=['auto','scroll'].includes(style.overflowY)&&e.scrollHeight>e.clientHeight;const horizontal=['auto','scroll'].includes(style.overflowX)&&e.scrollWidth>e.clientWidth;if(!vertical&&!horizontal)continue;const r=e.getBoundingClientRect();if(r.width>0&&r.height>0)scrollRects.push([Math.floor(r.left),Math.floor(r.top+window.scrollY),Math.ceil(r.right),Math.ceil(r.bottom+window.scrollY)])}const payload=JSON.stringify({kind:'pioneer-layout',instance:id,width:window.innerWidth,height:Math.max(1,Math.ceil(bottom)),scrollRects});if(payload!==last){last=payload;window.ReactNativeWebView.postMessage(payload)}};const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(measure)}};window.addEventListener('pioneer-theme',e=>apply(e.detail));window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);window.addEventListener('pioneer-measure',()=>{last='';schedule()});window.addEventListener('load',schedule);document.addEventListener('DOMContentLoaded',()=>{const resize=new ResizeObserver(schedule);resize.observe(document.body);resize.observe(document.documentElement);new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,characterData:true});document.fonts.ready.then(schedule);document.fonts.addEventListener('loadingdone',schedule);schedule()});apply(${JSON.stringify(palette)});})();`;
    return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:var(--pioneer-background);color:var(--pioneer-foreground)}</style><script>${script}</script>${html}`;
}

export function measurement(
    raw: string,
    origin: string,
    instance: string,
    width: number,
): number | null {
    if (
        raw.length > 8192 ||
        !Number.isFinite(width) ||
        width <= 0 ||
        !['about:blank', '', 'null'].includes(origin)
    )
        return null;
    try {
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== 'object') return null;
        const input = value as {
            kind?: string;
            instance?: string;
            width?: number;
            height?: number;
        };
        // Android's modern listener reports an opaque origin, fallback/iOS a
        // navigation URL. Neither alone owns a callback: the retained mount,
        // exact generation and actual host width must all match.
        if (
            input.kind !== 'pioneer-layout' ||
            Object.keys(input).some(
                (key) => !['kind', 'instance', 'width', 'height', 'scrollRects'].includes(key),
            )
        )
            return null;
        if (
            input.instance !== instance ||
            typeof input.width !== 'number' ||
            !Number.isFinite(input.width) ||
            input.width <= 0 ||
            Math.abs(input.width - width) > 1 ||
            typeof input.height !== 'number' ||
            !Number.isFinite(input.height) ||
            input.height < 1 ||
            !Number.isSafeInteger(Math.ceil(input.height))
        )
            return null;
        return Math.ceil(input.height);
    } catch {
        return null;
    }
}

// LegendList's item-percent threshold belongs to read/avatar behavior. A live
// renderer instead needs any actual intersection, independent of document size.
export function rendererIntersects(sizeVisible: number): boolean {
    return Number.isFinite(sizeVisible) && sizeVisible > 0;
}

export type ScrollRect = readonly [number, number, number, number];
export function layoutMeasurement(
    raw: string,
    origin: string,
    instance: string,
    width: number,
): { height: number; scrollRects: ScrollRect[] } | null {
    const height = measurement(raw, origin, instance, width);
    if (height === null) return null;
    const value = JSON.parse(raw) as { scrollRects?: unknown };
    const rects = value.scrollRects ?? [];
    if (!Array.isArray(rects) || rects.length > 64) return null;
    const scrollRects: ScrollRect[] = [];
    for (const rect of rects) {
        if (!Array.isArray(rect) || rect.length !== 4 || rect.some((n) => !Number.isSafeInteger(n)))
            return null;
        const [left, top, right, bottom] = rect as number[];
        const clipped: ScrollRect = [
            Math.max(0, left),
            Math.max(0, top),
            Math.min(width, right),
            Math.min(height, bottom),
        ];
        if (clipped[2] > clipped[0] && clipped[3] > clipped[1]) scrollRects.push(clipped);
    }
    return { height, scrollRects };
}
