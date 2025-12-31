FROM oven/bun:alpine

# 设置工作目录
WORKDIR /app

# 复制构建产物
COPY packages/backend/dist /app

# 安装 unzip 工具（用于解压上传的 zip 文件）
RUN apk add --no-cache unzip

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV MAIN_PORT=3000

# 启动应用
CMD ["bun", "run", "/app/src/main.js"]