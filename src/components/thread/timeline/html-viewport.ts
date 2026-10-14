import { createContext } from 'react';

// Layout/scroll notifications belong to the existing conversation viewport.
// A response may contain several documents within one LegendList container.
export type HtmlViewport = {
    subscribe: (measure: (top: number, height: number) => void) => () => void;
};
export const HtmlViewportContext = createContext<HtmlViewport | null>(null);
