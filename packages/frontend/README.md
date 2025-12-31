# Elysia 应用管理界面

这是一个优雅的 Elysia 应用管理界面，基于 Nuxt 3 和 Nuxt UI 构建。

## 功能特性

✨ **应用管理**
- 📦 查看所有已部署的应用
- 🔢 查看每个应用的所有版本
- 🚀 上传新应用（支持 .js 和 .zip 文件）
- 🗑️ 删除应用或特定版本
- 🔗 快速访问已部署的应用

✨ **用户体验**
- 🎨 优雅的 UI 设计，支持深色模式
- 📱 完全响应式布局
- ⚡ 即时反馈和加载状态
- 🔔 Toast 通知提示
- ✅ 表单验证

## 快速开始

### 1. 启动后端服务

```bash
cd packages/backend
bun run dev
```

后端服务将在 `http://localhost:3000` 启动。

### 2. 启动前端服务

```bash
cd packages/frontend
bun run dev
```

前端服务将在 `http://localhost:3001` 启动。

### 3. 访问管理界面

打开浏览器访问 `http://localhost:3001`

## 使用说明

### 上传应用

1. 点击右上角的"上传应用"按钮
2. 填写应用名称（例如：my-app）
3. 填写版本号（例如：1.0.0）
4. 选择要上传的文件：
   - `.js` 文件：单个 JavaScript 文件
   - `.zip` 文件：包含完整应用的压缩包
5. 点击"上传"按钮

### 查看应用版本

1. 在左侧列表中点击应用名称
2. 右侧将显示该应用的所有版本

### 访问应用

点击版本卡片上的"访问"按钮，将在新标签页中打开应用。

访问地址格式：`http://localhost:3000/app/{应用名}/{版本号}/`

### 删除应用

- **删除单个版本**：点击版本卡片上的"删除"按钮
- **删除所有版本**：点击右上角的"删除所有"按钮

## 技术栈

- **前端框架**: Nuxt 3
- **UI 组件**: Nuxt UI
- **状态管理**: Vue 3 Composition API
- **API 客户端**: Elysia Eden Treaty
- **样式**: Tailwind CSS
- **图标**: Lucide Icons

## 项目结构

```
packages/frontend/
├── app/
│   ├── pages/
│   │   └── index.vue          # 主管理界面
│   ├── plugins/
│   │   └── elysia.ts          # Elysia API 客户端插件
│   ├── types/
│   │   └── elysia.d.ts        # TypeScript 类型声明
│   └── app.vue                # 应用根组件
├── nuxt.config.ts             # Nuxt 配置
└── package.json
```

## API 接口

管理界面使用以下后端 API：

- `GET /app` - 获取所有应用列表
- `GET /app/:name` - 获取应用的所有版本
- `POST /app/:name?version=xxx` - 上传应用
- `DELETE /app/:name?version=xxx` - 删除应用版本
- `DELETE /app/:name?version=all` - 删除应用所有版本
- `ALL /app/:name/:version/*` - 访问应用

## 开发说明

### 添加新功能

1. 在 `index.vue` 中添加新的 UI 组件
2. 使用 `$elysia` 调用后端 API
3. 使用 `toast` 显示操作结果

### 自定义样式

项目使用 Tailwind CSS，可以在组件中直接使用 Tailwind 类名。

Nuxt UI 提供了丰富的组件，查看文档：https://ui.nuxt.com

## 故障排除

### API 连接失败

确保后端服务正在运行在 `http://localhost:3000`。

如果需要更改 API 地址，修改 `app/plugins/elysia.ts` 中的 URL。

### 上传失败

检查：
1. 文件格式是否正确（.js 或 .zip）
2. 应用名称和版本号是否填写
3. 后端服务是否正常运行
4. 查看浏览器控制台的错误信息

## License

MIT
