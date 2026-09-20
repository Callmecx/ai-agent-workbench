<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { init, use, type EChartsType, type EChartsCoreOption } from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useSettingsStore } from '../stores/settingsStore';
use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);
const props = defineProps<{ option: EChartsCoreOption; label: string }>(); const element = ref<HTMLDivElement>(); const settings = useSettingsStore(); let chart: EChartsType | undefined; let observer: ResizeObserver | undefined;
function update() { chart?.setOption({ backgroundColor: 'transparent', color: ['#779e55', '#bed396', '#577862', '#d6bd88', '#bda788', '#e0e8d2'], textStyle: { fontFamily: 'DM Sans, sans-serif', color: '#97a18c' }, ...props.option }, true); }
onMounted(() => { if (!element.value) return; chart = init(element.value); update(); observer = new ResizeObserver(() => chart?.resize()); observer.observe(element.value); });
watch(() => props.option, update, { deep: true }); watch(() => settings.settings.theme, update);
onBeforeUnmount(() => { observer?.disconnect(); chart?.dispose(); chart = undefined; });
</script>
<template><div ref="element" class="metric-chart" role="img" :aria-label="label"></div></template>
<style scoped>.metric-chart{height:220px;width:100%;min-width:0}</style>
