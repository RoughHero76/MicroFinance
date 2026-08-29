// EviTextField — a styled wrapper around paper TextInput so every field
// (login, forms, search) looks the same across the app.
import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { colors, radii, type, spacing } from '../../theme/tokens';

const EviTextField = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  left,
  right,
  mode = 'flat',
  ...rest
}) => (
  <TextInput
    label={label}
    value={value}
    onChangeText={onChangeText}
    secureTextEntry={secureTextEntry}
    keyboardType={keyboardType}
    mode={mode}
    left={left}
    right={right}
    style={[styles.input, rest.style]}
    contentStyle={styles.content}
    {...rest}
  />
);

const styles = StyleSheet.create({
  input: { backgroundColor: colors.card, borderRadius: radii.md, ...{ margin: 0 } },
  content: { paddingVertical: spacing.md, fontSize: type.sizes.md },
});

export default EviTextField;
