import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', () => {
    const backendURL = ref(useRequestURL().origin)
    return { backendURL }
})