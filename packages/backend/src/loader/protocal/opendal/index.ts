import { Operator } from "opendal";
import { schemas } from "./schema";
import { addProtocol } from "..";
import { decodeOptions } from "./utils";

for (const schema of schemas) {
  addProtocol(schema, async (args) => {
    const url = new URL(`${schema}:${args.path}`);

    // 从路径提取 options
    // https://docs.rs/opendal/latest/opendal/services/index.html
    const options = decodeOptions(url.host);

    const op = new Operator(schema, options);

    // 测试可否连通
    await op.check();

    // 读取内容
    const data = await op.read(args.path);

    return data;
  });
}
