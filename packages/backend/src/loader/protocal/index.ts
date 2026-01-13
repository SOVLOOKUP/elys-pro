import { isPlainObject } from "es-toolkit";
import path from "path";

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
  const ext = (path.extname(href).replace(".", "") as Loader) ?? "js";
  return loader.has(ext) ? ext : "js";
};

type Contents =
  | string
  | ArrayBufferView
  | ArrayBuffer
  | SharedArrayBuffer
  | Record<string, unknown>
  | undefined;

const protocols = new Map<string, Bun.OnLoadCallback>();

const addProtocol = (
  protocol: string,
  callback: (args: Bun.OnLoadArgs) => Contents | Promise<Contents>
) => {
  protocols.set(`${protocol}:`, async (args) => {
    const contents = await callback(args);

    if (contents === undefined) {
      return undefined;
    } else if (isPlainObject(contents)) {
      return { exports: contents as Record<string, unknown>, loader: "object" };
    } else {
      return { contents, loader: getLoader(args.path) };
    }
  });
};

await Promise.all([import("./http"), import("./opendal")]);

export { protocols, addProtocol };
