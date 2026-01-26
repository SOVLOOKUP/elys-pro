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

// 配置参数
const CONFIG = {
  CPU_THRESHOLD: parseInt(Bun.env.WORKER_CPU_THRESHOLD || "60"),
  QUEUE_LENGTH_THRESHOLD: parseInt(Bun.env.WORKER_QUEUE_THRESHOLD || "5"),
  PROCESSING_DELAY_THRESHOLD: parseInt(Bun.env.WORKER_DELAY_THRESHOLD || "200"),
  IDLE_TIMEOUT: parseInt(Bun.env.WORKER_IDLE_TIMEOUT || "30000"),
  MONITORING_INTERVAL: parseInt(Bun.env.WORKER_MONITORING_INTERVAL || "500"),
};

// 任务队列和处理统计
const taskQueue: Array<{ id: string; startTime: number }> = [];
let currentTasks = 0;
let lastRequestTime = Date.now();
let isOverloaded = false;
let isRunning = true;
let requestCount = 0;

// 真实CPU使用率监测
let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

async function getCpuUsage(): Promise<number> {
  const currentCpuUsage = process.cpuUsage(lastCpuUsage);
  const currentTime = Date.now();
  const timeDiff = currentTime - lastCpuTime;

  // 更新上次记录
  lastCpuUsage = process.cpuUsage();
  lastCpuTime = currentTime;

  // 计算CPU使用率（微秒转换为毫秒）
  const cpuTimeMs = (currentCpuUsage.user + currentCpuUsage.system) / 1000;
  const usage = Math.min(100, (cpuTimeMs / timeDiff) * 100);

  return usage;
}

// 负载监测函数
async function monitorLoad() {
  if (!isRunning) {
    return;
  }

  try {
    // 监测CPU使用率
    const cpuUsage = await getCpuUsage();

    // 监测任务队列长度
    const queueLength = taskQueue.length + currentTasks;

    // 监测处理延迟
    let processingDelay = 0;
    if (taskQueue.length > 0) {
      const oldestTask = taskQueue[0];
      processingDelay = oldestTask ? Date.now() - oldestTask.startTime : 0;
    }

    // 检查是否达到过载阈值
    const isOverloadedNow =
      cpuUsage > CONFIG.CPU_THRESHOLD ||
      queueLength > CONFIG.QUEUE_LENGTH_THRESHOLD ||
      processingDelay > CONFIG.PROCESSING_DELAY_THRESHOLD;

    // 如果从正常变为过载，发送求救信号
    if (!isOverloaded && isOverloadedNow) {
      isOverloaded = true;
      self.postMessage({
        type: "overloaded",
        payload: {
          cpuUsage,
          queueLength,
          processingDelay,
          timestamp: Date.now(),
        },
      });
      console.log(
        `[Worker] 发送求救信号 - CPU: ${cpuUsage.toFixed(2)}%, 队列: ${queueLength}, 延迟: ${processingDelay}ms`,
      );
    } else if (isOverloaded && !isOverloadedNow) {
      // 从过载恢复
      isOverloaded = false;
      self.postMessage({ type: "recovered", timestamp: Date.now() });
      console.log(
        `[Worker] 负载恢复正常 - CPU: ${cpuUsage.toFixed(2)}%, 队列: ${queueLength}, 延迟: ${processingDelay}ms`,
      );
    }

    // 检查是否闲置（只在首次闲置时发送消息，避免频繁发送）
    const idleTime = Date.now() - lastRequestTime;
    if (idleTime > CONFIG.IDLE_TIMEOUT && currentTasks === 0) {
      // 首次检测到闲置时发送消息，后续每30秒发送一次更新
      const lastIdleNotificationTime = (self as any).lastIdleNotificationTime || 0;
      if (Date.now() - lastIdleNotificationTime > 30000) {
        self.postMessage({ type: "idle", idleTime, timestamp: Date.now() });
        (self as any).lastIdleNotificationTime = Date.now();
        console.log(
          `[Worker] 检测到闲置状态 - 闲置时间: ${(idleTime / 1000).toFixed(2)}s`,
        );
      }
    }
  } catch (error) {
    console.error(`[Worker] 负载监测错误:`, error);
  } finally {
    // 继续监测
    if (isRunning) {
      setTimeout(monitorLoad, CONFIG.MONITORING_INTERVAL);
    }
  }
}

// 请求处理包装器，用于统计任务
function withTaskTracking(handler: (req: any) => Promise<any>) {
  return async (req: any) => {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 更新最后请求时间
    lastRequestTime = Date.now();
    requestCount++;

    // 添加到任务队列
    taskQueue.push({ id: taskId, startTime: Date.now() });
    currentTasks++;

    try {
      // 处理请求
      const result = await handler(req);
      return result;
    } catch (error) {
      console.error(`[Worker] 请求处理错误:`, error);
      throw error;
    } finally {
      // 从任务队列中移除（任务完成后）
      const taskIndex = taskQueue.findIndex((task) => task.id === taskId);
      if (taskIndex !== -1) {
        taskQueue.splice(taskIndex, 1);
      }
      currentTasks--;
    }
  };
}

const mainApp = new Elysia()
  // 测试端点，用于模拟CPU密集型任务
  .get(
    "/test/cpu",
    withTaskTracking(async (req) => {
      const duration = parseInt(req.query.duration || "100"); // 默认为100ms

      // 模拟CPU密集型任务
      const start = Date.now();
      let sum = 0;
      while (Date.now() - start < duration) {
        sum += Math.sqrt(Math.random() * 1000000);
      }

      return {
        message: `CPU密集型任务完成`,
        duration: Date.now() - start,
        result: sum,
        timestamp: Date.now(),
      };
    }),
  )
  // 根路径
  .get("/", () => "Hello Elysia")
  // 应用运行
  .all(
    "/:name/:version/*",
    withTaskTracking(async (req) => {
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
    }),
    {
      parse: "none",
    },
  );

let server: ReturnType<typeof mainApp.listen>;

// 启动负载监测
monitorLoad();

self.addEventListener("message", async (event) => {
  if (event.data.type === "start") {
    // 不再监听端口，而是通过消息传递处理请求
    self.postMessage({ type: "started" });
    console.log(`[Worker] 启动成功，准备接收请求`);
  } else if (event.data.type === "stop") {
    console.log(`[Worker] 收到停止消息，当前 isRunning: ${isRunning}`);
    isRunning = false;
    console.log(`[Worker] 设置 isRunning 为 false`);
    if (server) {
      server.stop();
      self.postMessage({ type: "stopped" });
      console.log(`[Worker] 停止运行`);
    }
  } else if (event.data.type === "request") {
    // 处理请求
    const requestId = event.data.requestId;
    const reqData = event.data.req;

    try {
      // 创建 Request 对象
      const request = new Request(reqData.url, {
        method: reqData.method,
        headers: new Headers(reqData.headers),
        body:
          reqData.method !== "GET" && reqData.method !== "HEAD"
            ? reqData.body
            : undefined,
      });

      // 使用 mainApp 处理请求
      const response = await mainApp.handle(request);

      // 将响应转换为可序列化的格式
      const responseData = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
      };

      self.postMessage({
        type: "response",
        requestId,
        response: responseData,
      });
    } catch (error) {
      self.postMessage({
        type: "response",
        requestId,
        response: {
          status: 500,
          headers: {},
          body: JSON.stringify({ error: String(error) }),
        },
      });
    }
  }
});

// 发送心跳信号
let heartbeatInterval = setInterval(async () => {
  if (!isRunning) {
    clearInterval(heartbeatInterval);
    return;
  }

  // 获取内存使用情况
  const memoryUsage = process.memoryUsage();
  const memoryUsedMB = memoryUsage.rss / 1024 / 1024;
  const memoryHeapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const memoryHeapTotalMB = memoryUsage.heapTotal / 1024 / 1024;

  // 获取CPU使用率
  const cpuUsage = await getCpuUsage();

  self.postMessage({
    type: "heartbeat",
    payload: {
      currentTasks,
      queueLength: taskQueue.length,
      lastRequestTime,
      requestCount,
      timestamp: Date.now(),
      // 添加性能指标
      memory: {
        rss: memoryUsedMB.toFixed(2),
        heapUsed: memoryHeapUsedMB.toFixed(2),
        heapTotal: memoryHeapTotalMB.toFixed(2),
        external: (memoryUsage.external / 1024 / 1024).toFixed(2),
      },
      cpu: {
        usage: cpuUsage.toFixed(2),
      },
    },
  });

  // 重置请求计数
  requestCount = 0;
}, 5000);

console.log(`[Worker] 初始化完成，负载监测已启动`);
