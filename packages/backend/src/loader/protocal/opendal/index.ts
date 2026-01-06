import { Operator } from "opendal";
import { schemas } from "./schema";
import { addProtocol } from "..";

for (const schema of schemas) {
  // http 已经有了
  if (schema === "http") {
    continue;
  }

  addProtocol(schema, async (args) => {
    // 从路径提取 options
    // https://docs.rs/opendal/latest/opendal/services/index.html
    const options = { todo: args.path };

    const op = new Operator(schema, options);

    await op.check();

    const data = await op.read(args.path);

    return data;
  });
}
