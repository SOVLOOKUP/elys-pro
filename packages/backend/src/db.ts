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

// todo 自动 migrate 数据库 @prisma/migrate

export const prisma = new PrismaClient({ adapter });
