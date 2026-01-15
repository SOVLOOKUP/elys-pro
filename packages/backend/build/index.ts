import { fdir } from "fdir";
import { copy, ensureDir, rm } from "fs-extra";
import { fixOpendalPlugin } from "./fix-opendal";
import { fixPrismaWasmPlugin } from "./fix-prisma";
import {
  BinaryType,
  download,
  type DownloadOptions,
} from "@prisma/fetch-engine";
import { prismaVersion } from "@/generated/prisma/internal/prismaNamespace";

const inAction = process.env.GITHUB_ACTIONS === "true";

const api = new fdir({
  maxDepth: 0,
  includeBasePath: true,
}).crawl("./src/workers");

await rm("dist", { recursive: true, force: true });
await ensureDir("dist");

if (inAction) {
  const binaryTargets: DownloadOptions["binaryTargets"] = [
    "linux-musl-openssl-3.0.x",
    "linux-musl-arm64-openssl-3.0.x",
  ];
  await download({
    binaries: {
      [BinaryType.SchemaEngineBinary]: "dist",
    },
    binaryTargets,
    showProgress: true,
    version: prismaVersion.engine,
  });
}

await Promise.all([
  Bun.build({
    splitting: true,
    entrypoints: [
      "./src/main.ts",
      "./src/db/migrate.ts",
      ...(await api.withPromise()),
    ],
    target: "bun",
    outdir: "dist",
    bytecode: true,
    minify: inAction,
    sourcemap: "linked",
    plugins: [fixOpendalPlugin, fixPrismaWasmPlugin],
  }),
  copy("prisma", "dist/prisma"),
]);

console.log("Build completed!");
