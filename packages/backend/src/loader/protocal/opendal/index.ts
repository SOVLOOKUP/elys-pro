import { Operator } from "opendal";
import { schemas } from "./generated/schema";
import { addProtocol } from "..";
import { decodeOptions } from "./utils";

for (const schema of schemas) {
  addProtocol(schema, async (args) => {
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
