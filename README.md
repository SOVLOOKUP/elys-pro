# elys-pro

基于 Elysia 的部署神器

快捷部署 Elysia 应用，并实现对应用的高效管理

支持应用版本管理

## 项目结构

```
elys-pro/
├── packages/
│   ├── backend/          # 后端服务
│   │   ├── src/
│   │   │   ├── main.ts     # 主服务器
│   │   │   └── workers/    # Worker 相关
│   │   └── dist/           # 构建产物
│   └── frontend/         # 前端管理界面
│       └── app/
│           └── pages/
│               └── index.vue # 管理界面
├── Dockerfile            # Docker 配置
├── .dockerignore         # Docker 忽略文件
├── docker-build.sh       # 构建脚本
└── .github/workflows/
    └── docker.yml        # GitHub Actions
```

## 开发运行

### 后端服务

```bash
cd packages/backend
bun run dev
```

### 前端界面

```bash
cd packages/frontend
bun run dev
```

## Docker 部署

### 本地构建

```bash
# 构建后端
cd packages/backend
bun run build

# 构建 Docker 镜像
docker build -t elys-pro:latest .
```

或者使用构建脚本：

```bash
./docker-build.sh
```

### 运行容器

```bash
docker run -d -p 3000:3000 --name elys-pro elys-pro:latest
```

## GitHub Actions 自动化

项目包含 GitHub Actions 配置，当代码推送到 main 或 master 分支时，会自动：

1. 拉取代码
2. 安装 Bun 依赖
3. 构建后端应用
4. 构建 Docker 镜像
5. 推送到 GitHub Container Registry (ghcr.io)

### 镜像仓库

构建的镜像会推送到：`ghcr.io/{username}/elys-pro`

### 触发条件

- 推送 `main` 或 `master` 分支
- 提交 Pull Request

## 环境变量

- `NODE_ENV`: 运行环境 (默认: production)
- `MAIN_PORT`: 主服务器端口 (默认: 3000)

## 特性

- ✨ 快速部署 Elysia 应用
- 📦 支持应用版本管理
- 🚀 Docker 容器化部署
- 🔄 GitHub Actions 自动化
- 🎨 优雅的管理界面
- 🔒 安全的 Worker 隔离
- 💻 多架构支持 (AMD64/ARM64)

<!-- 缩放模式（多请求1worker 超时无请求自动kill 可设置超时时间） -->
<!-- websocket支持 -->
<!-- 插件支持 -->
<!-- 日志收集 -->
