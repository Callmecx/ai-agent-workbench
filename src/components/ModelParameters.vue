<script setup lang="ts">
import { useSettingsStore } from '../stores/settingsStore';
defineProps<{ disabled?: boolean }>();
const store = useSettingsStore();
</script>
<template>
  <div class="model-parameters">
    <label
      >Model
      <el-select v-model="store.settings.model" aria-label="Model" :disabled="disabled"
        ><el-option
          v-for="model in store.availableModels"
          :key="model.id"
          :label="model.name.replace('Mock', 'Demo')"
          :value="model.id"
          :disabled="!model.available" /></el-select
    ></label>
    <p class="field-help">
      {{ store.availableModels.find((m) => m.id === store.settings.model)?.description }}
    </p>
    <label
      >Temperature <span>{{ store.settings.temperature }}</span
      ><el-slider
        v-model="store.settings.temperature"
        aria-label="Temperature"
        :min="0"
        :max="2"
        :step="0.1"
        :disabled="disabled"
    /></label>
    <div class="range-labels"><span>Precise</span><span>Creative</span></div>
    <label
      >Max tokens
      <el-input-number
        v-model="store.settings.maxTokens"
        aria-label="Max tokens"
        :min="16"
        :max="8192"
        :step="128"
        controls-position="right"
        :disabled="disabled" /></label
    ><label
      >Context length
      <el-select
        v-model="store.settings.contextLength"
        aria-label="Context length"
        :disabled="disabled"
        ><el-option
          v-for="size in [4096, 8192, 16000, 32000, 64000]"
          :key="size"
          :label="size.toLocaleString() + ' tokens'"
          :value="size" /></el-select></label
    ><label
      >Top P
      <el-slider
        v-model="store.settings.topP"
        aria-label="Top P"
        :min="0"
        :max="1"
        :step="0.05"
        :disabled="disabled"
    /></label>
  </div>
</template>
