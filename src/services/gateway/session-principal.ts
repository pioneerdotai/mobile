export const isSupportedSessionPrincipalKind = (kind: string): kind is 'superuser' | 'user' =>
    kind === 'superuser' || kind === 'user';
