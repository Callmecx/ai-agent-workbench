import type { EChartsCoreOption } from 'echarts/core';
import type { MetricRecord } from '../types';
export function dailySeries(records: MetricRecord[], from: string, to: string) {
  const result: {
    date: string;
    requests: number;
    tokens: number;
    latency: number;
    retrieval: number;
  }[] = [];
  const end = new Date(`${to}T00:00:00Z`);
  const cursor = new Date(`${from}T00:00:00Z`);
  for (let i = 0; cursor <= end && i < 366; i++, cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    const day = records.filter((r) => r.timestamp.slice(0, 10) === date);
    result.push({
      date,
      requests: day.length,
      tokens: day.reduce((s, r) => s + r.tokens, 0),
      latency: day.length ? Math.round(day.reduce((s, r) => s + r.latencyMs, 0) / day.length) : 0,
      retrieval: day.filter((r) => r.kind === 'retrieval').length,
    });
  }
  return result;
}
export function trend(
  labels: string[],
  values: number[],
  type: 'line' | 'bar' = 'line',
  color = '#779e55',
): EChartsCoreOption {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 38, right: 15, top: 18, bottom: 30 },
    xAxis: {
      type: 'category',
      data: labels.map((d) => d.slice(5)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 9, color: '#a2ac97' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#a7b29a20', type: 'dashed' } },
      axisLabel: { fontSize: 9, color: '#a2ac97' },
    },
    series: [
      {
        type,
        data: values,
        smooth: true,
        symbol: 'none',
        barMaxWidth: 19,
        itemStyle: { color, borderRadius: [3, 3, 0, 0] },
        lineStyle: { width: 2, color },
        areaStyle: type === 'line' ? { color, opacity: 0.08 } : undefined,
      },
    ],
  };
}
export function distribution(
  records: MetricRecord[],
  by: 'model' | 'tool' | 'status',
): EChartsCoreOption {
  const counts = new Map<string, number>();
  records.forEach((r) => {
    const key =
      by === 'status'
        ? r.aborted
          ? 'Aborted'
          : r.success
            ? 'Success'
            : 'Error'
        : by === 'tool'
          ? r.tool
          : r.model;
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return {
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 9, color: '#96a18b' },
      icon: 'circle',
      itemWidth: 7,
      itemHeight: 7,
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['50%', '43%'],
        label: { show: false },
        itemStyle: { borderRadius: 3, borderWidth: 3, borderColor: 'transparent' },
        data: Array.from(counts, ([name, value]) => ({ name, value })),
      },
    ],
  };
}
