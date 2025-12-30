import { Elysia } from "elysia";

export const app = new Elysia().get("/:name", ({ params }) => `Hello from ${params.name}`);

export default app.handle;
