import { resolve } from "path";
import { ensureDir, ensureDirSync } from "fs-extra";

export const getDataBaseURL = (root: string) => {
  // If no DATABASE_URL environment variable is set, use a local SQLite database
  if (!Bun.env.DATABASE_URL) {
    const dataDir = resolve(root, "data");
    ensureDirSync(dataDir);
    return `file:${resolve(dataDir, "data.db")}`;
  } else {
    return Bun.env.DATABASE_URL;
  }
};
