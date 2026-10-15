import { mobileClientBinding } from './mobile-client-binding';
import type { ArtifactIntent } from './generated/client_intent';
import type {
    ArtifactActionIdentity,
    ArtifactActionKind,
    ArtifactActionPublication,
    ArtifactPublication,
} from './generated/artifact_publication';

export type { ArtifactActionIdentity, ArtifactActionKind, ArtifactActionPublication };

export const dispatchArtifact = (intent: ArtifactIntent): boolean => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'artifact', intent },
    });
    const threadId =
        intent.kind === 'observe' || intent.kind === 'retry' || intent.kind === 'begin_action'
            ? intent.thread_id
            : intent.identity.thread_id;
    mobileClientBinding.drain({ kind: 'artifact', thread_id: threadId });
    return result.outcome === 'changed';
};

export const beginArtifactAction = (
    threadId: string,
    artifactId: string,
    versionId: string | null,
    action: ArtifactActionKind,
): ArtifactActionIdentity | null => {
    if (
        !dispatchArtifact({
            kind: 'begin_action',
            thread_id: threadId,
            artifact_id: artifactId,
            version_id: versionId,
            action,
        })
    )
        return null;
    const input = mobileClientBinding.scope({ kind: 'artifact', thread_id: threadId }).getSnapshot()
        ?.payload as ArtifactPublication | null;
    return input?.thread_id === threadId
        ? (input.actions.find(
              (item) =>
                  item.identity.artifact_id === artifactId &&
                  (item.identity.version_id ?? null) === versionId,
          )?.identity ?? null)
        : null;
};
