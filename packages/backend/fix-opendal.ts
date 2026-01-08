import type { BunPlugin } from "bun";

// 创建一个 Bun 插件来修复 opendal 的 require 重新分配问题
export const fixOpendalPlugin: BunPlugin = {
  name: "fix-opendal",
  setup(build) {
    // 拦截 opendal 模块的加载
    build.onLoad({ filter: /node_modules\/opendal/ }, async (args) => {
      // 读取原始文件内容
      const originalContent = await Bun.file(args.path).text();

      // 检查是否包含有问题的 require 重新分配代码
      if (originalContent.includes("require = createRequire")) {
        // 替换有问题的代码行，避免 require 重新分配
        const fixedContent = originalContent.replace(
          /require = createRequire\(__filename\)/g,
          ""
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
