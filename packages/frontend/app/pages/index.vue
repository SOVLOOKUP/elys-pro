<script setup lang="ts">
const { $elysia } = useNuxtApp()
const toast = useToast()

// 状态管理
const apps = ref<string[]>([])
const selectedApp = ref<string | null>(null)
const versions = ref<string[]>([])
const loading = ref(false)
const uploadModalOpen = ref(false)
const deleteModalOpen = ref(false)
const appToDelete = ref<{ name: string; version: string | 'all' } | null>(null)

// 上传表单
const uploadForm = ref({
  name: '',
  version: '',
  file: null as File | null
})

// 加载应用列表
async function loadApps() {
  loading.value = true
  try {
    const { data } = await $elysia.app.get()
    apps.value = data || []
  } catch (error) {
    toast.add({
      title: '加载失败',
      description: '无法获取应用列表',
      color: "warning"
    })
  } finally {
    loading.value = false
  }
}

// 加载应用版本
async function loadVersions(appName: string) {
  loading.value = true
  try {
    const { data } = await $elysia.app({ name: appName }).get()
    versions.value = (data as string[]) || []
  } catch (error) {
    toast.add({
      title: '加载失败',
      description: '无法获取版本列表',
      color: "warning"
    })
  } finally {
    loading.value = false
  }
}

// 选择应用
function selectApp(appName: string) {
  selectedApp.value = appName
  loadVersions(appName)
}

// 上传应用
async function uploadApp() {
  if (!uploadForm.value.file || !uploadForm.value.name || !uploadForm.value.version) {
    toast.add({
      title: '表单不完整',
      description: '请填写所有必填字段',
      color: "warning"
    })
    return
  }

  loading.value = true
  try {
    console.log(uploadForm.value.file)
    await $elysia.app({ name: uploadForm.value.name }).post(
      { file: uploadForm.value.file },
      {
        query: {
          version: uploadForm.value.version
        }
      }
    )

    toast.add({
      title: '上传成功',
      description: `应用 ${uploadForm.value.name}@${uploadForm.value.version} 已成功上传`,
      color: "success"
    })

    uploadModalOpen.value = false
    uploadForm.value = { name: '', version: '', file: null }
    await loadApps()
    if (selectedApp.value) {
      await loadVersions(selectedApp.value)
    }
  } catch (error: any) {
    toast.add({
      title: '上传失败',
      description: error.message || '上传过程中发生错误',
      color: "error"
    })
  } finally {
    loading.value = false
  }
}

// 删除应用
function confirmDelete(name: string, version: string | 'all') {
  appToDelete.value = { name, version }
  deleteModalOpen.value = true
}

async function deleteApp() {
  const appToDeleteValue = appToDelete.value
  if (!appToDeleteValue) return

  loading.value = true
  try {
    await $elysia.app({ name: appToDeleteValue.name }).delete(undefined, {
      query: {
        version: appToDeleteValue.version
      }
    })

    toast.add({
      title: '删除成功',
      description: `应用已成功删除`,
      color: "success"
    })

    deleteModalOpen.value = false
    appToDelete.value = null

    if (appToDeleteValue.version === 'all') {
      selectedApp.value = null
      versions.value = []
    }

    await loadApps()
    if (selectedApp.value) {
      await loadVersions(selectedApp.value)
    }
  } catch (error: any) {
    toast.add({
      title: '删除失败',
      description: error.message || '删除过程中发生错误',
      color: "error"
    })
  } finally {
    loading.value = false
  }
}

// 文件选择处理
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    uploadForm.value.file = target.files[0]
  }
}

// 初始化
onMounted(() => {
  loadApps()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Elysia 应用管理
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              管理和部署你的 Elysia 应用
            </p>
          </div>

          <!-- 上传模态框 -->
          <UModal v-model:open="uploadModalOpen">
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
                    <UInput v-model="uploadForm.name" placeholder="例如: my-app" icon="i-lucide-package" />
                  </UFormField>

                  <UFormField label="版本号" required>
                    <UInput v-model="uploadForm.version" placeholder="例如: 1.0.0" icon="i-lucide-git-branch" />
                  </UFormField>

                  <UFormField label="应用文件" required>
                    <div class="space-y-2">
                      <input type="file" accept=".js,.zip" @change="handleFileChange"
                        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-950 dark:file:text-primary-400" />
                      <p class="text-xs text-gray-500">
                        支持 .js 或 .zip 文件
                      </p>
                      <p v-if="uploadForm.file" class="text-xs text-primary-600">
                        已选择: {{ uploadForm.file.name }}
                      </p>
                    </div>
                  </UFormField>
                </UForm>

                <template #footer>
                  <div class="flex justify-end gap-2">
                    <UButton color="neutral" variant="ghost" @click="uploadModalOpen = false">
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
                <h2 class="text-lg font-semibold">
                  应用列表
                </h2>
                <UBadge color="primary" variant="subtle">
                  {{ apps.length }}
                </UBadge>
              </div>
            </template>

            <div v-if="loading && apps.length === 0" class="space-y-3">
              <USkeleton class="h-12 w-full" v-for="i in 3" :key="i" />
            </div>

            <div v-else-if="apps.length === 0" class="text-center py-8">
              <UIcon name="i-lucide-package" class="text-4xl text-gray-400 mb-2" />
              <p class="text-sm text-gray-500">暂无应用</p>
            </div>

            <div v-else class="space-y-2">
              <UButton v-for="app in apps" :key="app" :variant="selectedApp === app ? 'soft' : 'ghost'"
                :color="selectedApp === app ? 'primary' : 'neutral'" block class="justify-between"
                @click="selectApp(app)">
                <span class="flex items-center gap-2">
                  <UIcon name="i-lucide-package" />
                  {{ app }}
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
                  {{ selectedApp ? `${selectedApp} - 版本列表` : '选择一个应用' }}
                </h2>
                <div v-if="selectedApp" class="flex gap-2">
                  <UBadge color="primary" variant="subtle">
                    {{ versions.length }} 个版本
                  </UBadge>
                  <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm"
                    @click="confirmDelete(selectedApp, 'all')">
                    删除应用
                  </UButton>
                </div>
              </div>
            </template>

            <div v-if="!selectedApp" class="text-center py-16">
              <UIcon name="i-lucide-arrow-left" class="text-4xl text-gray-400 mb-2" />
              <p class="text-sm text-gray-500">请从左侧选择一个应用</p>
            </div>

            <div v-else-if="loading" class="space-y-3">
              <USkeleton class="h-20 w-full" v-for="i in 4" :key="i" />
            </div>

            <div v-else-if="versions.length === 0" class="text-center py-16">
              <UIcon name="i-lucide-git-branch" class="text-4xl text-gray-400 mb-2" />
              <p class="text-sm text-gray-500">该应用暂无版本</p>
            </div>

            <div v-else class="space-y-3">
              <UCard v-for="version in versions" :key="version" :ui="{ body: 'p-4' }">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-primary-50 dark:bg-primary-950 rounded-lg">
                      <UIcon name="i-lucide-git-branch" class="text-primary-500" />
                    </div>
                    <div>
                      <p class="font-medium">{{ version }}</p>
                      <p class="text-sm text-gray-500">
                        {{ selectedApp }}@{{ version }}
                      </p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <UButton :to="`/app/${selectedApp}/${version}/`" target="_blank" icon="i-lucide-external-link"
                      color="primary" variant="ghost" size="sm">
                      访问
                    </UButton>
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm"
                      @click="confirmDelete(selectedApp, version)">
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
            <template v-else>
              的版本 {{ appToDelete?.version }}
            </template>
            吗？此操作无法撤销。
          </p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">
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
