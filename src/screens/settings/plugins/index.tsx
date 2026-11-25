import { useEffect, useRef, useState } from 'react';
import { Alert, Switch, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ScrollView } from '@/components/primitives/scrollview';
import { Pressable } from '@/components/primitives/pressable';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAdministrationCapabilities } from '@/hooks/use-administration-capabilities';
import {
    dispatchPlugin,
    pluginOriginConnection,
    usePlugins,
    usePluginUpload,
    usePluginChildAction,
} from '@/client/plugins';
import { pioneerClient } from '@/client';
import type { PluginIntent, McpIntent } from '@/client/generated/client_intent';
import type { SkillUploadTarget } from '@/client/generated/plugin_shell_request';
import type {
    PluginPublication,
    PluginComponentItem,
    SkillListItem,
    McpListItem,
} from '@/client/generated/plugin_publication';
import { pickPluginArchive } from '@/services/plugins/archive';

const styles = StyleSheet.create((theme) => ({
    root: { flex: 1 },
    content: {
        ...theme.screenContentPadding('root'),
        paddingHorizontal: theme.space(4),
        gap: theme.space(4),
    },
    card: {
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius.xl,
        padding: theme.space(4),
        gap: theme.space(3),
    },
    heading: { ...theme.fontSize.lg, fontWeight: '600' },
    secondary: { ...theme.fontSize.sm, color: theme.colors.textMuted },
    action: { paddingVertical: theme.space(3), minHeight: theme.space(11) },
    actionText: { color: theme.colors.typography },
    disabled: { opacity: 0.4 },
    error: { color: theme.colors.dangerText },
    row: { flex: 1 },
    switchRow: { alignItems: 'center', gap: theme.space(3) },
    field: {
        padding: theme.space(3),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        color: theme.colors.typography,
        minHeight: theme.space(24),
    },
}));
const Action = ({
    label,
    onPress,
    disabled = false,
    danger = false,
}: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    danger?: boolean;
}) => (
    <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[styles.action, disabled ? styles.disabled : null]}
    >
        <Text style={[styles.actionText, danger ? styles.error : null]}>{label}</Text>
    </Pressable>
);
const Status = ({ value }: { value: string }) => {
    const { t } = useTranslation('settings');
    return (
        <Text style={styles.secondary}>
            {t(`plugins.status.${value}`, { defaultValue: value.replaceAll('_', ' ') })}
        </Text>
    );
};
const SwitchRow = ({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: boolean;
    disabled: boolean;
    onChange: (value: boolean) => void;
}) => (
    <HStack style={styles.switchRow}>
        <Text style={styles.row}>{label}</Text>
        <Switch
            accessibilityLabel={label}
            disabled={disabled}
            value={value}
            onValueChange={onChange}
        />
    </HStack>
);

export const PluginsSettingsScreen = () => {
    const { t } = useTranslation('settings');
    const workspace = useWorkspaceStore((s) => s.activeWorkspaceId);
    const capabilities = useAdministrationCapabilities();
    const [selected, setSelected] = useState<string | null>(null);
    const p = usePlugins(workspace, selected);
    const [operation, setOperation] = useState<number | null>(null);
    const upload = usePluginUpload(workspace, operation);
    const [picking, setPicking] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const archive = useRef<{ uri: string; remove: () => void } | null>(null);
    const uploadOwner = useRef<{ workspace: string; operation: number } | null>(null);
    const pickerOwner = useRef(0);
    const [purge, setPurge] = useState(false);
    const connection = pluginOriginConnection();
    const canManage = p?.managing === true && capabilities.data?.can_manage_capabilities === true;
    const busy =
        p?.busy === true ||
        picking ||
        Boolean(upload && !['succeeded', 'failed', 'cancelled'].includes(upload.state));
    const blocked = busy || !canManage || Boolean(p?.error);
    const run = (intent: PluginIntent) => {
        if (!workspace || !p) return;
        const result = dispatchPlugin(workspace, connection, intent);
        if (result.outcome === 'rejected') setFileError(t('plugins.staleAction'));
    };
    const refresh = () => {
        if (workspace)
            dispatchPlugin(workspace, pluginOriginConnection(), {
                kind: 'observe',
                plugin_id: selected,
            });
    };
    useEffect(() => {
        setSelected(null);
        setOperation(null);
        setPurge(false);
        setFileError(null);
    }, [workspace, connection]);
    useEffect(() => {
        if (upload && upload.state !== 'preparing') {
            archive.current?.remove();
            archive.current = null;
        }
    }, [upload?.state]);
    useEffect(() => {
        setPicking(false);
        return () => {
            pickerOwner.current++;
            const owned = uploadOwner.current;
            uploadOwner.current = null;
            if (owned)
                pioneerClient.pluginShell({
                    kind: 'cancel_upload',
                    workspace_id: owned.workspace,
                    operation_id: owned.operation,
                });
            archive.current?.remove();
            archive.current = null;
        };
    }, [workspace, connection, selected]);
    const chooseArchive = async (update: boolean, skillId?: string) => {
        if (!workspace || !p || blocked) return;
        const owner = ++pickerOwner.current;
        const origin = pluginOriginConnection();
        const parent = p.details;
        if (origin === null || (update && !parent)) return;
        setPicking(true);
        setFileError(null);
        try {
            const source = await pickPluginArchive(Boolean(skillId));
            if (!source) return;
            if (
                pickerOwner.current !== owner ||
                origin !== pluginOriginConnection() ||
                workspace !== useWorkspaceStore.getState().activeWorkspaceId
            ) {
                source.remove();
                return;
            }
            const target: SkillUploadTarget = skillId
                ? { kind: 'update', skill_id: skillId }
                : parent && update
                  ? {
                        kind: 'plugin_update_preview',
                        plugin_id: parent.id,
                        expected_revision: parent.revision,
                    }
                  : { kind: 'plugin_preview' };
            let result;
            try {
                result = pioneerClient.pluginShell({
                    kind: 'start_archive',
                    workspace_id: workspace,
                    expected_connection: origin,
                    target,
                    file_uri: source.uri,
                });
            } catch (error) {
                source.remove();
                throw error;
            }
            archive.current = source;
            if (result.operation_id != null)
                uploadOwner.current = { workspace, operation: result.operation_id };
            setOperation(result.operation_id ?? null);
        } catch {
            if (owner === pickerOwner.current) setFileError(t('plugins.archiveFailed'));
        } finally {
            if (owner === pickerOwner.current) setPicking(false);
        }
    };
    const parent = p?.details;
    const preview = upload?.plugin_preview?.package;
    const updatePreview = upload?.plugin_update_preview?.preview;
    const staleUpdate =
        parent &&
        upload?.target.kind === 'plugin_update_preview' &&
        (parent.id !== upload.target.plugin_id ||
            parent.revision !== upload.target.expected_revision);
    const previewPackage = preview ?? updatePreview?.package;
    const cancelUpload = () => {
        uploadOwner.current = null;
        if (workspace && operation !== null)
            pioneerClient.pluginShell({
                kind: 'cancel_upload',
                workspace_id: workspace,
                operation_id: operation,
            });
        archive.current?.remove();
        archive.current = null;
        setOperation(null);
    };
    const confirm = (title: string, message: string, label: string, action: () => void) => {
        const origin = connection;
        const promptOwner = pickerOwner.current;
        Alert.alert(title, message, [
            { text: t('plugins.cancel'), style: 'cancel' },
            {
                text: label,
                style: 'destructive',
                onPress: () => {
                    if (
                        promptOwner === pickerOwner.current &&
                        origin === pluginOriginConnection() &&
                        workspace === useWorkspaceStore.getState().activeWorkspaceId
                    )
                        action();
                },
            },
        ]);
    };
    return (
        <ScrollView style={styles.root} contentContainerStyle={styles.content}>
            <Text style={styles.heading}>{t('plugins.title')}</Text>
            {!workspace ? <Text>{t('plugins.noWorkspace')}</Text> : null}
            {workspace && connection === null ? <Text>{t('plugins.offline')}</Text> : null}
            {!p && workspace ? <Text>{t('plugins.loading')}</Text> : null}
            {p?.busy || picking ? (
                <Text>{t(picking ? 'plugins.choosingArchive' : 'plugins.loading')}</Text>
            ) : null}
            {p?.error ? (
                <Text style={styles.error}>
                    {t('plugins.loadFailed')} {p.error}
                </Text>
            ) : null}
            {fileError ? <Text style={styles.error}>{fileError}</Text> : null}
            {workspace ? (
                <Action label={t('plugins.refresh')} disabled={busy} onPress={refresh} />
            ) : null}
            {p && !canManage ? <Text style={styles.secondary}>{t('plugins.readOnly')}</Text> : null}
            {selected ? (
                <Action
                    label={t('plugins.back')}
                    disabled={busy}
                    onPress={() => {
                        setSelected(null);
                        setPurge(false);
                        cancelUpload();
                    }}
                />
            ) : (
                <Action
                    label={t('plugins.addArchive')}
                    disabled={blocked}
                    onPress={() => {
                        void chooseArchive(false);
                    }}
                />
            )}
            {upload ? (
                <VStack style={styles.card}>
                    <Status value={upload.state} />
                    <Text>
                        {t('plugins.progress', {
                            sent: upload.sent_bytes,
                            total: upload.total_bytes,
                        })}
                    </Text>
                    {upload.state === 'failed' ? (
                        <Text style={styles.error}>{t('plugins.archiveFailed')}</Text>
                    ) : null}
                    <Action label={t('plugins.cancelUpload')} onPress={cancelUpload} />
                </VStack>
            ) : null}
            {previewPackage ? (
                <VStack style={styles.card}>
                    <Text style={styles.heading}>
                        {t('plugins.preview', { name: previewPackage.name })}
                    </Text>
                    <Text>{previewPackage.version ?? ''}</Text>
                    {previewPackage.components.map((c) => (
                        <Text key={`${c.kind}:${c.member_key}`}>
                            {c.kind} · {c.member_key} · {c.status}
                        </Text>
                    ))}
                    {previewPackage.diagnostics.map((d, i) => (
                        <Text key={i} style={styles.secondary}>
                            {d.code} · {d.path} · {d.message}
                        </Text>
                    ))}
                    {updatePreview ? (
                        <>
                            <Text>{t('plugins.updateNotice')}</Text>
                            {(
                                [
                                    'added',
                                    'updated',
                                    'identity_resets',
                                    'removed',
                                    'authorization_changes',
                                ] as const
                            ).map((kind) => (
                                <VStack key={kind}>
                                    <Text>{t(`plugins.${kind}`)}</Text>
                                    {updatePreview[kind].map((c) => (
                                        <Text key={`${c.kind}:${c.member_key}`}>
                                            {c.kind} · {c.member_key}
                                        </Text>
                                    ))}
                                </VStack>
                            ))}
                        </>
                    ) : null}
                    {staleUpdate ? (
                        <Text style={styles.error}>{t('plugins.stalePreview')}</Text>
                    ) : null}
                    <Action
                        label={t(updatePreview ? 'plugins.applyUpdate' : 'plugins.install')}
                        disabled={blocked || Boolean(staleUpdate)}
                        onPress={() => {
                            if (operation !== null)
                                run(
                                    updatePreview
                                        ? {
                                              kind: 'apply_update',
                                              upload_operation: operation,
                                              confirm_changes: true,
                                          }
                                        : { kind: 'install', upload_operation: operation },
                                );
                        }}
                    />
                </VStack>
            ) : null}
            {p && !selected ? (
                <>
                    {p.plugins.length === 0 && !p.busy ? <Text>{t('plugins.empty')}</Text> : null}
                    {p.plugins.map((plugin) => (
                        <VStack key={plugin.id} style={styles.card}>
                            <Action
                                label={plugin.name}
                                disabled={busy}
                                onPress={() => {
                                    cancelUpload();
                                    setSelected(plugin.id);
                                }}
                            />
                            <Status value={plugin.state} />
                            <Status value={plugin.status} />
                        </VStack>
                    ))}
                </>
            ) : null}
            {parent && workspace && p ? (
                <VStack style={styles.card}>
                    <Text style={styles.heading}>{parent.name}</Text>
                    <Text style={styles.secondary}>
                        {parent.version ?? ''} ·{' '}
                        {t('plugins.revision', { revision: parent.revision })}
                    </Text>
                    <Status value={parent.state} />
                    <Status value={parent.status} />
                    <SwitchRow
                        label={t('plugins.enabled')}
                        value={parent.enabled}
                        disabled={blocked || parent.state !== 'installed'}
                        onChange={(enabled) =>
                            run({
                                kind: 'set_enabled',
                                plugin_id: parent.id,
                                expected_revision: parent.revision,
                                enabled,
                            })
                        }
                    />
                    <Action
                        label={t('plugins.updateArchive')}
                        disabled={blocked || parent.state !== 'installed'}
                        onPress={() => {
                            void chooseArchive(true);
                        }}
                    />
                    {parent.state !== 'installed' ? (
                        <>
                            <Text>{t('plugins.interruptedNotice')}</Text>
                            <Action
                                label={t('plugins.continue')}
                                disabled={blocked}
                                onPress={() =>
                                    run({
                                        kind: 'mutate',
                                        plugin_id: parent.id,
                                        expected_revision: parent.revision,
                                        intent: { action: 'continue' },
                                    })
                                }
                            />
                        </>
                    ) : null}
                    {parent.components.map((component) => (
                        <Component
                            key={`${component.kind}:${component.member_key}`}
                            component={component}
                            p={p}
                            workspace={workspace}
                            disabled={blocked}
                            run={run}
                            confirm={confirm}
                            updateSkill={(skillId) => {
                                void chooseArchive(false, skillId);
                            }}
                        />
                    ))}
                    {parent.diagnostics.map((d, i) => (
                        <Text key={i} style={styles.secondary}>
                            {d.code} · {d.path} · {d.message}
                        </Text>
                    ))}
                    <SwitchRow
                        label={t('plugins.purgeData')}
                        value={purge}
                        disabled={blocked}
                        onChange={setPurge}
                    />
                    <Text style={styles.secondary}>{t('plugins.retentionNotice')}</Text>
                    <Action
                        label={t('plugins.remove')}
                        danger
                        disabled={blocked}
                        onPress={() =>
                            confirm(
                                t('plugins.removeTitle', { name: parent.name }),
                                t(purge ? 'plugins.removePurgeNotice' : 'plugins.removeNotice'),
                                t('plugins.remove'),
                                () =>
                                    run({
                                        kind: 'mutate',
                                        plugin_id: parent.id,
                                        expected_revision: parent.revision,
                                        intent: { action: 'remove', purge_data: purge },
                                    }),
                            )
                        }
                    />
                </VStack>
            ) : selected && p && !p.busy && !p.error ? (
                <Text>{t('plugins.removed')}</Text>
            ) : null}
        </ScrollView>
    );
};

type ComponentProps = {
    component: PluginComponentItem;
    p: PluginPublication;
    workspace: string;
    disabled: boolean;
    run: (intent: PluginIntent) => void;
    confirm: (title: string, message: string, label: string, action: () => void) => void;
    updateSkill: (skillId: string) => void;
};
const Component = ({
    component: c,
    p,
    workspace,
    disabled,
    run,
    confirm,
    updateSkill,
}: ComponentProps) => {
    const { t } = useTranslation('settings');
    const parent = p.details!;
    const skill = p.skills.find((s) => s.skill_id === c.skill_id);
    const mcp = p.mcp.find((s) => s.id === c.mcp_installation_id);
    const retry = (restore: boolean) =>
        run({
            kind: 'mutate',
            plugin_id: parent.id,
            expected_revision: parent.revision,
            intent: {
                action: 'retry',
                components: [{ kind: c.kind, member_key: c.member_key }],
                restore_removed: restore,
            },
        });
    return (
        <VStack style={styles.card}>
            <Text>
                {c.kind} · {c.member_key}
            </Text>
            <Status value={c.status} />
            {c.runtime_status ? <Status value={c.runtime_status} /> : null}
            {c.diagnostic ? <Text style={styles.error}>{c.diagnostic}</Text> : null}
            {c.status === 'failed' ? (
                <Action
                    label={t('plugins.retryComponent')}
                    disabled={disabled}
                    onPress={() => retry(false)}
                />
            ) : null}
            {c.status === 'removed_by_user' ? (
                <Action
                    label={t('plugins.restoreComponent')}
                    disabled={disabled}
                    onPress={() =>
                        confirm(
                            t('plugins.restoreTitle', { member: c.member_key }),
                            t('plugins.restoreNotice'),
                            t('plugins.restoreComponent'),
                            () => retry(true),
                        )
                    }
                />
            ) : null}
            {skill ? (
                <SkillSettings
                    skill={skill}
                    workspace={workspace}
                    disabled={disabled}
                    run={run}
                    p={p}
                    confirm={confirm}
                    updateSkill={updateSkill}
                />
            ) : null}
            {mcp ? (
                <McpSettings
                    mcp={mcp}
                    workspace={workspace}
                    disabled={disabled}
                    run={run}
                    p={p}
                    confirm={confirm}
                    updateSkill={updateSkill}
                />
            ) : null}
        </VStack>
    );
};
const SkillSettings = ({
    skill,
    workspace,
    disabled,
    run,
    p,
    confirm,
    updateSkill,
}: Omit<ComponentProps, 'component'> & { skill: SkillListItem }) => {
    const { t } = useTranslation('settings');
    const action = usePluginChildAction(workspace, 'skills_action', skill.skill_id);
    const pending = disabled || action?.state === 'pending';
    const health = p.skill_health.find((h) => h.skill_id === skill.skill_id);
    return (
        <VStack>
            <Text>{skill.display_name}</Text>
            <Status value={skill.status} />
            <Text style={styles.secondary}>{t('plugins.trust', { trust: skill.trust_level })}</Text>
            <Text>{skill.description}</Text>
            <SwitchRow
                label={t('plugins.componentEnabled')}
                value={skill.policy.enabled}
                disabled={pending}
                onChange={(enabled) =>
                    run({
                        kind: 'skill',
                        skill_id: skill.skill_id,
                        enabled,
                        allow_implicit_invocation: skill.policy.allow_implicit_invocation,
                    })
                }
            />
            <SwitchRow
                label={t('plugins.implicit')}
                value={skill.policy.allow_implicit_invocation}
                disabled={pending || !skill.policy.allow_implicit_invocation_editable}
                onChange={(allow_implicit_invocation) =>
                    run({
                        kind: 'skill',
                        skill_id: skill.skill_id,
                        enabled: skill.policy.enabled,
                        allow_implicit_invocation,
                    })
                }
            />
            {action ? <Status value={action.state} /> : null}
            {(health?.dependency_diagnostics ?? skill.health.dependency_failures ?? []).map(
                (d, i) => (
                    <Text key={`dep:${i}`} style={styles.secondary}>
                        {d.kind} · {d.status}
                        {d.action_hint ? ` · ${d.action_hint}` : ''}
                    </Text>
                ),
            )}
            {(health?.security_findings ?? skill.health.security_blocks ?? []).map((d, i) => (
                <Text key={`sec:${i}`} style={styles.secondary}>
                    {d.severity} · {d.message}
                </Text>
            ))}
            {(health?.validation_issues ?? skill.health.validation_issues ?? []).map((d, i) => (
                <Text key={`val:${i}`} style={styles.secondary}>
                    {d.code} · {d.message}
                </Text>
            ))}
            {health?.trust_gate?.map((gate, i) => (
                <Text key={`gate:${i}`} style={styles.secondary}>
                    {t('plugins.gate', {
                        tool: gate.tool_kind,
                        trust: gate.minimum_trust,
                        decision: t(gate.allowed ? 'plugins.allowed' : 'plugins.blocked'),
                    })}
                </Text>
            ))}
            <Action
                label={t('plugins.updateSkill')}
                disabled={pending || !skill.install.lifecycle_editable}
                onPress={() =>
                    confirm(
                        t('plugins.updateSkillTitle', { member: skill.display_name }),
                        t('plugins.updateSkillNotice'),
                        t('plugins.chooseSkillArchive'),
                        () => updateSkill(skill.skill_id),
                    )
                }
            />
            <Action
                label={t('plugins.removeComponent')}
                disabled={pending || !skill.install.lifecycle_editable}
                danger
                onPress={() =>
                    confirm(
                        t('plugins.removeComponentTitle', { member: skill.display_name }),
                        t('plugins.removeComponentNotice'),
                        t('plugins.removeComponent'),
                        () => run({ kind: 'remove_skill', skill_id: skill.skill_id }),
                    )
                }
            />
        </VStack>
    );
};
const McpSettings = ({
    mcp,
    workspace,
    disabled,
    run,
    p,
    confirm,
}: Omit<ComponentProps, 'component'> & { mcp: McpListItem }) => {
    const { t } = useTranslation('settings');
    const { theme } = useUnistyles();
    const action = usePluginChildAction(workspace, 'mcp_action', mcp.id);
    const configAction = usePluginChildAction(workspace, 'mcp_action', 'configuration');
    const pending = disabled || action?.state === 'pending' || configAction?.state === 'pending';
    const [body, setBody] = useState('');
    const [editing, setEditing] = useState(false);
    const d = p.mcp_details.find((d) => d.server.id === mcp.id);
    const oauth = p.oauth.find((o) => o.server_id === mcp.id);
    const state = oauth?.state ?? d?.management?.oauth_state;
    const send = (intent: McpIntent) => run({ kind: 'mcp', intent });
    return (
        <VStack>
            <Text>{mcp.display_name ?? mcp.name}</Text>
            <Status value={mcp.status} />
            {state ? <Status value={state} /> : null}
            <SwitchRow
                label={t('plugins.componentEnabled')}
                value={mcp.policy.enabled}
                disabled={pending}
                onChange={(enabled) =>
                    send({
                        kind: 'policy',
                        server_id: mcp.id,
                        enabled,
                        allow_implicit_invocation: mcp.policy.allow_implicit_invocation,
                    })
                }
            />
            <SwitchRow
                label={t('plugins.implicit')}
                value={mcp.policy.allow_implicit_invocation}
                disabled={pending || Boolean(mcp.plugin_owner)}
                onChange={(allow_implicit_invocation) =>
                    send({
                        kind: 'policy',
                        server_id: mcp.id,
                        enabled: mcp.policy.enabled,
                        allow_implicit_invocation,
                    })
                }
            />
            {action ? <Status value={action.state} /> : null}
            {configAction ? <Status value={configAction.state} /> : null}
            <Action
                label={t('plugins.signIn')}
                disabled={
                    pending ||
                    d?.management?.transport.kind !== 'streamable_http' ||
                    state === 'awaiting_callback' ||
                    state === 'exchanging' ||
                    state === 'resolving'
                }
                onPress={() => send({ kind: 'sign_in', server_id: mcp.id })}
            />
            {oauth?.flow_id &&
            (state === 'awaiting_callback' || state === 'preparing' || state === 'exchanging') ? (
                <Action
                    label={t('plugins.cancelSignIn')}
                    disabled={pending}
                    onPress={() =>
                        send({
                            kind: 'cancel_authorization',
                            server_id: mcp.id,
                            flow_id: oauth.flow_id!,
                        })
                    }
                />
            ) : null}
            {oauth?.browser_failed ? (
                <Action
                    label={t('plugins.retryBrowser')}
                    disabled={pending}
                    onPress={() => send({ kind: 'retry_authorization_browser', server_id: mcp.id })}
                />
            ) : null}
            {d?.management?.oauth_cleanup_available ||
            state === 'authorized' ||
            state === 'cleanup_required' ? (
                <Action
                    label={t('plugins.disconnect')}
                    disabled={pending}
                    onPress={() => send({ kind: 'disconnect', server_id: mcp.id })}
                />
            ) : null}
            <Action
                label={t('plugins.restart')}
                disabled={pending}
                onPress={() => send({ kind: 'restart', server_id: mcp.id })}
            />
            {d?.management ? (
                <>
                    <Text style={styles.secondary}>
                        {d.management.transport.kind === 'stdio'
                            ? d.management.transport.command
                            : d.management.transport.url}
                    </Text>
                    {d.management.health.status_reason ? (
                        <Text style={styles.secondary}>{d.management.health.status_reason}</Text>
                    ) : null}
                    {d.management.health.last_error ? (
                        <Text style={styles.error}>{d.management.health.last_error}</Text>
                    ) : null}
                    <Action
                        label={t('plugins.editConfig')}
                        disabled={pending}
                        onPress={() => setEditing(true)}
                    />
                </>
            ) : null}
            {editing ? (
                <VStack>
                    <Text style={styles.secondary}>{t('plugins.configNotice')}</Text>
                    <TextInput
                        accessibilityLabel={t('plugins.configBody')}
                        value={body}
                        onChangeText={setBody}
                        multiline
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder={t('plugins.configBody')}
                        placeholderTextColor={theme.colors.textMuted}
                        style={styles.field}
                    />
                    <Action
                        label={t('plugins.saveConfig')}
                        disabled={pending || !body.trim()}
                        onPress={() => {
                            run({ kind: 'configure_mcp', server_id: mcp.id, body });
                            setBody('');
                            setEditing(false);
                        }}
                    />
                    <Action
                        label={t('plugins.cancel')}
                        onPress={() => {
                            setBody('');
                            setEditing(false);
                        }}
                    />
                    {configAction ? <Status value={configAction.state} /> : null}
                </VStack>
            ) : null}
            <Action
                label={t('plugins.removeComponent')}
                danger
                disabled={pending}
                onPress={() =>
                    confirm(
                        t('plugins.removeComponentTitle', { member: mcp.display_name ?? mcp.name }),
                        t('plugins.removeComponentNotice'),
                        t('plugins.removeComponent'),
                        () => send({ kind: 'remove', server_id: mcp.id }),
                    )
                }
            />
        </VStack>
    );
};
