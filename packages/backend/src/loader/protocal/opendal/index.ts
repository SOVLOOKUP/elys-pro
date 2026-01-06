import { Operator } from "opendal";
import { schemas, type OpendalSchema } from "./schema";
import { addProtocol } from "..";

// 使用 base64 将 options 编码
const encodeOptions = (options: Record<string, string>) => {
  const opts = new URLSearchParams(options);
  opts.sort();
  return btoa(JSON.stringify(opts.toJSON()));
};

const decodeOptions = (encodedOptions: string) =>
  JSON.parse(atob(encodedOptions));

// 构造新的 Opendal URL，将 options 构造到 URL host 中
export const newURL = (
  schema: OpendalSchema,
  options: Record<string, string>,
  path: string
) => {
  const url = new URL(path, `${schema}://${encodeOptions(options)}/`);

  return url.href;
};

for (const schema of schemas) {
  // http 已经有了
  if (schema === "http") {
    continue;
  }

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
