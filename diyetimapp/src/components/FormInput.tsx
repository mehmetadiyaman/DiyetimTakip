import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, HelperText, TextInputProps as PaperTextInputProps } from 'react-native-paper';
import { Control, Controller, FieldError, FieldValues, Path } from 'react-hook-form';

interface FormInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: FieldError;
  secureTextEntry?: boolean;
  toggleSecureEntry?: () => void;
  rightIcon?: string;
  onRightIconPress?: () => void;
  mode?: 'flat' | 'outlined';
  keyboardType?: PaperTextInputProps['keyboardType'];
  autoCapitalize?: PaperTextInputProps['autoCapitalize'];
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
}

function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  error,
  secureTextEntry,
  toggleSecureEntry,
  rightIcon,
  onRightIconPress,
  mode = 'outlined',
  keyboardType,
  autoCapitalize,
  multiline,
  numberOfLines,
  disabled,
}: FormInputProps<T>) {
  return (
    <>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label={label}
            value={value?.toString() || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            mode={mode}
            error={!!error}
            secureTextEntry={secureTextEntry}
            style={styles.input}
            right={
              rightIcon ? (
                <TextInput.Icon 
                  icon={rightIcon} 
                  onPress={onRightIconPress} 
                />
              ) : undefined
            }
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            numberOfLines={numberOfLines}
            disabled={disabled}
          />
        )}
      />
      {error && (
        <HelperText type="error" visible={!!error}>
          {error.message}
        </HelperText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    marginBottom: 4,
  },
});

export default FormInput; 