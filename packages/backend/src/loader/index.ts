import type { BunPlugin } from "bun";
import { ProtocolLoader } from "./protocal";
import { getCacheIfExistNorSet } from "./cache";

const protocolLoader = new ProtocolLoader();

export const moreImports: BunPlugin = {
  name: "more_imports",
  setup(build) {
    // 相对导入转换为绝对导入
    build.onResolve({ filter: /^(?:\/|\.\.?\/)/ }, ({ path, importer }) => {
      try {
        const { protocol } = new URL(importer);
        return protocolLoader.protocols.has(protocol)
          ? { path: new URL(path, importer).href }
          : undefined;
      } catch (error) {
        // importer cannot be parsed as URL
        return undefined;
      }
    });

    // 使用自定义方法解析指定协议导入
    for (const [protocol, callback] of protocolLoader.protocols) {
      const namespace = protocol.replace(":", "");

      // add namespace
      build.onResolve({ filter: /.*/, namespace }, (args) => ({
        path: args.path,
        namespace,
      }));

      // 加载指定协议导入的内容
      build.onLoad({ filter: /.*/, namespace }, (args) =>
        getCacheIfExistNorSet(args, callback)
      );
    }
  },
};
