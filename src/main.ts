import { Elysia, NotFoundError, status, t, ValidationError } from "elysia";
import { join, resolve } from "path";

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
  status: "starting" | "running" | "stopped" | "error";
}

class WorkerManager {
  private workers: Map<string, WorkerThread> = new Map();
  private configs: WorkerConfig[] = [];

  /**
   * 注册 worker 配置
   */
  registerWorker(config: WorkerConfig) {
    // 设置默认值
    const defaultConfig: Required<
      Pick<WorkerConfig, "enabled" | "healthCheck">
    > = {
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
        const worker = new Worker(join(__dirname, "./workers/worker-runner.ts"));

        // 监听 worker 消息
        worker.addEventListener("message", (event) => {
          const message = event.data;
          if (message.type === "started") {
            console.log(message.message);
            const workerThread = this.workers.get(config.name);
            if (workerThread) {
              workerThread.status = "running";
            }
            resolve();
          } else if (message.type === "error") {
            console.error(`Worker ${config.name} error:`, message.error);
            const workerThread = this.workers.get(config.name);
            if (workerThread) {
              workerThread.status = "error";
            }
            reject(new Error(message.error));
          } else if (
            message.type === "shutdown" ||
            message.type === "shutdown-error"
          ) {
            // 处理 worker 关闭消息
            if (message.type === "shutdown") {
              console.log(
                `Worker ${config.name} shutdown message:`,
                message.message
              );
            } else {
              console.error(
                `Worker ${config.name} shutdown error:`,
                message.error
              );
            }
            // 更新 worker 状态
            const workerThread = this.workers.get(config.name);
            if (workerThread) {
              workerThread.status = "stopped";
            }
          }
        });

        // 监听 worker 错误
        worker.addEventListener("error", (error) => {
          console.error(`Worker ${config.name} thread error:`, error);
          const workerThread = this.workers.get(config.name);
          if (workerThread) {
            workerThread.status = "error";
          }
          reject(error);
        });

        // 发送启动消息和配置数据
        worker.postMessage({
          type: "start",
          data: {
            name: config.name,
            port: config.port,
            workerPath: config.workerPath,
            healthCheck: config.healthCheck,
            prefix: config.prefix,
            env: config.env,
          },
        });

        // 将 worker 添加到管理器
        this.workers.set(config.name, {
          worker,
          port: config.port,
          status: "starting",
        });
      } catch (error) {
        console.error(
          `Failed to create worker thread for ${config.name}:`,
          error
        );
        reject(error);
      }
    });
  }

  /**
   * 启动所有注册的 workers
   */
  async startAll(): Promise<void> {
    console.log(`Starting ${this.configs.length} workers...`);

    const startPromises = this.configs.map((config) => this.loadWorker(config));

    try {
      await Promise.all(startPromises);
      console.log("All workers started successfully");
    } catch (error) {
      console.error("Failed to start all workers:", error);
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
      workerThread.worker.postMessage({ type: "terminate" });

      // 设置超时，如果 worker 没有响应则强制终止
      const timeout = setTimeout(() => {
        console.log(`Force terminating worker ${name}`);
        workerThread.worker.terminate();
        this.workers.delete(name);
        console.log(`Worker ${name} stopped`);
        resolve();
      }, 35000); // 35秒超时，比 worker 中的 30 秒超时稍长

      // 监听 worker 消息以检测是否已成功关闭
      workerThread.worker.addEventListener("message", (event) => {
        const message = event.data;
        // 当 worker 发送关闭消息时，认为它已成功关闭
        if (message.type === "shutdown" || message.type === "shutdown-error") {
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
    console.log("Stopping all workers...");

    const stopPromises = Array.from(this.workers.keys()).map((name) =>
      this.stopWorker(name)
    );

    await Promise.all(stopPromises);
    console.log("All workers stopped");
  }

  /**
   * 获取所有运行中的 worker 状态
   */
  getStatus(): Array<{ name: string; port: number; status: string }> {
    return this.configs.map((config) => {
      const workerThread = this.workers.get(config.name);
      return {
        name: config.name,
        port: config.port,
        status: workerThread ? workerThread.status : "stopped",
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

import { ensureDir, exists, remove, rm } from "fs-extra";
import { fdir } from "fdir";

const app_path = "./app";

await ensureDir(app_path);

const lsdir = async (path: string) => {
  const api = new fdir({
    excludeFiles: true,
    includeDirs: true,
    maxDepth: 0,
    relativePaths: true,
    filters: [(path) => path !== "."],
  }).crawl(path)

  const paths = (await api.withPromise()).map((item) => item.slice(0, -1));
  return paths
}

// 主服务器，用于管理所有 workers
const mainApp = new Elysia()
  .get("/workers", ({ query }) => {
    if (query && query.status === "detailed") {
      // 返回详细状态信息
      return workerManager.getStatus().map((status) => ({
        ...status,
        uptime: "N/A", // 可以扩展以跟踪运行时间
      }));
    }
    return workerManager.getStatus();
  })
  .get("/workers/:name", ({ params }) => {
    const workerStatus = workerManager
      .getStatus()
      .find((w) => w.name === params.name);
    if (!workerStatus) {
      return { error: `Worker ${params.name} not found` };
    }
    return workerStatus;
  })
  .post("/workers/:name/start", async ({ params }) => {
    const config = workerManager["configs"].find((c) => c.name === params.name);
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
  .post("/workers/:name/stop", async ({ params }) => {
    await workerManager.stopWorker(params.name);
    return { message: `Worker ${params.name} stopped` };
  })
  .get("/", () => ({
    message: "Elysia Worker Manager",
    workersCount: workerManager.getStatus().length,
    runningWorkers: workerManager
      .getStatus()
      .filter((w) => w.status === "running").length,
  }))
  .group("/app", app => app
    // 获取所有项目
    .get("/", async () => lsdir(app_path))
    // 获取指定项目所有版本
    .get("/:name", async ({ params }) => {
      const project_path = resolve(app_path, params.name)

      if (!await exists(project_path)) {
        return new NotFoundError(`${project_path} not found`)
      } else {
        return lsdir(project_path)
      }
    })
    // 删除项目或项目特定版本;
    .delete("/:name", async ({ params, query }) => {
      const project_path = resolve(app_path, params.name, query.version === "all" ? "" : query.version)

      if (!await exists(project_path)) {
        return status(404)
      } else {
        await rm(project_path, { recursive: true, force: true })
        return { message: `${project_path} deleted` }
      }
    }, {
      query: t.Object({
        version: t.Union([t.String(), t.Literal("all")])
      })
    })
    // 上传项目
    .post("/:name", async ({ params, body, query }) => {
      const project_path = resolve(app_path, params.name, query.version)
      const index_path = resolve(project_path, "index.js")

      if (await exists(project_path)) {
        return status(403)
      } else {
        await ensureDir(project_path)

        if (body.file.type === "application/zip") {
          // zip 解压写入
          const zipBuffer = await body.file.arrayBuffer();
          const tempZipPath = resolve(project_path, "temp.zip");

          // 先保存 zip 文件到临时位置
          await Bun.write(tempZipPath, zipBuffer);

          // 使用 Bun 的 shell 能力解压
          const proc = Bun.spawn(["unzip", "-o", "temp.zip"], {
            cwd: project_path,
            stdout: "pipe",
            stderr: "pipe",
          });

          await proc.exited;

          // 删除临时 zip 文件
          await rm(tempZipPath, { force: true });
        } else {
          // js 直接写入
          await Bun.write(index_path, body.file);
        }
        // 检测是否是合法可运行的 elysia 文件
        // 使用 Worker 隔离验证，防止影响主线程
        const validationResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
          const validator = new Worker(join(__dirname, "./workers/validator.ts"));

          // 设置超时
          const timeout = setTimeout(() => {
            validator.terminate();
            resolve({ success: false, error: "Validation timeout" });
          }, 5000); // 5秒超时

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

          // 发送验证请求
          validator.postMessage({
            type: "validate",
            data: { modulePath: index_path },
          });
        });

        if (!validationResult.success) {
          // 验证失败，删除已上传的文件
          await rm(project_path, { recursive: true, force: true });
          return status(400, validationResult.error || "Invalid Elysia application");
        }

        return { message: "Project uploaded and validated successfully" };

      }
    }, {
      body: t.Object({
        file: t.File({
          type: ["text/javascript", "application/zip"]
        })
      }),
      query: t.Object({
        version: t.String()
      })
    })
    // 代理到app进行处理
    .all("/:name/:version/*", async (req) => {
      const project_path = resolve(app_path, req.params.name, req.params.version)
      const index_path = resolve(project_path, "index.js")

      if (!await exists(index_path)) {
        return status(404)
      } else {
        const workerModule = await import(index_path);

        // 验证是否是合法的 Elysia 应用
        const app = workerModule.app as Elysia;

        // todo 将url中/:name/:version去除
        req.request.url

        return await app.handle(req.request)
      }
    })
  )


// 如果通过直接运行此文件，则启动主服务器和所有 workers
if (import.meta.main) {
  // test 注册默认的 worker（如果存在）
  // workerManager.registerWorker({
  //   name: "default",
  //   port: 3001,
  //   workerPath: "../test/worker-test", // 默认加载当前的 worker.ts
  //   enabled: true,
  //   healthCheck: true,
  // });

  const startMain = async () => {
    try {
      // 从环境变量或默认值获取主服务器端口
      const mainPort = parseInt(process.env.MAIN_PORT || "8080");

      // 启动主管理服务器
      const mainServer = mainApp.listen({ port: mainPort });
      console.log(`Main worker manager server started on port ${mainPort}`);

      // 启动所有注册的 workers
      await workerManager.startAll();

      // 设置优雅关闭
      const handleShutdown = async () => {
        console.log("\nShutting down gracefully...");
        await workerManager.stopAll();
        process.exit(0);
      };

      process.on("SIGINT", handleShutdown);
      process.on("SIGTERM", handleShutdown);
    } catch (error) {
      console.error("Failed to start main server:", error);
      process.exit(1);
    }
  };

  startMain();
}

export { WorkerManager, workerManager };
export default mainApp;
