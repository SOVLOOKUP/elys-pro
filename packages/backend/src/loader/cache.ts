// 若没有 redis 则用 sqlite 缓存
import Keyv from "keyv";
import KeyvGzip from "@keyv/compress-gzip";
import KeyvSqlite from "@keyv/sqlite";

const store = new KeyvSqlite(Bun.env.DATABASE_URL);
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
