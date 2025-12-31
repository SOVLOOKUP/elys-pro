import type { AppRouter } from 'elys-pro-backend'
import type { treaty } from '@elysiajs/eden'

declare module '#app' {
  interface NuxtApp {
    $elysia: ReturnType<typeof treaty<AppRouter>>
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $elysia: ReturnType<typeof treaty<AppRouter>>
  }
}

export {}
