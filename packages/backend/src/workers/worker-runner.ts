import Elysia from "elysia";

let serverInstance: Elysia | null = null;

addEventListener("message", async (event) => {
  const { type, data } = event.data;

  if (type === "start") {
    try {
      const workerModule = await import(data.workerPath);

      if (!(workerModule.app instanceof Elysia)) {
        throw new Error("Worker module does not export an app instance");
      }

      let app = workerModule.app as Elysia;

      if (data.healthCheck) {
        let hasHealthRoute = false;
        for (const route of app.routes) {
          if (route.path === "/health") {
            hasHealthRoute = true;
            break;
          }
        }

        if (!hasHealthRoute) {
          app.get("/health", () => ({
            status: "ok",
            worker: data.name,
            timestamp: new Date().toISOString(),
          }));
        }
      }

      app.decorate("workerName", data.name);

      if (data.prefix) {
        const prefixedApp = new Elysia({
          prefix: data.prefix,
        });
        prefixedApp.use(app);
        serverInstance = prefixedApp.listen({ port: data.port });

        postMessage({
          type: "started",
          message: `Worker ${data.name} with prefix ${data.prefix} started on port ${data.port}`,
        });
      } else {
        serverInstance = app.listen({ port: data.port });
        postMessage({
          type: "started",
          message: `Worker ${data.name} started on port ${data.port}`,
        });
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error.message : String(error);
      postMessage({
        type: "error",
        error: err,
      });
    }
  } else if (type === "terminate") {
    if (serverInstance && serverInstance.stop) {
      // @ts-ignore
      const name = serverInstance.decorator["workerName"];
      console.log(`Worker ${name} is shutting down gracefully...`);

      const forceExitTimer = setTimeout(() => {
        console.log(`Worker ${name} force exit after 30 seconds timeout.`);
        process.exit(0);
      }, 30000);

      serverInstance
        .stop()
        .then(() => {
          clearTimeout(forceExitTimer);
          console.log(`Worker ${name} shutdown completed.`);
          postMessage({
            type: "shutdown",
            message: `Worker ${name} shutdown completed.`,
          });
          process.exit(0);
        })
        .catch((error: any) => {
          console.error(
            `Error during graceful shutdown of worker ${name}:`,
            error
          );
          clearTimeout(forceExitTimer);
          postMessage({
            type: "shutdown-error",
            error: error.message,
          });
          process.exit(1);
        });
    } else {
      process.exit(0);
    }
  }
});
