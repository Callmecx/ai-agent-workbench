<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  Database,
  Plus,
  FileText,
  Layers,
  CheckCheck,
  UploadCloud,
  Pencil,
  Trash2,
  RefreshCw,
  FolderOpen,
} from 'lucide-vue-next';
import { ElMessageBox } from 'element-plus/es/components/message-box/index';
import PageHeading from '../components/PageHeading.vue';
import RequestFeedback from '../components/RequestFeedback.vue';
import { useKnowledgeStore } from '../stores/knowledgeStore';
import { useRequest } from '../composables/useRequest';
import { knowledgeService } from '../services/knowledge';
import { formatDate } from '../utils/context';
import type { DocumentStatus } from '../types';
const store = useKnowledgeStore();
const request = useRequest();
const uploadRequest = useRequest();
const fileInput = ref<HTMLInputElement>();
const dragging = ref(false);
const pollController = new AbortController();
let pollTimer: number | undefined;
let disposed = false;
const totalChunks = computed(() => store.bases.reduce((s, b) => s + b.chunkCount, 0));
const selected = computed(() => store.bases.find((b) => b.id === store.selectedId));
const tagType = (status: DocumentStatus) =>
  status === 'READY' ? 'success' : status === 'FAILED' ? 'danger' : 'warning';
function lastUpdated(baseId: string, createdAt: string) {
  const dates = store.documents
    .filter((d) => d.knowledgeBaseId === baseId)
    .map((d) => d.uploadedAt);
  return formatDate(dates.sort().at(-1) || createdAt);
}
async function poll() {
  if (disposed) return;
  if (store.documents.some((d) => ['PENDING', 'PARSING', 'EMBEDDING'].includes(d.status))) {
    try {
      await store.load(pollController.signal);
    } catch {
      /* Interactive retry remains available. */
    }
  }
  if (!disposed) pollTimer = window.setTimeout(poll, 1200);
}
async function load() {
  await request.run((signal) => store.load(signal));
}
onMounted(async () => {
  await load();
  void poll();
});
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(pollTimer);
  pollController.abort();
});
async function create() {
  try {
    const { value } = await ElMessageBox.prompt(
      'Give this collection a name.',
      'New knowledge base',
      {
        inputPlaceholder: 'e.g. Engineering handbook',
        inputValidator: (v) => !!v?.trim() || 'A name is required.',
      },
    );
    await request.run(async (signal) => {
      const base = await knowledgeService.create(value.trim());
      await store.load(signal);
      store.selectedId = base.id;
    });
  } catch {
    /* Cancelled */
  }
}
async function rename() {
  if (!selected.value) return;
  try {
    const { value } = await ElMessageBox.prompt('Knowledge base name', 'Rename collection', {
      inputValue: selected.value.name,
      inputValidator: (v) => !!v?.trim() || 'A name is required.',
    });
    await request.run(async (signal) => {
      await knowledgeService.rename(store.selectedId, value.trim());
      await store.load(signal);
    });
  } catch {
    /* Cancelled */
  }
}
async function remove() {
  try {
    await ElMessageBox.confirm(
      'Delete this collection and all its documents?',
      'Delete knowledge base',
      { type: 'warning' },
    );
    await request.run(async (signal) => {
      await knowledgeService.remove(store.selectedId);
      await store.load(signal);
    });
  } catch {
    /* Cancelled */
  }
}
async function uploadFiles(files: FileList | File[]) {
  if (uploadRequest.loading.value || !store.selectedId) return;
  const baseId = store.selectedId;
  await uploadRequest.run(async (signal) => {
    for (const file of Array.from(files)) {
      if (signal.aborted) return;
      await knowledgeService.upload(baseId, file, signal);
    }
    await store.load(signal);
  });
  if (fileInput.value) fileInput.value.value = '';
}
function fileChange(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (files) void uploadFiles(files);
}
function drop(event: DragEvent) {
  dragging.value = false;
  if (event.dataTransfer?.files) void uploadFiles(event.dataTransfer.files);
}
async function retry(id: string) {
  await request.run(async (signal) => {
    await knowledgeService.retry(id);
    await store.load(signal);
  });
}
async function deleteDocument(id: string) {
  await request.run(async (signal) => {
    await knowledgeService.removeDocument(id);
    await store.load(signal);
  });
}
</script>
<template>
  <div class="page">
    <PageHeading
      title="Knowledge Base"
      description="Organize your sources. Give your AI the context it needs."
      ><el-button type="primary" :icon="Plus" :disabled="request.loading.value" @click="create"
        >New knowledge base</el-button
      ></PageHeading
    >
    <div class="stat-grid">
      <div
        v-for="stat in [
          {
            label: 'Knowledge bases',
            value: store.bases.length,
            icon: Database,
            note: 'Independent document collections',
          },
          {
            label: 'Documents',
            value: store.documents.length,
            icon: FileText,
            note: 'PDF, TXT and Markdown',
          },
          {
            label: 'Indexed chunks',
            value: totalChunks,
            icon: Layers,
            note: 'Traceable, overlapping text segments',
          },
          {
            label: 'Ready documents',
            value: store.documents.filter((d) => d.status === 'READY').length,
            icon: CheckCheck,
            note: 'Mock embedding lifecycle',
          },
        ]"
        :key="stat.label"
        class="stat-card"
      >
        <div class="stat-label">{{ stat.label }}<component :is="stat.icon" :size="16" /></div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-note">{{ stat.note }}</div>
      </div>
    </div>
    <RequestFeedback
      :state="request.state.value"
      :error="request.error.value"
      @retry="load"
      @abort="request.abort"
    />
    <div class="knowledge-layout">
      <aside class="panel collections">
        <div class="panel-title">
          <h2>Collections</h2>
          <span class="tiny-badge">{{ store.bases.length }}</span>
        </div>
        <button
          v-for="base in store.bases"
          :key="base.id"
          class="collection"
          :class="{ selected: store.selectedId === base.id }"
          @click="store.selectedId = base.id"
        >
          <div class="collection-icon"><FolderOpen :size="19" /></div>
          <div>
            <strong>{{ base.name }}</strong
            ><small>{{ base.documentCount }} documents · {{ base.chunkCount }} chunks</small>
            <div class="collection-meta">
              <span
                class="status-badge"
                :class="base.documentCount ? tagType(base.embeddingStatus) : ''"
                >{{
                  !base.documentCount
                    ? 'Empty'
                    : base.embeddingStatus === 'READY'
                      ? 'Ready'
                      : base.embeddingStatus === 'FAILED'
                        ? 'Needs attention'
                        : 'Indexing'
                }}</span
              ><small>Updated {{ lastUpdated(base.id, base.createdAt) }}</small>
            </div>
          </div>
        </button>
        <div v-if="!store.bases.length" class="empty-inline">
          Create your first collection.<button class="text-button" @click="create">
            New knowledge base
          </button>
        </div>
        <div class="collection-note">
          <Database :size="18" />
          <p>
            Your files stay in this local workspace. Embedding and PDF extraction are simulated.
          </p>
        </div>
      </aside>
      <section class="panel documents">
        <div class="panel-title">
          <div>
            <h2>{{ selected?.name || 'Your knowledge starts here' }}</h2>
            <p>{{ selected?.description || 'Create a collection to add documents.' }}</p>
          </div>
          <div v-if="selected" class="document-actions">
            <el-button
              :icon="Pencil"
              aria-label="Rename knowledge base"
              :disabled="request.loading.value"
              @click="rename"
            /><el-button
              :icon="Trash2"
              aria-label="Delete knowledge base"
              :disabled="request.loading.value"
              @click="remove"
            />
          </div>
        </div>
        <div
          v-if="selected"
          class="upload-zone"
          :class="{ dragging, disabled: uploadRequest.loading.value }"
          role="button"
          tabindex="0"
          :aria-disabled="uploadRequest.loading.value"
          aria-label="Upload documents"
          @click="!uploadRequest.loading.value && fileInput?.click()"
          @keydown.enter="!uploadRequest.loading.value && fileInput?.click()"
          @keydown.space.prevent="!uploadRequest.loading.value && fileInput?.click()"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="drop"
        >
          <UploadCloud :size="28" /><strong>{{
            uploadRequest.loading.value
              ? 'Uploading documents…'
              : 'Drop your documents here, or browse files'
          }}</strong
          ><span>PDF, TXT, MD · up to 5 MB per file</span
          ><input
            ref="fileInput"
            type="file"
            hidden
            multiple
            accept=".pdf,.txt,.md"
            data-testid="knowledge-upload"
            @change="fileChange"
          />
        </div>
        <RequestFeedback
          :state="uploadRequest.state.value"
          :error="uploadRequest.error.value"
          @retry="fileInput?.click()"
          @abort="uploadRequest.abort"
        />
        <div v-if="selected" class="documents-toolbar">
          <span>{{ store.selectedDocuments.length }} documents</span
          ><el-button text :icon="RefreshCw" :disabled="request.loading.value" @click="load"
            >Refresh</el-button
          >
        </div>
        <div
          v-if="request.loading.value && !store.selectedDocuments.length"
          class="skeleton-card"
          aria-label="Loading documents"
        >
          <div v-for="n in 4" :key="n" class="skeleton-line"></div>
        </div>
        <el-table
          v-else-if="store.selectedDocuments.length"
          :data="store.selectedDocuments"
          row-key="id"
          ><el-table-column label="DOCUMENT" min-width="205"
            ><template #default="{ row }"
              ><div class="document-name">
                <FileText :size="17" />
                <div>
                  <strong>{{ row.name }}</strong
                  ><small
                    >{{ row.type }} · {{ (row.size / 1024).toFixed(1) }} KB ·
                    {{ formatDate(row.uploadedAt) }}</small
                  >
                </div>
              </div></template
            ></el-table-column
          ><el-table-column label="PARSING" min-width="105"
            ><template #default="{ row }"
              ><el-tag :type="tagType(row.status)" effect="plain" size="small">{{
                row.status
              }}</el-tag></template
            ></el-table-column
          ><el-table-column label="CHUNKS" prop="chunkCount" width="78" /><el-table-column
            label="EMBEDDING"
            min-width="110"
            ><template #default="{ row }"
              ><el-tag :type="tagType(row.embeddingStatus)" effect="plain" size="small">{{
                row.embeddingStatus
              }}</el-tag></template
            ></el-table-column
          ><el-table-column label="" width="77"
            ><template #default="{ row }"
              ><button
                v-if="row.status === 'FAILED'"
                class="icon-button"
                aria-label="Retry parsing"
                :disabled="request.loading.value"
                @click="retry(row.id)"
              >
                <RefreshCw :size="14" /></button
              ><button
                class="icon-button"
                aria-label="Delete document"
                :disabled="request.loading.value"
                @click="deleteDocument(row.id)"
              >
                <Trash2 :size="14" /></button></template></el-table-column
        ></el-table>
        <div v-else class="empty-state">
          <FileText :size="29" />
          <h3>No documents yet</h3>
          <p>Upload a file to watch the indexing pipeline in action.</p>
          <el-button v-if="selected" :icon="UploadCloud" @click="fileInput?.click()"
            >Upload a document</el-button
          ><el-button v-else :icon="Plus" @click="create">Create a collection</el-button>
        </div>
        <div
          v-for="doc in store.selectedDocuments.filter((d) => d.status === 'FAILED')"
          :key="doc.id"
          class="error-panel"
        >
          <p>
            <strong>{{ doc.name }}</strong
            ><br />{{ doc.error }}
          </p>
          <el-button size="small" @click="retry(doc.id)">Retry parsing</el-button>
        </div>
        <div class="pipeline">
          <span
            v-for="(step, index) in ['Upload', 'Parse', 'Chunk', 'Mock embedding', 'Ready']"
            :key="step"
            ><span class="pipeline-number">{{ index + 1 }}</span
            >{{ step }}</span
          >
        </div>
      </section>
    </div>
  </div>
</template>
