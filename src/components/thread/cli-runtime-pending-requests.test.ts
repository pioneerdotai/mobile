import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { TimelinePendingRequest } from '@/services/threads/conversation/timeline';

import type { PendingRequestAvailableAction } from '@/client';

import {
    pendingRequestActionLabel,
    pendingRequestActionVariant,
    pendingRequestQuestionInputSecurity,
    pendingRequestQuestionEditableValue,
    pendingRequestSelectedChoices,
    togglePendingRequestChoice,
} from './pending-request-actions';

describe('pending request provider actions', () => {
    it('renders the provider-scoped session approval action explicitly', () => {
        const action: PendingRequestAvailableAction = {
            kind: 'allow_for_session',
            resolution: { resolution: 'allow_for_session' },
        };

        expect(pendingRequestActionLabel(action)).toBe('Allow for session');
        expect(pendingRequestActionVariant(action)).toBe('secondary');
    });

    it('uses platform secure entry only for provider questions marked secret', () => {
        expect(pendingRequestQuestionInputSecurity({ is_secret: true })).toEqual({
            secureTextEntry: true,
            autoCapitalize: 'none',
            autoCorrect: false,
            spellCheck: false,
        });
        expect(pendingRequestQuestionInputSecurity({ is_secret: false })).toEqual({
            secureTextEntry: false,
        });
    });
});

describe('ACP multiselect editable defaults', () => {
    const question = { value_schema: { type: 'array', default: ['A'] } };
    it('uses the displayed default for selection and the first toggle', () => {
        const shown = pendingRequestQuestionEditableValue(question, undefined);
        expect(shown).toBe('["A"]');
        expect(pendingRequestSelectedChoices(shown)).toEqual(['A']);
        expect(JSON.parse(togglePendingRequestChoice(shown, 'B'))).toEqual(['A', 'B']);
        expect(JSON.parse(togglePendingRequestChoice(shown, 'A'))).toEqual([]);
        const cleared = pendingRequestQuestionEditableValue(question, '[]');
        expect(pendingRequestSelectedChoices(cleared)).toEqual([]);
        expect(JSON.parse(togglePendingRequestChoice(cleared, 'B'))).toEqual(['B']);
        expect(pendingRequestQuestionEditableValue(question, '')).toBe('');
    });
});

// Exercise the existing card's draft ownership, with presentation supplied by Core.
const mockReact = React;
let mockRequestGeneration = 1;
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: () => new Proxy({}, { get: () => ({}) }) },
}));
jest.mock('@/client/approval-actions', () => ({
    useApprovalAction: () => ({
        request_generation: mockRequestGeneration,
        state: { kind: 'idle' },
    }),
    dispatchApprovalAction: jest.fn(),
}));
jest.mock('@/client', () => ({
    pioneerClient: {
        pendingRequestPresentation: () => ({
            presentation: {
                title: 'Choose',
                origin_label: 'ACP',
                details: [],
                actions: [{ kind: 'answer' }],
                user_input_questions: [
                    {
                        id: 'q',
                        question: 'Choose',
                        is_secret: false,
                        options: [{ label: 'A' }, { label: 'B' }],
                        value_schema: { type: 'array', default: ['A'] },
                    },
                ],
            },
        }),
    },
}));
jest.mock('@/components/primitives/box', () => ({
    Box: (props: Record<string, unknown>) => mockReact.createElement('Box', props),
}));
jest.mock('@/components/primitives/hstack', () => ({
    HStack: (props: Record<string, unknown>) => mockReact.createElement('HStack', props),
}));
jest.mock('@/components/primitives/vstack', () => ({
    VStack: (props: Record<string, unknown>) => mockReact.createElement('VStack', props),
}));
jest.mock('@/components/primitives/input', () => ({
    Input: (props: Record<string, unknown>) => mockReact.createElement('Input', props),
}));
jest.mock('@/components/primitives/pressable', () => ({
    Pressable: (props: Record<string, unknown>) => mockReact.createElement('Pressable', props),
}));
jest.mock('@/components/primitives/text', () => ({
    Text: (props: Record<string, unknown>) => mockReact.createElement('Text', props),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PendingRequestCard } =
    require('./cli-runtime-pending-requests') as typeof import('./cli-runtime-pending-requests');

describe('pending request draft identity', () => {
    it('remounts the draft for a different request or generation before rendering', async () => {
        mockRequestGeneration = 1;
        const card = (id: string) =>
            React.createElement(PendingRequestCard, {
                threadId: 'thread',
                canRespond: true,
                entry: { request: { request_id: id } } as TimelinePendingRequest,
            });
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(card('first'));
        });
        const input = () => tree.root.findByType('Input' as never);
        expect(input().props.value).toBe('["A"]');
        await act(async () => {
            input().props.onChangeText('["B"]');
        });
        expect(input().props.value).toBe('["B"]');
        await act(async () => {
            tree.update(card('second'));
        });
        expect(input().props.value).toBe('["A"]');
        await act(async () => {
            input().props.onChangeText('[]');
        });
        expect(input().props.value).toBe('[]');
        mockRequestGeneration = 2;
        await act(async () => {
            tree.update(card('second'));
        });
        expect(input().props.value).toBe('["A"]');
        await act(async () => {
            tree.unmount();
        });
    });
});
