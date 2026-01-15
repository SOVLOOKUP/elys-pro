// @ts-ignore
import { MigrateDeploy } from "@prisma/migrate";
import { type PrismaConfig } from "prisma/config";
import { resolve } from "path";
import { getDataBaseURL } from "./utils";

const rootDir = process.argv[2];

if (!rootDir) {
  console.error("Please provide the root directory as an argument.");
  process.exit(1);
}

const migrateDeploy = async (
  baseDir: string,
  config?: PrismaConfig
): Promise<void> =>
  await MigrateDeploy.new().parse(["migrate", "deploy"], config, baseDir);

(async () => {
  // 自动 migrate 数据库
  await migrateDeploy(rootDir, {
    schema: resolve(rootDir, "prisma/schema.prisma"),
    migrations: {
      path: resolve(rootDir, "prisma/migrations"),
    },
    datasource: {
      url: await getDataBaseURL(rootDir),
    },
  });
})();
