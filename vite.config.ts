import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
export default defineConfig({
  plugins: [
    vue(),
    Components({
      dts: false,
      resolvers: [
        (name) => {
          if (!/^El[A-Z]/.test(name)) return;
          const directory = name
            .slice(2)
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();
          const parent: Record<string, string> = {
            ElOption: 'select',
            ElOptionGroup: 'select',
            ElRadioButton: 'radio',
            ElRadioGroup: 'radio',
            ElTableColumn: 'table',
            ElTabPane: 'tabs',
          };
          return {
            name,
            from: `element-plus/es/components/${parent[name] || directory}/index`,
            sideEffects: [
              `element-plus/es/components/base/style/css`,
              `element-plus/es/components/${directory}/style/css`,
            ],
          };
        },
      ],
    }),
  ],
  server: {
    port: Number(process.env.WEB_PORT || 5173),
    strictPort: true,
    proxy: { '/api': process.env.BFF_PROXY_TARGET || 'http://127.0.0.1:3001' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/zrender/')) return 'chart-renderer';
          if (id.includes('/node_modules/echarts/')) return 'charts';
          if (id.includes('/node_modules/element-plus/')) return 'ui';
          if (/\/node_modules\/(?:@vue|vue|vue-router|pinia)\//.test(id)) return 'vue';
          if (/\/node_modules\/(?:markdown-it|highlight.js|dompurify)\//.test(id))
            return 'markdown';
        },
      },
    },
  },
});
