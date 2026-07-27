import { describe, expect, it } from '@jest/globals';

import { commandLineFromCommandExecution } from './command-display';

const commandItem = (command: string[], argumentsValue: Record<string, unknown> = {}) => ({
    arguments: argumentsValue,
    command,
});

describe('command display', () => {
    it('removes the Codex shell launcher without changing the script', () => {
        expect(
            commandLineFromCommandExecution(
                commandItem(['/bin/zsh -lc "rg -n \\"needle\\" $HOME/crates"']),
            ),
        ).toBe('rg -n "needle" $HOME/crates');
    });

    it('removes an argv shell launcher used by native agents', () => {
        expect(
            commandLineFromCommandExecution(commandItem(['/bin/sh', '-c', 'find "$root" -type f'])),
        ).toBe('find "$root" -type f');
    });

    it('keeps direct native argv commands intact', () => {
        expect(
            commandLineFromCommandExecution(commandItem(['find', '/tmp', '-name', '*.rs'])),
        ).toBe('find /tmp -name *.rs');
    });

    it('unwraps the arguments fallback and flattens its title to one line', () => {
        expect(
            commandLineFromCommandExecution(
                commandItem([], { cmd: "bash -lc 'cargo test\ncargo check'" }),
            ),
        ).toBe('cargo test cargo check');
    });
});
