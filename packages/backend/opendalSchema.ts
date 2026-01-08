import { TOML } from "bun";
import ky from "ky";
import { pascalCase } from "es-toolkit";
import { parseDocument } from "htmlparser2";
import { selectOne } from "css-select";

// 配置并发请求数量
const CONCURRENT_REQUESTS = 5;

// 进度显示函数
function showProgress(current: number, total: number, service: string) {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filledLength = Math.round((percentage / 100) * barLength);
  const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);
  process.stdout.write(
    `\r[${bar}] ${percentage}% (${current}/${total}) - ${service}`
  );
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

// 并发处理函数
async function processUrlsConcurrently(urls: string[], services: string[]) {
  const results: string[] = [];
  const total = urls.length;
  let index = 0;

  async function processNext() {
    if (index >= total) return;

    const currentIndex = index++;
    const url = urls[currentIndex]!;
    const service = services[currentIndex]!;

    try {
      // 显示进度
      showProgress(currentIndex + 1, total, service);

      // 发送请求并处理
      const html = await ky.get(url).text();
      const rstype = extractTextByCSS(html, ".rust > code:nth-child(1)");
      results[currentIndex] = convertType(rstype);
    } catch (error) {
      console.error(`\n处理 ${service} 失败: ${error}`);
      results[currentIndex] = `// 处理 ${service} 失败`;
    }

    // 处理下一个
    await processNext();
  }

  // 创建并发任务
  const tasks = Array.from(
    { length: Math.min(CONCURRENT_REQUESTS, total) },
    processNext
  );
  await Promise.all(tasks);

  return results;
}

// 主函数
async function main() {
  console.log("开始获取 Opendal 服务列表...");

  // 获取服务列表
  const res = await ky
    .get("https://cdn.jsdelivr.net/gh/apache/opendal/bindings/java/Cargo.toml")
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
${schemas.map((item) => `    | "${item}"`).join("\n")}

export const schemas: OpendalSchema[] = ${JSON.stringify(schemas)};`;

  await Bun.write("./src/loader/protocal/opendal/schema.ts", schemaCode);
  console.log("\n已生成 schema.ts");

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

  await Bun.write("./src/loader/protocal/opendal/options.ts", optioncode);
  console.log("\n\n完成！已生成所有文件");
}

// 执行主函数
await main();
