import { plugin } from "bun";
import { more_imports } from "./loader";
import { startServer } from "./server";

// 注册插件
await plugin(more_imports);

// 启动服务器
await startServer();
