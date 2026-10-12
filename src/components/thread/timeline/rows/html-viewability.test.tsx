import React, { useState } from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, afterEach, expect, it, jest } from '@jest/globals';
import { View } from 'react-native';
import { LegendList, useViewabilityAmount, type LegendListRef } from '@legendapp/list/react-native';
import { rendererIntersects } from './html-document';

beforeEach(() => {
    jest.useFakeTimers();
});
afterEach(() => {
    jest.useRealTimers();
});

// Installed LegendList computes amount independently of read/avatar thresholds.
// There is no browser/device runtime in this written regression.
it('keeps a long inline instance through partial intersections and releases only outside', async () => {
    const amounts: number[] = [];
    const readCursor = jest.fn();
    let list!: LegendListRef;
    function Row({ id, height }: { id: string; height: number }) {
        const [live, setLive] = useState(false);
        useViewabilityAmount((token) => {
            if (id === 'html') amounts.push(token.sizeVisible);
            setLive(rendererIntersects(token.sizeVisible));
        });
        return (
            <View testID={id} style={{ height }}>
                {live && id === 'html' ? <View testID="live-html" /> : null}
            </View>
        );
    }
    let tree!: ReactTestRenderer;
    const rows = [
        { id: 'html', height: 100000 },
        { id: 'after', height: 1000 },
    ];
    await act(async () => {
        tree = renderer.create(
            <LegendList
                ref={(value) => {
                    list = value!;
                }}
                data={rows}
                recycleItems
                estimatedListSize={{ width: 360, height: 700 }}
                estimatedItemSize={100000}
                keyExtractor={(row) => row.id}
                viewabilityConfig={{ itemVisiblePercentThreshold: 1 }}
                onViewableItemsChanged={readCursor}
                renderItem={({ item }) => <Row id={item.id} height={item.height} />}
            />,
        );
    });
    await act(async () => {
        for (const node of tree.root.findAll(
            (node) => typeof node.type === 'string' && typeof node.props.onLayout === 'function',
        )) {
            node.props.onLayout({
                nativeEvent: {
                    layout: {
                        x: 0,
                        y: 0,
                        width: 360,
                        height: typeof node.props.onScroll === 'function' ? 700 : 100000,
                    },
                },
            });
        }
        for (const row of rows) list.setItemSize(row.id, { width: 360, height: row.height });
    });
    async function scroll(y: number) {
        await act(async () => {
            const node = tree.root.findAll(
                (node) =>
                    typeof node.type === 'string' && typeof node.props.onScroll === 'function',
            )[0];
            node.props.onScroll({
                timeStamp: Date.now(),
                nativeEvent: {
                    contentOffset: { x: 0, y },
                    layoutMeasurement: { width: 360, height: 700 },
                    contentSize: { width: 360, height: 101000 },
                    contentInset: { top: 0, bottom: 0, left: 0, right: 0 },
                    velocity: { x: 0, y: 0 },
                },
            });
            jest.advanceTimersByTime(100);
        });
    }
    await scroll(50000);
    expect(amounts).toContain(700);
    expect(tree.root.findAllByProps({ testID: 'live-html' }).length).toBeGreaterThan(0);
    await scroll(99999);
    expect(amounts).toContain(1);
    expect(tree.root.findAllByProps({ testID: 'live-html' }).length).toBeGreaterThan(0);
    await scroll(100000);
    expect(tree.root.findAllByProps({ testID: 'live-html' })).toHaveLength(0);
    await scroll(50000);
    expect(tree.root.findAllByProps({ testID: 'live-html' }).length).toBeGreaterThan(0);
    await act(async () => tree.unmount());
});
