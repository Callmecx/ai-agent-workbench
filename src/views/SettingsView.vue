<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Settings2, ShieldCheck, Server, Sun, Moon, RefreshCw, Check } from 'lucide-vue-next';
import { ElMessage } from 'element-plus/es/components/message/index';
import PageHeading from '../components/PageHeading.vue';
import RequestFeedback from '../components/RequestFeedback.vue';
import ModelParameters from '../components/ModelParameters.vue';
import { useSettingsStore } from '../stores/settingsStore';
import { useRequest } from '../composables/useRequest';
import { api, setAccessToken } from '../api/client';
const store = useSettingsStore();
const request = useRequest();
const accessToken = ref('');
async function check() {
  await request.run(() => store.check());
}
onMounted(check);
function switchMode(value: string | number | boolean | undefined) {
  if (value === 'real' && !store.health?.realConfigured) {
    ElMessage.warning('Configure server/.env before enabling Real API Mode.');
    return;
  }
  store.setMode(value === 'real' ? 'real' : 'mock');
}
async function authorize() {
  setAccessToken(accessToken.value);
  accessToken.value = '';
  await check();
}
</script>
<template>
  <div class="page">
    <PageHeading
      title="Settings"
      description="Configure your workspace, providers, and preferences."
      ><span class="quiet-badge"
        ><Check :size="13" /> Preferences saved automatically</span
      ></PageHeading
    ><RequestFeedback
      :state="request.state.value"
      :error="request.error.value"
      @retry="check"
      @abort="request.abort"
    />
    <div class="settings-layout">
      <div>
        <section class="panel settings-panel">
          <div class="panel-title">
            <div class="settings-title">
              <span class="settings-icon"><Server :size="19" /></span>
              <div>
                <h2>Connection & provider</h2>
                <p>All AI requests pass through your local BFF.</p>
              </div>
            </div>
            <el-button :icon="RefreshCw" :loading="request.loading.value" @click="check"
              >Check connection</el-button
            >
          </div>
          <div class="setting-line">
            <div>
              <strong>Runtime mode</strong>
              <p>Mock works out of the box. Real uses server credentials.</p>
            </div>
            <el-radio-group :model-value="store.settings.mode" @change="switchMode"
              ><el-radio-button value="mock">Mock</el-radio-button
              ><el-radio-button value="real" :disabled="!store.health?.realConfigured"
                >Real API</el-radio-button
              ></el-radio-group
            >
          </div>
          <div class="form-stack">
            <label
              >BFF API base URL<el-input
                :model-value="String(api.defaults.baseURL)"
                aria-label="BFF API base URL"
                readonly
            /></label>
            <p class="field-help">
              Set VITE_API_BASE_URL in the root .env and restart Vite. The default /api uses the
              development proxy.
            </p>
            <label
              >AI provider base URL<el-input
                :model-value="store.health?.providerBaseUrl || 'Unavailable'"
                aria-label="AI provider base URL"
                readonly
            /></label>
            <p class="field-help">
              Configured only in server/.env as AI_API_BASE_URL. Browser input cannot redirect
              server credentials.
            </p>
            <label
              >Request timeout (milliseconds)<el-input-number
                v-model="store.settings.timeoutMs"
                aria-label="Request timeout"
                :min="1000"
                :max="120000"
                :step="1000"
                controls-position="right" /></label
            ><template v-if="store.health?.authenticationRequired"
              ><label
                >BFF access token (memory only)<el-input
                  v-model="accessToken"
                  aria-label="BFF access token"
                  type="password"
                  show-password
                  autocomplete="off"
                  placeholder="BFF token, not an AI provider API key" /></label
              ><el-button type="primary" :disabled="!accessToken" @click="authorize"
                >Connect with token</el-button
              ></template
            >
          </div>
          <div class="connection-state">
            <span class="status-dot" :class="{ offline: !store.online }"></span
            >{{ store.online ? 'BFF connected' : 'BFF offline' }} <span>·</span>
            {{ store.health?.realConfigured ? 'Real provider configured' : 'Mock provider ready' }}
          </div>
        </section>
        <section class="panel settings-panel">
          <div class="panel-title">
            <div class="settings-title">
              <span class="settings-icon"><Sun :size="19" /></span>
              <div>
                <h2>Appearance</h2>
                <p>Make the workbench feel like yours.</p>
              </div>
            </div>
          </div>
          <div class="theme-options">
            <button
              :class="{ selected: store.settings.theme === 'light' }"
              @click="store.settings.theme = 'light'"
            >
              <Sun :size="21" /><strong>Light</strong><span>Clear, focused workspace</span></button
            ><button
              :class="{ selected: store.settings.theme === 'dark' }"
              @click="store.settings.theme = 'dark'"
            >
              <Moon :size="21" /><strong>Dark</strong><span>A softer view after hours</span>
            </button>
          </div>
        </section>
        <section class="panel settings-panel">
          <div class="settings-title">
            <span class="settings-icon"><ShieldCheck :size="20" /></span>
            <div>
              <h2>Credentials stay on the server</h2>
              <p>No AI provider key is stored in this browser.</p>
            </div>
          </div>
          <pre class="json-block">
# server/.env
ALLOW_REAL_API=true
AI_API_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-server-side-key
AI_MODELS=your-allowed-model-id
# Optional local BFF authentication
BFF_ACCESS_TOKEN=your-workspace-token</pre>
          <p class="muted">
            Restart the BFF after editing its environment. AI_API_KEY is never returned through the
            API. .env files are excluded from Git. This workspace is a local portfolio application,
            without multi-user authentication or tenant isolation.
          </p>
        </section>
      </div>
      <aside class="panel settings-defaults">
        <div class="panel-title">
          <div class="settings-title">
            <Settings2 :size="18" />
            <h2>Model defaults</h2>
          </div>
        </div>
        <ModelParameters />
        <div class="notice">
          Context length is a local budget setting. The BFF validates the budget and model
          allowlist; provider limits may differ.
        </div>
      </aside>
    </div>
  </div>
</template>
