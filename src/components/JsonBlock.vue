<script setup lang="ts">
import { computed } from 'vue';
import MarkdownContent from './MarkdownContent.vue';
const props = defineProps<{ value: unknown }>();
const content = computed(() => '```json\n' + JSON.stringify(props.value, null, 2) + '\n```');
</script>
<template><MarkdownContent :content="content" /></template>
