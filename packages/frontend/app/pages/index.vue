<script setup lang="ts">
import type { AppModel } from "backend/src/generated/prisma/internal/prismaNamespace";
import {
  type OpendalSchema,
  schemas,
} from "backend/src/loader/protocal/opendal/generated/schema";
import schemaConfig from "backend/src/loader/protocal/opendal/generated/schemaConfig";
import { newURL } from "backend/src/loader/protocal/opendal/utils";
import { startCase, pascalCase } from "es-toolkit";

const clipboard = useClipboard();
const { $elysia } = useNuxtApp();
const toast = useToast();
const defaultSchema: OpendalSchema = "http";

// 状态管理
const apps = ref<AppModel[]>([]);
const selectedApp = ref<string | null>(null);
const versions = ref<string[]>([]);
const loading = ref(false);
const uploadModalOpen = ref(false);
const deleteModalOpen = ref(false);
const appToDelete = ref<{ name: string; version: string | "all" } | null>(null);

// 请求状态
const lastRequestStatus = ref<"idle" | "loading" | "success" | "error">("idle");

// 后端连接状态
const backendStatus = ref<"checking" | "connected" | "disconnected">(
  "checking"
);

const backendStatusMessage = ref("正在检查后端连接...");

// 检查后端连接状态
async function checkBackendStatus() {
  try {
    await $elysia.api.health.get();
    backendStatus.value = "connected";
    backendStatusMessage.value = "后端连接正常";
  } catch (error) {
    backendStatus.value = "disconnected";
    backendStatusMessage.value = "后端连接失败";
  }
}

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
  protocol: defaultSchema as OpendalSchema,
  config: {},
  path: "",
});

const schema = computed(() => {
  const targetSchema = schemaConfig[uploadForm.value.protocol];
  return targetSchema;
});

const uploadURL = computed(() => {
  return newURL(
    uploadForm.value.protocol,
    uploadForm.value.config,
    uploadForm.value.path
  );
});

// 加载应用列表
async function loadApps() {
  loading.value = true;
  lastRequestStatus.value = "loading";
  try {
    const { data } = await $elysia.api.apps.get();
    apps.value = data || [];
    lastRequestStatus.value = "success";
  } catch (error) {
    toast.add({
      title: "加载失败",
      description: "无法获取应用列表",
      color: "warning",
    });
    lastRequestStatus.value = "error";
  } finally {
    loading.value = false;
  }
}

// 加载应用版本
async function loadVersions(appName: string) {
  loading.value = true;
  try {
    const { data } = await $elysia.api.app({ name: appName }).get();
    // 根据API实际返回的数据结构处理版本信息
    if (Array.isArray(data)) {
      // 如果API返回的是对象数组，则从中提取版本号
      if (
        data.length > 0 &&
        typeof data[0] === "object" &&
        data[0] !== null &&
        "version" in data[0]
      ) {
        versions.value = data.map((item: any) => item.version) || [];
      } else {
        // 如果API返回的是字符串数组，则直接使用
        versions.value = (data as unknown as string[]) || [];
      }
    } else {
      versions.value = [];
    }
  } catch (error) {
    toast.add({
      title: "加载失败",
      description: "无法获取版本列表",
      color: "warning",
    });
  } finally {
    loading.value = false;
  }
}

// 选择应用
function selectApp(app: AppModel | string) {
  // 如果传入的是 AppData 对象，则使用其 name 属性
  const appName = typeof app === "string" ? app : app.name;
  selectedApp.value = appName;
  loadVersions(appName);
}

// 上传应用
async function uploadApp() {
  if (
    !uploadForm.value.name ||
    !uploadForm.value.version ||
    !uploadForm.value.protocol ||
    !uploadForm.value.path
  ) {
    toast.add({
      title: "表单不完整",
      description: "请填写所有必填字段",
      color: "warning",
    });
    return;
  }

  loading.value = true;
  try {
    // 使用类型断言避免类型错误，实际API结构可能需要后端定义
    await $elysia.api.app({ name: uploadForm.value.name }).post(
      { url: uploadURL.value },
      {
        query: {
          version: uploadForm.value.version,
        },
      }
    );

    toast.add({
      title: "上传成功",
      description: `应用 ${uploadForm.value.name}@${uploadForm.value.version} 已成功上传`,
      color: "success",
    });

    uploadModalOpen.value = false;
    uploadForm.value = {
      name: "",
      version: "",
      protocol: defaultSchema,
      config: {},
      path: "",
    };
    await loadApps();
    if (selectedApp.value) {
      await loadVersions(selectedApp.value);
    }
  } catch (error: any) {
    toast.add({
      title: "上传失败",
      description: error.message || "上传过程中发生错误",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

// 删除应用
function confirmDelete(name: string, version: string | "all") {
  appToDelete.value = { name, version };
  deleteModalOpen.value = true;
}

async function deleteApp() {
  const appToDeleteValue = appToDelete.value;
  if (!appToDeleteValue) return;

  loading.value = true;
  try {
    // 使用类型断言避免类型错误，实际API结构可能需要后端定义
    await $elysia.api
      .app({ name: appToDeleteValue.name })
      .delete(undefined as any, {
        query: {
          version: appToDeleteValue.version,
        },
      });

    toast.add({
      title: "删除成功",
      description: `应用已成功删除`,
      color: "success",
    });

    deleteModalOpen.value = false;
    appToDelete.value = null;

    if (appToDeleteValue.version === "all") {
      selectedApp.value = null;
      versions.value = [];
    }

    await loadApps();
    if (selectedApp.value) {
      await loadVersions(selectedApp.value);
    }
  } catch (error: any) {
    toast.add({
      title: "删除失败",
      description: error.message || "删除过程中发生错误",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

// 生成应用 URL 地址
const appURL = (version: string) =>
  new URL(`/app/${selectedApp.value}/${version}/`, useConfigStore().backendURL)
    .href;

// 初始化
onMounted(async () => {
  // 检查后端连接状态
  await checkBackendStatus();

  // 加载应用列表
  await loadApps();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div
      class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col gap-4">
          <!-- 标题和上传按钮 -->
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                Elysia 应用管理
              </h1>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                管理和部署你的 Elysia 应用
              </p>
            </div>

            <!-- 后端连接状态 -->
            <div class="relative flex items-center justify-between">
              <!-- 连接状态指示器 -->
              <div class="flex items-center gap-2 group">
                <UBadge
                  :color="
                    backendStatus === 'connected'
                      ? 'success'
                      : backendStatus === 'disconnected'
                      ? 'error'
                      : backendStatus === 'checking'
                      ? 'warning'
                      : 'neutral'
                  "
                  variant="subtle"
                  class="relative group"
                >
                  <template #icon>
                    <UIcon
                      :name="
                        backendStatus === 'connected'
                          ? 'i-lucide-check-circle'
                          : backendStatus === 'disconnected'
                          ? 'i-lucide-x-circle'
                          : backendStatus === 'checking'
                          ? 'i-lucide-loader-2'
                          : 'i-lucide-circle'
                      "
                      :class="{ 'animate-spin': backendStatus === 'checking' }"
                    />
                  </template>
                  <span class="group-hover:hidden">{{
                    backendStatusMessage
                  }}</span>
                  <code
                    class="hidden group-hover:inline text-sm px-2 py-1 rounded"
                    >{{ useConfigStore().backendURL }}</code
                  >
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 应用列表 -->
        <div class="lg:col-span-1">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <h2 class="text-lg font-semibold">应用列表</h2>
                  <UBadge color="primary" variant="subtle">
                    {{ apps.length }}
                  </UBadge>
                </div>

                <!-- 上传模态框 -->
                <UModal scrollable v-model:open="uploadModalOpen">
                  <UButton label="Open" icon="i-lucide-plus" size="lg">
                    上传应用
                  </UButton>

                  <template #content>
                    <UCard>
                      <template #header>
                        <h3 class="text-lg font-semibold">上传应用</h3>
                      </template>

                      <UForm class="space-y-4">
                        <UFormField label="应用名称" required>
                          <UInput
                            v-model="uploadForm.name"
                            placeholder="例如: my-app"
                            icon="i-lucide-package"
                            class="font-mono w-full"
                          />
                        </UFormField>

                        <UFormField label="版本编号" required>
                          <UInput
                            v-model="uploadForm.version"
                            placeholder="例如: 1.0.0"
                            icon="i-lucide-git-branch"
                            class="font-mono w-full"
                          />
                        </UFormField>

                        <UFormField label="应用来源" required>
                          <UFieldGroup class="w-full">
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

                            <UInput
                              v-model="uploadForm.path"
                              placeholder="路径(例如：/app/index.js)"
                              class="font-mono w-full"
                            />

                            <UButton
                              color="neutral"
                              variant="outline"
                              size="sm"
                              square
                              icon="i-lucide-circle-help"
                              :to="`https://docs.rs/opendal/latest/opendal/services/struct.${pascalCase(
                                uploadForm.protocol
                              )}Config.html`"
                              target="_blank"
                            />
                          </UFieldGroup>
                        </UFormField>

                        <!-- 动态使用表单组件 -->
                        <UFormField label="协议配置">
                          <div class="w-full rounded-lg">
                            <p class="text-xs text-gray-500 mb-2">
                              填写协议配置参数
                            </p>
                            <UCard>
                              <MAutoForm
                                class="space-y-2"
                                :submitButton="false"
                                :state="uploadForm.config"
                                :schema="schema"
                              />
                            </UCard>
                          </div>
                        </UFormField>
                      </UForm>

                      <!-- 链接预览 -->
                      <div
                        class="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 relative"
                      >
                        <p class="text-xs text-gray-500 mb-1">资源 URL 预览</p>
                        <div class="flex items-center gap-2">
                          <UIcon
                            name="i-lucide-link-2"
                            class="text-gray-400 flex-shrink-0"
                          />
                          <code
                            class="text-sm text-gray-700 dark:text-gray-300 break-all font-mono"
                            >{{ uploadURL }}</code
                          >
                        </div>
                        <!-- 复制按钮放在右上角 -->
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          square
                          icon="i-lucide-copy"
                          class="absolute top-2 right-2"
                          @click="
                            clipboard.copy(uploadURL);
                            toast.add({
                              title: '已复制到剪贴板',
                              color: 'success',
                            });
                          "
                        />
                      </div>

                      <template #footer>
                        <div class="flex justify-end gap-2">
                          <UButton
                            color="neutral"
                            variant="ghost"
                            @click="uploadModalOpen = false"
                          >
                            取消
                          </UButton>
                          <UButton :loading="loading" @click="uploadApp">
                            上传
                          </UButton>
                        </div>
                      </template>
                    </UCard>
                  </template>
                </UModal>
              </div>
            </template>

            <div v-if="loading && apps.length === 0" class="space-y-3">
              <USkeleton class="h-12 w-full" v-for="i in 3" :key="i" />
            </div>

            <div v-else-if="apps.length === 0" class="text-center py-8">
              <UIcon
                name="i-lucide-package"
                class="text-4xl text-gray-400 mb-2"
              />
              <p class="text-sm text-gray-500">暂无应用</p>
            </div>

            <div v-else class="space-y-2">
              <UButton
                v-for="app in apps"
                :key="app.name"
                :variant="selectedApp === app.name ? 'soft' : 'ghost'"
                :color="selectedApp === app.name ? 'primary' : 'neutral'"
                block
                class="justify-between"
                @click="selectApp(app)"
              >
                <span class="flex items-center gap-2">
                  <UIcon name="i-lucide-package" />
                  {{ app.name }}
                </span>
                <UIcon name="i-lucide-chevron-right" />
              </UButton>
            </div>
          </UCard>
        </div>

        <!-- 版本列表 -->
        <div class="lg:col-span-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">
                  {{
                    selectedApp ? `${selectedApp} - 版本列表` : "选择一个应用"
                  }}
                </h2>
                <div v-if="selectedApp" class="flex gap-2">
                  <UBadge color="primary" variant="subtle">
                    {{ versions.length }} 个版本
                  </UBadge>
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="sm"
                    @click="confirmDelete(selectedApp, 'all')"
                  >
                    删除应用
                  </UButton>
                </div>
              </div>
            </template>

            <div v-if="!selectedApp" class="text-center py-16">
              <UIcon
                name="i-lucide-arrow-left"
                class="text-4xl text-gray-400 mb-2"
              />
              <p class="text-sm text-gray-500">请从左侧选择一个应用</p>
            </div>

            <div v-else-if="loading" class="space-y-3">
              <USkeleton class="h-20 w-full" v-for="i in 4" :key="i" />
            </div>

            <div v-else-if="versions.length === 0" class="text-center py-16">
              <UIcon
                name="i-lucide-git-branch"
                class="text-4xl text-gray-400 mb-2"
              />
              <p class="text-sm text-gray-500">该应用暂无版本</p>
            </div>

            <div v-else class="space-y-3">
              <UCard
                v-for="version in versions"
                :key="version"
                :ui="{ body: 'p-4' }"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="p-2 bg-primary-50 dark:bg-primary-950 rounded-lg"
                    >
                      <UIcon
                        name="i-lucide-git-branch"
                        class="text-primary-500"
                      />
                    </div>
                    <div>
                      <p class="font-medium">{{ version }}</p>
                      <p class="text-sm text-gray-500">
                        {{ selectedApp }}@{{ version }}
                      </p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <UButton
                      :to="appURL(version)"
                      target="_blank"
                      icon="i-lucide-external-link"
                      color="primary"
                      variant="ghost"
                      size="sm"
                    >
                      访问
                    </UButton>
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="sm"
                      @click="confirmDelete(selectedApp, version)"
                    >
                      删除
                    </UButton>
                  </div>
                </div>
              </UCard>
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <UModal v-model:open="deleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-alert-triangle" class="text-red-500" />
              <h3 class="text-lg font-semibold">确认删除</h3>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-400">
            你确定要删除
            <span class="font-semibold">{{ appToDelete?.name }}</span>
            <template v-if="appToDelete?.version === 'all'">
              的所有版本
            </template>
            <template v-else> 的版本 {{ appToDelete?.version }} </template>
            吗？此操作无法撤销。
          </p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="deleteModalOpen = false"
              >
                取消
              </UButton>
              <UButton color="error" :loading="loading" @click="deleteApp">
                确认删除
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
