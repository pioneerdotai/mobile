/* eslint-disable */

/**
 * Stable UI vocabulary for the authenticated principal kind. `Unknown` keeps
 * clients fail-closed when a future protocol kind reaches a newer boundary.
 */
export type CurrentPrincipalKindPresentation = 'superuser' | 'member' | 'unknown';
