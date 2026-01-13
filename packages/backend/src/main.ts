// 注册 bun 插件, 拓展 import 逻辑
import "./loader";
// import { startServer } from "./server";

console.log(
  await import("https://docs.deno.com/examples/scripts/hello_world.ts")
);

// 启动服务器
// await startServer();
