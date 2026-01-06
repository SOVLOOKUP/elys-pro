import type { mainApp } from "./server";
import { treaty } from "@elysiajs/eden";

export type AppRouter = typeof mainApp;
export const newClient = treaty<AppRouter>;
