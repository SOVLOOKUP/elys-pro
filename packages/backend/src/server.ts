import { Elysia, NotFoundError, status, t } from "elysia";
import cors from "@elysiajs/cors";
import { prisma } from "./db";
import {
  schemas,
  type OpendalSchema,
} from "./loader/protocal/generated/schema";
import { newURL } from "./loader/protocal/utils";
import { Operator } from "opendal";

// 生产前端地址
const frontend_origin =
  process.env.FRONTEND_ORIGIN || "https://elys.metapoint.tech";

const mainApp = new Elysia()
  // elys-pro 的管理 API
  .group("/api", (app) =>
    app
      // 允许本地调试及生产前端 origin 跨域
      .use(
        cors({
          origin: [
            new RegExp(`${frontend_origin}$`),
            /localhost:?\d*$/,
            /127.0.0.1:?\d*$/,
            /0.0.0.0:?\d*$/,
          ],
        }),
      )
      .get("/health", () => ({ status: "ok" }))
      // 应用管理
      .group("/app", (app) =>
        app
          .get("/", async () => {
            const apps = await prisma.app.findMany();
            return apps;
          })
          // 获取应用所有版本
          .get("/:name", async ({ params }) => {
            // 获取所有应用
            const apps = await prisma.app.findMany({
              where: {
                name: params.name,
              },
            });

            if (apps.length === 0) {
              return new NotFoundError(`${params.name} not found`);
            }

            return apps;
          })
          // 删除应用
          .delete(
            "/:name",
            async ({ params, body }) => {
              const res = await prisma.app.deleteMany({
                where: {
                  name: params.name,
                  version: body.version === "all" ? undefined : body.version,
                },
              });

              if (res.count === 0) {
                return new NotFoundError(`${params.name} not found`);
              }

              return res;
            },
            {
              body: t.Object({
                // 指定版本号或 all
                version: t.Union([t.String(), t.Literal("all")]),
              }),
            },
          )
          // 创建应用
          .post(
            "/:name",
            async ({ params, body }) => {
              const name = params.name;
              const version = body.version;

              const store = await prisma.store.findUnique({
                where: {
                  id: body.storeId,
                },
              });

              if (!store) {
                return new NotFoundError(`Store ${body.storeId} not found`);
              }

              const url = newURL(
                store.schema as OpendalSchema,
                store.config as Record<string, string>,
                body.path,
              );

              // 校验应用是否符合规范
              const validationResult = await new Promise<{
                success: boolean;
                error?: string;
              }>((resolve) => {
                const validator = new Worker(
                  new URL("./workers/worker-validator.ts", import.meta.url)
                    .href,
                );

                const timeout = setTimeout(() => {
                  validator.terminate();
                  resolve({ success: false, error: "Validation timeout" });
                }, 5000);

                validator.addEventListener("message", (event) => {
                  clearTimeout(timeout);
                  const message = event.data;

                  if (message.type === "validation-success") {
                    validator.terminate();
                    resolve({ success: true });
                  } else if (message.type === "validation-failed") {
                    validator.terminate();
                    resolve({ success: false, error: message.message });
                  } else if (message.type === "validation-error") {
                    validator.terminate();
                    resolve({ success: false, error: message.error });
                  }
                });

                validator.addEventListener("error", (error) => {
                  clearTimeout(timeout);
                  validator.terminate();
                  resolve({ success: false, error: error.message });
                });

                validator.postMessage({
                  type: "validate",
                  data: { modulePath: url },
                });
              });

              if (!validationResult.success) {
                return status(
                  400,
                  validationResult.error || "Invalid Elysia application",
                );
              } else {
                const app = await prisma.app.create({
                  data: {
                    name,
                    version,
                    path: body.path,
                    storeId: body.storeId,
                  },
                });
                return app;
              }
            },
            {
              body: t.Object({
                version: t.String(),
                path: t.String(),
                storeId: t.String(),
              }),
            },
          ),
      )
      // 存储管理
      .group("/store", (app) =>
        app
          .get("/", async () => {
            const result = await prisma.store.findMany();
            return result;
          })
          .post(
            "/testConnection",
            async ({ body }) => {
              const op = new Operator(body.schema, body.config);

              // 使用 Promise.race 实现超时控制
              try {
                const timeoutPromise = new Promise((_, reject) => {
                  setTimeout(
                    () => reject(new Error("Connection test timeout")),
                    3000,
                  ); // 3秒超时
                });

                const checkPromise = op.check();

                await Promise.race([checkPromise, timeoutPromise]);

                return { status: "success" };
              } catch (error) {
                // 确保错误信息是字符串类型，避免类型错误
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                return { status: "error", message: errorMessage };
              }
            },
            {
              body: t.Object({
                schema: t.Enum(Object.fromEntries(schemas.map((i) => [i, i]))),
                config: t.Record(t.String(), t.String()),
              }),
            },
          )
          .get("/:store", async ({ params }) => {
            const result = await prisma.store.findUnique({
              where: {
                name: params.store,
              },
            });
            return result;
          })
          .post(
            "/:store",
            async ({ params, body }) => {
              return await prisma.store.create({
                data: {
                  name: params.store,
                  schema: body.schema,
                  config: body.config,
                },
              });
            },
            {
              body: t.Object({
                schema: t.Enum(Object.fromEntries(schemas.map((i) => [i, i]))),
                config: t.Record(t.String(), t.String()),
              }),
            },
          )
          .delete(
            "/:store",
            async ({ params }) => {
              return await prisma.store.delete({
                where: {
                  name: params.store,
                },
              });
            },
            {
              body: t.Object({}),
            },
          ),
      ),
  )
  // 携带后端地址跳转到前端
  .get("/", ({ request }) => {
    const target = new URL(frontend_origin);

    // 远程仅允许 https 安全访问
    const atLocalhost =
      request.url.startsWith("http://localhost") ||
      request.url.startsWith("http://127.0.0.1") ||
      request.url.startsWith("http://0.0.0.0");

    const backendURL = atLocalhost
      ? request.url
      : request.url.replace("http", "https");

    target.searchParams.set("backendURL", encodeURIComponent(backendURL));

    // 跳转到前端地址
    return Response.redirect(target.href, 302);
  });

const startServer = async () => {
  try {
    const adminPort = parseInt(Bun.env.ADMIN_PORT || "3000");

    mainApp.listen({ port: adminPort });

    console.log(`Server URL: http://localhost:${adminPort}`);
    return mainApp;
  } catch (error) {
    console.error("✗ Failed to start main server:", error);
    process.exit(1);
  }
};

export type { mainApp };
export { startServer };
