import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Path, Polyline, Line, Circle, Pie, G } from 'react-native-svg';
import { colors, spacing, type } from './tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - spacing.xl * 2;

/* ------------------------------------------------------------------ */
/* DonutChart                                                          */
/* ------------------------------------------------------------------ */

/**
 * DonutChart
 * ----------
 *   <DonutChart data={[{label, value, color}]} centerValue="1,240" centerLabel="Total" />
 */
const DonutChart = ({
  data = [],
  size = 180,
  thickness = 26,
  centerValue,
  centerLabel,
  style,
}) => {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0) || 1;
  const innerRadius = Math.max(0, (size - thickness) / 2);

  let angle = -90; // start at 12 o'clock
  const segments = data.map((d) => {
    const frac = (Number(d.value) || 0) / total;
    const sweep = frac * 360;
    const seg = {
      ...d,
      startAngle: angle,
      endAngle: angle + sweep,
    };
    angle += sweep;
    return seg;
  });

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={innerRadius + thickness / 2} stroke={colors.inkFaint} strokeWidth={thickness} fill="none" />
        {segments.map((s, i) => {
          const sweep = s.endAngle - s.startAngle;
          if (sweep <= 0) return null;
          return (
            <Pie
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={innerRadius + thickness / 2}
              innerRadius={innerRadius}
              startAngle={s.startAngle}
              endAngle={s.endAngle}
              fill={s.color || colors.accent}
            />
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        {centerValue ? (
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>
            {centerValue}
          </Text>
        ) : null}
        {centerLabel ? (
          <Text numberOfLines={1} style={[type.caption, { color: colors.inkMuted }]}>
            {centerLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* BarChart                                                            */
/* ------------------------------------------------------------------ */

/**
 * BarChart — vertical bars with baseline labels.
 *   <BarChart data={[{label, value, color?}]} height={180} />
 */
const BarChart = ({ data = [], height = 180, color = colors.primary, barColor, formatValue = (v) => v, style }) => {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));

  return (
    <View style={style}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
        {data.map((d, i) => {
          const v = Number(d.value) || 0;
          const h = Math.max(4, (v / max) * (height - 24));
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[type.micro, { color: colors.inkMuted, marginBottom: 4 }]}>
                {v ? formatValue(v) : ''}
              </Text>
              <View
                style={{
                  width: '70%',
                  maxWidth: 34,
                  height: h,
                  borderRadius: 8,
                  backgroundColor: d.color || barColor || color,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[type.micro, { color: colors.inkMuted }]}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* LineChart / Sparkline                                               */
/* ------------------------------------------------------------------ */

/**
 * LineChart — smooth-ish line with area fill, grid and baseline labels.
 *   <LineChart data={[{label, value}]} height={180} />
 */
const LineChart = ({
  data = [],
  height = 180,
  color = colors.primary,
  fill = true,
  showLabels = true,
  formatValue = (v) => v,
  style,
}) => {
  const padTop = 20;
  const padBottom = showLabels ? 26 : 8;
  const innerH = height - padTop - padBottom;
  const values = data.map((d) => Number(d.value) || 0);
  const max = Math.max(1, ...values);
  const min = 0;
  const range = max - min || 1;
  const n = Math.max(2, data.length);
  const stepX = CHART_W / (n - 1);

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = padTop + innerH - ((Number(d.value) || 0) / range) * innerH;
    return { x, y };
  });

  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaD = points.length
    ? `${lineD} L ${CHART_W} ${padTop + innerH} L 0 ${padTop + innerH} Z`
    : '';

  return (
    <View style={style}>
      <Svg width={CHART_W} height={height}>
        {/* grid */}
        {[0, 0.5, 1].map((f, i) => {
          const y = padTop + innerH * f;
          return <Line key={i} x1={0} y1={y} x2={CHART_W} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray="4 5" />;
        })}
        {fill && <Path d={areaD} fill={color} opacity={0.1} />}
        <Path d={lineD} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={colors.surface} stroke={color} strokeWidth={2} />
        ))}
      </Svg>
      {showLabels ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          {data.map((d, i) => (
            <Text key={i} numberOfLines={1} adjustsFontSizeToFit style={[type.micro, { color: colors.inkMuted, width: 48, textAlign: i === 0 ? 'left' : i === data.length - 1 ? 'right' : 'center' }]}>
              {d.label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

/**
 * Sparkline — compact line, no axes. Good inside stat cards / list rows.
 *   <Sparkline values={[4, 8, 6, 10]} width={120} height={36} color={...} />
 */
const Sparkline = ({ values = [], width = 120, height = 36, color = colors.primary, fill = true, style }) => {
  const vals = values.map((v) => Number(v) || 0);
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  const n = Math.max(2, vals.length);
  const stepX = width / (n - 1);
  const points = vals.map((v, i) => ({
    x: i * stepX,
    y: height - 4 - ((v - min) / range) * (height - 8),
  }));
  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${lineD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <Svg width={width} height={height} style={style}>
      {fill && <Path d={areaD} fill={color} opacity={0.12} />}
      <Path d={lineD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

/* ------------------------------------------------------------------ */
/* ProgressRing                                                        */
/* ------------------------------------------------------------------ */

/**
 * ProgressRing — circular progress with a value in the center.
 *   <ProgressRing progress={0.72} size={120} />
 */
const ProgressRing = ({
  progress = 0,
  size = 120,
  thickness = 12,
  color = colors.accent,
  trackColor = colors.inkFaint,
  centerValue,
  centerLabel,
  style,
}) => {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={thickness} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeDasharray={`${clamped * c} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        {centerValue ? (
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: size * 0.2, fontWeight: '800', color: colors.ink }}>
            {centerValue}
          </Text>
        ) : null}
        {centerLabel ? <Text numberOfLines={1} style={[type.caption, { color: colors.inkMuted }]}>{centerLabel}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export { DonutChart, BarChart, LineChart, Sparkline, ProgressRing };
