<script setup lang="ts">
import type { APIError, RequestState } from '../types';
import { CircleAlert } from 'lucide-vue-next';
defineProps<{ state: RequestState; error?: APIError }>();
defineEmits<{ retry: []; abort: [] }>();
</script>
<template>
  <div v-if="state === 'ERROR'" class="error-panel" role="alert">
    <CircleAlert :size="18" />
    <div>
      <strong>{{
        error?.code === 'TIMEOUT'
          ? 'The request took too long'
          : 'We couldn’t complete this request'
      }}</strong>
      <p>{{ error?.message || 'Something went wrong. Please retry.' }}</p>
      <details v-if="error?.code">
        <summary>Show details</summary>
        <small>{{ error.code }}</small
        ><small v-if="error.requestId">Request {{ error.requestId }}</small>
      </details>
    </div>
    <el-button size="small" @click="$emit('retry')">Retry</el-button>
  </div>
  <div v-else-if="state === 'ABORTED'" class="notice">
    Request cancelled. <button class="text-button" @click="$emit('retry')">Try again</button>
  </div>
  <div v-else-if="state === 'SUBMITTING'" class="request-loading">
    <span class="loading-dot"></span> Working…
    <button class="text-button" @click="$emit('abort')">Cancel</button>
  </div>
</template>
