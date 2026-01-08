import { Elysia, NotFoundError, status, t } from "elysia";
import { join } from "path";
import { maxSatisfying } from "semver";
import cors from "@elysiajs/cors";
import { prisma } from "./db";
import type { App } from "./generated/prisma/client";

// 生产前端地址
const frontend_origin = "https://elys.metapoint.tech";

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
        })
      )
      // 获取所有应用
      .get("/apps", async () => {
        const apps = await prisma.app.findMany();
        return apps;
      })
      // 应用管理
      .group("/app", (app) =>
        app
          // 获取应用所有版本
          .get("/:name", async ({ params }) => {
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
            async ({ params, query }) => {
              const res = await prisma.app.deleteMany({
                where: {
                  name: params.name,
                  version: query.version === "all" ? undefined : query.version,
                },
              });

              if (res.count === 0) {
                return new NotFoundError(`${params.name} not found`);
              }

              return res;
            },
            {
              query: t.Object({
                // 指定版本号或 all
                version: t.Union([t.String(), t.Literal("all")]),
              }),
            }
          )
          // 创建应用
          .post(
            "/:name",
            async ({ params, body, query }) => {
              const name = params.name;
              const version = query.version;
              const url = body.url;

              // 校验应用是否符合规范
              const validationResult = await new Promise<{
                success: boolean;
                error?: string;
              }>((resolve) => {
                const validator = new Worker(
                  join(import.meta.dir, "./workers/worker-validator.ts")
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
                  resolve({ success: false, error: String(error) });
                });

                validator.postMessage({
                  type: "validate",
                  data: { modulePath: url },
                });
              });

              if (!validationResult.success) {
                return status(
                  400,
                  validationResult.error || "Invalid Elysia application"
                );
              } else {
                const app = await prisma.app.create({
                  data: {
                    name,
                    version,
                    url,
                  },
                });
                return app;
              }
            },
            {
              body: t.Object({
                url: t.String({
                  format: "uri",
                }),
              }),
              query: t.Object({
                version: t.String(),
              }),
            }
          )
      )
  )
  // 应用运行
  .all(
    "/app/:name/:version/*",
    async (req) => {
      let targetApp: App;
      // 最新版本
      if (req.params.version === "latest") {
        const apps = await prisma.app.findMany({
          where: {
            name: req.params.name,
          },
        });

        const versions = apps.map((item) => item.version);

        const latestVersion = maxSatisfying(versions, "*");

        if (!latestVersion) {
          return status(404, "No versions found");
        }

        const app = apps.find((item) => item.version === latestVersion)!;

        targetApp = app;
      } else {
        // 指定版本
        const app = await prisma.app.findFirst({
          where: {
            name: req.params.name,
            version: req.params.version,
          },
        });

        if (!app) {
          return status(404, "Version not found");
        }

        targetApp = app;
      }

      const appModule = await import(targetApp.url);

      const app = new Elysia({
        prefix: `/app/${req.params.name}/${req.params.version}`,
      }).use(appModule.app as Elysia);

      return await app.handle(req.request);
    },
    {
      parse: "none",
    }
  );

const startServer = async () => {
  try {
    const mainPort = parseInt(Bun.env.MAIN_PORT || "3000");

    mainApp
      // 携带后端地址跳转到前端
      .get("/", ({ request }) => {
        const target = new URL(frontend_origin);
        target.searchParams.set("backendURL", encodeURIComponent(request.url));
        return Response.redirect(target.href, 302);
      })
      .listen({ port: mainPort });

    console.log(`Server URL: http://localhost:${mainPort}`);
    return mainApp;
  } catch (error) {
    console.error("✗ Failed to start main server:", error);
    process.exit(1);
  }
};

export type { mainApp };
export { startServer };
