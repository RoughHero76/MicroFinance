import React from 'react';
import {Text as RNText, type TextProps as RNTextProps, type TextStyle} from 'react-native';
import {useTheme, type Theme} from '@/theme';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'bodyLg'
  | 'body'
  | 'small'
  | 'caption'
  | 'label'
  | 'overline';
export type TextColor =
  | 'text'
  | 'muted'
  | 'primary'
  | 'onPrimary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'onToast'
  | 'white';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: keyof Theme['weight'];
  align?: TextStyle['textAlign'];
  /** Fixed-width digits so money columns line up (U-11). */
  tabular?: boolean;
}

function variantStyle(t: Theme, variant: TextVariant): TextStyle {
  switch (variant) {
    case 'display':
      return {fontSize: t.font.display, lineHeight: 38, fontWeight: t.weight.bold};
    case 'h1':
      return {fontSize: t.font.h1, lineHeight: 30, fontWeight: t.weight.bold};
    case 'h2':
      return {fontSize: t.font.h2, lineHeight: 26, fontWeight: t.weight.semibold};
    case 'title':
      return {fontSize: t.font.title, lineHeight: 24, fontWeight: t.weight.semibold};
    case 'bodyLg':
      return {fontSize: t.font.bodyLg, lineHeight: 22};
    case 'small':
      return {fontSize: t.font.small, lineHeight: 18};
    case 'caption':
      return {fontSize: t.font.caption, lineHeight: 16};
    case 'label':
      return {fontSize: t.font.small, lineHeight: 18, fontWeight: t.weight.medium};
    case 'overline':
      return {
        fontSize: 11,
        lineHeight: 14,
        fontWeight: t.weight.semibold,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
      };
    default:
      return {fontSize: t.font.body, lineHeight: 20};
  }
}

export function Text({variant = 'body', color = 'text', weight, align, tabular, style, ...rest}: TextProps) {
  const t = useTheme();
  const base: TextStyle = {
    ...variantStyle(t, variant),
    color: t.colors[color],
    ...(weight ? {fontWeight: t.weight[weight]} : null),
    ...(align ? {textAlign: align} : null),
    ...(tabular ? {fontVariant: ['tabular-nums']} : null),
  };
  return <RNText style={[base, style]} {...rest} />;
}
