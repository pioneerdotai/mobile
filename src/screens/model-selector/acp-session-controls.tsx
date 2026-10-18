import { nanoid } from 'nanoid';
import { useEffect, useRef, useState } from 'react';
import { Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import type { AcpSessionParams } from '@/client/generated/acp_session_params';
import type { SessionConfigSelectOption } from '@/client/generated/acp_session_response';
import type { AcpSessionResponse } from '@/client/generated/acp_session_response';
import { pioneerClient } from '@/client';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Input } from '@/components/primitives/input';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';

type Snapshot = AcpSessionResponse['snapshot'];
type Operation = AcpSessionParams['operation'];

// This view renders the shared session descriptors and dispatches typed Core
// operations. It owns only editable fields and transient auth terminal output.
export const AcpSessionControls = ({ snapshot }: { snapshot: Snapshot }) => {
    const { t } = useTranslation('threads');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [terminalId, setTerminalId] = useState<string | null>(null);
    const [terminalOutput, setTerminalOutput] = useState('');
    const [terminalState, setTerminalState] = useState<{
        completed: boolean;
        exitCode?: number;
        error?: string;
        truncated: boolean;
    } | null>(null);
    const [terminalInput, setTerminalInput] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [roots, setRoots] = useState(snapshot.additional_directories.join('\n'));
    const [sessions, setSessions] = useState<{ sessionId: string; title?: string; cwd?: string }[]>(
        [],
    );
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const terminalOwner = useRef<{
        params: Pick<AcpSessionParams, 'workspace_id' | 'thread_id' | 'runtime_id'>;
        id: string;
        expectedGeneration: number;
    } | null>(null);
    const closeTerminal = async (owner: NonNullable<typeof terminalOwner.current>) => {
        return pioneerClient
            .providerCommand({
                kind: 'release_acp_auth',
                params: {
                    ...owner.params,
                    operation: {
                        type: 'terminal_auth_close',
                        terminal_id: owner.id,
                        expected_generation: owner.expectedGeneration,
                    },
                },
            })
            .then(
                () => true,
                () => false,
            );
    };
    const identity = `${snapshot.workspace_id}:${snapshot.thread_id}:${snapshot.runtime_id}:${snapshot.generation}`;
    const current = useRef(identity);
    current.current = identity;
    useEffect(() => {
        current.current = identity;
        setBusy(false);
        setSessions([]);
        setNextCursor(null);
        setRoots(snapshot.additional_directories.join('\n'));
        setError(null);
        setTerminalId(null);
        setTerminalInput('');
        setTerminalOutput('');
        setTerminalState(null);
        return () => {
            current.current = '';
            const owner = terminalOwner.current;
            terminalOwner.current = null;
            if (owner) closeTerminal(owner);
        };
    }, [identity]);

    const run = async (operation: Operation) => {
        if (busy || (operation.type === 'terminal_auth_start' && terminalOwner.current)) return;
        setBusy(true);
        setError(null);
        if (operation.type === 'terminal_auth_input') setTerminalInput('');
        const generation = identity;
        if (operation.type === 'terminal_auth_start') {
            setTerminalId(operation.terminal_id);
            terminalOwner.current = {
                params: {
                    workspace_id: snapshot.workspace_id,
                    thread_id: snapshot.thread_id,
                    runtime_id: snapshot.runtime_id,
                },
                id: operation.terminal_id,
                expectedGeneration: operation.expected_generation,
            };
        }
        try {
            const response = await pioneerClient.acpSessionControl({
                workspace_id: snapshot.workspace_id,
                thread_id: snapshot.thread_id,
                runtime_id: snapshot.runtime_id,
                operation,
            });
            if (current.current !== generation) {
                const value = response.result;
                if (
                    operation.type === 'terminal_auth_start' &&
                    value &&
                    typeof value === 'object' &&
                    !Array.isArray(value) &&
                    'terminal_id' in value &&
                    typeof value.terminal_id === 'string'
                )
                    closeTerminal({
                        params: {
                            workspace_id: snapshot.workspace_id,
                            thread_id: snapshot.thread_id,
                            runtime_id: snapshot.runtime_id,
                        },
                        id: value.terminal_id,
                        expectedGeneration: snapshot.generation,
                    });
                return;
            }
            const value = response.result;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if ('terminal_id' in value && typeof value.terminal_id === 'string') {
                    setTerminalId(value.terminal_id);
                    terminalOwner.current = {
                        params: {
                            workspace_id: snapshot.workspace_id,
                            thread_id: snapshot.thread_id,
                            runtime_id: snapshot.runtime_id,
                        },
                        id: value.terminal_id,
                        expectedGeneration: snapshot.generation,
                    };
                }
                if (
                    operation.type === 'list' &&
                    'sessions' in value &&
                    Array.isArray(value.sessions)
                ) {
                    setSessions(
                        value.sessions.flatMap((session) =>
                            session &&
                            typeof session === 'object' &&
                            !Array.isArray(session) &&
                            'sessionId' in session &&
                            typeof session.sessionId === 'string'
                                ? [
                                      {
                                          sessionId: session.sessionId,
                                          title:
                                              typeof session.title === 'string'
                                                  ? session.title
                                                  : undefined,
                                          cwd:
                                              typeof session.cwd === 'string'
                                                  ? session.cwd
                                                  : undefined,
                                      },
                                  ]
                                : [],
                        ),
                    );
                    setNextCursor(
                        'nextCursor' in value && typeof value.nextCursor === 'string'
                            ? value.nextCursor
                            : null,
                    );
                }
                if (
                    'snapshot' in value &&
                    value.snapshot &&
                    typeof value.snapshot === 'object' &&
                    !Array.isArray(value.snapshot)
                ) {
                    const output = value.snapshot;
                    setTerminalState({
                        completed: 'completed' in output && output.completed === true,
                        exitCode:
                            'exit_code' in output && typeof output.exit_code === 'number'
                                ? output.exit_code
                                : undefined,
                        error:
                            'error' in output && typeof output.error === 'string'
                                ? output.error
                                : undefined,
                        truncated: 'truncated' in output && output.truncated === true,
                    });
                    if ('output' in output && typeof output.output === 'string')
                        setTerminalOutput(output.output);
                }
                if (operation.type === 'terminal_auth_input' && 'accepted_bytes' in value) {
                    // Partial input is shown explicitly and never resubmitted.
                    setTerminalInput('');
                    if (value.accepted_bytes !== new TextEncoder().encode(operation.data).length)
                        setError(t('acpPartialInput', { count: value.accepted_bytes }));
                }
            }
            if (operation.type === 'terminal_auth_close') {
                terminalOwner.current = null;
                setTerminalId(null);
                setTerminalInput('');
                setTerminalOutput('');
                setTerminalState(null);
            }
        } catch (error) {
            const owner = terminalOwner.current;
            if (operation.type === 'terminal_auth_start' && owner?.id === operation.terminal_id) {
                const transferred = await closeTerminal(owner);
                if (transferred && terminalOwner.current === owner) {
                    terminalOwner.current = null;
                    if (current.current === generation) setTerminalId(null);
                }
            }
            if (current.current === generation)
                setError(error instanceof Error ? error.message : String(error));
        } finally {
            if (current.current === generation) setBusy(false);
        }
    };

    const action = (key: string, label: string, operation: Operation, selected = false) => (
        <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{
                disabled:
                    busy ||
                    (operation.type === 'terminal_auth_input' &&
                        terminalState?.completed === true) ||
                    (operation.type === 'terminal_auth_start' && terminalOwner.current != null),
                selected,
            }}
            accessibilityLabel={label}
            disabled={
                busy ||
                (operation.type === 'terminal_auth_input' && terminalState?.completed === true) ||
                (operation.type === 'terminal_auth_start' && terminalOwner.current != null)
            }
            onPress={() => void run(operation)}
            style={[styles.action, selected ? styles.selected : null]}
        >
            <Text>{label}</Text>
        </Pressable>
    );

    return (
        <VStack style={styles.section}>
            {snapshot.config_options.map((option) => (
                <VStack key={option.id} style={styles.group}>
                    <Text style={styles.label}>{option.name}</Text>
                    {option.description ? <Text>{option.description}</Text> : null}
                    {option.type === 'boolean' ? (
                        <Switch
                            accessibilityLabel={option.name}
                            value={option.currentValue}
                            disabled={busy || !snapshot.session_id || !snapshot.version}
                            onValueChange={(value) => {
                                if (snapshot.session_id && snapshot.version)
                                    void run({
                                        type: 'set_option',
                                        session_id: snapshot.session_id,
                                        expected: snapshot.version,
                                        config_id: option.id,
                                        value: { type: 'boolean', value },
                                    });
                            }}
                        />
                    ) : option.type === 'select' ? (
                        <VStack style={styles.group}>
                            {option.options.map((entry) => {
                                const grouped = Array.isArray(entry.options);
                                const choices: SessionConfigSelectOption[] = grouped
                                    ? (entry.options as SessionConfigSelectOption[])
                                    : [entry as SessionConfigSelectOption];
                                return (
                                    <VStack
                                        key={grouped ? String(entry.group) : String(entry.value)}
                                        style={styles.group}
                                    >
                                        {grouped ? (
                                            <Text style={styles.label}>{entry.name}</Text>
                                        ) : null}
                                        <HStack style={styles.actions}>
                                            {choices.map((choice) =>
                                                snapshot.session_id && snapshot.version
                                                    ? action(
                                                          `${option.id}:${choice.value}`,
                                                          choice.name,
                                                          {
                                                              type: 'set_option',
                                                              session_id: snapshot.session_id,
                                                              expected: snapshot.version,
                                                              config_id: option.id,
                                                              value: { value: choice.value },
                                                          },
                                                          option.currentValue === choice.value,
                                                      )
                                                    : null,
                                            )}
                                        </HStack>
                                    </VStack>
                                );
                            })}
                        </VStack>
                    ) : null}
                </VStack>
            ))}
            {!snapshot.has_config_options &&
            snapshot.modes &&
            snapshot.session_id &&
            snapshot.version ? (
                <HStack style={styles.actions}>
                    {snapshot.modes.availableModes.map((mode) =>
                        action(
                            `mode:${mode.id}`,
                            mode.name,
                            {
                                type: 'set_mode',
                                session_id: snapshot.session_id!,
                                expected: snapshot.version!,
                                mode_id: mode.id,
                            },
                            snapshot.modes!.currentModeId === mode.id,
                        ),
                    )}
                </HStack>
            ) : null}
            {snapshot.commands.map((command) => (
                <VStack key={command.name}>
                    <Text>/{command.name}</Text>
                    <Text>{command.description}</Text>
                </VStack>
            ))}
            {snapshot.notice ? (
                <VStack>
                    <Text style={styles.label}>{snapshot.notice.title}</Text>
                    <Text>{snapshot.notice.description}</Text>
                </VStack>
            ) : null}
            {snapshot.completed_elicitations.map((id) => (
                <Text key={id}>{t('acpUrlCompleted')}</Text>
            ))}
            <HStack style={styles.actions}>
                {snapshot.auth_methods.map((method) =>
                    action(
                        `auth:${method.id}`,
                        method.name,
                        method.kind === 'terminal'
                            ? {
                                  type: 'terminal_auth_start',
                                  expected_generation: snapshot.generation,
                                  terminal_id: nanoid(32),
                                  method_id: method.id,
                                  columns: 90,
                                  rows: 24,
                              }
                            : { type: 'authenticate', method_id: method.id },
                    ),
                )}
                {!snapshot.session_id
                    ? action('prepare', t('acpPrepare'), {
                          type: 'prepare',
                          additional_directories: roots
                              .split('\n')
                              .filter((path) => path.length > 0),
                      })
                    : null}
                {snapshot.capabilities.auth?.logout
                    ? action('logout', t('acpLogout'), { type: 'logout' })
                    : null}
            </HStack>
            {!snapshot.session_id ? (
                <Input
                    value={roots}
                    onChangeText={setRoots}
                    multiline
                    editable={!busy}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={t('acpAdditionalDirectories')}
                    accessibilityLabel={t('acpAdditionalDirectories')}
                />
            ) : null}
            {terminalState?.truncated ? <Text>{t('acpAuthTruncated')}</Text> : null}
            {terminalState?.completed ? (
                <Text>{t('acpAuthFinished', { code: terminalState.exitCode ?? '—' })}</Text>
            ) : null}
            {terminalState?.error ? <Text style={styles.error}>{terminalState.error}</Text> : null}
            {terminalId ? (
                <VStack style={styles.group}>
                    <Text selectable style={styles.output}>
                        {terminalOutput}
                    </Text>
                    <Input
                        value={terminalInput}
                        onChangeText={setTerminalInput}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!busy && !terminalState?.completed}
                        accessibilityLabel={t('acpTerminalInput')}
                    />
                    <HStack style={styles.actions}>
                        {action('input', t('acpSendInput'), {
                            type: 'terminal_auth_input',
                            terminal_id: terminalId,
                            data: `${terminalInput}\r`,
                        })}
                        {action('output', t('acpRefreshOutput'), {
                            type: 'terminal_auth_output',
                            terminal_id: terminalId,
                        })}
                        {action('close-terminal', t('acpReconnect'), {
                            type: 'terminal_auth_close',
                            expected_generation: snapshot.generation,
                            terminal_id: terminalId,
                        })}
                    </HStack>
                </VStack>
            ) : null}
            {snapshot.capabilities.sessionCapabilities?.list
                ? action('list', t('acpListSessions'), { type: 'list', cursor: null, cwd: null })
                : null}
            {sessions.map((session) => (
                <Pressable
                    key={session.sessionId}
                    accessibilityRole="button"
                    onPress={() => setSessionId(session.sessionId)}
                    style={styles.action}
                >
                    <Text>{session.title ?? session.sessionId}</Text>
                    {session.cwd ? <Text>{session.cwd}</Text> : null}
                </Pressable>
            ))}
            {nextCursor
                ? action('next-page', t('acpMoreSessions'), {
                      type: 'list',
                      cursor: nextCursor,
                      cwd: null,
                  })
                : null}
            <Input
                value={sessionId}
                onChangeText={setSessionId}
                editable={!busy}
                autoCapitalize="none"
                accessibilityLabel={t('acpSessionId')}
                placeholder={t('acpSessionId')}
            />
            {sessionId ? (
                <HStack style={styles.actions}>
                    {snapshot.capabilities.loadSession
                        ? action('load', t('acpLoad'), { type: 'load', session_id: sessionId })
                        : null}
                    {snapshot.capabilities.sessionCapabilities?.resume
                        ? action('resume', t('acpResume'), {
                              type: 'resume',
                              session_id: sessionId,
                          })
                        : null}
                    {snapshot.capabilities.sessionCapabilities?.delete
                        ? action('delete', t('acpDelete'), {
                              type: 'delete',
                              session_id: sessionId,
                          })
                        : null}
                </HStack>
            ) : null}

            {snapshot.session_id && snapshot.capabilities.sessionCapabilities?.close ? (
                <HStack style={styles.actions}>
                    {action('close', t('acpCloseSession'), {
                        type: 'close',
                        session_id: snapshot.session_id,
                    })}
                </HStack>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
        </VStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    section: { gap: theme.space(4), padding: theme.space(3) },
    group: { gap: theme.space(2) },
    label: { fontWeight: '600' },
    actions: { flexWrap: 'wrap', gap: theme.space(2) },
    action: {
        padding: theme.space(2),
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
    },
    selected: { borderColor: theme.colors.typography, backgroundColor: theme.colors.surfaceMuted },
    output: { fontFamily: 'Menlo', fontSize: theme.fontSize.sm.fontSize },
    error: { color: theme.colors.dangerText },
}));
