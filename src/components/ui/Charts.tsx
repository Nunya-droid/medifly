import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { chartColors, colors, radius, space } from '@/theme';
import { Text } from './Text';

/**
 * Lightweight SVG charts. Single y-axis, thin marks, recessive grid, hover/tap tooltips,
 * and values always available as text (legend, tooltip, or direct label).
 */

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function useWidth(initial = 300) {
  const [w, setW] = useState(initial);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.max(160, e.nativeEvent.layout.width));
  return { w, onLayout };
}

function Tooltip({ title, lines, x, chartWidth }: { title: string; lines: { label: string; value: string; color?: string }[]; x: number; chartWidth: number }) {
  const width = 150;
  const left = Math.max(0, Math.min(x - width / 2, chartWidth - width));
  return (
    <View pointerEvents="none" style={[styles.tooltip, { left, width }]}>
      <Text variant="caption" weight="semibold">
        {title}
      </Text>
      {lines.map((l) => (
        <View key={l.label} style={styles.ttRow}>
          {l.color ? <View style={[styles.swatch, { backgroundColor: l.color }]} /> : null}
          <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
            {l.label}
          </Text>
          <Text variant="caption" weight="semibold" tabular>
            {l.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ Bar chart (single or grouped series) */

export interface BarSeries {
  key: string;
  label: string;
  values: number[];
}

export function BarChart({ labels, series, height = 200, format = (v: number) => String(v), ariaLabel }: { labels: string[]; series: BarSeries[]; height?: number; format?: (v: number) => string; ariaLabel: string }) {
  const { w, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const padL = 34;
  const padB = 22;
  const plotH = height - padB - 8;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const groupW = (w - padL) / labels.length;
  const barGap = 2;
  const barW = Math.max(3, Math.min(22, (groupW * 0.62 - barGap * (series.length - 1)) / series.length));
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const labelEvery = labels.length > 10 ? 2 : 1;

  return (
    <View accessibilityLabel={ariaLabel}>
      {series.length > 1 ? <Legend items={series.map((s, i) => ({ label: s.label, color: chartColors[i] }))} /> : null}
      <View onLayout={onLayout} style={{ height }}>
        <Svg width={w} height={height}>
          {ticks.map((t) => {
            const y = 8 + plotH - (t / max) * plotH;
            return <Line key={t} x1={padL} x2={w} y1={y} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray={t === 0 ? undefined : '3 4'} />;
          })}
          {labels.map((_, gi) => {
            const groupX = padL + gi * groupW + (groupW - (barW * series.length + barGap * (series.length - 1))) / 2;
            return (
              <G key={gi} opacity={active == null || active === gi ? 1 : 0.45}>
                {series.map((s, si) => {
                  const v = s.values[gi] ?? 0;
                  const h = Math.max(v > 0 ? 2 : 0, (v / max) * plotH);
                  const x = groupX + si * (barW + barGap);
                  const y = 8 + plotH - h;
                  const r = Math.min(4, barW / 2, h);
                  // Rounded data-end, square baseline.
                  const d = h > 0 ? `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + h} Z` : '';
                  return d ? <Path key={s.key} d={d} fill={chartColors[si]} /> : null;
                })}
              </G>
            );
          })}
        </Svg>
        {/* Y-axis labels */}
        {ticks.map((t) => (
          <Text key={t} variant="caption" tone="muted" tabular style={[styles.yLabel, { top: 8 + plotH - (t / max) * plotH - 8 }]}>
            {format(t)}
          </Text>
        ))}
        {/* X labels */}
        <View style={[styles.xLabels, { left: padL }]}>
          {labels.map((l, i) => (
            <Text key={l + i} variant="caption" tone="muted" align="center" style={{ width: groupW, fontSize: 11 }} numberOfLines={1}>
              {i % labelEvery === 0 ? l : ''}
            </Text>
          ))}
        </View>
        {/* Hit targets wider than marks */}
        <View style={[StyleSheet.absoluteFill, { left: padL, flexDirection: 'row', bottom: padB }]}>
          {labels.map((l, i) => (
            <Pressable
              key={l + i}
              style={{ width: groupW, height: '100%' }}
              onHoverIn={() => setActive(i)}
              onHoverOut={() => setActive(null)}
              onPress={() => setActive(active === i ? null : i)}
              accessibilityLabel={`${l}: ${series.map((s) => `${s.label} ${format(s.values[i] ?? 0)}`).join(', ')}`}
            />
          ))}
        </View>
        {active != null ? (
          <Tooltip
            title={labels[active]}
            x={padL + active * groupW + groupW / 2}
            chartWidth={w}
            lines={series.map((s, i) => ({ label: s.label, value: format(s.values[active] ?? 0), color: chartColors[i] }))}
          />
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ Area/line chart (single series) */

export function AreaChart({ labels, values, height = 200, format = (v: number) => String(v), seriesLabel, ariaLabel, color = chartColors[0] }: { labels: string[]; values: number[]; height?: number; format?: (v: number) => string; seriesLabel: string; ariaLabel: string; color?: string }) {
  const { w, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const padL = 46;
  const padB = 22;
  const plotH = height - padB - 10;
  const max = niceMax(Math.max(1, ...values));
  const step = labels.length > 1 ? (w - padL - 8) / (labels.length - 1) : 0;
  const pt = (i: number) => ({ x: padL + i * step, y: 10 + plotH - (values[i] / max) * plotH });
  const line = values.map((_, i) => `${i === 0 ? 'M' : 'L'}${pt(i).x},${pt(i).y}`).join(' ');
  const area = values.length ? `${line} L${pt(values.length - 1).x},${10 + plotH} L${padL},${10 + plotH} Z` : '';
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const labelEvery = labels.length > 10 ? 3 : 1;

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel={ariaLabel}>
      <Svg width={w} height={height}>
        {ticks.map((t) => {
          const y = 10 + plotH - (t / max) * plotH;
          return <Line key={t} x1={padL} x2={w} y1={y} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray={t === 0 ? undefined : '3 4'} />;
        })}
        <Path d={area} fill={color} opacity={0.1} />
        <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {active != null ? (
          <>
            <Line x1={pt(active).x} x2={pt(active).x} y1={10} y2={10 + plotH} stroke={colors.borderStrong} strokeWidth={1} />
            <Circle cx={pt(active).x} cy={pt(active).y} r={5} fill={color} stroke={colors.surface} strokeWidth={2} />
          </>
        ) : values.length ? (
          <Circle cx={pt(values.length - 1).x} cy={pt(values.length - 1).y} r={4} fill={color} stroke={colors.surface} strokeWidth={2} />
        ) : null}
      </Svg>
      {ticks.map((t) => (
        <Text key={t} variant="caption" tone="muted" tabular style={[styles.yLabel, { width: padL - 6, top: 10 + plotH - (t / max) * plotH - 8 }]}>
          {format(t)}
        </Text>
      ))}
      <View style={[styles.xLabels, { left: padL - step / 2 }]}>
        {labels.map((l, i) => (
          <Text key={l + i} variant="caption" tone="muted" align="center" style={{ width: step || 40, fontSize: 11 }} numberOfLines={1}>
            {i % labelEvery === 0 || i === labels.length - 1 ? l : ''}
          </Text>
        ))}
      </View>
      <View style={[StyleSheet.absoluteFill, { left: padL - step / 2, flexDirection: 'row', bottom: padB }]}>
        {labels.map((l, i) => (
          <Pressable key={l + i} style={{ width: step || 40, height: '100%' }} onHoverIn={() => setActive(i)} onHoverOut={() => setActive(null)} onPress={() => setActive(active === i ? null : i)} accessibilityLabel={`${l}: ${format(values[i])}`} />
        ))}
      </View>
      {active != null ? <Tooltip title={labels[active]} x={pt(active).x} chartWidth={w} lines={[{ label: seriesLabel, value: format(values[active]), color }]} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ Donut with value legend */

export function DonutChart({ data, size = 150, centerLabel, centerValue, ariaLabel }: { data: { label: string; value: number }[]; size?: number; centerLabel: string; centerValue: string; ariaLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2;
  const stroke = 18;
  const inner = r - stroke / 2 - 2;
  const C = 2 * Math.PI * inner;
  const gap = data.filter((d) => d.value > 0).length > 1 ? 2 : 0;
  // Cumulative start offset of each segment.
  const starts = data.map((_, i) => data.slice(0, i).reduce((s, d) => s + (d.value / total) * C, 0));
  return (
    <View style={styles.donutWrap} accessibilityLabel={ariaLabel}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={r} cy={r} r={inner} stroke={colors.surfaceSunken} strokeWidth={stroke} fill="none" />
          {data.map((d, i) => {
            const len = (d.value / total) * C;
            return d.value > 0 ? (
                <Circle
                  key={d.label}
                  cx={r}
                  cy={r}
                  r={inner}
                  stroke={chartColors[i % chartColors.length]}
                  strokeWidth={active === i ? stroke + 3 : stroke}
                  strokeDasharray={`${Math.max(0, len - gap)} ${C}`}
                  strokeDashoffset={-starts[i]}
                  fill="none"
                  opacity={active == null || active === i ? 1 : 0.4}
                />
              ) : null;
          })}
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
          <Text variant="h2" tabular>
            {active != null ? data[active].value : centerValue}
          </Text>
          <Text variant="caption" tone="secondary" align="center" numberOfLines={1} style={{ maxWidth: size - 40 }}>
            {active != null ? data[active].label : centerLabel}
          </Text>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
        {data.map((d, i) => (
          <Pressable key={d.label} onHoverIn={() => setActive(i)} onHoverOut={() => setActive(null)} onPress={() => setActive(active === i ? null : i)} style={[styles.legendRow, active === i && { backgroundColor: colors.surfaceSunken }]}>
            <View style={[styles.swatch, { backgroundColor: chartColors[i % chartColors.length] }]} />
            <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
              {d.label}
            </Text>
            <Text variant="caption" weight="semibold" tabular>
              {d.value}
            </Text>
            <Text variant="caption" tone="muted" tabular style={{ width: 38, textAlign: 'right' }}>
              {Math.round((d.value / total) * 100)}%
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ Horizontal bar list (ranked) */

export function BarList({ data, format = (v: number) => String(v), color = chartColors[0] }: { data: { label: string; value: number; hint?: string }[]; format?: (v: number) => string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: space[3] }}>
      {data.map((d) => (
        <View key={d.label} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
            <Text variant="bodySm" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
              {d.label}
            </Text>
            <Text variant="bodySm" weight="semibold" tabular>
              {format(d.value)}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(d.value / max) * 100}%`, backgroundColor: color }]} />
          </View>
          {d.hint ? (
            <Text variant="caption" tone="muted">
              {d.hint}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.swatch, { backgroundColor: i.color }]} />
          <Text variant="caption" tone="secondary">
            {i.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: { position: 'absolute', top: 0, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space[2], gap: 3, boxShadow: '0 6px 20px rgba(14,42,63,0.14)' } as object,
  ttRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  yLabel: { position: 'absolute', left: 0, width: 28, textAlign: 'right', fontSize: 11 },
  xLabels: { position: 'absolute', bottom: 0, right: 0, flexDirection: 'row' },
  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: space[5], flexWrap: 'wrap' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: 5, paddingHorizontal: 6, borderRadius: radius.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4], marginBottom: space[3] },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
});
