import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, type, shadow } from '../tokens';
import Icon from '../Icon';

/**
 * SearchBar
 * ---------
 * Rounded search field with a leading magnifier and a clear button when
 * non-empty.
 *
 *   <SearchBar value={q} onChangeText={setQ} placeholder="Search customers" />
 */
const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search',
  autoFocus = false,
  returnKeyType = 'search',
  onSubmitEditing,
  style,
}) => {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          paddingLeft: spacing.md,
          paddingRight: spacing.sm,
          height: 46,
          ...shadow.subtle,
        },
        style,
      ]}
    >
      <Icon name="search" size={18} color={colors.inkMuted} style={{ marginRight: spacing.xs }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        style={[type.body, { flex: 1, color: colors.ink, padding: 0 }]}
      />
      {value ? (
        <Pressable hitSlop={8} onPress={() => onChangeText('')} accessibilityRole="button">
          <Icon name="close" size={16} color={colors.inkMuted} />
        </Pressable>
      ) : null}
    </View>
  );
};

export default SearchBar;
