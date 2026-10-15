import { useSyncExternalStore } from 'react';
import type { AgentsDocumentIntent, AgentsDocEditorScope } from './generated/client_intent';
import type { AgentsDocumentPublication } from './generated/agents_document_publication';
import { mobileClientBinding } from './mobile-client-binding';

const publicationScope = (scope: AgentsDocEditorScope) => ({
    kind: 'agents_document_content' as const,
    workspace_id: scope.workspace_id,
    folder_id: scope.kind === 'folder' ? scope.folder_id : null,
});

export const useAgentsDocument = (
    scope: AgentsDocEditorScope,
): AgentsDocumentPublication | null => {
    const store = mobileClientBinding.scope(publicationScope(scope));
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (snapshot?.payload as AgentsDocumentPublication | null) ?? null;
};

export const dispatchAgentsDocument = (intent: AgentsDocumentIntent) => {
    const transition = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'agents_document', intent },
    });
    mobileClientBinding.drain(publicationScope(intent.scope));
    return transition;
};
