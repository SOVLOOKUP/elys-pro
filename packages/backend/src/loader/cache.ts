// 若没有 redis 则用 sqlite 缓存
import Keyv, { type KeyvStoreAdapter } from "keyv";
import KeyvGzip from "@keyv/compress-gzip";
import KeyvFile from "keyv-file";
import KeyvValkey from "@keyv/valkey";

let store: KeyvStoreAdapter;

if (Bun.env.VALKEY_URL) {
  store = new KeyvValkey(Bun.env.VALKEY_URL);
} else {
  store = new KeyvFile();
}

const keyv = new Keyv({ store, compression: new KeyvGzip() });

// 缓存模块
export const getCacheIfExistNorSet = async (
  args: Bun.OnLoadArgs,
  callback: Bun.OnLoadCallback
) => {
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
