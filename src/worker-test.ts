import { Elysia } from "elysia";

export const app = new Elysia().get("/", () => "Hello from Vercel Edge");

export default app.handle;