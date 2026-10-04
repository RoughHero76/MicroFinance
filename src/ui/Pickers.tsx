// DateField (native date picker) and SelectField (U-07: chips for ≤7
// options, a picker sheet for longer lists such as the 22 durations).

import React, {useRef, useState} from 'react';
import {Pressable, View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {formatDate} from '@/lib/format';
import {makeStyles} from '@/theme';
import {Icon} from './Icon';
import {BottomSheet, type SheetHandle} from './Sheet';
import {Text} from './Text';

interface FieldShellProps {
  label?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  value: string;
  placeholder?: string;
  icon: string;
  onPress: () => void;
  onClear?: () => void;
  disabled?: boolean;
}

function FieldShell({
  label,
  required,
  error,
  hint,
  value,
  placeholder,
  icon,
  onPress,
  onClear,
  disabled,
}: FieldShellProps) {
  const s = useStyles();
  return (
    <View style={s.container}>
      {label ? (
        <Text variant="label" color="muted" style={s.label}>
          {label}
          {required ? <Text color="danger"> *</Text> : null}
        </Text>
      ) : null}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${value || placeholder || ''}` : value}
        style={[s.field, !!error && s.errored, disabled && s.disabled]}>
        <Text variant="bodyLg" color={value ? 'text' : 'muted'} style={s.value} numberOfLines={1}>
          {value || placeholder}
        </Text>
        {onClear && value ? (
          <Pressable onPress={onClear} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear">
            <Icon name="close-circle" size={18} color="muted" />
          </Pressable>
        ) : (
          <Icon name={icon} size={20} color="muted" />
        )}
      </Pressable>
      {error ? (
        <Text variant="caption" color="danger" style={s.below}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="muted" style={s.below}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export interface DateFieldProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  required?: boolean;
  error?: string | null;
  minimumDate?: Date;
  maximumDate?: Date;
  clearable?: boolean;
  disabled?: boolean;
}

export function DateField({
  label,
  value,
  onChange,
  required,
  error,
  minimumDate,
  maximumDate,
  clearable,
  disabled,
}: DateFieldProps) {
  const {t, lang} = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldShell
        label={label}
        required={required}
        error={error}
        value={value ? formatDate(value, lang) : ''}
        placeholder={t('common.selectDate')}
        icon="calendar"
        onPress={() => setOpen(true)}
        onClear={clearable ? () => onChange(null) : undefined}
        disabled={disabled}
      />
      {open ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) {
              onChange(date);
            }
          }}
        />
      ) : null}
    </>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface SelectFieldProps<T extends string> {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  required?: boolean;
  error?: string | null;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
  error,
  hint,
  placeholder,
  disabled,
}: SelectFieldProps<T>) {
  const {t} = useTranslation();
  const s = useStyles();
  const sheet = useRef<SheetHandle>(null);
  const selected = options.find(o => o.value === value);
  return (
    <>
      <FieldShell
        label={label}
        required={required}
        error={error}
        hint={hint}
        value={selected?.label ?? ''}
        placeholder={placeholder ?? t('common.select')}
        icon="chevron-down"
        onPress={() => sheet.current?.open()}
        disabled={disabled}
      />
      <BottomSheet ref={sheet} title={label} snapPoints={options.length > 8 ? ['60%'] : undefined}>
        {options.map(option => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                onChange(option.value);
                sheet.current?.close();
              }}
              accessibilityRole="radio"
              accessibilityState={{selected: isSelected}}
              style={({pressed}) => [s.option, pressed && s.optionPressed]}>
              <View style={s.optionText}>
                <Text
                  variant="bodyLg"
                  weight={isSelected ? 'semibold' : 'regular'}
                  color={isSelected ? 'primary' : 'text'}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text variant="small" color="muted">
                    {option.description}
                  </Text>
                ) : null}
              </View>
              {isSelected ? <Icon name="check" size={20} color="primary" /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </>
  );
}

const useStyles = makeStyles(t => ({
  container: {marginBottom: t.space.md},
  label: {marginBottom: t.space.xs},
  field: {
    minHeight: t.size.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  errored: {borderColor: t.colors.danger},
  disabled: {backgroundColor: t.colors.surface2},
  value: {flex: 1},
  below: {marginTop: t.space.xs},
  option: {flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: t.space.sm, gap: t.space.md},
  optionPressed: {opacity: 0.6},
  optionText: {flex: 1},
}));
