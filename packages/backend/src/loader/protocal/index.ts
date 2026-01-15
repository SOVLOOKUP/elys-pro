import ky from "ky";
import { isPlainObject } from "es-toolkit";
import { Operator } from "opendal";
import { extname } from "path";

import { schemas } from "./generated/schema";
import type { Loader } from "bun";
import { decodeOptions } from "./utils";
import { loader } from "./generated/bunLoaders";

type Contents =
  | string
  | ArrayBufferView
  | ArrayBuffer
  | SharedArrayBuffer
  | Record<string, unknown>
  | undefined;

export * from "./utils";
export class ProtocolLoader {
  protocols = new Map<string, Bun.OnLoadCallback>();

  // 获取后缀，或是默认返回js
  private static getLoader = (href: string): Loader => {
    const ext = (extname(href).replace(".", "") as Loader) ?? "js";
    return loader.has(ext) ? ext : "js";
  };

  addProtocol = (
    protocol: string,
    callback: (args: Bun.OnLoadArgs) => Contents | Promise<Contents>
  ) => {
    this.protocols.set(`${protocol}:`, async (args) => {
      const contents = await callback(args);

      if (contents === undefined) {
        return undefined;
      } else if (isPlainObject(contents)) {
        return {
          exports: contents as Record<string, unknown>,
          loader: "object",
        };
      } else {
        return { contents, loader: ProtocolLoader.getLoader(args.path) };
      }
    });
  };

  private addHTTPProtocol = () => {
    const loadHttpModule = async (url: string) => await ky.get(url).text();
    this.addProtocol("https", (args) => loadHttpModule(`https:${args.path}`));
  };

  private addOpendalProtocol = () => {
    for (const schema of schemas) {
      this.addProtocol(schema, async (args) => {
        // 从路径提取 options 及 path
        const m = args.path.match(/^\/\/([^\/]+)/);
        const options = m?.[1];
        const path = m ? args.path.slice(m[0].length) : "/index.js";

        if (!options) {
          throw new Error(`options is required for ${schema}`);
        }

        // https://docs.rs/opendal/latest/opendal/services/index.html
        const parsedOptions = decodeOptions(options);

        const op = new Operator(schema, parsedOptions);

        // 读取内容
        const data = await op.read(path);

        return data;
      });
    }
  };

  constructor() {
    this.addHTTPProtocol();
    this.addOpendalProtocol();
  }
}
