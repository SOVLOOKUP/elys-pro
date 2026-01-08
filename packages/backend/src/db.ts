import { PrismaClient } from "./generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import type { SqlDriverAdapterFactory } from "@prisma/client/runtime/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

let adapter: SqlDriverAdapterFactory;

if (databaseUrl?.startsWith("postgres:")) {
  adapter = new PrismaPg({ connectionString: databaseUrl });
} else {
  adapter = new PrismaLibSql({
    url: databaseUrl,
  });
}

// @ts-ignore
import { MigrateDeploy } from "@prisma/migrate";
import { type PrismaConfig } from "prisma/config";
import { resolve } from "path";

const migrateDeploy = async (
  baseDir: string,
  config?: PrismaConfig
): Promise<void> =>
  await MigrateDeploy.new().parse(["migrate", "deploy"], config, baseDir);

const rootDir = resolve(import.meta.dir, "..");

// 自动 migrate 数据库
await migrateDeploy(rootDir, {
  experimental: {
    // 外部表
    externalTables: true,
  },
  // tables: {
  //   external: ["public.users"],
  // },
  schema: resolve(rootDir, "prisma/schema.prisma"),
  migrations: {
    path: resolve(rootDir, "prisma/migrations"),
  },
  datasource: {
    url: databaseUrl,
  },
});

export const prisma = new PrismaClient({ adapter });
