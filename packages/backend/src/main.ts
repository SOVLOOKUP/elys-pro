// 注册 bun 插件, 拓展 import 逻辑
import { migrateDeploy } from "./db";
import "./loader";
import { startServer } from "./server";

// 自动检测数据库更新
await migrateDeploy();

// 启动服务器
await startServer();
