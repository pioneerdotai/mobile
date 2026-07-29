import {
    type Control,
    type FieldPath,
    type FieldValues,
    type UseControllerProps,
    useController,
} from 'react-hook-form';

import { OtpInput, type OtpInputProps } from '@/components/forms/otp-input';

export type ControlledOtpInputProps<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>,
> = Omit<OtpInputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
    control: Control<TFieldValues>;
    name: TName;
    rules?: UseControllerProps<TFieldValues, TName>['rules'];
    externalError?: string | null;
    onValueChange?: (value: string) => void;
};

export const ControlledOtpInput = <
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>,
>({
    control,
    name,
    rules,
    externalError,
    onValueChange,
    ...inputProps
}: ControlledOtpInputProps<TFieldValues, TName>) => {
    const { field, fieldState } = useController({ control, name, rules });

    return (
        <OtpInput
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
