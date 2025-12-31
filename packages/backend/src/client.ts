import { mainApp } from "./main";
import { treaty } from "@elysiajs/eden";

export type AppRouter = typeof mainApp;
export const newClient = treaty<AppRouter>;
