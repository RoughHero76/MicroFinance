import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, type, shadow } from '../tokens';
import Icon from '../Icon';

/**
 * TextField
 * ---------
 * Labeled text input with leading icon, trailing slot (password toggle, clear),
 * and inline error. Controlled: pass `value` + `onChangeText`.
 *
 *   <TextField
 *     label="Password"
 *     value={pw}
 *     onChangeText={setPw}
 *     leftIcon="lock"
 *     secureTextEntry={!show}
 *     rightSlot={show ? <Icon name="eye" .../> : <Icon name="eye-off" .../>}
 *   />
 */
const TextField = ({
  label,
  value,
  onChangeText,
  leftIcon,
  placeholder,
  error,
  hint,
  multiline = false,
  numberOfLines,
  secureTextEntry = false,
  rightSlot,
  disabled = false,
  editable = true,
  autoCapitalize = 'none',
  autoCorrect = false,
  keyboardType = 'default',
  returnKeyType = 'done',
  onSubmitEditing,
  onFocus,
  onBlur,
  testID,
  style,
}) => {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.danger
    : focused
    ? colors.primary
    : colors.borderStrong;
  const borderWidth = focused ? 1.5 : 1;

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text style={[type.caption, { color: colors.inkSecondary, marginBottom: spacing.xs }]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            alignItems: multiline ? 'flex-start' : 'center',
            borderColor,
            borderWidth,
            backgroundColor: disabled ? colors.inkFaint : colors.surface,
            ...shadow.subtle,
          },
        ]}
      >
        {leftIcon ? (
          <View style={{ marginRight: spacing.xs }}>
            <Icon
              name={leftIcon}
              size={18}
              color={focused || error ? colors.primary : colors.inkMuted}
            />
          </View>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          style={[
            type.body,
            styles.input,
            { color: colors.ink },
            multiline && { minHeight: 96, textAlignVertical: 'top', paddingVertical: spacing.sm },
            !multiline && { height: multiline ? undefined : 24, lineHeight: 22 },
          ]}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines || 4 : undefined}
          secureTextEntry={secureTextEntry}
          editable={editable && !disabled}
          disabled={disabled}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={(e) => {
            setFocused(true);
            onFocus && onFocus(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur && onBlur(e);
          }}
          testID={testID}
        />

        {rightSlot ? <View style={{ marginLeft: spacing.xs, justifyContent: 'center' }}>{rightSlot}</View> : null}
      </View>

      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Icon name="alert-circle" size={14} color={colors.danger} style={{ marginRight: 5 }} />
          <Text style={[type.caption, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[type.caption, { color: colors.inkMuted, marginTop: 6 }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  field: {
    flexDirection: 'row',
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    padding: 0,
  },
});

export default TextField;
