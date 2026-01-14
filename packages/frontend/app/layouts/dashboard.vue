<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
      :ui="{ footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <UIcon
          v-if="collapsed"
          name="i-simple-icons-nuxtdotjs"
          class="size-5 text-primary mx-auto"
        />
        <div v-else>
          <h1 class="font-bold text-gray-900 dark:text-white">
            Elysia 应用管理
          </h1>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            管理和部署你的 Elysia 应用
          </p>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items"
          class="group flex flex-col gap-2"
          orientation="vertical"
        />
      </template>

      <template
        #footer="{ collapsed }"
        class="flex items-center justify-center gap-2 group"
      >
        <UIcon
          v-if="collapsed"
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

        <UBadge
          v-else
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
          <span class="group-hover:hidden">{{ backendStatusMessage }}</span>
          <code class="hidden group-hover:inline rounded">{{
            useConfigStore().backendURL
          }}</code>
        </UBadge>
      </template>
    </UDashboardSidebar>

    <div class="flex-1">
      <slot />
    </div>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
const { $elysia } = useNuxtApp();

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

// 初始化
onMounted(async () => {
  // 检查后端连接状态
  await checkBackendStatus();
});

const items: NavigationMenuItem[] = [
  {
    label: "应用列表",
    href: "/",
    icon: "i-lucide-list",
  },
  {
    label: "储存管理",
    href: "/store",
    icon: "i-lucide-database",
  },
];
</script>
