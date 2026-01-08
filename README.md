# <img src="./images/logo.svg" width="30" height="30" align="top"> elys-pro

> 基于 Elysia 的现代化部署神器，为 Elysia 应用提供高效的部署与管理解决方案

<p align="center">
  <a href="#特性">特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#安装">安装</a> •
  <a href="#开发">开发</a> •
  <a href="#贡献">贡献</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/built%20with-elysia-24292e?style=for-the-badge" alt="Built with Elysia">
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
</p>

## ✨ 特性

| 特性               | 描述                                 |
| ------------------ | ------------------------------------ |
| 🚀 **快速部署**    | 一键部署 Elysia 应用，简化部署流程   |
| 📦 **版本管理**    | 支持应用版本管理，轻松回滚和更新     |
| 🐳 **Docker 支持** | 完整的容器化部署方案，保证环境一致性 |
| 🎨 **优雅界面**    | 直观的管理界面，轻松监控和管理应用   |
| 🔒 **Worker 隔离** | 安全的 Worker 隔离机制，保障应用安全 |
| 💻 **多架构支持**  | 支持 AMD64/ARM64 等多种架构部署      |

## 🚀 快速开始

### 系统要求

- [Bun](https://bun.sh/) >= 1.0
- Docker (可选，用于容器化部署)

### 默认配置

elys-pro 默认使用以下配置，无需额外设置：

- **数据库**: SQLite
- **缓存**: 文件系统缓存
- **数据库文件**: `/app/data/sqlite.db`
- **缓存文件**: `${os.tmpdir()}/keyv-file/default.json`

## 📦 安装

### 容器化部署 (推荐)

> 容器端口: `3000`

#### 使用 Podman

```bash
podman run -d \
  --name elys-pro \
  -p 3000:3000 \
  -v ./data:/app/data \
  ghcr.io/sovlookup/elys-pro:latest
```

#### 使用 Docker

```bash
docker run -d \
  --name elys-pro \
  -p 3000:3000 \
  -v ./data:/app/data \
  ghcr.io/sovlookup/elys-pro:latest
```

#### 国内加速

```bash
docker run -d \
  --name elys-pro \
  -p 3000:3000 \
  -v ./data:/app/data \
  ghcr.1ms.run/sovlookup/elys-pro:latest
```

### 高级部署 (PostgreSQL + Valkey)

如需使用更强大的数据库和缓存，可以使用以下配置：

```yaml
version: "3.8"

services:
  elys-pro:
    container_name: elys-pro
    image: ghcr.io/sovlookup/elys-pro:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@localhost:5432/dbname
      - VALKEY_URL=redis://user:pass@localhost:6379
    restart: unless-stopped
```

## 使用

访问 [http://localhost:3000](http://localhost:3000) 即可使用。

## 🛠️ 开发

### 环境准备

1. 克隆项目

   ```bash
   git clone <repository-url>
   cd elys-pro
   ```

2. 安装依赖

   ```bash
   bun install
   ```

3. 初始化数据库
   ```bash
   cd packages/backend
   bun run prisma:migrate:dev
   ```

### 开发模式

| 模式                  | 命令                              | 描述                       |
| --------------------- | --------------------------------- | -------------------------- |
| 🔄 **前后端协同开发** | `bun dev`                         | 同时启动前端和后端进行开发 |
| ⚡ **仅后端服务**     | `cd packages/backend && bun dev`  | 仅启动后端服务进行开发     |
| 🌐 **仅前端界面**     | `cd packages/frontend && bun dev` | 仅启动前端界面进行开发     |

### 构建

| 目标              | 命令                                    |
| ----------------- | --------------------------------------- |
| 📦 **完整构建**   | `bun run build`                         |
| ⚡ **仅后端构建** | `cd packages/backend && bun run build`  |
| 🌐 **仅前端构建** | `cd packages/frontend && bun run build` |

## 🤝 贡献

我们欢迎各种形式的贡献！如果您想为项目做出贡献，请按照以下步骤操作：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 代码风格遵循 ESLint 和 Prettier 规则
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 所有功能应包含相应的测试

## 📄 许可证

本项目采用 [AGPL-3.0 许可证](LICENSE)。详情请参阅 [LICENSE](LICENSE) 文件。

## 🖼️ 使用示例

<div align="center">
  
  [_界面预览_](https://elys.metapoint.tech/)
  
</div>

## 🙏 致谢

- 感谢 [Elysia](https://elysiajs.com/) 提供了出色的框架
- 感谢 [Nuxt](https://nuxt.com/) 为前端提供强大的支持
- 感谢所有为项目做出贡献的开发者

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/sovlookup">sovlookup</a>
</p>
