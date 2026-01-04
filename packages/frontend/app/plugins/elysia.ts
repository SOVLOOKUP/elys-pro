import { newClient } from "elys-pro-backend";

export default defineNuxtPlugin({
  name: "elysia",
  setup() {
    const route = useRoute()
    const config = useConfigStore()

    if (typeof route.query.backendURL === "string") {
      config.backendURL = decodeURIComponent(route.query.backendURL)
    }

    const baseURL =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : config.backendURL

    const elysia = newClient(baseURL);

    return {
      provide: {
        elysia,
      },
    };
  },
});
