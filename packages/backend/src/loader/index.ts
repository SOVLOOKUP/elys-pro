import type { BunPlugin } from "bun";
import ky from "ky";

/** https://bun.com/docs/bundler/loaders */
type Loader = Parameters<Bun.OnLoadCallback>["0"]["loader"];
const loader = new Set<Loader>([
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "jsonc",
  "toml",
  "yaml",
  "file",
  "napi",
  "wasm",
  "text",
  "css",
  "html",
]);

// 获取后缀，或是默认返回js
const getLoader = (href: string): Loader => {
  const match = href.match(/\.([^.]+)$/);
  if (match && match[1]) {
    const ext = match[1].toLowerCase() as Loader;
    return loader.has(ext) ? ext : "js";
  }
  return "js";
};

const protocols = new Map<string, Bun.OnLoadCallback>();

const loadHttpModule = async (url: string) => {
  const contents = await ky.get(url).text();
  const loader = getLoader(url);
  return { contents, loader };
};

// http
protocols.set("http:", (args) => {
  return loadHttpModule(`http:${args.path}`);
});
protocols.set("https:", (args) => {
  return loadHttpModule(`https:${args.path}`);
});

// todo opendal
// todo 本地缓存

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
      build.onLoad({ filter: /./, namespace }, (args) => callback(args));
    }
  },
};

// Bun.plugin(more_imports);
