import type { BunPlugin } from "bun";

// 创建一个 Bun 插件来修复 @prisma/prisma-schema-wasm 依赖的 WASM 文件加载问题
export const fixPrismaWasmPlugin: BunPlugin = {
  name: "fix-prisma-wasm",
  setup(build) {
    // 拦截 prisma_schema_build.js 模块的加载
    build.onLoad({ filter: /prisma_schema_build\.js$/ }, async (args) => {
      // 读取原始文件内容
      const originalContent = await Bun.file(args.path).text();

      // 检查是否包含有问题的 __dirname 相关代码
      if (
        originalContent.includes(
          "const wasmPath = `${__dirname}/prisma_schema_build_bg.wasm`"
        )
      ) {
        // 替换有问题的代码行，使用 require 方式导入 WASM 文件
        const fixedContent = originalContent.replace(
          /const wasmPath = `\${__dirname}\/prisma_schema_build_bg\.wasm`;/g,
          "const wasmPath = require('./prisma_schema_build_bg.wasm');"
        );

        return {
          contents: fixedContent,
          loader: "js",
        };
      }

      return {
        contents: originalContent,
        loader: "js",
      };
    });
  },
};
