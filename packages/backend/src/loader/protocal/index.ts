import { isPlainObject } from "es-toolkit";

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

type Contents =
  | string
  | ArrayBufferView
  | ArrayBuffer
  | SharedArrayBuffer
  | Record<string, unknown>
  | undefined;

const protocols = new Map<string, Bun.OnLoadCallback>();
export const addProtocol = (
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

import "./http";
import "./opendal";

export { protocols };
