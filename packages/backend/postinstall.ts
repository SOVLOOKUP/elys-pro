import { TOML } from "bun";
import ky from "ky";

const res = await ky
  .get("https://cdn.jsdelivr.net/gh/apache/opendal/bindings/java/Cargo.toml")
  .text();
const toml = TOML.parse(res);
// @ts-ignore
const features = toml["features"];
const schemas = [...features.default, ...features["services-all"]]
  .filter((item) => item !== "default")
  .map((item) => item.replace("services-", ""));

const code = `export type OpendalSchema = 
${schemas.map((item) => `    | "${item}"`).join("\n")}

export const schemas: OpendalSchema[] = ${JSON.stringify(schemas)};`;

await Bun.write("./src/loader/protocal/opendal/schema.ts", code);
