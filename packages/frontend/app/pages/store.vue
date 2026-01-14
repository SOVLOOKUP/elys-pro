<template>
  <div class="container mx-auto px-4">
    <h1 class="text-2xl font-bold mb-4">储存管理</h1>
  </div>

  <USelect
    width="full"
    v-model="uploadForm.protocol"
    :items="protocols"
    icon="i-lucide-command"
    :ui="{ content: 'min-w-fit' }"
    placeholder="选择来源协议"
  >
    <template #leading="{ modelValue, ui }">
      <UIcon
        v-if="modelValue"
        :name="getProtocolIcon(modelValue)"
        :class="ui.leadingAvatar()"
      />
    </template>
  </USelect>

  <!-- 动态使用表单组件 -->
  <UFormField label="协议配置">
    <div class="w-full rounded-lg">
      <p class="text-xs text-gray-500 mb-2">填写协议配置参数</p>
      <SchemaConfigForm :modelValue="uploadForm" />
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import {
  type OpendalSchema,
  schemas,
} from "backend/src/loader/protocal/opendal/generated/schema";
import { startCase } from "es-toolkit";

const { $elysia } = useNuxtApp();

definePageMeta({
  layout: "dashboard",
});

// 支持的协议列表
const protocols = ref<{ label: string; value: OpendalSchema; icon: string }[]>(
  schemas.map((schema) => ({
    label: startCase(schema),
    value: schema,
    icon: getProtocolIcon(schema),
  }))
);

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

// 上传表单
const uploadForm = ref({
  name: "",
  version: "",
  protocol: "http" as OpendalSchema,
  config: {},
  path: "",
});

// 列出所有store
$elysia.api.store.get();
// 删除一个store
$elysia.api.store({ store: "name" }).delete({});
// 创建一个store
$elysia.api.store({ store: "name" }).post({
  schema: uploadForm.value.protocol,
  config: uploadForm.value.config,
});
</script>
