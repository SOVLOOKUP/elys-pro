import { PrismaClient } from "../generated/prisma/client";
import { PrismaBunSqlite } from "prisma-adapter-bun-sqlite";
import { PrismaPg } from "@prisma/adapter-pg";
import type { SqlDriverAdapterFactory } from "@prisma/client/runtime/client";
import { databaseUrl } from "./utils";

let adapter: SqlDriverAdapterFactory;

// Determine the database adapter based on the DATABASE_URL environment variable
if (databaseUrl?.startsWith("postgres")) {
  adapter = new PrismaPg({ connectionString: databaseUrl });
} else {
  adapter = new PrismaBunSqlite({
    url: databaseUrl,
  });
}

export const prisma = new PrismaClient({ adapter });
