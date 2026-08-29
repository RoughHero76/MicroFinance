import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, radius, type } from '../tokens';

/** Deterministic, pleasant color from a name so each person keeps their hue. */
const PALETTE = [
  { bg: '#FDE68A', fg: '#92400E' },
  { bg: '#BBF7D0', fg: '#065F46' },
  { bg: '#BFDBFE', fg: '#1E40AF' },
  { bg: '#FBCFE8', fg: '#9D174D' },
  { bg: '#DDD6FE', fg: '#5B21B6' },
  { bg: '#FED7AA', fg: '#9A3412' },
  { bg: '#A7F3D0', fg: '#065F46' },
  { bg: '#E9D5FF', fg: '#6B21A8' },
];

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const pickColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

/**
 * Avatar
 * ------
 * Circular avatar with an optional image, otherwise deterministic initials.
 *
 *   <Avatar name="Priya Sharma" />
 *   <Avatar name="A" size={44} image={uri} />
 */
const Avatar = ({ name = '', size = 40, image, style, ring }) => {
  const { bg, fg } = useMemo(() => pickColor(name), [name]);
  const initials = useMemo(() => getInitials(name), [name]);
  const fs = Math.round(size * 0.38);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          borderWidth: ring ? 2 : 0,
          borderColor: ring ? colors.accent : 'transparent',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: size, height: size }} />
      ) : (
        <View
          style={{
            flex: 1,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            numberOfLines={1}
            style={{ fontSize: fs, fontWeight: '700', color: fg, letterSpacing: 0.3 }}
          >
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
};

export default Avatar;
