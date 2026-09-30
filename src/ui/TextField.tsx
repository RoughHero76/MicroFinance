// U-07: label above the field, the right keyboard, errors under the field.

import React, {forwardRef, useState} from 'react';
import {Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle} from 'react-native';
import {makeStyles, useTheme} from '@/theme';
import {Icon} from './Icon';
import {Text} from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  icon?: string;
  prefix?: string;
  /** Show/hide toggle for passwords. */
  secureToggle?: boolean;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    hint,
    error,
    required,
    icon,
    prefix,
    secureToggle,
    right,
    containerStyle,
    editable = true,
    secureTextEntry,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const t = useTheme();
  const s = useStyles();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={[s.container, containerStyle]}>
      {label ? (
        <Text variant="label" color="muted" style={s.label}>
          {label}
          {required ? <Text color="danger"> *</Text> : null}
        </Text>
      ) : null}
      <View style={[s.field, focused && s.focused, !!error && s.errored, !editable && s.readonly]}>
        {icon ? <Icon name={icon} size={18} color="muted" /> : null}
        {prefix ? (
          <Text variant="bodyLg" color="muted">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          style={s.input}
          placeholderTextColor={t.colors.muted}
          editable={editable}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          accessibilityLabel={label}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden(h => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show' : 'Hide'}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color="muted" />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? (
        <Text variant="caption" color="danger" style={s.below}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="muted" style={s.below}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const useStyles = makeStyles(t => ({
  container: {marginBottom: t.space.md},
  label: {marginBottom: t.space.xs},
  field: {
    minHeight: t.size.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  focused: {borderColor: t.colors.primary},
  errored: {borderColor: t.colors.danger},
  readonly: {backgroundColor: t.colors.surface2},
  input: {flex: 1, fontSize: t.font.bodyLg, color: t.colors.text, paddingVertical: t.space.sm},
  below: {marginTop: t.space.xs},
}));
