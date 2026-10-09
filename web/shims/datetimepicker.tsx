// @react-native-community/datetimepicker on the web. Like the Android
// picker, rendering it opens a dialog; it answers through onChange with
// type "set" (a date was chosen) or "dismissed".

import React, {useState} from 'react';
import {createPortal} from 'react-dom';
import i18n from '@/i18n';
import {useTheme} from '@/theme';

interface Props {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  onChange?: (event: {type: 'set' | 'dismissed'}, date?: Date) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toInput = (d?: Date) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : undefined);

/** "2026-10-05" -> that day, keeping the time of day of `base`. */
export function fromInput(text: string, base: Date): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), base.getHours(), base.getMinutes());
}

export default function DateTimePicker({value, minimumDate, maximumDate, onChange}: Props) {
  const t = useTheme();
  const [text, setText] = useState(toInput(value) ?? '');
  const chosen = fromInput(text, value);

  return createPortal(
    <div style={{position: 'fixed', inset: 0, zIndex: 100000, display: 'grid', placeItems: 'center'}}>
      <div
        onClick={() => onChange?.({type: 'dismissed'})}
        style={{position: 'absolute', inset: 0, background: 'rgba(8, 12, 20, 0.5)'}}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          background: t.colors.surface,
          color: t.colors.text,
          borderRadius: 16,
          padding: 20,
          width: 'min(320px, 92vw)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          fontFamily: 'inherit',
        }}>
        <div style={{fontWeight: 700, marginBottom: 12}}>{i18n.t('common.selectDate')}</div>
        <input
          type="date"
          autoFocus
          value={text}
          min={toInput(minimumDate)}
          max={toInput(maximumDate)}
          onChange={e => setText(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            fontSize: 16,
            borderRadius: 10,
            border: `1px solid ${t.colors.border}`,
            background: t.colors.bg,
            color: t.colors.text,
          }}
        />
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16}}>
          <button
            type="button"
            onClick={() => onChange?.({type: 'dismissed'})}
            style={{padding: '8px 14px', border: 0, background: 'transparent', color: t.colors.muted, fontWeight: 600, cursor: 'pointer'}}>
            {i18n.t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!chosen}
            onClick={() => chosen && onChange?.({type: 'set'}, chosen)}
            style={{padding: '8px 16px', border: 0, borderRadius: 10, background: t.colors.primary, color: t.colors.onPrimary, fontWeight: 700, cursor: 'pointer', opacity: chosen ? 1 : 0.5}}>
            {i18n.t('common.done')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
