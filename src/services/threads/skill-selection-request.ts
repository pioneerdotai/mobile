import type { ComposerSkillPickerProjection, ComposerSkillSelection } from '@/client';

export const skillSelectionRequestFields = (
    selections: readonly ComposerSkillSelection[],
    picker: ComposerSkillPickerProjection,
) => ({
    skill_selections: [...selections],
    skill_picker: picker,
});
