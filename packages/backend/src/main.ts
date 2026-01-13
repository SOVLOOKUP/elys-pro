// 注册 bun 插件, 拓展 import 逻辑
import "./loader";
import { startServer } from "./server";

// 启动服务器
await startServer();
