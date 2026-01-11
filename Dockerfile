# 根据目标架构使用不同的基础镜像
FROM oven/bun:latest AS base

# 设置工作目录
WORKDIR /app/src

# 复制构建产物
COPY packages/backend/dist /app

# 根据架构设置特定的优化
FROM base AS amd64-stage
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "amd64" ] ; then \
    echo "Setting AMD64-specific optimizations" && \
    rm -f dist/schema-engine-linux-musl-arm64-openssl-3.0.x && \
    true ; \
  fi

FROM base AS arm64-stage
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "arm64" ] ; then \
    echo "Setting ARM64-specific optimizations" && \
    rm -f dist/schema-engine-linux-musl-openssl-3.0.x && \
    true ; \
  fi

# 最终阶段
FROM ${TARGETARCH%%/*}-stage

# 设置最终环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["bun", "run", "main.js"]