import { PrismaClient } from "./generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import type { SqlDriverAdapterFactory } from "@prisma/client/runtime/client";
// @ts-ignore
import { MigrateDeploy } from "@prisma/migrate";
import { type PrismaConfig } from "prisma/config";
import { resolve } from "path";

const rootDir = resolve(import.meta.dir, "..");
const databaseUrl = Bun.env.DATABASE_URL;

let adapter: SqlDriverAdapterFactory;

if (databaseUrl?.startsWith("postgres:")) {
  adapter = new PrismaPg({ connectionString: databaseUrl });
} else {
  adapter = new PrismaLibSql({
    url: databaseUrl ?? `file:${resolve(rootDir, "data.db")}`,
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
    url: databaseUrl,
  },
});

export const prisma = new PrismaClient({ adapter });
