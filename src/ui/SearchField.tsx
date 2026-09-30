import React, {useEffect, useRef, useState} from 'react';
import {Pressable, TextInput, View, type StyleProp, type ViewStyle} from 'react-native';
import {makeStyles, useTheme} from '@/theme';
import {Icon} from './Icon';
import {MAX_FONT_SCALE} from './Text';

export interface SearchFieldProps {
  value: string;
  /** Called 300 ms after typing stops (the existing search delay). */
  onSearch: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  debounceMs?: number;
}

export function SearchField({value, onSearch, placeholder, autoFocus, style, debounceMs = 300}: SearchFieldProps) {
  const t = useTheme();
  const s = useStyles();
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setText(value), [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (next: string) => {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(next.trim()), debounceMs);
  };

  return (
    <View style={[s.field, style]}>
      <Icon name="magnify" size={20} color="muted" />
      <TextInput
        style={s.input}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        value={text}
        onChangeText={change}
        placeholder={placeholder}
        placeholderTextColor={t.colors.muted}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={() => {
          clearTimeout(timer.current);
          onSearch(text.trim());
        }}
        accessibilityLabel={placeholder}
        autoCorrect={false}
      />
      {text ? (
        <Pressable onPress={() => change('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear">
          <Icon name="close-circle" size={18} color="muted" />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(t => ({
  field: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface2,
  },
  input: {flex: 1, fontSize: t.font.body, color: t.colors.text, paddingVertical: 0},
}));
