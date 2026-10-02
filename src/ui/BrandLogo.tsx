// The brand logo for the current mode. In dark mode it uses logo-dark.png, or
// sits on a light rounded plate when the brand has no dark logo (R-08).

import React from 'react';
import {Image, View, type StyleProp, type ViewStyle} from 'react-native';
import {brand, brandLogo} from '@/brand';
import {makeStyles, useTheme} from '@/theme';

export function BrandLogo({
  width = 160,
  height = 64,
  style,
}: {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const s = useStyles();
  const {source, needsPlate} = brandLogo(t.mode);
  return (
    <View style={[needsPlate && s.plate, style]} accessibilityRole="image" accessibilityLabel={brand.name}>
      <Image source={source} style={{width, height}} resizeMode="contain" />
    </View>
  );
}

const useStyles = makeStyles(t => ({
  plate: {backgroundColor: t.colors.white, borderRadius: t.radius.md, padding: t.space.sm},
}));
