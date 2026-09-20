import { createRouter, createWebHistory } from 'vue-router';
export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/chat' },
    {
      path: '/chat',
      component: () => import('../views/ChatView.vue'),
      meta: { title: 'AI Chat', section: 'Workspace' },
    },
    {
      path: '/knowledge',
      component: () => import('../views/KnowledgeView.vue'),
      meta: { title: 'Knowledge Base', section: 'Workspace' },
    },
    {
      path: '/retrieval',
      component: () => import('../views/RetrievalView.vue'),
      meta: { title: 'Retrieval Debug', section: 'Workspace' },
    },
    {
      path: '/tools',
      component: () => import('../views/ToolsView.vue'),
      meta: { title: 'Agent Tools', section: 'Workspace' },
    },
    {
      path: '/prompts',
      component: () => import('../views/PromptsView.vue'),
      meta: { title: 'Prompt Lab', section: 'Workspace' },
    },
    {
      path: '/monitoring',
      component: () => import('../views/MonitoringView.vue'),
      meta: { title: 'Monitoring', section: 'Manage' },
    },
    {
      path: '/settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { title: 'Settings', section: 'Manage' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/chat' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
