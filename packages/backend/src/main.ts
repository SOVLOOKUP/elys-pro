import { moreImports } from "./loader";
import { migrateDeploy } from "./db";
import { startServer } from "./server";

// 注册 bun 插件, 拓展 import 逻辑
await Bun.plugin(moreImports);

// 自动检测数据库更新
await migrateDeploy();

// 启动服务器
await startServer();

const runner = new Worker(
  new URL("./workers/worker-runner.ts", import.meta.url).href,
);

runner.addEventListener("message", (event) => {
  console.log("Worker message:", event.data);
});

runner.addEventListener("error", (error) => {
  console.error("Worker error:", error);
});

runner.postMessage({
  type: "start",
});

console.log("Worker started, waiting for message...");
