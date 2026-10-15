import { navigationSnapshot, useClientNavigation } from '@/client/navigation';
import { directorySnapshot, useWorkspaceDirectory } from '@/client/workspaces';
import type { ThreadTreePublication } from '@/client/generated/thread_tree_publication';

const presentation = (publication: ThreadTreePublication | null) => ({
    snapshot: publication?.snapshot ?? null,
    workspaceId: publication?.snapshot.workspace_id ?? null,
    loading: publication?.loading ?? false,
    error: publication?.error ?? null,
});
type ThreadTreeState = ReturnType<typeof presentation>;
/** Read-only facade over the scoped Client directory. */
export const useThreadTreeStore = Object.assign(
    <T>(selector: (state: ThreadTreeState) => T): T => {
        const workspace = useClientNavigation()?.workspace_id ?? null;
        return selector(presentation(useWorkspaceDirectory(workspace)));
    },
    {
        getState: (): ThreadTreeState =>
            presentation(directorySnapshot(navigationSnapshot()?.workspace_id ?? null)),
    },
);
