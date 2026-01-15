import { TOML } from "bun";
import ky from "ky";
import { camelCase, pascalCase } from "es-toolkit";
import { parseDocument } from "htmlparser2";
import { selectOne, selectAll } from "css-select";
import { generate } from "ts-to-zod";

// 配置并发请求数量
const CONCURRENT_REQUESTS = 8; // 降低并发数以避免请求失败
const generatedPath = "./src/loader/protocal/generated/";

// 进度显示函数（改进版，包含时间估算）
class ProgressTracker {
  private startTime: number = Date.now();
  private completed: number = 0;
  private total: number = 0;

  constructor(total: number) {
    this.total = total;
  }

  update(service: string) {
    this.completed++;
    const elapsed = (Date.now() - this.startTime) / 1000; // 秒
    const progress = this.completed / this.total;
    const eta = progress > 0 ? (elapsed / progress) * (1 - progress) : 0;

    const percentage = Math.round(progress * 100);
    const barLength = 30;
    const filledLength = Math.round((percentage / 100) * barLength);
    const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);

    const timeInfo = eta > 0 ? `, ETA: ${Math.round(eta)}s` : "";
    process.stdout.write(
      `\r[${bar}] ${percentage}% (${this.completed}/${this.total}) - ${service}${timeInfo}`
    );
  }

  complete() {
    console.log("\n"); // 换行以避免覆盖
  }
}

// 递归提取htmlparser2节点的所有文本内容（核心辅助函数）
function extractNodeText(node: any) {
  if (node.type === "text") {
    return node.data || "";
  }
  if (node.type === "tag" && node.children) {
    return node.children.map(extractNodeText).join("");
  }
  return "";
}

// 提取文本内容（优化版，仅提取单个节点）
function extractTextByCSS(html: string, cssSelector: string) {
  try {
    const dom = parseDocument(html);
    const node = selectOne(cssSelector, dom);
    return node ? extractNodeText(node).trim() : "";
  } catch (error) {
    console.error(`CSS选择器提取文本失败: ${error}`);
    return "";
  }
}

// 类型转换函数（优化版）
const typeMap = {
  String: "string",
  usize: "number",
  u32: "number",
  u64: "number",
  bool: "boolean",
  i64: "number",
  Duration: "number",
};

function convertType(rstype: string) {
  let result = rstype
    .replaceAll("#[non_exhaustive]", "")
    .replace("pub struct", "export interface")
    .replaceAll("pub ", "")
    .replaceAll(/Show \d+ fields/g, "");

  // 使用for循环替代多次replaceAll调用，提高性能
  for (const [rustType, tsType] of Object.entries(typeMap)) {
    result = result
      .replaceAll(`: ${rustType},`, `: ${tsType};`)
      .replaceAll(`: Vec<${rustType}>,`, `: ${tsType}[];`)
      .replaceAll(`: Option<${rustType}>,`, `?: ${tsType};`)
      .replaceAll(`: Option<Vec<${rustType}>>,`, `?: ${tsType}[];`);
  }

  return result;
}

// 并发处理函数（改进版，使用更高效的并发模式）
async function processUrlsConcurrently(urls: string[], services: string[]) {
  const results: string[] = new Array(urls.length);
  const progressTracker = new ProgressTracker(urls.length);

  // 创建任务批次
  const tasks = urls.map(async (url, index) => {
    const service = services[index]!;
    console.log(`开始处理服务: ${service}`);

    try {
      // 发送请求并处理
      const html = await ky.get(url, { timeout: 15000 }).text(); // 增加超时时间
      const rstype = extractTextByCSS(html, ".rust > code:nth-child(1)");
      results[index] = convertType(rstype);
      console.log(`完成处理服务: ${service}`);
    } catch (error) {
      console.error(`\n处理 ${service} 失败: ${error}`);
      results[index] = `// 处理 ${service} 失败`;
    } finally {
      progressTracker.update(service);
    }
  });

  // 分批执行以控制并发
  for (let i = 0; i < tasks.length; i += CONCURRENT_REQUESTS) {
    const batch = tasks.slice(i, i + CONCURRENT_REQUESTS);
    await Promise.allSettled(batch); // 使用Promise.allSettled确保即使有失败也不影响其他请求
  }

  progressTracker.complete();
  return results;
}

// 主函数
async function main() {
  console.log("开始获取 Opendal 服务列表...");

  // 获取服务列表
  const res = await ky
    .get(
      "https://raw.githubusercontent.com/apache/opendal/refs/heads/main/bindings/java/Cargo.toml"
    )
    .text();
  const toml = TOML.parse(res);
  // @ts-ignore
  const features = toml["features"];
  const schemas: string[] = [...features.default, ...features["services-all"]]
    .filter((item) => item !== "default")
    .map((item) => item.replace("services-", ""));

  console.log(`获取到 ${schemas.length} 个服务`);

  // 生成 schema.ts
  const schemaCode = `export type OpendalSchema = 
${schemas.map((item) => `  | "${item}"`).join("\n")}

export const schemas: OpendalSchema[] = ${JSON.stringify(schemas)};`;

  await Bun.write(`${generatedPath}schema.ts`, schemaCode);
  console.log("\n已生成 schema.ts");

  // 生成 options.ts
  // 处理 options
  const pascalCaseOptions = schemas.map((item) => pascalCase(item));
  const optionhtmlurl = pascalCaseOptions.map(
    (item) =>
      `https://docs.rs/opendal/latest/opendal/services/struct.${item}Config.html`
  );

  console.log("\n开始处理服务配置...");
  const optionhtml = await processUrlsConcurrently(
    optionhtmlurl,
    pascalCaseOptions
  );

  // 生成 options.ts
  const optioncode = `// Generate from https://docs.rs/opendal/latest/opendal/services/
${optionhtml.join("\n\n")}

export type OpendalOption = ${pascalCaseOptions
    .map((item) => `\n  | ${item}Config`)
    .join("")};`;

  await Bun.write(`${generatedPath}options.ts`, optioncode);
  console.log("已生成 options.ts");

  // 生成 optionsSchema.ts
  const out = generate({
    sourceText: optioncode,
  });

  await Bun.write(
    `${generatedPath}optionsSchema.ts`,
    out.getZodSchemasFile(`${generatedPath}options.ts`)
  );
  console.log("已生成 optionsSchema.ts");

  // 生成 schemaConfig.ts
  const camelCaseOptions = schemas.map(
    (item) => `${camelCase(item)}ConfigSchema`
  );
  const optionsExport = schemas
    .map((item) => `"${item}": ${camelCase(item)}ConfigSchema`)
    .join(",\n  ");

  const schemaConfig = `import { 
  ${camelCaseOptions.join(",\n  ")}
} from "./optionsSchema";

export default {
  ${optionsExport}
};`;

  await Bun.write(`${generatedPath}schemaConfig.ts`, schemaConfig);
  console.log("已生成 schemaConfig.ts");

  console.log("\n完成！已生成所有文件");
}

// 执行主函数
await Promise.all([
  main(),
  (async () => {
    const bunLoaders: string[] = selectAll(
      `#table-of-contents-content > li[data-depth="1"]`,
      parseDocument(await ky.get("https://bun.com/docs/bundler/loaders").text())
    ).map((i) => extractNodeText(i));

    await Bun.write(
      `${generatedPath}bunLoaders.ts`,
      `// generate from https://bun.com/docs/bundler/loaders
// @ts-ignore
export const loader = new Set<Bun.Loader>([
  "${bunLoaders.join('",\n  "')}"
])`
    );
    console.log("已生成 bunLoaders.ts");
  })(),
]);
