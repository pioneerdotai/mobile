import {
    type Control,
    type FieldPath,
    type FieldValues,
    type UseControllerProps,
    useController,
} from 'react-hook-form';

import { Input, type InputProps } from '@/components/forms/input';

export type FormLabeledInputProps<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>,
> = Omit<InputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
    control: Control<TFieldValues>;
    name: TName;
    rules?: UseControllerProps<TFieldValues, TName>['rules'];
    externalError?: string | null;
    onValueChange?: (value: string) => void;
};

export const ControlledInput = <
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>,
>({
    control,
    name,
    rules,
    externalError,
    onValueChange,
    ...inputProps
}: FormLabeledInputProps<TFieldValues, TName>) => {
    const { field, fieldState } = useController({ control, name, rules });

    return (
        <Input
            {...inputProps}
            value={typeof field.value === 'string' ? field.value : ''}
            onBlur={() => field.onBlur()}
            onChangeText={(value) => {
                field.onChange(value);
                onValueChange?.(value);
            }}
            error={fieldState.error?.message ?? externalError}
        />
    );
};
