// react-native-linear-gradient on the web: a View with a CSS gradient.

import React from 'react';
import {View, type StyleProp, type ViewProps, type ViewStyle} from 'react-native';

interface Point {
  x: number;
  y: number;
}

export interface LinearGradientProps extends ViewProps {
  colors: string[];
  start?: Point;
  end?: Point;
  locations?: number[];
  style?: StyleProp<ViewStyle>;
}

/** CSS angles run clockwise from "up"; the phone library uses two points. */
export function gradientCss(colors: string[], start: Point, end: Point, locations?: number[]): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
  const stops = colors
    .map((color, i) => {
      const at = locations?.[i] ?? (colors.length > 1 ? i / (colors.length - 1) : 0);
      return `${color} ${Math.round(at * 100)}%`;
    })
    .join(', ');
  return `linear-gradient(${angle}deg, ${stops})`;
}

export default function LinearGradient({
  colors,
  start = {x: 0.5, y: 0},
  end = {x: 0.5, y: 1},
  locations,
  style,
  children,
  ...rest
}: LinearGradientProps) {
  const background = {backgroundImage: gradientCss(colors, start, end, locations)} as unknown as ViewStyle;
  return (
    <View {...rest} style={[style, background]}>
      {children}
    </View>
  );
}
