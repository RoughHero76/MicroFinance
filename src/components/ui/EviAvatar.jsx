// EviAvatar — initials or photo, circular, consistent sizing.
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { tokens, tones } from '../../theme/tokens';

const { colors, type, radii } = tokens;

const initials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

const EviAvatar = ({ name = '', source, size = 40, tone = 'brand', loading = false, style }) => {
  const t = tones[tone] || tones.brand;
  if (source && !loading) {
    return (
      <Image
        source={{ uri: source }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: t.bg }, style]}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.bg,
          borderWidth: 2,
          borderColor: t.bg,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size={size * 0.4} color={t.fg} />
      ) : (
        <Text style={{ color: t.fg, fontSize: Math.round(size * 0.36), fontWeight: type.weights.semibold }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.brandTint,
  },
});

export default EviAvatar;
