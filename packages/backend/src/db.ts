import { PrismaClient } from "./generated/prisma/client";
import { PrismaBunSqlite } from "prisma-adapter-bun-sqlite";
import { PrismaPg } from "@prisma/adapter-pg";
import type { SqlDriverAdapterFactory } from "@prisma/client/runtime/client";
// @ts-ignore
import { MigrateDeploy } from "@prisma/migrate";
import { type PrismaConfig } from "prisma/config";
import { resolve } from "path";
import { ensureDir } from "fs-extra";

const rootDir = resolve(import.meta.dir, "..");

// If no DATABASE_URL environment variable is set, use a local SQLite database
if (!Bun.env.DATABASE_URL) {
  const dataDir = resolve(rootDir, "data");
  await ensureDir(dataDir);
  Bun.env.DATABASE_URL = `file:${resolve(dataDir, "data.db")}`;
}

let adapter: SqlDriverAdapterFactory;

// Determine the database adapter based on the DATABASE_URL environment variable
if (Bun.env.DATABASE_URL.startsWith("postgres")) {
  adapter = new PrismaPg({ connectionString: Bun.env.DATABASE_URL });
} else {
  adapter = new PrismaBunSqlite({
    url: Bun.env.DATABASE_URL,
  });
}

const migrateDeploy = async (
  baseDir: string,
  config?: PrismaConfig
): Promise<void> =>
  await MigrateDeploy.new().parse(["migrate", "deploy"], config, baseDir);

// 自动 migrate 数据库
await migrateDeploy(rootDir, {
  schema: resolve(rootDir, "prisma/schema.prisma"),
  migrations: {
    path: resolve(rootDir, "prisma/migrations"),
  },
  datasource: {
    url: Bun.env.DATABASE_URL,
  },
});

export const prisma = new PrismaClient({ adapter });
