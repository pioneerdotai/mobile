import { create } from 'zustand';

type GatewayCreate = {
    type: 'gateway__create';
};

type GatewayEdit = {
    type: 'gateway__edit';
    payload: {
        gatewayId: string;
    };
};

type GatewayAuthenticate = {
    type: 'gateway__authenticate';
    payload: {
        gatewayId: string;
    };
};

type WorkspaceCreate = {
    type: 'workspace__create';
};

type WorkspaceEdit = {
    type: 'workspace__edit';
    payload: {
        workspaceId: string;
    };
};

type Unknown = {
    type: 'unknown';
};

export type EditorState = {
    title?: string;
    description?: string;
} & (GatewayCreate | GatewayEdit | GatewayAuthenticate | WorkspaceCreate | WorkspaceEdit | Unknown);

type EditorActions = {
    setState: (state: EditorState) => void;
    resetState: () => void;
};

const initial: EditorState = {
    type: 'unknown',
};

export const useEditorStore = create<EditorState & EditorActions>()((set, get) => ({
    ...initial,
    setState: (state) => set(state),
    resetState: () => set(initial),
}));
