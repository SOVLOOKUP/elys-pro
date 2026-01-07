import { more_imports } from "./loader";
import { startServer } from "./server";

// 注册 bun 插件, 拓展 import 逻辑
await Bun.plugin(more_imports);

// 启动服务器
await startServer();
