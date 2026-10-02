// U-15: a photo wherever a person appears; initials only without a photo.
// Photos go through the shared cache so lists don't re-download them.

import React, {useEffect, useState} from 'react';
import {Image, Pressable, View, type StyleProp, type ViewStyle} from 'react-native';
import {cachedImage, cachedPathSync} from '@/lib/imageCache';
import {makeStyles, useTheme} from '@/theme';
import {Icon} from './Icon';
import {Text} from './Text';

export interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Shows the round camera badge at the bottom-right corner (PhotoBadge). */
  onEditPhoto?: () => void;
  onPress?: () => void;
}

export function initialsOf(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// The server occasionally sends a non-URL placeholder (empty path, "null",
// a bare filename with no host); those never load and never fire onError,
// so they'd otherwise leave the Image's blank background showing forever
// instead of falling back to initials.
function isPhotoUri(uri?: string | null): uri is string {
  return typeof uri === 'string' && /^https?:\/\//i.test(uri);
}

export const Avatar = React.memo(function Avatar({name, uri, size = 40, style, onEditPhoto, onPress}: AvatarProps) {
  const t = useTheme();
  const s = useStyles();
  const [source, setSource] = useState<string | null>(isPhotoUri(uri) ? cachedPathSync(uri) : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    if (!isPhotoUri(uri)) {
      setSource(null);
      return;
    }
    const known = cachedPathSync(uri);
    if (known) {
      setSource(known);
      return;
    }
    // Show the remote image right away; swap to the cached file once saved.
    setSource(uri);
    cachedImage(uri).then(path => {
      if (alive && path) {
        setSource(path);
      }
    });
    return () => {
      alive = false;
    };
  }, [uri]);

  const circle = {width: size, height: size, borderRadius: size / 2};
  const body =
    source && !failed ? (
      <Image
        source={{uri: source}}
        style={[circle, s.image]}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    ) : (
      <View style={[circle, s.initials]}>
        <Text weight="semibold" style={{color: t.colors.primary, fontSize: Math.max(11, size * 0.36)}}>
          {initialsOf(name)}
        </Text>
      </View>
    );

  const badgeSize = Math.max(22, Math.round(size * 0.32));
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[{width: size, height: size}, style]}
      accessibilityRole={onPress ? 'imagebutton' : 'image'}
      accessibilityLabel={name ?? undefined}>
      {body}
      {onEditPhoto ? (
        <Pressable
          onPress={onEditPhoto}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Change photo"
          style={[s.badge, {width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2}]}>
          <Icon name="camera" size={Math.round(badgeSize * 0.55)} color="onPrimary" />
        </Pressable>
      ) : null}
    </Pressable>
  );
});

const useStyles = makeStyles(t => ({
  image: {backgroundColor: t.colors.surface2},
  initials: {backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center'},
  // Anchored to the photo's bottom-right corner, with a ring in the card colour.
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: t.colors.primary,
    borderWidth: 2,
    borderColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
