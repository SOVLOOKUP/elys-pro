// 若没有 redis 则用文件缓存
import Keyv, { type KeyvStoreAdapter } from "keyv";
// todo 贡献一个 zstd 压缩
import KeyvBrotli from "@keyv/compress-brotli";
import { KeyvFile } from "keyv-file";
import KeyvValkey from "@keyv/valkey";

let store: KeyvStoreAdapter;

if (Bun.env.VALKEY_URL) {
  store = new KeyvValkey(Bun.env.VALKEY_URL);
} else {
  store = new KeyvFile();
}

const keyv = new Keyv({ store, compression: new KeyvBrotli() });

// 缓存模块
export const getCacheIfExistNorSet = async (
  args: Bun.OnLoadArgs,
  callback: Bun.OnLoadCallback
) => {
  // 非生产环境不缓存
  if (Bun.env.NODE_ENV !== "production") {
    return callback(args);
  }

  const { namespace, path } = args;
  const cacheKey = `${namespace}:${path}`;

  const cache = await keyv.get(cacheKey);

  if (cache) {
    return cache;
  } else {
    const result = await callback(args);
    await keyv.set(cacheKey, result);
    return result;
  }
};
