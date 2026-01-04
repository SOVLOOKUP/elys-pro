import { newClient } from "elys-pro-backend";

export default defineNuxtPlugin({
  name: "elysia",
  setup() {
    const baseURL =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : useRequestURL().origin;

    const elysia = newClient(baseURL);

    return {
      provide: {
        elysia,
      },
    };
  },
});
