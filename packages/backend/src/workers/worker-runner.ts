import Elysia from "elysia";
import { moreImports } from "../loader";
import type { App } from "../generated/prisma/client";
import { maxSatisfying } from "semver";
import { prisma } from "../db";
import { status } from "elysia";
import { NotFoundError } from "elysia";
import { newURL } from "../loader/protocal/utils";
import type { OpendalSchema } from "../loader/protocal/generated/schema";

// prevents TS errors
declare var self: Worker;

await Bun.plugin(moreImports);

const mainApp = new Elysia()
  .get("/", () => "Hello Elysia")
  // 应用运行
  .all(
    "/:name/:version/*",
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
        const app = await prisma.app.findUnique({
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

      const store = await prisma.store.findUnique({
        where: {
          id: targetApp.storeId,
        },
      });

      if (!store) {
        return new NotFoundError(`Store ${targetApp.storeId} not found`);
      }

      const url = newURL(
        store.schema as OpendalSchema,
        store.config as Record<string, string>,
        targetApp.path,
      );

      const appModule = await import(url);

      const app = new Elysia({
        prefix: `/${req.params.name}/${req.params.version}`,
      }).use(appModule.app as Elysia);

      return await app.handle(req.request);
    },
    {
      parse: "none",
    },
  );

let server: ReturnType<typeof mainApp.listen>;
const port = parseInt(Bun.env.APP_PORT || "2999");

self.addEventListener("message", (event) => {
  if (event.data.type === "start") {
    server = mainApp.listen({ port });
    self.postMessage({ type: "started", port });
  } else if (event.data.type === "stop") {
    if (server) {
      server.stop();
      self.postMessage({ type: "stopped" });
    }
  }
});
