import { parse as parseShellCommand } from 'shell-quote';

import type { TurnItem } from '@/client/generated/client_active_thread_snapshot';

type CommandExecutionDisplayItem = Pick<
    Extract<TurnItem, { type: 'commandExecution' }>,
    'arguments' | 'command'
>;

export const commandLineFromCommandExecution = (item: CommandExecutionDisplayItem): string => {
    if (item.command?.length) {
        return displayCommandParts(item.command);
    }

    const args = asRecord(item.arguments);
    const cmd = readString(args, 'cmd');
    if (cmd?.trim()) {
        return displayCommandParts([cmd]);
    }

    const command = args.command;
    if (Array.isArray(command)) {
        return displayCommandParts(
            command.filter((part): part is string => typeof part === 'string'),
        );
    }

    return '';
};

const displayCommandParts = (parts: readonly string[]): string => {
    const nonEmptyParts = parts.filter((part) => part.trim().length > 0);
    if (nonEmptyParts.length === 0) {
        return '';
    }

    let display = shellLauncherScript(nonEmptyParts);
    if (!display && nonEmptyParts.length === 1) {
        try {
            const parsed = parseShellCommand(nonEmptyParts[0]!, (name) => `$${name}`);
            if (parsed.every((part): part is string => typeof part === 'string')) {
                display = shellLauncherScript(parsed);
            }
        } catch {
            // Keep malformed launcher strings visible instead of hiding the command.
        }
    }

    return (display ?? nonEmptyParts.join(' ')).replace(/[\r\n]+/g, ' ').trim();
};

const shellLauncherScript = (parts: readonly string[]): string | null => {
    if (parts.length < 3 || (parts[1] !== '-c' && parts[1] !== '-lc')) {
        return null;
    }

    const executable = parts[0]!.split('/').at(-1);
    return executable === 'sh' || executable === 'bash' || executable === 'zsh' ? parts[2]! : null;
};

const asRecord = (value: unknown): Record<string, unknown> => {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
};

const readString = (value: Record<string, unknown>, key: string): string | null => {
    const candidate = value[key];
    return typeof candidate === 'string' ? candidate : null;
};
