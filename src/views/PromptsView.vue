<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  Plus,
  Copy,
  Trash2,
  Play,
  Save,
  FlaskConical,
  History,
  Square,
  Braces,
} from 'lucide-vue-next';
import { ElMessage } from 'element-plus/es/components/message/index';
import { ElMessageBox } from 'element-plus/es/components/message-box/index';
import PageHeading from '../components/PageHeading.vue';
import RequestFeedback from '../components/RequestFeedback.vue';
import MarkdownContent from '../components/MarkdownContent.vue';
import { usePromptStore } from '../stores/promptStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useRequest } from '../composables/useRequest';
import { useStreaming } from '../composables/useStreaming';
import { renderTemplate, selectContext } from '../utils/context';
import { normalizeError } from '../api/client';
import type { Message, PromptTemplate } from '../types';
const store = usePromptStore();
const settings = useSettingsStore();
const request = useRequest();
const stream = useStreaming();
const draft = ref<PromptTemplate>();
const tab = ref('editor');
const rendered = ref('');
const newVariable = ref('');
const clone = (prompt: PromptTemplate) => JSON.parse(JSON.stringify(prompt)) as PromptTemplate;
const variableKeys = computed(() => [
  ...new Set(
    [...(draft.value?.userTemplate.matchAll(/\{\{\s*(\w+)\s*\}\}/g) || [])]
      .map((m) => m[1]!)
      .concat(Object.keys(draft.value?.variables || {})),
  ),
]);
const dirty = computed(
  () =>
    draft.value &&
    JSON.stringify(draft.value) !==
      JSON.stringify(store.prompts.find((p) => p.id === draft.value?.id)),
);
async function select(prompt: PromptTemplate) {
  if (stream.busy.value) return;
  if (dirty.value) {
    try {
      await ElMessageBox.confirm('Discard unsaved edits and switch prompts?', 'Unsaved changes', {
        confirmButtonText: 'Discard edits',
      });
    } catch {
      return;
    }
  }
  draft.value = clone(prompt);
  rendered.value = '';
  stream.content.value = '';
  stream.error.value = undefined;
}
async function load() {
  await request.run(() => store.load());
  if (!draft.value && store.prompts[0]) draft.value = clone(store.prompts[0]);
}
onMounted(load);
async function create(duplicate = false) {
  await request.run(async () => {
    const base =
      duplicate && draft.value
        ? { ...clone(draft.value), name: `${draft.value.name} (copy)` }
        : {
            name: 'Untitled prompt',
            systemPrompt:
              'You are a helpful assistant. Be precise and transparent about uncertainty.',
            userTemplate: 'Explain {{topic}}.',
            variables: { topic: 'AI applications' },
            fewShots: [],
            temperature: 0.7,
            maxTokens: 1024,
            topP: 1,
          };
    draft.value = clone(await store.save({ ...base, id: undefined, versions: [] }));
    rendered.value = '';
    stream.content.value = '';
  });
}
async function save(version = false) {
  if (!draft.value) return;
  const saved = await request.run(() => store.save(draft.value!, version));
  if (saved) {
    draft.value = clone(saved);
    ElMessage.success(version ? 'Version saved' : 'Prompt saved');
  }
}
async function remove() {
  if (!draft.value) return;
  try {
    await ElMessageBox.confirm('Delete this prompt and its saved versions?', 'Delete prompt', {
      type: 'warning',
    });
    await request.run(() => store.remove(draft.value!.id));
    draft.value = store.prompts[0] ? clone(store.prompts[0]) : undefined;
  } catch {
    /* Cancelled */
  }
}
function addVariable() {
  if (draft.value && /^\w+$/.test(newVariable.value)) {
    draft.value.variables[newVariable.value] = '';
    newVariable.value = '';
  }
}
async function test() {
  if (!draft.value || stream.busy.value) return;
  try {
    rendered.value = renderTemplate(draft.value.userTemplate, draft.value.variables);
    const make = (role: Message['role'], content: string): Message => ({
      id: crypto.randomUUID(),
      role,
      content,
      createdAt: new Date().toISOString(),
    });
    const messages = [
      make('system', draft.value.systemPrompt),
      ...draft.value.fewShots.flatMap((f) => [
        make('user', f.user),
        make('assistant', f.assistant),
      ]),
      make('user', rendered.value),
    ];
    await stream.start({
      ...settings.settings,
      temperature: draft.value.temperature,
      maxTokens: draft.value.maxTokens,
      topP: draft.value.topP,
      messages: selectContext(messages, settings.settings.contextLength, draft.value.maxTokens),
    });
  } catch (error) {
    stream.error.value = normalizeError(error);
    stream.state.value = 'ERROR';
  }
}
function restore(index: number) {
  const version = draft.value?.versions[index];
  if (!draft.value || !version) return;
  draft.value = {
    ...clone({ ...version.snapshot, versions: draft.value.versions }),
    updatedAt: draft.value.updatedAt,
  };
  tab.value = 'editor';
  ElMessage.info('Version restored into the editor. Save to keep these changes.');
}
</script>
<template>
  <div class="page">
    <PageHeading
      title="Prompt Lab"
      description="Turn good instructions into repeatable, versioned workflows."
      ><el-button
        type="primary"
        :icon="Plus"
        :disabled="request.loading.value || stream.busy.value"
        @click="create()"
        >New prompt</el-button
      ></PageHeading
    ><RequestFeedback
      :state="request.state.value"
      :error="request.error.value"
      @retry="load"
      @abort="request.abort"
    />
    <div class="prompt-layout">
      <aside class="panel prompt-list">
        <div class="section-label">
          YOUR PROMPTS <span>{{ store.prompts.length }}</span>
        </div>
        <button
          v-for="prompt in store.prompts"
          :key="prompt.id"
          class="prompt-item"
          :class="{ selected: draft?.id === prompt.id }"
          :disabled="stream.busy.value || request.loading.value"
          @click="select(prompt)"
        >
          <FlaskConical :size="17" />
          <div>
            <strong>{{ prompt.name }}</strong
            ><small
              >{{ prompt.versions.length }} versions ·
              {{ Object.keys(prompt.variables).length }} variables</small
            >
          </div>
        </button>
        <div v-if="!store.prompts.length" class="empty-inline">Create your first prompt.</div>
        <div class="tip-card">
          <Braces :size="20" /><strong>Write once. Adapt with variables.</strong>
          <p>
            Use double braces to insert variables, like <code v-pre>{{ topic }}</code
            >.
          </p>
        </div>
      </aside>
      <section v-if="draft" class="panel prompt-editor">
        <div class="panel-title">
          <div>
            <h2>{{ draft.name }}</h2>
            <p>
              {{ dirty ? 'Unsaved changes' : 'All changes saved' }} ·
              {{ draft.versions.length }} saved versions
            </p>
          </div>
          <div class="editor-actions">
            <el-button
              :icon="Copy"
              aria-label="Duplicate prompt"
              :disabled="stream.busy.value || request.loading.value"
              @click="create(true)"
            /><el-button
              :icon="Trash2"
              aria-label="Delete prompt"
              :disabled="stream.busy.value || request.loading.value"
              @click="remove"
            />
          </div>
        </div>
        <el-tabs v-model="tab"
          ><el-tab-pane label="Prompt editor" name="editor"
            ><div class="form-stack">
              <label
                >Prompt name<el-input
                  v-model="draft.name"
                  aria-label="Prompt name"
                  maxlength="100"
                  :disabled="stream.busy.value" /></label
              ><label
                >System prompt<el-input
                  v-model="draft.systemPrompt"
                  aria-label="System prompt"
                  type="textarea"
                  :rows="2"
                  :disabled="stream.busy.value" /></label
              ><label
                >User prompt template<el-input
                  v-model="draft.userTemplate"
                  aria-label="User prompt template"
                  type="textarea"
                  :rows="2"
                  :disabled="stream.busy.value"
              /></label>
              <details class="examples-disclosure">
                <summary>
                  Few-shot examples <span class="tiny-badge">{{ draft.fewShots.length }}</span>
                </summary>
                <div v-for="(example, index) in draft.fewShots" :key="index" class="few-shot">
                  <el-input
                    v-model="example.user"
                    :aria-label="'Example user ' + index"
                    type="textarea"
                    :rows="2"
                    placeholder="User example"
                    :disabled="stream.busy.value"
                  /><el-input
                    v-model="example.assistant"
                    :aria-label="'Example assistant ' + index"
                    type="textarea"
                    :rows="2"
                    placeholder="Assistant example"
                    :disabled="stream.busy.value"
                  /><button
                    class="icon-button"
                    aria-label="Remove example"
                    :disabled="stream.busy.value"
                    @click="draft.fewShots.splice(index, 1)"
                  >
                    <Trash2 :size="13" />
                  </button>
                </div>
                <el-button
                  text
                  :icon="Plus"
                  :disabled="stream.busy.value || draft.fewShots.length >= 10"
                  @click="draft.fewShots.push({ user: '', assistant: '' })"
                  >Add example</el-button
                >
              </details>
              <div class="form-row prompt-params">
                <label
                  >Temperature<el-input-number
                    v-model="draft.temperature"
                    aria-label="Prompt temperature"
                    :min="0"
                    :max="2"
                    :step="0.1"
                    controls-position="right"
                    :disabled="stream.busy.value" /></label
                ><label
                  >Max tokens<el-input-number
                    v-model="draft.maxTokens"
                    aria-label="Prompt max tokens"
                    :min="16"
                    :max="8192"
                    :step="128"
                    controls-position="right"
                    :disabled="stream.busy.value" /></label
                ><label
                  >Top P<el-input-number
                    v-model="draft.topP"
                    aria-label="Prompt top P"
                    :min="0"
                    :max="1"
                    :step="0.1"
                    controls-position="right"
                    :disabled="stream.busy.value"
                /></label>
              </div>
              <div class="form-actions">
                <el-button
                  type="primary"
                  :icon="Save"
                  :disabled="
                    !draft.name.trim() ||
                    !draft.userTemplate.trim() ||
                    stream.busy.value ||
                    request.loading.value
                  "
                  @click="save()"
                  >Save prompt</el-button
                ><el-button
                  :icon="History"
                  :disabled="!draft.name.trim() || stream.busy.value || request.loading.value"
                  @click="save(true)"
                  >Save version</el-button
                >
              </div>
            </div></el-tab-pane
          ><el-tab-pane :label="`Versions (${draft.versions.length})`" name="versions"
            ><div v-if="!draft.versions.length" class="empty-state">
              <History :size="28" />
              <h3>No saved versions yet</h3>
              <p>Save a version to preserve a snapshot of the full prompt.</p>
            </div>
            <div
              v-for="(version, index) in draft.versions"
              :key="version.version"
              class="version-row"
            >
              <div>
                <strong>Version {{ version.version }}</strong
                ><small>{{ new Date(version.savedAt).toLocaleString() }}</small>
              </div>
              <el-button size="small" @click="restore(index)">Restore in editor</el-button>
            </div></el-tab-pane
          ></el-tabs
        >
      </section>
      <section v-else class="panel empty-state">
        <FlaskConical :size="30" />
        <h3>Your prompt library is empty</h3>
        <p>Create a prompt to begin.</p>
        <el-button :icon="Plus" @click="create()">Create a prompt</el-button>
      </section>
      <section v-if="draft" class="panel prompt-test">
        <div class="panel-title">
          <div>
            <h2>Output playground</h2>
            <p>
              {{ settings.settings.model }} ·
              {{ settings.settings.mode === 'mock' ? 'Demo response' : 'Live response' }}
            </p>
          </div>
          <Play :size="17" class="muted" />
        </div>
        <div class="form-stack">
          <div class="prompt-variables">
            <label v-for="key in variableKeys" :key="key"
              >{{ key
              }}<el-input
                v-model="draft.variables[key]"
                :aria-label="'Variable ' + key"
                :placeholder="`Value for ${key}`"
                :disabled="stream.busy.value"
            /></label>
          </div>
          <div class="new-variable">
            <el-input
              v-model="newVariable"
              aria-label="New variable name"
              placeholder="New variable name"
              :disabled="stream.busy.value"
              @keydown.enter="addVariable"
            /><el-button
              :icon="Plus"
              aria-label="Add variable"
              :disabled="!/^\w+$/.test(newVariable) || stream.busy.value"
              @click="addVariable"
            />
          </div>
        </div>
        <div class="form-actions">
          <el-button
            type="primary"
            :icon="Play"
            :disabled="stream.busy.value || !draft.userTemplate.trim()"
            @click="test"
            >Test prompt</el-button
          ><el-button v-if="stream.busy.value" :icon="Square" @click="stream.stop">Stop</el-button>
        </div>
        <RequestFeedback
          :state="stream.state.value"
          :error="stream.error.value"
          @retry="test"
          @abort="stream.stop"
        /><template v-if="rendered"
          ><div class="content-label">RENDERED PROMPT</div>
          <pre class="json-block">{{ rendered }}</pre></template
        ><template v-if="stream.content.value"
          ><div class="content-label">MODEL RESPONSE</div>
          <div class="prompt-response" tabindex="0" aria-label="Model response">
            <MarkdownContent :content="stream.content.value" /></div
        ></template>
        <div v-if="stream.result.value" class="test-metrics">
          <span
            >{{ stream.result.value.usage.totalTokens }} tokens
            {{ stream.result.value.usage.estimated ? '(est.)' : '' }}</span
          ><span>{{ (stream.result.value.latencyMs / 1000).toFixed(2) }}s</span>
        </div>
        <div v-if="!rendered" class="empty-state">
          <FlaskConical :size="29" />
          <p>
            Fill your variables and run a test.<br />Your rendered prompt and response appear here.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
