import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { DeviceActivationQr } from './device-activation-qr';

const mockReact = React;

jest.mock('react-native-svg', () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => mockReact.createElement('Svg', props),
    Rect: (props: Record<string, unknown>) => mockReact.createElement('Rect', props),
}));

describe('DeviceActivationQr', () => {
    it('rejects malformed matrices', async () => {
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(
                <DeviceActivationQr modules={[true]} width={2} accessibilityLabel="QR" />,
            );
        });
        expect(tree!.toJSON()).toBeNull();
    });

    it('renders the exact shared matrix without embedding the activation URI', async () => {
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(
                <DeviceActivationQr
                    modules={[true, false, false, true]}
                    width={2}
                    accessibilityLabel="Device activation QR"
                />,
            );
        });
        const snapshot = JSON.stringify(tree!.toJSON());

        expect(snapshot).toContain('Device activation QR');
        expect(snapshot).not.toContain('pioneer://activate');
        expect(snapshot).not.toContain('device_');
    });
});
