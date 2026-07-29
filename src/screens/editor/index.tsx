import { useEditorStore } from '@/stores/editor';

import GatewayEditorScreen from '@/screens/gateway/editor';
import WorkspaceEditorScreen from '@/screens/workspace/editor';

const EditorScreen = () => {
    const state = useEditorStore((state) => state);

    switch (state.type) {
        case 'gateway__create':
            return <GatewayEditorScreen />;
        case 'gateway__edit':
            return <GatewayEditorScreen {...state.payload} />;
        case 'gateway__authenticate':
            return <GatewayEditorScreen {...state.payload} authenticateOnly />;
        case 'workspace__create':
            return <WorkspaceEditorScreen />;
        case 'workspace__edit':
            return <WorkspaceEditorScreen {...state.payload} />;
        default:
            return null;
    }
};

export default EditorScreen;
