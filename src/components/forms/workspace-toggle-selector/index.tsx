import { StyleSheet } from 'react-native-unistyles';

import { Label } from '@/components/forms/label';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

type WorkspaceToggleOption = {
    id: string;
    name: string;
};

type WorkspaceToggleSelectorProps = {
    workspaces: readonly WorkspaceToggleOption[];
    selectedWorkspaceIds: ReadonlySet<string>;
    onToggle: (workspaceId: string) => void;
    label?: string | null;
    disabled?: boolean;
    disabledWorkspaceIds?: ReadonlySet<string>;
};

export const WorkspaceToggleSelector = ({
    workspaces,
    selectedWorkspaceIds,
    onToggle,
    label,
    disabled = false,
    disabledWorkspaceIds,
}: WorkspaceToggleSelectorProps) => (
    <VStack style={styles.container}>
        {label ? (
            <Box style={styles.label}>
                <Label>{label}</Label>
            </Box>
        ) : null}
        <HStack style={styles.toggles}>
            {workspaces.map((workspace) => {
                const selected = selectedWorkspaceIds.has(workspace.id);
                const workspaceDisabled =
                    disabled || disabledWorkspaceIds?.has(workspace.id) === true;
                return (
                    <Pressable
                        key={workspace.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{
                            checked: selected,
                            disabled: workspaceDisabled,
                        }}
                        disabled={workspaceDisabled}
                        onPress={() => onToggle(workspace.id)}
                        style={[
                            styles.toggle,
                            selected ? styles.toggleSelected : styles.toggleIdle,
                            workspaceDisabled ? styles.disabled : null,
                        ]}
                    >
                        <Text style={selected ? styles.textSelected : styles.text}>
                            {workspace.name}
                        </Text>
                    </Pressable>
                );
            })}
        </HStack>
    </VStack>
);

const styles = StyleSheet.create((theme) => ({
    container: {
        gap: theme.space(1.5),
    },
    label: {
        alignItems: 'center',
    },
    toggles: {
        flexWrap: 'wrap',
        gap: theme.space(1.5),
        justifyContent: 'center',
        paddingBottom: theme.space(8),
    },
    toggle: {
        minHeight: theme.space(10),
        justifyContent: 'center',
        paddingHorizontal: theme.space(4),
        borderRadius: theme.radius.full,
    },
    toggleIdle: {
        backgroundColor: 'transparent',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
    },
    toggleSelected: {
        backgroundColor: theme.colors.typography,
    },
    text: {
        color: theme.colors.typography,
        opacity: 0.8,
        ...theme.fontSize.default,
    },
    textSelected: {
        color: theme.colors.background,
        opacity: 1,
        ...theme.fontSize.default,
    },
    disabled: {
        opacity: 0.45,
    },
}));
