<template>
  <UCard
    :ui="{ body: 'p-4' }"
    class="hover:shadow-md transition-shadow duration-200"
  >
    <div class="flex items-start justify-between">
      <div class="flex items-start gap-3 flex-1 min-w-0">
        <div
          class="p-2 bg-primary-50 dark:bg-primary-950 rounded-lg flex-shrink-0 mt-1"
        >
          <UIcon
            :name="getProtocolIcon(store.schema as OpendalSchema)"
            class="text-primary-500 w-5 h-5"
          />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-medium truncate">{{ store.name }}</h3>
            <UBadge
              :color="store.status === 'active' ? 'success' : 'error'"
              variant="subtle"
              size="xs"
            >
              {{ store.status === "active" ? "已连接" : "连接异常" }}
            </UBadge>
          </div>

          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs text-gray-500 capitalize">
              {{ store.schema }}
            </span>
            <span v-if="store.createdAt" class="text-xs text-gray-400">
              • 创建于 {{ formatDate(store.createdAt) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex gap-1 flex-shrink-0 ml-2">
        <UButton
          icon="i-lucide-eye"
          color="primary"
          variant="ghost"
          size="xs"
          @click="$emit('view', store)"
          title="查看详情"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="primary"
          variant="ghost"
          size="xs"
          :loading="testing"
          @click="$emit('test', store)"
          title="测试连接"
        />
        <!-- <UButton
          icon="i-lucide-edit"
          color="primary"
          variant="ghost"
          size="xs"
          @click="$emit('edit', store)"
          title="编辑"
        /> -->
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xs"
          @click="$emit('delete', store.name)"
          title="删除"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { type OpendalSchema } from "backend/src/loader/protocal/generated/schema";

interface Store {
  name: string;
  schema: string;
  config: any;
  createdAt?: Date;
  updatedAt?: Date;
  id?: string;
  status?: "active" | "inactive";
}

const props = defineProps<{
  store: Store;
  testing?: boolean;
}>();

const emit = defineEmits<{
  (e: "view", store: Store): void;
  (e: "test", store: Store): void;
  (e: "edit", store: Store): void;
  (e: "delete", storeName: string): void;
}>();

// 获取协议对应的图标
function getProtocolIcon(protocol: OpendalSchema): string {
  const iconMap: Record<OpendalSchema, string> = {
    fs: "i-lucide-folder",
    http: "ic:twotone-http",
    s3: "solar:cloud-storage-linear",
    gcs: "mingcute:google-fill",
    azblob: "tabler:brand-azure",
    oss: "ant-design:aliyun-outlined",
    webdav: "icon-park-twotone:cloud-storage",
    memory: "bxs:memory-card",
    redis: "cib:redis",
    mysql: "tabler:brand-mysql",
    postgresql: "akar-icons:postgresql-fill",
    mongodb: "simple-icons:mongodb",
    sqlite: "file-icons:sqlite",
    dropbox: "akar-icons:dropbox-fill",
    gdrive: "picon:gdrive",
    onedrive: "simple-icons:microsoftonedrive",
    "aliyun-drive": "streamline-plump:hard-drive-2-remix",
    ipfs: "simple-icons:ipfs",
    etcd: "simple-icons:etcd",
    memcached: "devicon-plain:memcached",
    huggingface: "simple-icons:huggingface",
    "vercel-artifacts": "famicons:logo-vercel",
    azdls: "teenyicons:azure-outline",
    cos: "cib:tencent-qq",
    ghac: "mingcute:github-line",
    ipmfs: "arcticons:ipfslite",
    obs: "simple-icons:huawei",
    webhdfs: "streamline-ultimate:circus-elephant-bold",
    cacache: "octicon:cache-24",
    dashmap: "material-symbols:dashboard",
    "mini-moka": "game-icons:moka-pot",
    moka: "game-icons:moka-pot",
    persy: "material-symbols:calendar-view-day-sharp",
    koofr: "arcticons:koofr",
    redb: "bxl:redbubble",
    sled: "solar:sledgehammer-bold",
    tikv: "mdi:database",
    gridfs: "material-symbols:grid-3x3-rounded",
    azfile: "famicons:logo-amazon",
    swift: "tabler:brand-swift",
    alluxio: "arcticons:auxio-alt",
    b2: "carbon:ibm-db2-alt",
    seafile: "simple-icons:seafile",
    upyun: "gravity-ui:logo-yandex",
    "yandex-disk": "gravity-ui:logo-yandex-messenger",
  };
  return iconMap[protocol] || "ic:baseline-question-mark";
}

// 获取配置摘要（只显示关键信息）
function getConfigSummary(): Record<string, string> {
  const config = props.store.config || {};
  const summary: Record<string, string> = {};

  // 根据不同协议显示不同的关键配置
  switch (props.store.schema) {
    case "s3":
      if (config.bucket) summary.bucket = config.bucket;
      if (config.region) summary.region = config.region;
      if (config.endpoint) summary.endpoint = config.endpoint;
      break;
    case "http":
      if (config.endpoint) summary.endpoint = config.endpoint;
      break;
    case "fs":
      if (config.root) summary.root = config.root;
      break;
    case "gcs":
      if (config.bucket) summary.bucket = config.bucket;
      if (config.root) summary.root = config.root;
      break;
    default:
      // 显示前几个配置项
      const keys = Object.keys(config).slice(0, 3);
      keys.forEach((key) => {
        const value = config[key];
        if (typeof value === "string" && value) {
          summary[key] =
            value.length > 20 ? value.substring(0, 20) + "..." : value;
        } else if (typeof value !== "object") {
          summary[key] = String(value);
        }
      });
  }

  return summary;
}

// 格式化日期
function formatDate(date: Date | string): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
</script>
