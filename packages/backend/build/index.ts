import { fdir } from "fdir";
import { copy, rm } from "fs-extra";
import { fixOpendalPlugin } from "./fix-opendal";

const api = new fdir({
  maxDepth: 0,
  includeBasePath: true,
}).crawl("./src/workers");

await rm("dist", { recursive: true, force: true });

await Promise.all([
  Bun.build({
    splitting: true,
    entrypoints: ["./src/main.ts", ...(await api.withPromise())],
    target: "bun",
    outdir: "dist",
    minify: true,
    sourcemap: "linked",
    plugins: [fixOpendalPlugin],
  }),
  copy("prisma", "dist/prisma"),
]);

console.log("Build completed!");
