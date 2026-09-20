import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3001' } },
  build: { rollupOptions: { output: { manualChunks: { vue: ['vue', 'vue-router', 'pinia'], ui: ['element-plus'], charts: ['echarts'], markdown: ['markdown-it', 'highlight.js', 'dompurify'] } } },
});
