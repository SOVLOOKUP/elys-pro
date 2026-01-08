FROM oven/bun:alpine

# 设置工作目录
WORKDIR /app

# 复制构建产物
COPY packages/backend/dist /app

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV MAIN_PORT=3000

# 启动应用
CMD ["bun", "run", "src/main.js"]