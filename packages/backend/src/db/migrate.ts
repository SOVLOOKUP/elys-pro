// @ts-ignore
import { MigrateDeploy } from "@prisma/migrate";
import { type PrismaConfig } from "prisma/config";
import { resolve } from "path";
import { databaseUrl, rootDir } from "./utils";

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
