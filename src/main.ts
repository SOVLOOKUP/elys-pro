import { Elysia } from "elysia";
import { join } from "path";
import { file } from "bun";
// @ts-ignore
import runner from "./worker-runner" with { type: "file"}

const runnerBlob = file(runner, {
    type: "application/typescript",
});
const workerBlob = URL.createObjectURL(runnerBlob);

interface WorkerConfig {
    name: string;
    port: number;
    workerPath: string;
    enabled?: boolean; // 是否启用此 worker，默认为 true
    env?: Record<string, string>; // 为 worker 设置特定环境变量
    healthCheck?: boolean; // 是否添加健康检查路由，默认为 true
    prefix?: string; // 为 worker 添加路由前缀
}

interface WorkerThread {
    worker: Worker;
    port: number;
    status: 'starting' | 'running' | 'stopped' | 'error';
}

class WorkerManager {
    private workers: Map<string, WorkerThread> = new Map();
    private configs: WorkerConfig[] = [];

    /**
     * 注册 worker 配置
     */
    registerWorker(config: WorkerConfig) {
        // 设置默认值
        const defaultConfig: Required<Pick<WorkerConfig, 'enabled' | 'healthCheck'>> = {
            enabled: true,
            healthCheck: true,
            // env 和 prefix 不设置默认值，因为它们是可选的
        };

        const finalConfig = { ...defaultConfig, ...config };
        this.configs.push(finalConfig);
    }

    /**
     * 加载单个 worker
     */
    async loadWorker(config: WorkerConfig): Promise<void> {
        // 检查 worker 是否启用
        if (config.enabled === false) {
            console.log(`Worker ${config.name} is disabled, skipping...`);
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                // 创建 Bun Worker 来运行 Elysia 应用
                const worker = new Worker(workerBlob);

                // 监听 worker 消息
                worker.addEventListener('message', (event) => {
                    const message = event.data;
                    if (message.type === 'started') {
                        console.log(message.message);
                        const workerThread = this.workers.get(config.name);
                        if (workerThread) {
                            workerThread.status = 'running';
                        }
                        resolve();
                    } else if (message.type === 'error') {
                        console.error(`Worker ${config.name} error:`, message.error);
                        const workerThread = this.workers.get(config.name);
                        if (workerThread) {
                            workerThread.status = 'error';
                        }
                        reject(new Error(message.error));
                    } else if (message.type === 'shutdown' || message.type === 'shutdown-error') {
                        // 处理 worker 关闭消息
                        if (message.type === 'shutdown') {
                            console.log(`Worker ${config.name} shutdown message:`, message.message);
                        } else {
                            console.error(`Worker ${config.name} shutdown error:`, message.error);
                        }
                        // 更新 worker 状态
                        const workerThread = this.workers.get(config.name);
                        if (workerThread) {
                            workerThread.status = 'stopped';
                        }
                    }
                });

                // 监听 worker 错误
                worker.addEventListener('error', (error) => {
                    console.error(`Worker ${config.name} thread error:`, error);
                    const workerThread = this.workers.get(config.name);
                    if (workerThread) {
                        workerThread.status = 'error';
                    }
                    reject(error);
                });

                // 发送启动消息和配置数据
                worker.postMessage({
                    type: 'start',
                    data: {
                        name: config.name,
                        port: config.port,
                        workerPath: config.workerPath,
                        healthCheck: config.healthCheck,
                        prefix: config.prefix,
                        env: config.env
                    }
                });

                // 将 worker 添加到管理器
                this.workers.set(config.name, {
                    worker,
                    port: config.port,
                    status: 'starting'
                });

            } catch (error) {
                console.error(`Failed to create worker thread for ${config.name}:`, error);
                reject(error);
            }
        });
    }

    /**
     * 启动所有注册的 workers
     */
    async startAll(): Promise<void> {
        console.log(`Starting ${this.configs.length} workers...`);

        const startPromises = this.configs.map(config => this.loadWorker(config));

        try {
            await Promise.all(startPromises);
            console.log('All workers started successfully');
        } catch (error) {
            console.error('Failed to start all workers:', error);
            throw error;
        }
    }

    /**
     * 停止指定的 worker
     */
    async stopWorker(name: string): Promise<void> {
        const workerThread = this.workers.get(name);
        if (!workerThread) {
            console.warn(`Worker ${name} not found`);
            return;
        }

        return new Promise((resolve) => {
            // 发送终止消息给 worker
            workerThread.worker.postMessage({ type: 'terminate' });

            // 设置超时，如果 worker 没有响应则强制终止
            const timeout = setTimeout(() => {
                console.log(`Force terminating worker ${name}`);
                workerThread.worker.terminate();
                this.workers.delete(name);
                console.log(`Worker ${name} stopped`);
                resolve();
            }, 35000); // 35秒超时，比 worker 中的 30 秒超时稍长

            // 监听 worker 消息以检测是否已成功关闭
            workerThread.worker.addEventListener('message', (event) => {
                const message = event.data;
                // 当 worker 发送关闭消息时，认为它已成功关闭
                if (message.type === 'shutdown' || message.type === 'shutdown-error') {
                    clearTimeout(timeout);
                    this.workers.delete(name);
                    console.log(`Worker ${name} stopped`);
                    resolve();
                }
            });
        });
    }

    /**
     * 停止所有 workers
     */
    async stopAll(): Promise<void> {
        console.log('Stopping all workers...');

        const stopPromises = Array.from(this.workers.keys()).map(name => this.stopWorker(name));

        await Promise.all(stopPromises);
        console.log('All workers stopped');
    }

    /**
     * 获取所有运行中的 worker 状态
     */
    getStatus(): Array<{ name: string; port: number; status: string }> {
        return this.configs.map(config => {
            const workerThread = this.workers.get(config.name);
            return {
                name: config.name,
                port: config.port,
                status: workerThread ? workerThread.status : 'stopped'
            };
        });
    }

    /**
     * 获取指定 worker 线程
     */
    getWorker(name: string) {
        return this.workers.get(name)?.worker;
    }
}

// 创建全局 worker 管理器实例
const workerManager = new WorkerManager();

// 主服务器，用于管理所有 workers
const mainApp = new Elysia()
    .get('/workers', ({ query }) => {
        if (query && query.status === 'detailed') {
            // 返回详细状态信息
            return workerManager.getStatus().map(status => ({
                ...status,
                uptime: 'N/A' // 可以扩展以跟踪运行时间
            }));
        }
        return workerManager.getStatus();
    })
    .get('/workers/:name', ({ params }) => {
        const workerStatus = workerManager.getStatus().find(w => w.name === params.name);
        if (!workerStatus) {
            return { error: `Worker ${params.name} not found` };
        }
        return workerStatus;
    })
    .post('/workers/:name/start', async ({ params }) => {
        const config = workerManager['configs'].find(c => c.name === params.name);
        if (!config) {
            return { error: `Worker ${params.name} not found in configs` };
        }

        try {
            await workerManager.loadWorker(config);
            return { message: `Worker ${params.name} started successfully` };
        } catch (error) {
            return { error: `Failed to start worker ${params.name}: ${error}` };
        }
    })
    .post('/workers/:name/stop', async ({ params }) => {
        await workerManager.stopWorker(params.name);
        return { message: `Worker ${params.name} stopped` };
    })
    .get('/', () => ({
        message: 'Elysia Worker Manager',
        workersCount: workerManager.getStatus().length,
        runningWorkers: workerManager.getStatus().filter(w => w.status === 'running').length
    }));

// 如果通过直接运行此文件，则启动主服务器和所有 workers
if (import.meta.main) {

    // todo test 注册默认的 worker（如果存在）
    workerManager.registerWorker({
        name: 'default',
        port: 3001,
        workerPath: '/home/xiafan/桌面/elys-pro/test/worker-test.ts', // 默认加载当前的 worker.ts
        enabled: true,
        healthCheck: true
    });

    const startMain = async () => {
        try {
            // 从环境变量或默认值获取主服务器端口
            const mainPort = parseInt(process.env.MAIN_PORT || '8080');

            // 启动主管理服务器
            const mainServer = mainApp.listen({ port: mainPort });
            console.log(`Main worker manager server started on port ${mainPort}`);

            // 启动所有注册的 workers
            await workerManager.startAll();

            // 设置优雅关闭
            const handleShutdown = async () => {
                console.log('\nShutting down gracefully...');
                await workerManager.stopAll();
                process.exit(0);
            };

            process.on('SIGINT', handleShutdown);
            process.on('SIGTERM', handleShutdown);
        } catch (error) {
            console.error('Failed to start main server:', error);
            process.exit(1);
        }
    };

    startMain();
}

export { WorkerManager, workerManager };
export default mainApp;

