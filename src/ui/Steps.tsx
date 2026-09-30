// StepTracker (lead progress, 5 steps), Stepper (form steps) and Timeline
// (remarks, activity). Built on fixed geometry: each step is centred in an
// equal-width column and the connecting line runs through the circle
// centres, so nothing drifts with label length ("these are crooked").

import React from 'react';
import { View } from 'react-native';
import { makeStyles } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

const CIRCLE = 24;

export interface StepTrackerProps {
  steps: string[];
  /** Index of the current step (0-based). Earlier steps show a check. */
  current: number;
  /** Mark the current step as failed (e.g. a rejected lead). */
  failed?: boolean;
  showLabels?: boolean;
}

export function StepTracker({ steps, current, failed, showLabels = true }: StepTrackerProps) {
  const s = useStyles();
  const n = steps.length;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={`${current + 1} / ${n}: ${steps[current] ?? ''}`}>
      <View style={s.track}>
        {/* The line spans from the first circle's centre to the last one's. */}
        <View style={[s.line, { left: `${50 / n}%`, right: `${50 / n}%` }]} />
        <View
          style={[
            s.line,
            s.lineDone,
            { left: `${50 / n}%`, width: `${(Math.max(0, Math.min(current, n - 1)) / n) * 100}%` },
          ]}
        />
        {steps.map((label, i) => {
          const done = i < current;
          const isCurrent = i === current;
          return (
            <View key={label} style={s.column}>
              <View style={[s.circle, done && s.circleDone, isCurrent && (failed ? s.circleFailed : s.circleCurrent)]}>
                {done ? (
                  <Icon name="check" size={14} color="onPrimary" />
                ) : isCurrent && failed ? (
                  <Icon name="close" size={14} color="white" />
                ) : (
                  <Text variant="caption" weight="bold" color={isCurrent ? 'onPrimary' : 'muted'}>
                    {i + 1}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      {showLabels ? (
        <View style={s.labels}>
          {steps.map((label, i) => (
            <Text
              key={label}
              variant="caption"
              color={i === current ? 'text' : 'muted'}
              weight={i === current ? 'semibold' : 'regular'}
              align="center"
              numberOfLines={2}
              style={s.label}>
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Form steps: "1 Terms · 2 Business · 3 Documents". */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return <StepTracker steps={steps} current={current} />;
}

export interface TimelineItem {
  key: string;
  title: string;
  body?: string;
  meta?: string;
  /** Right-aligned bubble for "your" remarks in a conversation. */
  mine?: boolean;
  tone?: 'default' | 'primary' | 'danger' | 'success';
}

/** Remarks as a short conversation, or an activity list. */
export function Timeline({ items, conversation }: { items: TimelineItem[]; conversation?: boolean }) {
  const s = useStyles();
  if (conversation) {
    return (
      <View style={s.conversation}>
        {items.map(item => (
          <View key={item.key} style={[s.bubble, item.mine ? s.bubbleMine : s.bubbleOther]}>
            <Text variant="body">{item.title}</Text>
            {item.meta ? (
              <Text variant="caption" color="muted" style={s.bubbleMeta}>
                {item.meta}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  }
  return (
    <View>
      {items.map((item, i) => (
        <View key={item.key} style={s.tlRow}>
          <View style={s.tlRail}>
            <View style={[s.tlDot, item.tone === 'danger' && s.tlDanger, item.tone === 'success' && s.tlSuccess]} />
            {i < items.length - 1 ? <View style={s.tlLine} /> : null}
          </View>
          <View style={s.tlBody}>
            <Text variant="body" weight="medium">
              {item.title}
            </Text>
            {item.body ? (
              <Text variant="small" color="muted">
                {item.body}
              </Text>
            ) : null}
            {item.meta ? (
              <Text variant="caption" color="muted">
                {item.meta}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(t => ({
  track: { flexDirection: 'row', alignItems: 'center', height: CIRCLE },
  line: { position: 'absolute', top: CIRCLE / 2 - 1, height: 2, backgroundColor: t.colors.border },
  lineDone: { backgroundColor: t.colors.primary },
  column: { flex: 1, alignItems: 'center' },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: t.colors.surface,
    borderWidth: 2,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  circleCurrent: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  circleFailed: { backgroundColor: t.colors.danger, borderColor: t.colors.danger },
  labels: { flexDirection: 'row', marginTop: t.space.xs },
  label: { flex: 1, paddingHorizontal: 2 },
  conversation: { gap: t.space.sm },
  bubble: { maxWidth: '85%', padding: t.space.md, borderRadius: t.radius.lg, gap: 2 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: t.colors.primarySoft, borderBottomRightRadius: 4 },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: t.colors.surface2, borderBottomLeftRadius: 4 },
  bubbleMeta: { marginTop: 2 },
  tlRow: { flexDirection: 'row', gap: t.space.md },
  tlRail: { width: 12, alignItems: 'center' },
  tlDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: t.colors.primary },
  tlDanger: { backgroundColor: t.colors.danger },
  tlSuccess: { backgroundColor: t.colors.success },
  tlLine: { flex: 1, width: 2, backgroundColor: t.colors.border, marginTop: 2 },
  tlBody: { flex: 1, paddingBottom: t.space.md, gap: 2 },
}));
