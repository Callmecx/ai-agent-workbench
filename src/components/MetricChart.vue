<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { init, use, type EChartsType, type EChartsCoreOption } from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSettingsStore } from '../stores/settingsStore';
use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);
const props = defineProps<{ option: EChartsCoreOption; label: string }>();
const element = ref<HTMLDivElement>();
const settings = useSettingsStore();
let chart: EChartsType | undefined;
let observer: ResizeObserver | undefined;
function update() {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const color = token('--text-tertiary');
  const option = { ...props.option };
  for (const key of ['xAxis', 'yAxis']) {
    const axis = option[key] as { axisLabel?: object; splitLine?: object } | undefined;
    if (axis)
      option[key] = {
        ...axis,
        axisLabel: { ...axis.axisLabel, color },
        splitLine: {
          ...axis.splitLine,
          lineStyle: { color: token('--border-subtle'), type: 'dashed' },
        },
      };
  }
  const legend = option.legend as { textStyle?: object } | undefined;
  if (legend)
    option.legend = {
      ...legend,
      textStyle: { ...legend.textStyle, color },
      pageTextStyle: { color },
    };
  if (Array.isArray(option.series))
    option.series = option.series.map((series) =>
      series.type === 'pie'
        ? {
            ...series,
            data: series.data.map((item: { name: string; value: number }) => ({
              ...item,
              ...(item.name === 'Success' || item.name === 'Error' || item.name === 'Aborted'
                ? {
                    itemStyle: {
                      color: token(
                        item.name === 'Success'
                          ? '--success'
                          : item.name === 'Error'
                            ? '--danger'
                            : '--warning',
                      ),
                    },
                  }
                : {}),
            })),
          }
        : series,
    );
  chart?.setOption(
    {
      ...option,
      backgroundColor: 'transparent',
      color: ['--accent-primary', '--info', '--text-tertiary', '--accent-border', '--success'].map(
        token,
      ),
      textStyle: { fontFamily: 'DM Sans, sans-serif', color },
      tooltip: {
        ...(option.tooltip as object),
        backgroundColor: token('--surface-primary'),
        borderColor: token('--border-default'),
        textStyle: { color: token('--text-primary'), fontSize: 12 },
        extraCssText: 'border-radius:8px;box-shadow:' + token('--shadow-md'),
        confine: true,
      },
    },
    true,
  );
}
onMounted(() => {
  if (!element.value) return;
  chart = init(element.value);
  update();
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(element.value);
});
watch(() => props.option, update, { deep: true });
watch(() => settings.settings.theme, update, { flush: 'post' });
onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
  chart = undefined;
});
</script>
<template><div ref="element" class="metric-chart" role="img" :aria-label="label"></div></template>
<style scoped>
.metric-chart {
  height: 210px;
  width: 100%;
  min-width: 0;
}
</style>
