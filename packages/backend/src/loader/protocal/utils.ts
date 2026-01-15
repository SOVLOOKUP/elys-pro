import type { OpendalSchema } from "./generated/schema";
import type { OpendalOption } from "./generated/options";
import { normalize, isAbsolute } from "path";

// 使用 base64 将 options 编码
export const encodeOptions = (options: Record<string, string>) => {
  const sortedKeys = Object.keys(options).sort();
  const sortedObj: Record<string, string> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = options[key]!;
  }
  return btoa(JSON.stringify(sortedObj));
};

// 构造新的 Opendal URL，将 options 构造到 URL host 中
export const newURL = (
  schema: OpendalSchema,
  options: Record<string, string>,
  path: string
) => {
  const p = isAbsolute(path) ? normalize(path) : normalize(`/${path}`);
  return `${schema}://${encodeOptions(options)}${p}`;
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
