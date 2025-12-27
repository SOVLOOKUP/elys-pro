import Elysia from 'elysia';

// 保存服务器实例以便能够优雅地关闭它
let serverInstance: Elysia | null = null;

// 监听从主线程发送的消息
addEventListener("message", async (event) => {
    const { type, data } = event.data;

    if (type === 'start') {
        try {
            // 导入 worker 模块
            const workerModule = await import(data.workerPath);

            if (!(workerModule.app instanceof Elysia)) {
                throw new Error('Worker module does not export an app instance');
            }

            let app = workerModule.app as Elysia;

            // 添加健康检查路由（如果需要且不存在）
            if (data.healthCheck) {
                // 检查是否存在健康检查路由
                let hasHealthRoute = false;
                for (const route of app.routes) {
                    if (route.path === '/health') {
                        hasHealthRoute = true;
                        break;
                    }
                }

                if (!hasHealthRoute) {
                    app.get('/health', () => ({
                        status: 'ok',
                        worker: data.name,
                        timestamp: new Date().toISOString()
                    }));
                }
            }

            // 添加工作器名称标识
            app.decorate('workerName', data.name);

            // 如果指定了前缀，使用前缀
            if (data.prefix) {
                const prefixedApp = new (await import('elysia')).Elysia({ prefix: data.prefix });
                prefixedApp.use(app);
                serverInstance = prefixedApp.listen({ port: data.port });

                postMessage({
                    type: 'started',
                    message: `Worker ${data.name} with prefix ${data.prefix} started on port ${data.port}`
                });
            } else {
                serverInstance = app.listen({ port: data.port });
                postMessage({
                    type: 'started',
                    message: `Worker ${data.name} started on port ${data.port}`
                });
            }

        } catch (error: unknown) {
            postMessage({
                type: 'error',
                error: error.message
            });
        }
    } else if (type === 'terminate') {
        // 等待所有 HTTP 会话都退出或 30 秒后强制终止
        if (serverInstance && serverInstance.stop) {
            const name = serverInstance.decorator.workerName;
            console.log(`Worker ${name} is shutting down gracefully...`);

            // 设置 30 秒超时，超时后强制退出
            const forceExitTimer = setTimeout(() => {
                console.log(`Worker ${name} force exit after 30 seconds timeout.`);
                process.exit(0);
            }, 30000); // 30秒超时

            // 尝试优雅地关闭服务器
            serverInstance.stop().then(() => {
                clearTimeout(forceExitTimer);
                console.log(`Worker ${name} shutdown completed.`);
                // 发送关闭完成消息给主进程
                postMessage({
                    type: 'shutdown',
                    message: `Worker ${name} shutdown completed.`
                });
                process.exit(0);
            }).catch((error: any) => {
                console.error(`Error during graceful shutdown of worker ${name}:`, error);
                clearTimeout(forceExitTimer);
                // 发送错误消息给主进程
                postMessage({
                    type: 'shutdown-error',
                    error: error.message
                });
                process.exit(1);
            });
        } else {
            // 如果没有服务器实例，直接退出
            process.exit(0);
        }
    }
});