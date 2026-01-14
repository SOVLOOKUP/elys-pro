<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          储存管理
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">管理存储配置和连接</p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <UCard :ui="{ body: 'p-4' }">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UIcon
                name="i-lucide-hard-drive"
                class="text-blue-600 dark:text-blue-400 w-6 h-6"
              />
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                总存储数
              </p>
              <p class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ stores.length }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard :ui="{ body: 'p-4' }">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <UIcon
                name="i-lucide-check-circle"
                class="text-green-600 dark:text-green-400 w-6 h-6"
              />
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                活跃连接
              </p>
              <p class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ activeStores.length }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard :ui="{ body: 'p-4' }">
          <div class="flex items-center">
            <div class="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <UIcon
                name="i-lucide-alert-triangle"
                class="text-red-600 dark:text-red-400 w-6 h-6"
              />
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                异常连接
              </p>
              <p class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ inactiveStores.length }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Store List -->
        <div>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <h2 class="text-lg font-semibold">存储列表</h2>
                  <UBadge color="primary" variant="subtle"
                    >{{ stores.length }} 项</UBadge
                  >
                </div>

                <UModal scrollable v-model:open="createModalOpen">
                  <div>
                    <UButton label="Open" icon="i-lucide-plus" size="lg">
                      创建存储
                    </UButton>
                  </div>
                  <template #content>
                    <!-- Create/Edit Form -->
                    <UCard>
                      <template #header>
                        <h2 class="text-lg font-semibold">
                          {{ isEditing ? "编辑存储" : "创建存储" }}
                        </h2>
                      </template>

                      <UForm class="space-y-4">
                        <UFormField label="存储名称" required>
                          <UInput
                            v-model="form.name"
                            placeholder="例如: my-store"
                            icon="i-lucide-hard-drive"
                            class="font-mono w-full"
                            :disabled="isEditing"
                          />
                        </UFormField>

                        <UFormField label="存储协议" required>
                          <USelect
                            v-model="form.schema"
                            :items="protocols"
                            icon="i-lucide-command"
                            :ui="{ content: 'min-w-fit' }"
                            placeholder="选择存储协议"
                          >
                            <template #leading="{ modelValue, ui }">
                              <UIcon
                                v-if="modelValue"
                                :name="getProtocolIcon(modelValue)"
                                :class="ui.leadingAvatar()"
                              />
                            </template>
                          </USelect>
                        </UFormField>

                        <UFormField label="配置参数" required>
                          <div class="space-y-2">
                            <p class="text-xs text-gray-500">
                              根据所选协议填写相应配置
                            </p>
                            <SchemaConfigForm v-model="formWithFullInterface" />
                          </div>
                        </UFormField>

                        <div class="flex items-center justify-between pt-2">
                          <div>
                            <UButton
                              :loading="testingConnection"
                              @click="testConnection"
                              color="primary"
                              variant="outline"
                              size="sm"
                            >
                              测试连接
                            </UButton>
                            <p
                              v-if="connectionTestResult"
                              :class="
                                connectionTestResult.success
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              "
                              class="mt-1 text-xs"
                            >
                              {{ connectionTestResult.message }}
                            </p>
                          </div>
                        </div>
                      </UForm>

                      <template #footer>
                        <div class="flex justify-end gap-2">
                          <UButton
                            color="neutral"
                            variant="ghost"
                            @click="createModalOpen = false"
                          >
                            取消
                          </UButton>
                          <UButton
                            :loading="loading"
                            @click="submitForm"
                            color="primary"
                            :disabled="!canCreateStore"
                          >
                            {{ isEditing ? "更新" : "创建" }}
                          </UButton>
                        </div>
                      </template>
                    </UCard>
                  </template>
                </UModal>
              </div>
            </template>

            <div class="space-y-3">
              <div v-if="loading && stores.length === 0" class="space-y-3">
                <USkeleton class="h-16 w-full" v-for="i in 3" :key="i" />
              </div>

              <div v-else-if="stores.length === 0" class="text-center py-8">
                <UIcon
                  name="i-lucide-hard-drive"
                  class="text-4xl text-gray-400 mb-2"
                />
                <p class="text-sm text-gray-500">暂无存储配置</p>
                <p class="text-xs text-gray-400 mt-1">
                  点击右上角按钮创建新的存储
                </p>
              </div>

              <div v-else class="space-y-3 max-h-96 overflow-y-auto">
                <StoreInfoCard
                  v-for="store in stores"
                  :key="store.name"
                  :store="store"
                  :testing="
                    testingConnection && selectedStore?.name === store.name
                  "
                  @view="showStoreDetail"
                  @test="handleTestStore"
                  @delete="confirmDelete"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
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
            您确定要删除存储
            <span class="font-semibold">{{ storeToDelete }}</span> 吗？
            此操作无法撤销。
          </p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="
                  deleteModalOpen = false;
                  if (isEditing) cancelEdit();
                "
              >
                取消
              </UButton>
              <UButton color="error" :loading="loading" @click="deleteStore">
                确认删除
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Store Detail Modal -->
    <UModal v-model:open="detailModalOpen" scrollable>
      <template #content>
        <UCard v-if="selectedStore">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon
                  :name="getProtocolIcon(selectedStore.schema as OpendalSchema)"
                  class="text-primary-500 w-6 h-6"
                />
                <h3 class="text-lg font-semibold">{{ selectedStore.name }}</h3>
                <UBadge
                  :color="
                    selectedStore.status === 'active' ? 'success' : 'error'
                  "
                  variant="subtle"
                >
                  {{
                    selectedStore.status === "active" ? "已连接" : "连接异常"
                  }}
                </UBadge>
              </div>
              <UButton
                :loading="testingConnection"
                @click="testSelectedStoreConnection"
                color="primary"
                variant="outline"
                size="sm"
              >
                测试连接
              </UButton>
            </div>
          </template>

          <div class="space-y-4">
            <!-- 基本信息 -->
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                基本信息
              </h4>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-gray-600 dark:text-gray-400"
                    >协议类型:</span
                  >
                  <span class="ml-2 font-medium capitalize">{{
                    selectedStore.schema
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600 dark:text-gray-400"
                    >创建时间:</span
                  >
                  <span class="ml-2">{{
                    formatDate(selectedStore.createdAt)
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600 dark:text-gray-400"
                    >更新时间:</span
                  >
                  <span class="ml-2">{{
                    formatDate(selectedStore.updatedAt)
                  }}</span>
                </div>
                <div v-if="selectedStore.id">
                  <span class="text-gray-600 dark:text-gray-400">存储ID:</span>
                  <span class="ml-2 font-mono text-xs">{{
                    selectedStore.id
                  }}</span>
                </div>
              </div>
            </div>

            <!-- 配置详情 -->
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                配置详情
              </h4>
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <pre class="text-xs overflow-x-auto">{{
                  JSON.stringify(selectedStore.config, null, 2)
                }}</pre>
              </div>
            </div>

            <!-- 连接状态 -->
            <div v-if="selectedStoreTestResult">
              <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                连接测试结果
              </h4>
              <div
                :class="[
                  'p-3 rounded-lg',
                  selectedStoreTestResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
                ]"
              >
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="
                      selectedStoreTestResult.success
                        ? 'i-lucide-check-circle'
                        : 'i-lucide-x-circle'
                    "
                    :class="[
                      'w-5 h-5',
                      selectedStoreTestResult.success
                        ? 'text-green-600'
                        : 'text-red-600',
                    ]"
                  />
                  <span
                    :class="[
                      'font-medium',
                      selectedStoreTestResult.success
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200',
                    ]"
                  >
                    {{ selectedStoreTestResult.message }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="detailModalOpen = false"
              >
                关闭
              </UButton>
              <!-- <UButton
                color="primary"
                variant="outline"
                @click="editSelectedStore"
              >
                编辑
              </UButton> -->
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import {
  type OpendalSchema,
  schemas,
} from "backend/src/loader/protocal/opendal/generated/schema";
import { startCase } from "es-toolkit";

const { $elysia } = useNuxtApp();
const toast = useToast();

definePageMeta({
  layout: "dashboard",
});

// Store 数据结构定义
interface Store {
  name: string;
  schema: string;
  config: any;
  createdAt?: Date;
  updatedAt?: Date;
  id?: string;
  status?: "active" | "inactive";
}

// 状态管理
const stores = ref<Store[]>([]);
const loading = ref(false);
const deleteModalOpen = ref(false);
const storeToDelete = ref<string>("");
const isEditing = ref(false);
const createModalOpen = ref(false);
const testingConnection = ref(false);
const connectionTestResult = ref<{ success: boolean; message: string } | null>(
  null
);

// 详情模态框状态
const detailModalOpen = ref(false);
const selectedStore = ref<Store | null>(null);
const selectedStoreTestResult = ref<{
  success: boolean;
  message: string;
} | null>(null);

// 表单数据
const form = ref({
  name: "",
  schema: "http" as OpendalSchema,
  config: {} as Record<string, any>,
});

// 为 SchemaConfigForm 准备完整的接口
const formWithFullInterface = computed({
  get: () => ({
    name: form.value.name,
    version: "1.0.0",
    protocol: form.value.schema,
    config: form.value.config,
    path: "/",
  }),
  set: (newValue) => {
    form.value.config = newValue.config;
  },
});

// 计算属性
const activeStores = computed(() =>
  stores.value.filter((store) => store.status === "active")
);
const inactiveStores = computed(() =>
  stores.value.filter(
    (store) => store.status === "inactive" || store.status === undefined
  )
);

// 判断是否可以创建存储（必须通过连接测试）
const canCreateStore = computed(() => {
  // 必须有存储名称和协议
  if (!form.value.name || !form.value.schema) {
    return false;
  }

  // 必须通过连接测试
  if (!connectionTestResult.value || !connectionTestResult.value.success) {
    return false;
  }

  return true;
});

// 支持的协议列表
const protocols = computed(() =>
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

// 加载所有存储
async function loadStores() {
  loading.value = true;
  try {
    const response = await $elysia.api.store.get();
    stores.value = response.data || [];

    // 加载后测试所有连接状态
    await testAllConnections();
  } catch (error: any) {
    toast.add({
      title: "加载失败",
      description: error.message || "无法获取存储列表",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

// 测试所有存储连接状态
async function testAllConnections() {
  // 为每个存储单独测试连接
  for (let i = 0; i < stores.value.length; i++) {
    const store = stores.value[i];

    if (store) {
      try {
        // 使用专门的测试连接API来测试每个存储
        const testPayload = {
          schema: store.schema as OpendalSchema,
          config: store.config,
        };

        const response = await $elysia.api.store.testConnection.post(
          testPayload
        );

        // 根据响应判断连接是否成功
        if (response.data) {
          const responseData = response.data;
          let isActive = true;

          if (typeof responseData === "object" && "success" in responseData) {
            isActive = !!responseData.success;
          } else if (
            typeof responseData === "object" &&
            "status" in responseData
          ) {
            isActive =
              responseData.status === "success" || responseData.status === "ok";
          }

          store.status = isActive ? "active" : "inactive";
        } else {
          store.status = "inactive";
        }
      } catch (error) {
        // 如果测试失败，标记为非活跃
        store.status = "inactive";
      }
    }
  }
}

// 创建或更新存储
async function submitForm() {
  if (!form.value.name || !form.value.schema) {
    toast.add({
      title: "表单不完整",
      description: "请填写所有必填字段",
      color: "warning",
    });
    return;
  }

  // 检查连接测试是否已通过
  if (!connectionTestResult.value || !connectionTestResult.value.success) {
    toast.add({
      title: "请先测试连接",
      description: "在提交前请确保连接测试已通过",
      color: "warning",
    });
    return;
  }

  loading.value = true;
  try {
    if (isEditing.value) {
      // 更新现有存储 (使用 POST 方法进行更新)
      await $elysia.api.store({ store: form.value.name }).post({
        schema: form.value.schema,
        config: form.value.config,
      });

      toast.add({
        title: "更新成功",
        description: `存储 ${form.value.name} 已更新`,
        color: "success",
      });
    } else {
      // 创建新存储
      await $elysia.api.store({ store: form.value.name }).post({
        schema: form.value.schema,
        config: form.value.config,
      });

      toast.add({
        title: "创建成功",
        description: `存储 ${form.value.name} 已创建`,
        color: "success",
      });
    }

    // 重置表单并重新加载数据
    resetForm();
    createModalOpen.value = false;
    await loadStores();
  } catch (error: any) {
    toast.add({
      title: isEditing.value ? "更新失败" : "创建失败",
      description: error.message || "操作过程中发生错误",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

// 编辑存储
// function editStore(store: Store) {
//   form.value = {
//     name: store.name,
//     schema: store.schema as OpendalSchema,
//     config: { ...store.config },
//   };
//   isEditing.value = true;
// }

// 取消编辑
function cancelEdit() {
  resetForm();
}

// 确认删除
function confirmDelete(storeName: string) {
  storeToDelete.value = storeName;
  deleteModalOpen.value = true;
}

// 删除存储
async function deleteStore() {
  if (!storeToDelete.value) return;

  loading.value = true;
  try {
    await $elysia.api.store({ store: storeToDelete.value }).delete({});

    toast.add({
      title: "删除成功",
      description: `存储 ${storeToDelete.value} 已删除`,
      color: "success",
    });

    deleteModalOpen.value = false;
    storeToDelete.value = "";
    await loadStores();
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

// 测试连接
async function testConnection() {
  if (!form.value.schema) {
    connectionTestResult.value = {
      success: false,
      message: "请选择协议类型",
    };
    return;
  }

  testingConnection.value = true;
  try {
    // 尝试测试连接，使用临时的测试接口
    // 注意：这里假设后端提供了一个测试连接的API，如果没有则可能需要创建一个
    // 或者尝试访问存储以验证连接
    const testPayload = {
      schema: form.value.schema,
      config: form.value.config,
    };

    // 使用专门的测试连接API
    const response = await $elysia.api.store.testConnection.post(testPayload);

    // 检查响应数据以判断连接测试结果
    if (response.data) {
      // 假设后端返回的数据格式包含status或success字段
      const responseData = response.data;

      // 安全地检查响应中的属性
      if (
        typeof responseData === "object" &&
        responseData &&
        "success" in responseData
      ) {
        const success = !!responseData.success;
        const message =
          "message" in responseData && typeof responseData.message === "string"
            ? responseData.message
            : success
            ? "连接测试成功"
            : "连接测试失败";

        connectionTestResult.value = {
          success: success,
          message: message,
        };
      } else if (
        typeof responseData === "object" &&
        responseData &&
        "status" in responseData
      ) {
        // 如果返回的是status字段
        const status =
          "status" in responseData && typeof responseData.status === "string"
            ? responseData.status
            : "";
        const success = status === "success" || status === "ok";
        const message =
          "message" in responseData && typeof responseData.message === "string"
            ? responseData.message
            : success
            ? "连接测试成功"
            : "连接测试失败";

        connectionTestResult.value = {
          success: success,
          message: message,
        };
      } else {
        // 默认认为测试成功
        connectionTestResult.value = {
          success: true,
          message: "连接测试成功",
        };
      }
    } else {
      // 如果没有数据返回，可能表示测试失败
      const errorMessage = response.error
        ? typeof response.error === "object" && "message" in response.error
          ? (response.error as any).message
          : "连接测试失败"
        : "连接测试失败";
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    connectionTestResult.value = {
      success: false,
      message: error.message || "连接测试失败",
    };
  } finally {
    testingConnection.value = false;
  }
}

// 重置表单
function resetForm() {
  form.value = {
    name: "",
    schema: "http",
    config: {},
  };
  isEditing.value = false;
  connectionTestResult.value = null;
}

// 显示存储详情
function showStoreDetail(store: Store) {
  selectedStore.value = store;
  detailModalOpen.value = true;
  selectedStoreTestResult.value = null;
}

// 测试选中存储的连接
async function testSelectedStoreConnection() {
  if (!selectedStore.value) return;

  testingConnection.value = true;
  try {
    const testPayload = {
      schema: selectedStore.value.schema as OpendalSchema,
      config: selectedStore.value.config,
    };

    const response = await $elysia.api.store.testConnection.post(testPayload);

    if (response.data) {
      const responseData = response.data;
      let success = true;
      let message = "连接测试成功";

      if (typeof responseData === "object" && "success" in responseData) {
        success = !!responseData.success;
        message =
          "message" in responseData && typeof responseData.message === "string"
            ? responseData.message
            : success
            ? "连接测试成功"
            : "连接测试失败";
      } else if (typeof responseData === "object" && "status" in responseData) {
        const status =
          "status" in responseData && typeof responseData.status === "string"
            ? responseData.status
            : "";
        success = status === "success" || status === "ok";
        message =
          "message" in responseData && typeof responseData.message === "string"
            ? responseData.message
            : success
            ? "连接测试成功"
            : "连接测试失败";
      }

      selectedStoreTestResult.value = { success, message };
    } else {
      throw new Error("连接测试失败");
    }
  } catch (error: any) {
    selectedStoreTestResult.value = {
      success: false,
      message: error.message || "连接测试失败",
    };
  } finally {
    testingConnection.value = false;
  }
}

// 格式化日期
function formatDate(date: Date | string | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 处理存储测试
function handleTestStore(store: Store) {
  selectedStore.value = store;
  testSelectedStoreConnection();
}

// 初始化
onMounted(async () => {
  await loadStores();
});
</script>
