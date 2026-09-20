<script setup lang="ts">
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import { useClipboard } from '../composables/useClipboard';
const props = defineProps<{ content: string }>(); const { copy } = useClipboard();
hljs.registerLanguage('javascript', javascript); hljs.registerLanguage('typescript', typescript); hljs.registerLanguage('python', python); hljs.registerLanguage('json', json); hljs.registerLanguage('bash', bash);
const md = new MarkdownIt({ html: false, linkify: true, breaks: true, highlight: (code, language) => { const safeCode = language && hljs.getLanguage(language) ? hljs.highlight(code, { language }).value : md.utils.escapeHtml(code); return `<pre class="code-block"><div class="code-toolbar"><span>${md.utils.escapeHtml(language || 'text')}</span><button type="button" class="copy-code">Copy code</button></div><code class="hljs">${safeCode}</code></pre>`; } });
const html = computed(() => DOMPurify.sanitize(md.render(props.content.slice(0, 100000)), { ADD_TAGS: ['button'], ADD_ATTR: ['type'], FORBID_TAGS: ['style', 'iframe', 'form'], FORBID_ATTR: ['style'] }));
function handleClick(event: MouseEvent) { const target = event.target as HTMLElement; if (target.closest('.copy-code')) { const code = target.closest('pre')?.querySelector('code')?.textContent; if (code) void copy(code); } }
</script>
<template><div class="markdown" @click="handleClick" v-html="html"></div></template>
