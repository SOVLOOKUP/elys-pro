import type { BunPlugin } from "bun";
import { protocols } from "./protocal";
import { getCacheIfExistNorSet } from "./cache";

export const more_imports: BunPlugin = {
  name: "more_imports",
  setup(build) {
    // 相对导入转换为绝对导入
    build.onResolve({ filter: /^(?:\/|\.\.?\/)/ }, ({ path, importer }) => {
      try {
        const { protocol } = new URL(importer);
        return protocols.has(protocol)
          ? { path: new URL(path, importer).href }
          : undefined;
      } catch (error) {
        // importer cannot be parsed as URL
        return undefined;
      }
    });

    // 使用自定义方法解析指定协议导入
    for (const [protocol, callback] of protocols) {
      const namespace = protocol.replace(":", "");
      build.onLoad({ filter: /./, namespace }, (args) =>
        getCacheIfExistNorSet(args, callback)
      );
    }
  },
};

await Bun.plugin(more_imports);
