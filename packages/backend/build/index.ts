import { fdir } from "fdir";
import { copy, rm } from "fs-extra";
import { fixOpendalPlugin } from "./fix-opendal";
import { fixPrismaWasmPlugin } from "./fix-prisma";
import {
  BinaryType,
  download,
  type DownloadOptions,
} from "@prisma/fetch-engine";
import { prismaVersion } from "@/generated/prisma/internal/prismaNamespace";

console.log(process.env);
const inAction = process.env.GITHUB_ACTIONS === "true";

const api = new fdir({
  maxDepth: 0,
  includeBasePath: true,
}).crawl("./src/workers");

await rm("dist", { recursive: true, force: true });

if (inAction) {
  // todo
  const arm = false ? "-arm64" : "";
  const binaryTargets: DownloadOptions["binaryTargets"] = [
    `linux-musl${arm}-openssl-3.0.x`,
  ];
  const out = await download({
    binaries: {
      [BinaryType.SchemaEngineBinary]: "dist",
    },
    binaryTargets,
    showProgress: true,
    version: prismaVersion.engine,
  });

  const platform = out[BinaryType.SchemaEngineBinary]!;

  process.env.PRISMA_SCHEMA_ENGINE_BINARY = platform[binaryTargets![0]!];
}

await Promise.all([
  Bun.build({
    splitting: true,
    entrypoints: ["./src/main.ts", ...(await api.withPromise())],
    target: "bun",
    outdir: "dist",
    env: "PRISMA_SCHEMA_*",
    minify: inAction,
    sourcemap: "linked",
    plugins: [fixOpendalPlugin, fixPrismaWasmPlugin],
  }),
  copy("prisma", "dist/prisma"),
]);

console.log("Build completed!");
