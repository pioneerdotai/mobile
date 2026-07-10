import type {
    ClientTurnSecuritySummary,
    TurnSecurityCapabilityKind,
} from '@/client/generated/client_turn_security_summary';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export type TimelineSecurityDiagnosticRow = {
    capability: TurnSecurityCapabilityKind;
    label: string;
    message: string;
};

export const securitySummaryLabel = (summary: ClientTurnSecuritySummary, t: Translate): string => {
    switch (summary.enforcement) {
        case 'unavailable':
            return t('timelineSecuritySandboxUnavailable');
        case 'degraded':
            return t('timelineSecuritySandboxDegraded');
        case 'active':
            switch (summary.filesystem_access) {
                case 'unrestricted':
                    return t('timelineSecurityUnrestricted');
                case 'read_only':
                    return t('timelineSecurityReadOnlySandbox');
                case 'workspace_write':
                    return t('timelineSecurityWorkspaceSandbox');
            }
    }
};

export const securityDiagnosticRows = (
    summary: ClientTurnSecuritySummary,
    t: Translate,
): TimelineSecurityDiagnosticRow[] => {
    return (summary.diagnostics ?? []).map((diagnostic) => ({
        capability: diagnostic.capability,
        label: securityCapabilityLabel(diagnostic.capability, t),
        message: sanitizeSecurityDiagnosticMessage(diagnostic.message, t),
    }));
};

const securityCapabilityLabel = (capability: TurnSecurityCapabilityKind, t: Translate): string => {
    switch (capability) {
        case 'filesystem':
            return t('timelineSecurityFilesystemSandbox');
        case 'network':
            return t('timelineSecurityNetworkSandbox');
        case 'process':
            return t('timelineSecurityProcessSandbox');
        case 'approval':
            return t('timelineSecurityApprovalPolicy');
        case 'sandbox_backend':
            return t('timelineSecuritySandboxBackend');
    }
};

const sanitizeSecurityDiagnosticMessage = (message: string, t: Translate): string => {
    const sanitized = message.trim().split(/\s+/).filter(Boolean).join(' ');
    const normalized =
        sanitized.length > 0 ? sanitized : t('timelineSecurityCapabilityNotEnforced');
    const maxChars = 180;

    if ([...normalized].length <= maxChars) {
        return normalized;
    }

    return `${[...normalized].slice(0, maxChars).join('')}...`;
};
