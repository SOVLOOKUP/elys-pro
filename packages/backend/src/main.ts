import { moreImports } from "./loader";
import { migrateDeploy } from "./db";
import { mainApp } from "./server";

// 注册 bun 插件, 拓展 import 逻辑
await Bun.plugin(moreImports);

// 配置参数
const CONFIG = {
  MAX_WORKERS: Math.max(
    1,
    parseInt(Bun.env.MAX_WORKERS || "") || navigator.hardwareConcurrency * 2,
  ),
  MIN_WORKERS: parseInt(Bun.env.MIN_WORKERS || "1"),
  SCALE_UP_COOLDOWN: parseInt(Bun.env.SCALE_UP_COOLDOWN || "2000"),
  SCALE_DOWN_COOLDOWN: parseInt(Bun.env.SCALE_DOWN_COOLDOWN || "3000"),
  SCALE_UP_BATCH_SIZE: parseInt(Bun.env.SCALE_UP_BATCH_SIZE || "2"),
  SCALE_UP_THRESHOLD_MULTIPLIER: parseFloat(
    Bun.env.SCALE_UP_THRESHOLD_MULTIPLIER || "1.5",
  ),
};

// Worker 状态接口
interface WorkerInfo {
  id: string;
  worker: Worker;
  status: "starting" | "running" | "stopping" | "stopped";
  lastHeartbeat: number;
  lastRequestTime: number;
  isOverloaded: boolean;
  // 性能指标
  memory?: {
    rss: string;
    heapUsed: string;
    heapTotal: string;
    external: string;
  };
  cpu?: {
    usage: string;
  };
}

// 创建负载均衡器
const pendingRequests = new Map<
  string,
  {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    startTime: number;
  }
>();

// 请求队列
const requestQueue: Array<{
  req: Request;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  startTime: number;
}> = [];

// Worker 池管理
class WorkerPool {
  private workers: Map<string, WorkerInfo> = new Map();
  private nextWorkerId = 1;
  private lastScaleUpTime = 0;
  private lastScaleDownTime = 0;
  private requestCount = 0;
  private lastRequestTime = Date.now();
  private recentRequestRates: number[] = [];
  private readonly REQUEST_RATE_WINDOW = 10000; // 10秒窗口
  private readonly REQUEST_RATE_SAMPLES = 10; // 保留10个样本
  activeRequests = 0; // 当前活跃请求数
  maxConcurrentRequests = 100; // 最大并发请求数
  totalRequests = 0; // 总请求数
  failedRequests = 0; // 失败请求数
  successfulRequests = 0; // 成功请求数
  requestHistory: Array<{
    timestamp: number;
    success: boolean;
    responseTime: number;
  }> = [];

  constructor() {
    // 启动初始 worker
    this.startWorker();
    // 定期检查 worker 状态
    setInterval(() => this.checkWorkerStatus(), 10000);
    // 定期检查请求速率
    setInterval(() => this.checkRequestRate(), 5000);
    // 定期处理请求队列
    setInterval(() => this.processRequestQueue(), 100);
  }

  // 记录请求
  recordRequest() {
    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  // 检查请求速率
  private checkRequestRate() {
    const now = Date.now();
    const windowStart = now - this.REQUEST_RATE_WINDOW;

    // 清理过期的请求速率样本
    this.recentRequestRates = this.recentRequestRates.filter((rate, index) => {
      const sampleTime =
        now -
        (this.recentRequestRates.length - 1 - index) *
        (this.REQUEST_RATE_WINDOW / this.REQUEST_RATE_SAMPLES);
      return sampleTime >= windowStart;
    });

    // 计算当前请求速率
    const currentRate = this.requestCount / (this.REQUEST_RATE_WINDOW / 1000);
    this.recentRequestRates.push(currentRate);
    if (this.recentRequestRates.length > this.REQUEST_RATE_SAMPLES) {
      this.recentRequestRates.shift();
    }

    // 计算平均请求速率
    const avgRate =
      this.recentRequestRates.reduce((a, b) => a + b, 0) /
      this.recentRequestRates.length;

    // 如果请求速率持续增长，主动扩容
    if (this.recentRequestRates.length >= 3) {
      const isIncreasing = this.recentRequestRates.every(
        (rate, i) => i === 0 || rate >= this.recentRequestRates[i - 1],
      );

      if (isIncreasing && avgRate > 10) {
        console.log(`[Main] 检测到请求速率增长: ${avgRate.toFixed(2)} req/s`);
        this.batchScaleUp();
      }
    }

    // 重置请求计数
    this.requestCount = 0;
  }

  // 获取负载最低的 worker
  getLeastLoadedWorker(): WorkerInfo | null {
    const runningWorkers = Array.from(this.workers.values()).filter(
      (worker) => worker.status === "running" && !worker.isOverloaded,
    );

    if (runningWorkers.length === 0) {
      return null;
    }

    // 选择负载最低的 worker（基于最后请求时间）
    return runningWorkers.sort(
      (a, b) => a.lastRequestTime - b.lastRequestTime,
    )[0];
  }

  // 启动新的 worker
  async startWorker(): Promise<WorkerInfo | null> {
    // 检查是否达到最大 worker 数量
    if (this.workers.size >= CONFIG.MAX_WORKERS) {
      console.log(`[Main] 已达到最大 worker 数量: ${CONFIG.MAX_WORKERS}`);
      return null;
    }

    // 检查扩容冷却
    if (Date.now() - this.lastScaleUpTime < CONFIG.SCALE_UP_COOLDOWN) {
      console.log(`[Main] 扩容冷却中，跳过启动新 worker`);
      return null;
    }

    const workerId = `worker-${this.nextWorkerId++}`;
    console.log(`[Main] 启动新 worker: ${workerId}`);

    try {
      const worker = new Worker(
        new URL("./workers/worker-runner", import.meta.url).href,
      );

      const workerInfo: WorkerInfo = {
        id: workerId,
        worker,
        status: "starting",
        lastHeartbeat: Date.now(),
        lastRequestTime: Date.now(),
        isOverloaded: false,
        port: this.serverPort,
      };

      // 设置 worker 事件监听
      this.setupWorkerListeners(workerInfo);

      // 启动 worker
      worker.postMessage({ type: "start" });

      // 添加到 worker 池
      this.workers.set(workerId, workerInfo);

      this.lastScaleUpTime = Date.now();
      console.log(
        `[Main] 新 worker 已启动: ${workerId}, 当前 worker 数量: ${this.workers.size}`,
      );

      return workerInfo;
    } catch (error) {
      console.error(`[Main] 启动 worker 失败:`, error);
      return null;
    }
  }

  // 批量扩容
  async batchScaleUp() {
    const currentWorkerCount = this.workers.size;
    const overloadedWorkers = Array.from(this.workers.values()).filter(
      (worker) => worker.isOverloaded,
    );

    if (overloadedWorkers.length === 0) {
      return;
    }

    // 检查扩容冷却
    if (Date.now() - this.lastScaleUpTime < CONFIG.SCALE_UP_COOLDOWN) {
      console.log(`[Main] 扩容冷却中，跳过批量扩容`);
      return;
    }

    // 计算需要启动的 worker 数量
    const targetWorkerCount = Math.min(
      Math.ceil(currentWorkerCount * CONFIG.SCALE_UP_THRESHOLD_MULTIPLIER),
      CONFIG.MAX_WORKERS,
    );
    const workersToStart = Math.min(
      targetWorkerCount - currentWorkerCount,
      CONFIG.SCALE_UP_BATCH_SIZE,
    );

    if (workersToStart <= 0) {
      console.log(`[Main] 已达到目标 worker 数量或最大限制，跳过扩容`);
      return;
    }

    console.log(
      `[Main] 批量扩容: 当前 ${currentWorkerCount} 个, 目标 ${targetWorkerCount} 个, 启动 ${workersToStart} 个`,
    );

    // 并行启动多个 worker
    const startPromises: Promise<WorkerInfo | null>[] = [];
    for (let i = 0; i < workersToStart; i++) {
      startPromises.push(this.startWorker());
    }

    const results = await Promise.all(startPromises);
    const successfulStarts = results.filter((result) => result !== null).length;

    console.log(
      `[Main] 批量扩容完成: 成功启动 ${successfulStarts}/${workersToStart} 个 worker`,
    );
  }

  // 设置 worker 事件监听
  private setupWorkerListeners(workerInfo: WorkerInfo) {
    const { worker, id } = workerInfo;

    // 处理 worker 消息
    worker.addEventListener("message", (event) => {
      const { type, payload, idleTime, timestamp } = event.data;

      switch (type) {
        case "started":
          workerInfo.status = "running";
          console.log(
            `[Main] Worker ${id} 已启动`,
          );
          break;

        case "overloaded":
          workerInfo.isOverloaded = true;
          console.log(`[Main] Worker ${id} 过载:`, payload);
          // 批量启动新 worker
          this.batchScaleUp();
          break;

        case "recovered":
          workerInfo.isOverloaded = false;
          console.log(`[Main] Worker ${id} 负载已恢复`);
          break;

        case "idle":
          console.log(
            `[Main] Worker ${id} 闲置: ${(idleTime / 1000).toFixed(2)}s`,
          );
          // 尝试缩容
          this.tryScaleDown();
          break;

        case "response":
          // 处理 worker 返回的响应
          const requestId = event.data.requestId;
          const response = event.data.response;
          const pendingRequest = pendingRequests.get(requestId);

          if (pendingRequest) {
            pendingRequest.resolve(response);
            pendingRequests.delete(requestId);
          }
          break;

        case "heartbeat":
          workerInfo.lastHeartbeat = timestamp || Date.now();
          if (payload) {
            workerInfo.lastRequestTime = payload.lastRequestTime || Date.now();
            // 记录请求计数
            if (payload.requestCount !== undefined) {
              this.requestCount += payload.requestCount;
            }
            // 存储性能指标
            if (payload.memory) {
              workerInfo.memory = payload.memory;
            }
            if (payload.cpu) {
              workerInfo.cpu = payload.cpu;
            }
          }
          break;

        case "stopped":
          workerInfo.status = "stopped";
          console.log(`[Main] Worker ${id} 已停止`);
          // 从 worker 池移除
          this.workers.delete(id);
          // 确保至少有一个 worker 运行
          this.ensureMinWorkers();
          break;

        default:
          console.log(`[Main] 收到 Worker ${id} 消息:`, event.data);
      }
    });

    // 处理 worker 错误
    worker.addEventListener("error", (error) => {
      console.error(`[Main] Worker ${id} 错误:`, error);
      // 标记为已停止并从池移除
      workerInfo.status = "stopped";
      this.workers.delete(id);
      // 确保至少有一个 worker 运行
      this.ensureMinWorkers();
    });

    // 处理 worker 终止
    worker.addEventListener("close", () => {
      console.log(`[Main] Worker ${id} 已关闭`);
      // 标记为已停止并从池移除
      workerInfo.status = "stopped";
      this.workers.delete(id);
      // 确保至少有一个 worker 运行
      this.ensureMinWorkers();
    });
  }

  // 尝试缩容
  private tryScaleDown() {
    // 检查是否达到最小 worker 数量
    if (this.workers.size <= CONFIG.MIN_WORKERS) {
      console.log(
        `[Main] 已达到最小 worker 数量: ${CONFIG.MIN_WORKERS}，跳过缩容`,
      );
      return;
    }

    // 检查缩容冷却
    const cooldownRemaining =
      CONFIG.SCALE_DOWN_COOLDOWN - (Date.now() - this.lastScaleDownTime);
    if (cooldownRemaining > 0) {
      console.log(`[Main] 缩容冷却中，剩余 ${cooldownRemaining}ms，跳过缩容`);
      return;
    }

    // 查找闲置的 worker
    const idleWorkers = Array.from(this.workers.values()).filter(
      (worker) =>
        worker.status === "running" &&
        !worker.isOverloaded &&
        Date.now() - worker.lastRequestTime > 30000, // 30秒无请求
    );

    console.log(
      `[Main] 查找闲置 worker: 总数=${this.workers.size}, 闲置数=${idleWorkers.length}, 最小数=${CONFIG.MIN_WORKERS}`,
    );

    if (idleWorkers.length > 0) {
      // 选择最早闲置的 worker
      const workerToStop = idleWorkers.sort(
        (a, b) => a.lastRequestTime - b.lastRequestTime,
      )[0];

      if (!workerToStop) {
        console.log(`[Main] 未找到合适的 worker 进行缩容`);
        return;
      }

      console.log(
        `[Main] 停止闲置 worker: ${workerToStop.id}，闲置时间: ${((Date.now() - workerToStop.lastRequestTime) / 1000).toFixed(2)}s`,
      );
      workerToStop.status = "stopping";
      workerToStop.worker.postMessage({ type: "stop" });

      this.lastScaleDownTime = Date.now();
      console.log(
        `[Main] 缩容完成，当前 worker 数量: ${this.workers.size - 1}`,
      );
    } else {
      console.log(`[Main] 没有找到闲置的 worker 进行缩容`);
    }
  }

  // 确保至少有最小数量的 worker 运行
  private ensureMinWorkers() {
    if (this.workers.size < CONFIG.MIN_WORKERS) {
      console.log(`[Main] 确保最小 worker 数量，启动新 worker`);
      // 直接启动新 worker，不受扩容冷却限制
      const workerId = `worker-${this.nextWorkerId++}`;
      console.log(`[Main] 启动新 worker: ${workerId}`);

      try {
        const worker = new Worker(
          new URL("./workers/worker-runner", import.meta.url).href,
        );

        const workerInfo: WorkerInfo = {
          id: workerId,
          worker,
          status: "starting",
          lastHeartbeat: Date.now(),
          lastRequestTime: Date.now(),
          isOverloaded: false,
        };

        // 设置 worker 事件监听
        this.setupWorkerListeners(workerInfo);

        // 启动 worker
        worker.postMessage({ type: "start" });

        // 添加到 worker 池
        this.workers.set(workerId, workerInfo);

        console.log(
          `[Main] 新 worker 已启动: ${workerId}, 当前 worker 数量: ${this.workers.size}`,
        );
      } catch (error) {
        console.error(`[Main] 启动 worker 失败:`, error);
      }
    }
  }

  // 检查 worker 状态
  private checkWorkerStatus() {
    const now = Date.now();
    const deadWorkers: string[] = [];

    // 检查每个 worker 的状态
    for (const [id, worker] of this.workers) {
      // 检查心跳是否超时
      if (now - worker.lastHeartbeat > 60000) {
        // 60秒无心跳
        console.log(`[Main] Worker ${id} 心跳超时，标记为死亡`);
        deadWorkers.push(id);
      }
    }

    // 移除死亡的 worker
    for (const id of deadWorkers) {
      const worker = this.workers.get(id);
      if (worker) {
        worker.status = "stopped";
        try {
          worker.worker.terminate();
        } catch (error) {
          console.error(`[Main] 终止 worker ${id} 失败:`, error);
        }
        this.workers.delete(id);
      }
    }

    // 确保至少有一个 worker 运行
    this.ensureMinWorkers();

    console.log(
      `[Main] Worker 状态检查完成，当前 worker 数量: ${this.workers.size}`,
    );
  }

  // 处理请求队列
  private processRequestQueue() {
    if (requestQueue.length === 0) {
      return;
    }

    // 检查是否有可用的worker
    const worker = this.getLeastLoadedWorker();
    if (!worker) {
      return;
    }

    // 检查并发请求数
    if (this.activeRequests >= this.maxConcurrentRequests) {
      return;
    }

    // 从队列中取出一个请求
    const queuedRequest = requestQueue.shift();
    if (!queuedRequest) {
      return;
    }

    // 处理队列中的请求
    this.processRequest(
      queuedRequest.req,
      queuedRequest.resolve,
      queuedRequest.reject,
      queuedRequest.startTime,
    );
  }

  // 处理单个请求
  private async processRequest(
    req: Request,
    resolve: (value: any) => void,
    reject: (reason: any) => void,
    startTime: number,
  ) {
    // 获取负载最低的 worker
    const worker = this.getLeastLoadedWorker();

    if (!worker) {
      // 将请求重新放入队列
      requestQueue.push({
        req,
        resolve,
        reject,
        startTime,
      });
      return;
    }

    // 更新 worker 的最后请求时间
    worker.lastRequestTime = Date.now();

    // 增加活跃请求数
    this.activeRequests++;

    // 生成请求 ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 创建 Promise 等待 worker 响应
    const responsePromise = new Promise((resolve, reject) => {
      pendingRequests.set(requestId, {
        resolve,
        reject,
        startTime: Date.now(),
      });

      // 设置超时
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          this.activeRequests--;
          this.failedRequests++;
          this.requestHistory.push({
            timestamp: Date.now(),
            success: false,
            responseTime: Date.now() - startTime,
          });
          reject(new Error("Request timeout"));
        }
      }, 60000);
    });

    // 将请求转发给 worker
    worker.worker.postMessage({
      type: "request",
      requestId,
      req: {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        body: await req.text(),
      },
    });

    try {
      // 等待 worker 响应
      const responseData = await responsePromise;

      // 减少活跃请求数
      this.activeRequests--;
      this.successfulRequests++;
      this.requestHistory.push({
        timestamp: Date.now(),
        success: true,
        responseTime: Date.now() - startTime,
      });

      // 构建响应
      const headers = new Headers();
      for (const [key, value] of Object.entries(responseData.headers)) {
        headers.set(key, value as string);
      }

      resolve(
        new Response(responseData.body, {
          status: responseData.status,
          headers,
        }),
      );
    } catch (error) {
      this.activeRequests--;
      this.failedRequests++;
      this.requestHistory.push({
        timestamp: Date.now(),
        success: false,
        responseTime: Date.now() - startTime,
      });
      console.error(`[Main] 请求处理错误:`, error);
      reject(
        new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
        }),
      );
    }
  }

  // 获取当前 worker 数量
  getWorkerCount(): number {
    return this.workers.size;
  }

  // 获取监控数据
  getMonitoringData() {
    const workers = Array.from(this.workers.values()).map((worker) => ({
      id: worker.id,
      status: worker.status,
      isOverloaded: worker.isOverloaded,
      lastHeartbeat: worker.lastHeartbeat,
      lastRequestTime: worker.lastRequestTime,
      // 添加性能指标
      memory: worker.memory,
      cpu: worker.cpu,
    }));

    // 计算成功率
    const total = this.totalRequests;
    const successRate =
      total > 0 ? (this.successfulRequests / total) * 100 : 100;

    // 计算平均响应时间
    const recentHistory = this.requestHistory.slice(-100);
    const avgResponseTime =
      recentHistory.length > 0
        ? recentHistory.reduce((sum, h) => sum + h.responseTime, 0) /
        recentHistory.length
        : 0;

    // 计算QPS（每秒请求数）- 统计最近1秒内的请求数
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(
      (h) => now - h.timestamp < 1000,
    );
    const qps = recentRequests.length;

    // 计算总的内存和CPU指标
    let totalMemoryMB = 0;
    let totalHeapUsedMB = 0;
    let totalHeapTotalMB = 0;
    let totalCpuUsage = 0;
    let workersWithMetrics = 0;

    for (const worker of workers) {
      if (worker.memory) {
        totalHeapUsedMB += parseFloat(worker.memory.heapUsed);
        totalHeapTotalMB += parseFloat(worker.memory.heapTotal);
      }
      if (worker.cpu) {
        totalCpuUsage += parseFloat(worker.cpu.usage);
        workersWithMetrics++;
      }
    }

    const avgCpuUsage =
      workersWithMetrics > 0 ? totalCpuUsage / workersWithMetrics : 0;

    const mainProcessMemory = process.memoryUsage();
    const mainProcessMemoryMB = mainProcessMemory.rss / 1024 / 1024;

    return {
      workers,
      totalWorkers: this.workers.size,
      activeRequests: this.activeRequests,
      queuedRequests: requestQueue.length,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      successRate,
      avgResponseTime,
      qps,
      maxConcurrentRequests: this.maxConcurrentRequests,
      requestHistory: recentHistory.slice(-50),
      systemMetrics: {
        totalMemory: mainProcessMemoryMB.toFixed(2),
        totalHeapUsed: totalHeapUsedMB.toFixed(2),
        totalHeapTotal: totalHeapTotalMB.toFixed(2),
        avgCpuUsage: avgCpuUsage.toFixed(2),
      },
    };
  }

  // 停止所有 worker
  stopAllWorkers() {
    console.log(`[Main] 停止所有 worker`);
    for (const [id, worker] of this.workers) {
      console.log(`[Main] 停止 worker: ${id}`);
      worker.status = "stopping";
      try {
        worker.worker.postMessage({ type: "stop" });
      } catch (error) {
        console.error(`[Main] 发送停止命令失败:`, error);
      }
    }
  }
}

// 自动检测数据库更新
await migrateDeploy();

// 初始化 worker 池
const workerPool = new WorkerPool();

// 主进程 HTTP 服务器（负载均衡器）- 基于 mainApp 扩展
const loadBalancerApp = mainApp
  // 监控页面
  .get("/monitoring", async () => {
    const file = Bun.file("./public/monitoring.html");
    return new Response(file);
  })
  // 监控API
  .get("/api/monitoring", async () => {
    const monitoringData = workerPool.getMonitoringData();
    return new Response(JSON.stringify(monitoringData, null, 2), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  })
  // 负载均衡处理 - 所有其他请求
  .all("/*", async ({ request }) => {
    const req = request;
    const startTime = Date.now(); // 记录请求开始时间

    // 记录请求
    workerPool.recordRequest();
    workerPool.totalRequests++;

    // 检查并发请求数
    if (workerPool.activeRequests >= workerPool.maxConcurrentRequests) {
      // 将请求放入队列
      const queuePromise = new Promise((resolve, reject) => {
        requestQueue.push({
          req,
          resolve,
          reject,
          startTime: Date.now(),
        });
      });

      try {
        return await queuePromise;
      } catch (error) {
        workerPool.failedRequests++;
        workerPool.requestHistory.push({
          timestamp: Date.now(),
          success: false,
          responseTime: Date.now() - startTime,
        });
        return new Response("Request queue error", { status: 500 });
      }
    }

    // 获取负载最低的 worker
    const worker = workerPool.getLeastLoadedWorker();

    if (!worker) {
      // 将请求放入队列
      const queuePromise = new Promise((resolve, reject) => {
        requestQueue.push({
          req,
          resolve,
          reject,
          startTime: Date.now(),
        });
      });

      try {
        return await queuePromise;
      } catch (error) {
        workerPool.failedRequests++;
        workerPool.requestHistory.push({
          timestamp: Date.now(),
          success: false,
          responseTime: Date.now() - startTime,
        });
        return new Response("No available workers", { status: 503 });
      }
    }

    // 更新 worker 的最后请求时间
    worker.lastRequestTime = Date.now();

    // 增加活跃请求数
    workerPool.activeRequests++;

    // 生成请求 ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 创建 Promise 等待 worker 响应
    const responsePromise = new Promise((resolve, reject) => {
      pendingRequests.set(requestId, {
        resolve,
        reject,
        startTime: Date.now(),
      });

      // 设置超时
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          workerPool.activeRequests--;
          workerPool.failedRequests++;
          workerPool.requestHistory.push({
            timestamp: Date.now(),
            success: false,
            responseTime: Date.now() - startTime,
          });
          reject(new Error("Request timeout"));
        }
      }, 60000);
    });

    // 将请求转发给 worker
    worker.worker.postMessage({
      type: "request",
      requestId,
      req: {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        body: await req.text(),
      },
    });

    try {
      // 等待 worker 响应
      const responseData = await responsePromise;

      // 减少活跃请求数
      workerPool.activeRequests--;
      workerPool.successfulRequests++;
      workerPool.requestHistory.push({
        timestamp: Date.now(),
        success: true,
        responseTime: Date.now() - startTime,
      });

      // 构建响应
      const headers = new Headers();
      for (const [key, value] of Object.entries(responseData.headers)) {
        headers.set(key, value as string);
      }

      return new Response(responseData.body, {
        status: responseData.status,
        headers,
      });
    } catch (error) {
      workerPool.activeRequests--;
      workerPool.failedRequests++;
      workerPool.requestHistory.push({
        timestamp: Date.now(),
        success: false,
        responseTime: Date.now() - startTime,
      });
      console.error(`[Main] 请求处理错误:`, error);
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
      });
    }
  });

const port = parseInt(Bun.env.APP_PORT || "3000");

// 启动服务器
loadBalancerApp.listen(port);

console.log(`[Main] 负载均衡器已启动，监听端口: ${port}`);

// 优雅关闭处理
process.on("SIGINT", () => {
  console.log(`[Main] 收到 SIGINT 信号，正在关闭...`);
  workerPool.stopAllWorkers();
  setTimeout(() => process.exit(0), 2000);
});

process.on("SIGTERM", () => {
  console.log(`[Main] 收到 SIGTERM 信号，正在关闭...`);
  workerPool.stopAllWorkers();
  setTimeout(() => process.exit(0), 2000);
});

console.log(`[Main] 系统初始化完成，worker 池已启动`);
console.log(`[Main] 配置信息:`);
console.log(`[Main] - 最大 worker 数量: ${CONFIG.MAX_WORKERS}`);
console.log(`[Main] - 最小 worker 数量: ${CONFIG.MIN_WORKERS}`);
console.log(`[Main] - 扩容冷却时间: ${CONFIG.SCALE_UP_COOLDOWN}ms`);
console.log(`[Main] - 缩容冷却时间: ${CONFIG.SCALE_DOWN_COOLDOWN}ms`);
console.log(`[Main] 等待 worker 消息...`);
