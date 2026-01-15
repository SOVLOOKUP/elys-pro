import { dirname, resolve } from "path";
import { ensureDir } from "fs-extra";

const rootDir = resolve(dirname(Bun.main), "..");

let databaseUrl: string;

// If no DATABASE_URL environment variable is set, use a local SQLite database
if (!Bun.env.DATABASE_URL) {
  const dataDir = resolve(rootDir, "data");
  await ensureDir(dataDir);
  databaseUrl = `file:${resolve(dataDir, "data.db")}`;
} else {
  databaseUrl = Bun.env.DATABASE_URL;
}

export { databaseUrl, rootDir };
