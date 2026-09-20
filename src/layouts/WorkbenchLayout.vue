<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  MessageSquare,
  Database,
  ScanSearch,
  Workflow,
  FlaskConical,
  ChartNoAxesCombined,
  Settings2,
  ChevronRight,
  PanelLeftClose,
  Layers2,
  Command,
} from 'lucide-vue-next';
import { useSettingsStore } from '../stores/settingsStore';
import { useTokenUsage } from '../composables/useTokenUsage';
import { formatNumber } from '../utils/context';
const route = useRoute();
const settings = useSettingsStore();
const { total } = useTokenUsage();
const collapsed = ref(false);
const navigation = [
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
  { to: '/knowledge', label: 'Knowledge Base', icon: Database },
  { to: '/retrieval', label: 'Retrieval Debug', icon: ScanSearch },
  { to: '/tools', label: 'Agent Tools', icon: Workflow },
  { to: '/prompts', label: 'Prompt Lab', icon: FlaskConical },
];
onMounted(() => {
  void settings.check().catch(() => undefined);
});
watch(
  () => route.path,
  () => {
    if (window.innerWidth < 760) collapsed.value = false;
  },
);
</script>
<template>
  <div
    class="app-shell"
    :class="{ collapsed, 'presentation-mode': route.query.presentation === '1' }"
  >
    <button
      v-if="collapsed"
      class="sidebar-backdrop"
      aria-label="Close navigation"
      @click="collapsed = false"
    ></button>
    <aside class="sidebar">
      <RouterLink to="/chat" class="brand"
        ><div class="brand-symbol"><Layers2 :size="22" /></div>
        <span class="brand-text"
          >AI Agent Workbench<small>Your AI workspace.</small></span
        ></RouterLink
      >
      <div class="workspace-label">
        <div class="workspace-mark">W</div>
        <span>Personal workspace</span>
      </div>
      <div class="nav-caption">WORKSPACE</div>
      <nav aria-label="Workspace navigation">
        <RouterLink v-for="item in navigation" :key="item.to" :to="item.to" class="nav-link"
          ><component :is="item.icon" :size="18" /><span>{{ item.label }}</span
          ><span v-if="item.to === '/chat'" class="nav-shortcut">01</span></RouterLink
        >
      </nav>
      <div class="nav-caption manage-caption">MANAGE</div>
      <nav aria-label="Management navigation">
        <RouterLink to="/monitoring" class="nav-link"
          ><ChartNoAxesCombined :size="18" /><span>Monitoring</span></RouterLink
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="workspace-note">
          <span class="small-label"
            ><span class="status-dot"></span>
            {{ settings.settings.mode === 'mock' ? 'DEMO WORKSPACE' : 'LIVE WORKSPACE' }}</span
          >
          <p>
            {{
              settings.settings.mode === 'mock'
                ? 'Ideas into working systems.'
                : 'Connected through your BFF.'
            }}
          </p>
          <small>{{
            settings.settings.mode === 'mock'
              ? 'Explore the complete workflow with local demo data.'
              : 'Credentials stay on the server. Requests may incur provider charges.'
          }}</small>
        </div>
        <RouterLink to="/settings" class="nav-link"
          ><Settings2 :size="18" /><span>Settings</span></RouterLink
        >
        <div class="sidebar-user">
          <div class="user-avatar">DU</div>
          <div><strong>Demo User</strong><small>Local workspace</small></div>
          <span class="version">v1.0</span>
        </div>
      </div>
    </aside>
    <div class="workspace-main">
      <header class="topbar">
        <div class="breadcrumbs">
          <button class="icon-button" aria-label="Toggle sidebar" @click="collapsed = !collapsed">
            <PanelLeftClose :size="18" /></button
          ><span>{{ route.meta.section }}</span
          ><ChevronRight :size="13" /><strong>{{ route.meta.title }}</strong>
        </div>
        <div class="header-status">
          <span class="header-model">{{
            settings.availableModels.find((m) => m.id === settings.settings.model)?.name ||
            settings.settings.model
          }}</span>
          <span class="api-status"
            ><span class="status-dot" :class="{ offline: !settings.online }"></span
            >{{ settings.online ? 'API connected' : 'API offline' }}</span
          ><span class="header-divider"></span
          ><span class="token-counter"><Command :size="14" /> {{ formatNumber(total) }} tokens</span
          ><span class="mode-pill">{{
            settings.settings.mode === 'mock' ? 'Demo Mode' : 'Live API'
          }}</span>
          <div class="user-avatar small">DU</div>
        </div>
      </header>
      <main><RouterView /></main>
    </div>
  </div>
</template>
