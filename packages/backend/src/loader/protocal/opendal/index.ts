import { Operator } from "opendal";
import { type OpendalSchema, schemas } from "./schema";
import { addProtocol } from "..";

const Op = async (scheme: OpendalSchema, options?: Record<string, string>) => {
  const op = new Operator(scheme, options);
  await op.check();
  return op;
};

for (const schema of schemas) {
  addProtocol(schema, async (args) => {
    // 从路径提取options
    const options = { todo: args.path };

    const op = await Op(schema, options);

    const data = await op.read(args.path);

    return data;
  });
}
