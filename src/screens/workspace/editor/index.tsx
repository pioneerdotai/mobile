import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import { ControlledInput } from '@/components/forms/controlled/input';
import { Box } from '@/components/primitives/box';
import { Title } from '@/components/typography/title';
import { useWorkspace } from '@/hooks/use-workspace';
import { WorkspaceOperationError } from '@/services/workspace/management';
import type { WorkspaceOperationErrorCode } from '@/services/workspace/management';
import { Container } from '@/screens/editor/components/container';

type WorkspaceFormValues = {
    name: string;
};

type WorkspaceEditorScreenProps = {
    workspaceId?: string;
};

const workspaceErrorTranslationKeys: Record<WorkspaceOperationErrorCode, string> = {
    gatewayNotFound: 'errors.gatewayNotFound',
    gatewayNotConnected: 'errors.gatewayNotConnected',
    bootstrapFailed: 'errors.bootstrapFailed',
    selectFailed: 'errors.selectFailed',
    createFailed: 'errors.createFailed',
    renameFailed: 'errors.renameFailed',
    emptyName: 'errors.emptyName',
    busy: 'errors.busy',
    unknownTarget: 'errors.unknownTarget',
};

const WorkspaceEditorScreen = ({ workspaceId }: WorkspaceEditorScreenProps) => {
    const { t } = useTranslation('workspace');
    const router = useRouter();
    const {
        createWorkspace,
        renameWorkspace,
        workspaces,
        loading,
        error: storeError,
    } = useWorkspace();
    const isEdit = Boolean(workspaceId);
    const editingWorkspace = useMemo(
        () => (workspaceId ? workspaces.find((workspace) => workspace.id === workspaceId) : null),
        [workspaceId, workspaces],
    );
    const [formError, setFormError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        formState: { isSubmitting },
    } = useForm<WorkspaceFormValues>({
        defaultValues: {
            name: '',
        },
    });
    const submitting = loading || isSubmitting;

    useEffect(() => {
        if (!isEdit || !editingWorkspace) {
            reset({ name: '' });
            return;
        }

        reset({ name: editingWorkspace.name });
    }, [editingWorkspace, isEdit, reset]);

    const requiredName = useCallback(
        (value: string) => {
            return value.trim() ? true : t('errors.emptyName');
        },
        [t],
    );

    const workspaceErrorMessage = useCallback(
        (code: WorkspaceOperationErrorCode) => {
            return t(workspaceErrorTranslationKeys[code]);
        },
        [t],
    );

    const unknownWorkspaceErrorMessage = useCallback(
        (error: unknown) => {
            if (error instanceof WorkspaceOperationError) {
                return workspaceErrorMessage(error.code);
            }

            return t(isEdit ? 'errors.renameFailed' : 'errors.createFailed');
        },
        [isEdit, t, workspaceErrorMessage],
    );

    const onSubmit = handleSubmit(async (values) => {
        setFormError(null);
        const name = values.name.trim();

        try {
            if (isEdit) {
                if (!workspaceId || !editingWorkspace) {
                    throw new WorkspaceOperationError('unknownTarget');
                }

                await renameWorkspace(workspaceId, name);
                router.back();
                return;
            }

            await createWorkspace(name);
            router.back();
        } catch (error) {
            setFormError(unknownWorkspaceErrorMessage(error));
        }
    });

    const storeErrorMessage = storeError ? workspaceErrorMessage(storeError) : null;
    const title = isEdit ? t('renameWorkspace') : t('newWorkspace');
    const buttonLabel = isEdit ? t('save') : t('create');
    const submitDisabled = submitting || (isEdit && !editingWorkspace);

    return (
        <Container
            handleSubmit={() => void onSubmit()}
            handleClose={() => router.back()}
            loading={submitting}
            submitDisabled={submitDisabled}
            buttonLabel={buttonLabel}
        >
            <Box style={styles.container}>
                <View style={styles.header}>
                    <Title type="h2">{title}</Title>
                </View>

                <ControlledInput
                    control={control}
                    name="name"
                    rules={{
                        validate: requiredName,
                    }}
                    label={t('name')}
                    autoCapitalize="words"
                />

                {formError || storeErrorMessage ? (
                    <Text style={styles.error}>{formError ?? storeErrorMessage}</Text>
                ) : null}
            </Box>
        </Container>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        paddingHorizontal: theme.space(4),
        paddingBottom: rt.insets.bottom + theme.space(24),
        gap: theme.space(5),
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingTop: theme.screenContentPadding('child').paddingTop,
        gap: theme.space(2),
    },
    error: {
        ...theme.fontSize.sm,
        color: theme.colors.dangerText,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textAlign: 'center',
    },
}));

export default WorkspaceEditorScreen;
