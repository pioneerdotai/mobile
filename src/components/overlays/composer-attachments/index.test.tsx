import { describe, expect, it, jest } from '@jest/globals';

import { pioneerClient, type ClientComposerCapabilityMenuVisibilityRequest } from '@/client';

import {
    NATIVE_COMPOSER_CAPABILITY_POLICY,
    UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
    composerCapabilityMenuVisibility,
    type ComposerCapabilityPolicy,
} from '@/services/providers/cli-runtime';

jest.mock('@/client', () => ({
    pioneerClient: {
        composerCapabilityMenuVisibility: jest.fn(
            (_request: ClientComposerCapabilityMenuVisibilityRequest) => ({
                skills: true,
                mcp: true,
                any: true,
            }),
        ),
    },
}));

const cliPolicy = (supportsSkills: boolean, supportsMcpTools: boolean) =>
    ({
        kind: 'cli',
        supports_skills: supportsSkills,
        supports_mcp_tools: supportsMcpTools,
    }) satisfies ComposerCapabilityPolicy;

describe('composer attachment capability menu', () => {
    const cases: readonly ComposerCapabilityPolicy[] = [
        NATIVE_COMPOSER_CAPABILITY_POLICY,
        UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
        cliPolicy(true, false),
        cliPolicy(false, true),
        cliPolicy(true, true),
    ];

    it.each(cases)('always exposes both picker entry points', (policy) => {
        expect(composerCapabilityMenuVisibility(policy)).toEqual({
            skills: true,
            mcp: true,
            any: true,
        });
        expect(pioneerClient.composerCapabilityMenuVisibility).toHaveBeenLastCalledWith({
            target: policy,
        });
    });
});
