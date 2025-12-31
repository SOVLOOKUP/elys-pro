import { newClient } from "elys-pro-backend"

export default defineNuxtPlugin({
  name: 'elysia',
  setup() {
    const elysia = newClient('http://localhost:3000')
    
    return {
      provide: {
        elysia
      }
    }
  }
}) 
