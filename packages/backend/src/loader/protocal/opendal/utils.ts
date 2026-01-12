import { type OpendalSchema } from "./schema";
import type { OpendalOption } from "./options";

// 使用 base64 将 options 编码
export const encodeOptions = (options: Record<string, string>) => {
  const opts = new URLSearchParams(options);
  opts.sort();
  return btoa(JSON.stringify(opts.toJSON()));
};

// 构造新的 Opendal URL，将 options 构造到 URL host 中
export const newURL = (
  schema: OpendalSchema,
  options: Record<string, string>,
  path: string
) => {
  const url = new URL(path, `${schema}://${encodeOptions(options)}/`);

  return url.href;
};

// 使用 base64 将 options 解码
export const decodeOptions = (encodedOptions: string) => {
  // 将所有 value 转换为 string
  const optionsStr: Record<string, string> = {};
  const decoded: Record<string, any> = JSON.parse(
    atob(encodedOptions)
  ) as OpendalOption;

  // 将所有 value 转换为 string
  for (const key in decoded) {
    if (Object.prototype.hasOwnProperty.call(decoded, key)) {
      const value = decoded[key];
      if (typeof value === "string") {
        optionsStr[key] = value;
      } else {
        optionsStr[key] = JSON.stringify(value);
      }
    }
  }

  return optionsStr;
};
