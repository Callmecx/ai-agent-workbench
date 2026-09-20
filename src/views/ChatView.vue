<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  Plus,
  Search,
  ArrowUp,
  Square,
  SlidersHorizontal,
  Copy,
  RotateCcw,
  Trash2,
  Sparkles,
  FileText,
  ArrowUpRight,
  Circle,
  Check,
  MessageSquare,
  X,
  MoreHorizontal,
  TrendingUp,
  ScanSearch,
  Workflow,
  PanelLeft,
} from 'lucide-vue-next';
import { ElMessage } from 'element-plus/es/components/message/index';
import { ElMessageBox } from 'element-plus/es/components/message-box/index';
import PageHeading from '../components/PageHeading.vue';
import MarkdownContent from '../components/MarkdownContent.vue';
import ModelParameters from '../components/ModelParameters.vue';
import RequestFeedback from '../components/RequestFeedback.vue';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useChat } from '../composables/useChat';
import { useClipboard } from '../composables/useClipboard';
import { useRequest } from '../composables/useRequest';
import { formatDate } from '../utils/context';
import { isBusy } from '../utils/state';
const store = useChatStore();
const settings = useSettingsStore();
const chat = useChat();
const request = useRequest();
const { copy } = useClipboard();
const input = ref('');
const debouncedLength = ref(0);
const search = ref('');
const showConfig = ref(window.innerWidth > 1100);
const historyOpen = ref(false);
const composerInput = ref<HTMLTextAreaElement>();
const suggestions = [
  {
    title: 'Understand the market',
    detail: 'Frame a market analysis',
    icon: TrendingUp,
    prompt: 'Help me structure a market analysis, separating verified facts from assumptions.',
  },
  {
    title: 'Ask your knowledge base',
    detail: 'Build an answer with evidence',
    icon: ScanSearch,
    prompt: 'How can I ground an answer in knowledge base sources and cite the evidence?',
  },
  {
    title: 'Build a tool workflow',
    detail: 'Connect a question to an action',
    icon: Workflow,
    prompt:
      'Design a tool workflow that validates inputs, handles errors, and explains its result.',
  },
  {
    title: 'Research an idea',
    detail: 'Turn a question into a plan',
    icon: FileText,
    prompt: 'Create a research plan for evaluating a reliable AI assistant.',
  },
];
function useSuggestion(prompt: string) {
  input.value = prompt;
  composerInput.value?.focus();
}
const messagesEl = ref<HTMLElement>();
const simulate = ref<'normal' | 'error' | 'timeout'>('normal');
const busy = computed(() => isBusy(store.state) || request.loading.value);
const error = computed(() => chat.localError.value || chat.error.value);
const filtered = computed(() =>
  store.conversations.filter((c) => c.title.toLowerCase().includes(search.value.toLowerCase())),
);
const latestUsage = computed(() => store.active?.messages.filter((m) => m.usage).at(-1));
let debounceTimer: number | undefined;
watch(input, (value) => {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => (debouncedLength.value = value.length), 180);
});
watch(
  () => store.active?.messages.at(-1)?.content,
  async (_content, previous) => {
    if (previous === undefined) return;
    const container = messagesEl.value;
    const nearBottom =
      container && container.scrollHeight - container.scrollTop - container.clientHeight < 160;
    await nextTick();
    if (nearBottom && container) container.scrollTop = container.scrollHeight;
  },
);
async function load() {
  await request.run(() => store.load());
}
onMounted(load);
onBeforeUnmount(() => clearTimeout(debounceTimer));
async function send(retry = false) {
  if (busy.value || (!retry && !input.value.trim())) return;
  const text = input.value;
  if (!retry) input.value = '';
  await chat.send(text, retry, simulate.value === 'normal' ? undefined : simulate.value);
  simulate.value = 'normal';
}
async function create() {
  if (busy.value) return;
  await request.run(() => store.create());
  historyOpen.value = false;
}
function select(id: string) {
  if (busy.value) return;
  store.activeId = id;
  historyOpen.value = false;
  store.state = 'IDLE';
  chat.error.value = undefined;
  chat.localError.value = undefined;
}
async function remove(id: string) {
  if (busy.value) return;
  await request.run(() => store.remove(id));
}
async function clear() {
  try {
    await ElMessageBox.confirm(
      'Delete all conversations from this local workspace?',
      'Clear history',
      { type: 'warning' },
    );
    await request.run(() => store.clear());
  } catch {
    /* Dialog cancelled. */
  }
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    void send();
  }
}
async function rename() {
  if (!store.active || busy.value) return;
  try {
    const { value } = await ElMessageBox.prompt('Conversation title', 'Rename conversation', {
      inputValue: store.active.title,
      inputValidator: (v) => !!v?.trim() || 'Enter a title.',
    });
    store.active.title = value.trim().slice(0, 120);
    await store.persist(store.active);
  } catch (reason) {
    if (reason instanceof Error) ElMessage.error(reason.message);
  }
}
</script>
<template>
  <div class="page chat-page">
    <PageHeading
      title="AI Chat"
      description="A thoughtful space for questions, context, and better answers."
      ><el-button
        :icon="SlidersHorizontal"
        :aria-expanded="showConfig"
        @click="showConfig = !showConfig"
        >Configuration</el-button
      ></PageHeading
    >
    <div class="chat-workspace" :class="{ 'no-config': !showConfig, 'history-open': historyOpen }">
      <aside class="conversation-panel">
        <el-button class="new-chat" type="primary" :icon="Plus" :disabled="busy" @click="create"
          >New conversation</el-button
        >
        <div class="conversation-search">
          <Search :size="15" /><input
            v-model="search"
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
        </div>
        <div class="section-label">
          RECENT CONVERSATIONS <span>{{ store.conversations.length }}</span>
        </div>
        <div class="conversation-list">
          <div v-for="conversation in filtered" :key="conversation.id" class="conversation-row">
            <button
              class="conversation-item"
              :class="{ active: store.activeId === conversation.id }"
              :disabled="busy"
              @click="select(conversation.id)"
            >
              <MessageSquare :size="15" />
              <div>
                <strong>{{ conversation.title }}</strong
                ><small
                  >{{ formatDate(conversation.updatedAt) }}
                  <span
                    >·
                    {{ conversation.messages.filter((m) => m.role === 'user').length }} turns</span
                  ></small
                >
              </div>
            </button>
            <details class="conversation-more">
              <summary class="icon-button" :aria-label="'Actions for ' + conversation.title">
                <MoreHorizontal :size="15" />
              </summary>
              <button class="conversation-menu" :disabled="busy" @click="remove(conversation.id)">
                <Trash2 :size="13" /> Delete conversation
              </button>
            </details>
          </div>
          <div v-if="!filtered.length" class="empty-inline">
            {{ search ? 'No matching conversations.' : 'Your next idea starts here.' }}
          </div>
        </div>
        <button
          class="clear-history"
          :disabled="busy || !store.conversations.length"
          @click="clear"
        >
          <Trash2 :size="14" /> Clear history
        </button>
        <div class="conversation-footer">
          <span class="status-dot"></span> Saved to your local workspace
        </div>
      </aside>
      <section class="chat-panel">
        <div class="chat-toolbar">
          <div>
            <button
              class="icon-button history-mobile"
              aria-label="Conversation history"
              @click="historyOpen = !historyOpen"
            >
              <PanelLeft :size="16" />
            </button>
            <span class="model-avatar"><Sparkles :size="16" /></span
            ><strong>{{ store.active?.title || 'New conversation' }}</strong>
          </div>
          <button class="text-button" :disabled="busy || !store.active" @click="rename">
            Rename
          </button>
        </div>
        <RequestFeedback
          :state="request.state.value"
          :error="request.error.value"
          @retry="load"
          @abort="request.abort"
        />
        <div ref="messagesEl" class="messages-scroll">
          <div
            v-if="request.loading.value && !store.active"
            class="skeleton-card"
            aria-label="Loading conversations"
          >
            <div v-for="n in 4" :key="n" class="skeleton-line"></div>
          </div>
          <div v-else-if="!store.active?.messages.length" class="chat-empty">
            <div class="empty-spark"><Sparkles :size="28" /></div>
            <div class="eyebrow">YOUR NEXT IDEA STARTS HERE</div>
            <h2>What will you explore today?</h2>
            <p>Bring a question. Add a little context. See where it takes you.</p>
            <div class="suggestion-grid">
              <button
                v-for="suggestion in suggestions"
                :key="suggestion.title"
                @click="useSuggestion(suggestion.prompt)"
              >
                <component :is="suggestion.icon" :size="18" /><strong>{{ suggestion.title }}</strong
                ><small>{{ suggestion.detail }}</small>
              </button>
            </div>
          </div>
          <template v-for="message in store.active?.messages" :key="message.id"
            ><details v-if="message.role === 'system'" class="system-message">
              <summary><SlidersHorizontal :size="12" /> System instructions</summary>
              <p>{{ message.content }}</p>
            </details>
            <article
              v-else
              class="message"
              :class="[
                message.role,
                { failed: message.status === 'ERROR' || message.status === 'ABORTED' },
              ]"
            >
              <div class="message-avatar" :class="message.role">
                <Sparkles v-if="message.role === 'assistant'" :size="17" /><span
                  v-else-if="message.role === 'user'"
                  >DU</span
                ><FileText v-else :size="17" />
              </div>
              <div class="message-body">
                <div class="message-heading">
                  <strong>{{
                    message.role === 'assistant'
                      ? 'Workbench'
                      : message.role === 'user'
                        ? 'You'
                        : 'Tool'
                  }}</strong
                  ><span v-if="message.role === 'assistant'" class="message-model">{{
                    message.model || settings.settings.model
                  }}</span
                  ><span class="message-time">{{
                    new Date(message.createdAt).toLocaleTimeString('en', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  }}</span>
                </div>
                <MarkdownContent v-if="message.content" :content="message.content" />
                <div
                  v-else-if="message.status === 'SUBMITTING' || message.status === 'STREAMING'"
                  class="thinking"
                >
                  <span class="loading-dot"></span> Preparing response…
                </div>
                <div v-if="message.status === 'STREAMING'" class="stream-label">
                  <Circle :size="8" fill="currentColor" /> Streaming response
                </div>
                <div v-if="message.status === 'ABORTED'" class="muted">
                  Generation stopped · partial response retained
                </div>
                <div v-if="message.status === 'ERROR'" class="muted">
                  Generation failed · use Retry below
                </div>
                <div v-if="message.content || message.role === 'assistant'" class="message-actions">
                  <button
                    v-if="message.content"
                    :aria-label="'Copy ' + message.role + ' message'"
                    @click="copy(message.content)"
                  >
                    <Copy :size="13" /></button
                  ><template v-if="message.usage"
                    ><span
                      ><Check :size="12" /> {{ message.usage.totalTokens }} tokens
                      {{ message.usage.estimated ? '(est.)' : '' }}</span
                    ><span>·</span
                    ><span>{{ ((message.latencyMs || 0) / 1000).toFixed(2) }}s</span></template
                  ><button
                    v-if="
                      message.role === 'assistant' &&
                      message.id === store.active?.messages.at(-1)?.id
                    "
                    :disabled="busy"
                    aria-label="Regenerate response"
                    @click="send(true)"
                  >
                    <RotateCcw :size="13" /> Regenerate
                  </button>
                </div>
              </div>
            </article></template
          >
        </div>
        <div class="composer-area">
          <RequestFeedback
            v-if="store.state === 'ERROR' || store.state === 'ABORTED'"
            :state="store.state"
            :error="error"
            @retry="
              simulate = 'normal';
              send(true);
            "
          />
          <div
            class="composer"
            :class="{ 'is-streaming': busy, 'has-error': store.state === 'ERROR' }"
          >
            <textarea
              v-model="input"
              ref="composerInput"
              data-testid="chat-input"
              aria-label="Message"
              placeholder="Ask anything, or start with an idea…"
              :maxlength="20000"
              :disabled="busy"
              rows="2"
              @keydown="keydown"
            ></textarea>
            <div class="composer-bottom">
              <RouterLink
                to="/retrieval"
                class="context-link"
                title="Inspect knowledge sources and generate a grounded answer"
                ><Plus :size="15" /> Context</RouterLink
              >
              <div class="composer-controls">
                <el-select
                  v-model="settings.settings.model"
                  class="composer-model"
                  aria-label="Composer model"
                  :disabled="busy"
                  ><el-option
                    v-for="model in settings.availableModels"
                    :key="model.id"
                    :label="model.name.replace('Mock', 'Demo')"
                    :value="model.id"
                    :disabled="!model.available"
                /></el-select>
                <button
                  v-if="input"
                  class="icon-button"
                  aria-label="Clear input"
                  @click="input = ''"
                >
                  <X :size="15" /></button
                ><span v-if="debouncedLength">{{ debouncedLength.toLocaleString() }}/20k</span
                ><button
                  v-if="busy"
                  class="send-button stop"
                  aria-label="Stop generation"
                  @click="chat.stop"
                >
                  <Square :size="16" fill="currentColor" /></button
                ><button
                  v-else
                  class="send-button"
                  aria-label="Send message"
                  :disabled="!input.trim()"
                  @click="send()"
                >
                  <ArrowUp :size="20" />
                </button>
              </div>
            </div>
          </div>
          <div class="composer-footnote">
            <span
              >Enter to send <span class="keyboard-separator">·</span> Shift + Enter for a new
              line</span
            ><span>{{
              settings.settings.mode === 'mock'
                ? 'Demo responses · local data'
                : 'Verify important information.'
            }}</span>
          </div>
        </div>
      </section>
      <aside v-if="showConfig" class="config-panel">
        <div class="panel-heading">
          <SlidersHorizontal :size="16" /><strong>Configuration</strong
          ><button
            class="icon-button config-close"
            aria-label="Close configuration"
            @click="showConfig = false"
          >
            <X :size="16" />
          </button>
        </div>
        <ModelParameters :disabled="busy" />
        <div class="config-section">
          <div class="section-label">LAST RESPONSE</div>
          <div class="metric-row">
            <span>Prompt tokens</span><strong>{{ latestUsage?.usage?.promptTokens ?? '—' }}</strong>
          </div>
          <div class="metric-row">
            <span>Completion tokens</span
            ><strong>{{ latestUsage?.usage?.completionTokens ?? '—' }}</strong>
          </div>
          <div class="metric-row">
            <span>Total tokens</span><strong>{{ latestUsage?.usage?.totalTokens ?? '—' }}</strong>
          </div>
          <div class="metric-row">
            <span>Response time</span
            ><strong>{{
              latestUsage ? ((latestUsage.latencyMs || 0) / 1000).toFixed(2) + 's' : '—'
            }}</strong>
          </div>
          <p class="field-help">
            {{
              latestUsage?.usage?.estimated
                ? 'Estimated tokens · sample / mock data'
                : 'Usage is reported when available.'
            }}
          </p>
        </div>
        <details class="developer-controls">
          <summary>Diagnostics</summary>
          <label class="field-label"
            >Next request behavior<el-select
              v-model="simulate"
              aria-label="Next request behavior"
              :disabled="busy || settings.settings.mode !== 'mock'"
              ><el-option label="Normal response" value="normal" /><el-option
                label="Simulate provider error"
                value="error" /><el-option
                label="Simulate timeout"
                value="timeout" /></el-select></label
          ><span class="request-state" :class="store.state.toLowerCase()"
            ><span class="status-dot"></span>{{ store.state }}</span
          >
        </details>
        <div class="tip-card">
          <Sparkles :size="17" /><strong>Good context, better answers.</strong>
          <p>Use Retrieval Debug to inspect your sources before generating an answer.</p>
          <RouterLink to="/retrieval">Explore retrieval <ArrowUpRight :size="13" /></RouterLink>
        </div>
      </aside>
    </div>
  </div>
</template>
