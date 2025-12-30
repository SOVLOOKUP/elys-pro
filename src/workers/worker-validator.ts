import Elysia from "elysia";

// 监听从主线程发送的消息
addEventListener("message", async (event) => {
    const { type, data } = event.data;

    if (type === "validate") {
        try {
            const { modulePath } = data;

            // 在隔离的 Worker 中导入模块
            const workerModule = await import(modulePath);

            // 验证是否是合法的 Elysia 应用
            if (workerModule.app instanceof Elysia) {
                // 验证成功
                postMessage({
                    type: "validation-success",
                    message: "Valid Elysia application",
                });
            } else {
                // 验证失败
                postMessage({
                    type: "validation-failed",
                    message: "Module does not export a valid Elysia app instance",
                });
            }
        } catch (error) {
            // 导入或执行出错
            postMessage({
                type: "validation-error",
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
});
