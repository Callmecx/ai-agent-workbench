import { ElMessage } from 'element-plus';
export function useClipboard() { async function copy(text: string) { try { await navigator.clipboard.writeText(text); ElMessage.success('Copied to clipboard'); } catch { ElMessage.error('Clipboard unavailable. Select and copy the text manually.'); } } return { copy }; }
