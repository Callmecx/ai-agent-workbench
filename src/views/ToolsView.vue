<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  Play,
  Wrench,
  Workflow,
  Check,
  CircleAlert,
  LoaderCircle,
  UserRound,
  Terminal,
  FileText,
  Calculator,
  TrendingUp,
  CloudSun,
  ScanSearch,
  Square,
  RotateCcw,
  Braces,
} from 'lucide-vue-next';
import PageHeading from '../components/PageHeading.vue';
import RequestFeedback from '../components/RequestFeedback.vue';
import MarkdownContent from '../components/MarkdownContent.vue';
import JsonBlock from '../components/JsonBlock.vue';
import { useRequest } from '../composables/useRequest';
import { toolsService } from '../services/tools';
import { routeTool } from '../utils/toolRouting';
import type { ToolCall, ToolDefinition } from '../types';
const initial = useRequest();
const request = useRequest();
const tools = ref<ToolDefinition[]>([]);
const input = ref('Calculate (128 + 64) * 3');
const selected = ref('auto');
const argsText = ref('');
const call = ref<ToolCall>();
const phase = ref(0);
const fail = ref(false);
const finalAnswer = ref('');
async function load() {
  const data = await initial.run((signal) => toolsService.list(signal));
  if (data) tools.value = data;
}
onMounted(load);
function choose(name: string) {
  selected.value = name;
  const tool = tools.value.find((t) => t.name === name);
  argsText.value = tool
    ? JSON.stringify(
        Object.fromEntries(
          Object.entries(tool.parameters).map(([key, value]) => [
            key,
            key === 'top_k' ? Number(value) : value,
          ]),
        ),
        null,
        2,
      )
    : '';
}
async function execute() {
  if (request.loading.value) return;
  call.value = undefined;
  finalAnswer.value = '';
  phase.value = 1;
  const data = await request.run(async (signal) => {
    const routed =
      selected.value === 'auto'
        ? routeTool(input.value)
        : {
            name: selected.value,
            arguments: JSON.parse(argsText.value) as Record<string, unknown>,
          };
    call.value = { id: crypto.randomUUID(), ...routed, status: 'PENDING', durationMs: 0 };
    phase.value = 2;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    phase.value = 3;
    call.value.status = 'RUNNING';
    return toolsService.execute(routed.name, routed.arguments, fail.value, signal);
  });
  if (data) {
    call.value = data;
    phase.value = 5;
    const output = data.result?.output;
    finalAnswer.value =
      data.name === 'calculate'
        ? `### Calculation complete\n\n\`${String(output?.expression)}\` = **${String(output?.value)}**\n\nEvaluated by the server's restricted arithmetic parser.`
        : data.name === 'get_market_data'
          ? `### Market snapshot · Mock\n\n**${String(output?.symbol)}** has a fictional sample price of **$${Number(output?.price).toLocaleString()}**, with a sample change of **${String(output?.changePercent)}%**.\n\n> This is a deterministic tool demonstration. It is not current market data or an investment recommendation.`
          : data.name === 'get_weather'
            ? `### Weather fixture · Mock\n\nSample conditions for **${String(output?.city)}**: ${String(output?.condition)}, **${String(output?.temperature)}°C**.\n\nThis is not a live forecast.`
            : '### Knowledge search complete\n\nInspect the tool result for matched chunks and their sources. This demonstration uses lexical scoring; no model reasoning or semantic quality is implied.';
  } else {
    const failedCall = call.value as ToolCall | undefined;
    if (failedCall) {
      failedCall.status = 'FAILED';
      failedCall.error = request.error.value?.message || 'Execution cancelled';
    }
  }
}
const steps = [
  'User request',
  'Tool request',
  'Tool call',
  'Tool execution',
  'Tool result',
  'Final answer',
];
const stepIcons = [UserRound, Workflow, Braces, Terminal, Check, FileText];
const toolIcons: Record<string, typeof Wrench> = {
  calculate: Calculator,
  get_market_data: TrendingUp,
  get_weather: CloudSun,
  search_knowledge: ScanSearch,
};
function stepStatus(index: number) {
  if (call.value?.status === 'FAILED' && index === phase.value)
    return request.state.value === 'ABORTED' ? 'Cancelled' : 'Failed';
  if (phase.value === 5 || index < phase.value) return 'Complete';
  return index === phase.value ? 'Running' : 'Pending';
}
</script>
<template>
  <div class="page">
    <PageHeading
      title="Agent Tools"
      description="Make every tool call visible, inspectable, and explainable."
      ><span class="quiet-badge"><Workflow :size="14" /> Observable execution</span></PageHeading
    >
    <div class="tool-cards">
      <button
        v-for="tool in tools"
        :key="tool.name"
        class="tool-card"
        :class="{ selected: selected === tool.name }"
        :disabled="request.loading.value"
        @click="choose(tool.name)"
      >
        <span class="tool-icon"><component :is="toolIcons[tool.name] || Wrench" :size="18" /></span
        ><span class="tiny-badge">{{ tool.mock ? 'Demo' : 'Local' }}</span>
        <h3>{{ tool.name }}</h3>
        <p>{{ tool.description }}</p>
        <small>{{ Object.keys(tool.parameters).join(' · ') }}</small>
      </button>
    </div>
    <RequestFeedback
      :state="initial.state.value"
      :error="initial.error.value"
      @retry="load"
      @abort="initial.abort"
    />
    <div class="two-col">
      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>Run an agent workflow</h2>
            <p>Rule-based routing, typed arguments, observable results.</p>
          </div>
          <Workflow :size="20" class="muted" />
        </div>
        <div class="form-stack">
          <label
            >User request<el-input
              v-model="input"
              aria-label="Agent request"
              type="textarea"
              :rows="3"
              :disabled="request.loading.value" /></label
          ><label
            >Tool selection<el-select
              :model-value="selected"
              aria-label="Tool selection"
              :disabled="request.loading.value"
              @change="choose"
              ><el-option label="Auto · demo keyword router" value="auto" /><el-option
                v-for="tool in tools"
                :key="tool.name"
                :label="tool.name"
                :value="tool.name" /></el-select></label
          ><label v-if="selected !== 'auto'"
            >JSON arguments<el-input
              v-model="argsText"
              aria-label="Tool JSON arguments"
              type="textarea"
              :rows="3"
              :disabled="request.loading.value"
          /></label>
          <details class="developer-controls">
            <summary>Diagnostics</summary>
            <el-checkbox v-model="fail" :disabled="request.loading.value"
              >Simulate tool failure</el-checkbox
            >
          </details>
        </div>
        <div class="form-actions">
          <el-button
            type="primary"
            :icon="Play"
            :loading="request.loading.value"
            :disabled="!input.trim()"
            @click="execute"
            >Run workflow</el-button
          ><el-button v-if="request.loading.value" :icon="Square" @click="request.abort"
            >Cancel</el-button
          ><el-button
            v-else-if="call"
            :icon="RotateCcw"
            @click="
              fail = false;
              execute();
            "
            >Run again</el-button
          >
        </div>
        <RequestFeedback
          :state="request.state.value"
          :error="request.error.value"
          @retry="
            fail = false;
            execute();
          "
          @abort="request.abort"
        />
        <div class="notice">
          Demo routing and summaries · real local arithmetic. Market and weather results use sample
          data.
          <details>
            <summary>About this workflow</summary>
            Steps show execution status and tool outputs. Routing and summaries are deterministic in
            both modes; no model reasoning is exposed.
          </details>
        </div>
      </section>
      <section class="panel execution-panel">
        <div class="panel-title">
          <h2>Execution trace</h2>
          <span class="tiny-badge">{{ call?.status || 'READY TO RUN' }}</span>
        </div>
        <div v-if="!call" class="empty-state">
          <Workflow :size="35" />
          <h3>From request to result</h3>
          <p>Run a workflow to inspect each step of the tool lifecycle.</p>
          <button
            class="text-button"
            :disabled="!input.trim() || request.loading.value"
            @click="execute"
          >
            Run your first workflow →
          </button>
        </div>
        <div v-else class="execution-trace">
          <div
            v-for="(step, index) in steps"
            :key="step"
            class="trace-step"
            :class="{
              complete: stepStatus(index) === 'Complete',
              current: stepStatus(index) === 'Running',
              failed: stepStatus(index) === 'Failed' || stepStatus(index) === 'Cancelled',
            }"
          >
            <div class="trace-rail">
              <span
                ><CircleAlert
                  v-if="stepStatus(index) === 'Failed' || stepStatus(index) === 'Cancelled'"
                  :size="14" /><LoaderCircle
                  v-else-if="stepStatus(index) === 'Running'"
                  :size="14" /><component v-else :is="stepIcons[index]" :size="14"
              /></span>
            </div>
            <div class="trace-content">
              <div class="trace-title">
                <strong>{{ step }}</strong
                ><span class="trace-status">{{ stepStatus(index) }}</span
                ><small v-if="index === 3 && call.durationMs">{{ call.durationMs }} ms</small>
              </div>
              <p v-if="index === 0">{{ input }}</p>
              <p v-if="index === 1">
                {{ call.name }} ·
                {{ selected === 'auto' ? 'Demo keyword router' : 'Explicitly selected' }}
              </p>
              <details v-if="index === 2">
                <summary>
                  <Braces :size="13" /> Arguments · {{ Object.keys(call.arguments).length }} fields
                </summary>
                <JsonBlock :value="call.arguments" />
              </details>
              <p v-if="index === 3">
                {{ call.status }} <span v-if="call.error">· {{ call.error }}</span>
              </p>
              <details v-if="index === 4 && call.result">
                <summary>
                  <Braces :size="13" /> JSON result ·
                  {{ call.result.mock ? 'Mock' : 'Locally computed' }}
                </summary>
                <JsonBlock :value="call.result.output" />
              </details>
              <MarkdownContent v-if="index === 5 && finalAnswer" :content="finalAnswer" />
              <p v-if="phase < index" class="muted">Waiting for previous step</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
