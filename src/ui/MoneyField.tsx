// ₹ amount field: groups digits while typing (P-02) and reads the amount in
// words underneath (P-01), in Hindi when the app is in Hindi.

import React, {forwardRef} from 'react';
import type {TextInput} from 'react-native';
import {useI18n} from '@/i18n';
import {amountInWords, formatMoneyInput, parseMoney} from '@/lib/format';
import {TextField, type TextFieldProps} from './TextField';

export interface MoneyFieldProps extends Omit<TextFieldProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value: number | null;
  onChangeValue: (value: number | null) => void;
  /** Show the amount in words under the field (default on). */
  showWords?: boolean;
}

export const MoneyField = forwardRef<TextInput, MoneyFieldProps>(function MoneyField(
  {value, onChangeValue, showWords = true, hint, error, ...rest},
  ref,
) {
  const {lang} = useI18n();
  const [text, setText] = React.useState(value == null ? '' : formatMoneyInput(String(value)));

  // Follow outside changes (e.g. a pre-filled due amount).
  React.useEffect(() => {
    if (parseMoney(text) !== value) {
      setText(value == null ? '' : formatMoneyInput(String(value)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const words = showWords && value ? amountInWords(value, lang) : '';

  return (
    <TextField
      ref={ref}
      prefix="₹"
      keyboardType="decimal-pad"
      value={text}
      onChangeText={next => {
        const formatted = formatMoneyInput(next);
        setText(formatted);
        onChangeValue(parseMoney(formatted));
      }}
      error={error}
      hint={words ? (hint ? `${words}\n${hint}` : words) : hint}
      {...rest}
    />
  );
});
