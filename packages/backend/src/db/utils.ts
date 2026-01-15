import { resolve } from "path";
import { ensureDir } from "fs-extra";

export const getDataBaseURL = async (root: string) => {
  // If no DATABASE_URL environment variable is set, use a local SQLite database
  if (!Bun.env.DATABASE_URL) {
    const dataDir = resolve(root, "data");
    await ensureDir(dataDir);
    return `file:${resolve(dataDir, "data.db")}`;
  } else {
    return Bun.env.DATABASE_URL;
  }
};
