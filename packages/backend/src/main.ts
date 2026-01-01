import { Elysia, file, NotFoundError, status, t } from "elysia";
import { join, resolve } from "path";
import { maxSatisfying } from "semver";
import { ensureDir, exists, rm } from "fs-extra";
import { fdir } from "fdir";
import staticPlugin from "@elysiajs/static";

const app_path = "./app_data";

await ensureDir(app_path);

const lsdir = async (path: string) => {
  const api = new fdir({
    excludeFiles: true,
    includeDirs: true,
    maxDepth: 0,
    relativePaths: true,
    filters: [(path) => path !== "."],
  }).crawl(path);

  const paths = (await api.withPromise()).map((item) => item.slice(0, -1));
  return paths;
};

const mainApp = new Elysia().group("/app", (app) =>
  app
    .get("/", async () => lsdir(app_path))
    .get("/:name", async ({ params }) => {
      const project_path = resolve(app_path, params.name);

      if (!(await exists(project_path))) {
        return new NotFoundError(`${project_path} not found`);
      } else {
        return lsdir(project_path);
      }
    })
    .delete(
      "/:name",
      async ({ params, query }) => {
        const project_path = resolve(
          app_path,
          params.name,
          query.version === "all" ? "" : query.version
        );

        if (!(await exists(project_path))) {
          return status(404, "Project not found");
        } else {
          await rm(project_path, { recursive: true, force: true });
          return { message: `${project_path} deleted` };
        }
      },
      {
        query: t.Object({
          version: t.Union([t.String(), t.Literal("all")]),
        }),
      }
    )
    .post(
      "/:name",
      async ({ params, body, query }) => {
        const project_path = resolve(app_path, params.name, query.version);
        const index_path = resolve(project_path, "index.js");

        if (await exists(project_path)) {
          return status(403, "Project already exists");
        } else {
          await ensureDir(project_path);

          if (body.file.type === "application/zip") {
            const zipBuffer = await body.file.arrayBuffer();
            const tempZipPath = resolve(project_path, "temp.zip");

            await Bun.write(tempZipPath, zipBuffer);

            const proc = Bun.spawn(["unzip", "-o", "temp.zip"], {
              cwd: project_path,
              stdout: "pipe",
              stderr: "pipe",
            });

            await proc.exited;

            await rm(tempZipPath, { force: true });
          } else {
            await Bun.write(index_path, body.file);
          }

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
              data: { modulePath: index_path },
            });
          });

          if (!validationResult.success) {
            await rm(project_path, { recursive: true, force: true });
            return status(
              400,
              validationResult.error || "Invalid Elysia application"
            );
          }

          return { message: "Project uploaded and validated successfully" };
        }
      },
      {
        body: t.Object({
          file: t.File({
            name: t.String({
              pattern: "/$ ^.*\.(js|zip)$/",
            }),
          }),
        }),
        query: t.Object({
          version: t.String(),
        }),
      }
    )
    .all(
      "/:name/:version/*",
      async (req) => {
        if (req.params.version === "latest") {
          const versions = await lsdir(resolve(app_path, req.params.name));
          const latestVersion = maxSatisfying(versions, "*");
          if (!latestVersion) {
            return status(404, "No versions found");
          }
          req.params.version = latestVersion;
        }

        const project_path = resolve(
          app_path,
          req.params.name,
          req.params.version
        );
        const index_path = resolve(project_path, "index.js");

        if (!(await exists(index_path))) {
          return status(404, "Project not found");
        } else {
          const workerModule = await import(index_path);
          const app = new Elysia({
            prefix: `/app/${req.params.name}/${req.params.version}`,
          }).use(workerModule.app as Elysia);

          return await app.handle(req.request);
        }
      },
      {
        parse: "none",
      }
    )
);

if (import.meta.main) {
  try {
    const mainPort = parseInt(process.env.MAIN_PORT || "3000");

    console.log(`Attempting to start server on port ${mainPort}...`);

    const FRONTEND_DIST_PATH = resolve(import.meta.dir, "./public")

    if (await exists(FRONTEND_DIST_PATH)) {
      mainApp
        .use(
          staticPlugin({
            assets: FRONTEND_DIST_PATH,
            prefix: "",
            alwaysStatic: true,
            indexHTML: false
          }),
        )
        .get("/:name?", async ({ params }) => {
          const ex = await exists(resolve(FRONTEND_DIST_PATH, params.name === undefined ? "index.html" : params.name))

          if (!ex) {
            return status(404, Bun.file(resolve(FRONTEND_DIST_PATH, "404.html")))
          } else {
            return Bun.file(resolve(FRONTEND_DIST_PATH, params.name === undefined ? "index.html" : params.name))
          }
        })
    }

    mainApp.listen({ port: mainPort });

    console.log(`Server URL: http://localhost:${mainPort}`);
  } catch (error) {
    console.error("✗ Failed to start main server:", error);
    process.exit(1);
  }
}

export { mainApp };
