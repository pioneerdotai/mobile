import { describe, expect, it } from '@jest/globals';

import {
    COMPOSER_CAPABILITY_POLICY_MATRIX,
    NATIVE_COMPOSER_CAPABILITY_POLICY,
    UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
    composerCapabilityMenuVisibility,
    type ComposerCapabilityPolicy,
} from '@/services/providers/cli-runtime';

const cliPolicy = (supportsSkills: boolean, supportsMcpTools: boolean) =>
    ({
        kind: 'cli',
        supportsSkills,
        supportsMcpTools,
    }) satisfies ComposerCapabilityPolicy;

describe('composer attachment capability menu', () => {
    const cases: readonly (readonly [
        ComposerCapabilityPolicy,
        Readonly<{ skills: boolean; mcp: boolean; any: boolean }>,
    ])[] = [
        [NATIVE_COMPOSER_CAPABILITY_POLICY, { skills: true, mcp: true, any: true }],
        [UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY, { skills: false, mcp: false, any: false }],
        [cliPolicy(true, false), { skills: true, mcp: false, any: true }],
        [cliPolicy(false, true), { skills: false, mcp: true, any: true }],
        [cliPolicy(true, true), { skills: true, mcp: true, any: true }],
    ];

    it.each(cases)(
        'shows only capability kinds enabled by the effective policy',
        (policy, expected) => {
            expect(composerCapabilityMenuVisibility(policy)).toEqual(expected);
        },
    );

    it('covers the canonical native/neither/skills/MCP/both matrix', () => {
        expect(COMPOSER_CAPABILITY_POLICY_MATRIX.map(({ id }) => id)).toEqual([
            'native',
            'cli_neither',
            'cli_skills_only',
            'cli_mcp_only',
            'cli_both',
        ]);
        expect(
            COMPOSER_CAPABILITY_POLICY_MATRIX.map(({ policy }) =>
                composerCapabilityMenuVisibility(policy),
            ),
        ).toEqual(cases.map(([, expected]) => expected));
    });
});
