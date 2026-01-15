import { PrismaClient } from "../generated/prisma/client";
import { PrismaBunSqlite } from "prisma-adapter-bun-sqlite";
import { PrismaPg } from "@prisma/adapter-pg";
import type { SqlDriverAdapterFactory } from "@prisma/client/runtime/client";
import { dirname, resolve } from "path";
import { getDataBaseURL } from "./utils";

const mainPath = dirname(Bun.main);
const appDir = resolve(mainPath, "..");
const dbDir = resolve(mainPath, "./db/");
const dbScript = resolve(dbDir, "./migrate");

export const migrateDeploy = async () => {
  const proc = Bun.spawn(["bun", "run", dbScript, appDir], {
    cwd: dbDir,
  });
  const text = await proc.stdout.text();
  console.log(text);
};

const databaseUrl = await getDataBaseURL(appDir);

// Determine the database adapter based on the DATABASE_URL environment variable
const adapter: SqlDriverAdapterFactory = databaseUrl?.startsWith("postgres")
  ? new PrismaPg({ connectionString: databaseUrl })
  : new PrismaBunSqlite({
      url: databaseUrl,
    });

export const prisma = new PrismaClient({ adapter });
