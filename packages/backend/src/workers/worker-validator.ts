import Elysia from "elysia";

addEventListener("message", async (event) => {
  const { type, data } = event.data;

  if (type === "validate") {
    try {
      const { modulePath } = data;

      const workerModule = await import(modulePath);

      if (workerModule.app instanceof Elysia) {
        postMessage({
          type: "validation-success",
          message: "Valid Elysia application",
        });
      } else {
        postMessage({
          type: "validation-failed",
          message: "Module does not export a valid Elysia app instance",
        });
      }
    } catch (error) {
      postMessage({
        type: "validation-error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
});
