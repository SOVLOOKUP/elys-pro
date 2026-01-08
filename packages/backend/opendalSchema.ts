import { TOML } from "bun";
import ky from "ky";

const res = await ky
  .get("https://cdn.jsdelivr.net/gh/apache/opendal/bindings/java/Cargo.toml")
  .text();
const toml = TOML.parse(res);
// @ts-ignore
const features = toml["features"];
const schemas: string[] = [...features.default, ...features["services-all"]]
  .filter((item) => item !== "default")
  .map((item) => item.replace("services-", ""));

const code = `export type OpendalSchema = 
${schemas.map((item) => `    | "${item}"`).join("\n")}

export const schemas: OpendalSchema[] = ${JSON.stringify(schemas)};`;

await Bun.write("./src/loader/protocal/opendal/schema.ts", code);

import { pascalCase } from "es-toolkit";

const pascalCaseOptions = schemas.map((item) => pascalCase(item));

const optionhtmlurl = pascalCaseOptions.map(
  (item) =>
    `https://docs.rs/opendal/latest/opendal/services/struct.${item}Config.html`
);

import { parseDocument } from "htmlparser2";
import { selectOne, selectAll } from "css-select";

/**
 * 递归提取htmlparser2节点的所有文本内容（核心辅助函数）
 */
function extractNodeText(node: any) {
  // 文本节点直接返回内容
  if (node.type === "text") {
    return node.data || "";
  }

  // 元素节点递归提取子节点文本
  if (node.type === "tag" && node.children) {
    return node.children.map(extractNodeText).join("");
  }

  // 其他节点（注释、指令等）返回空
  return "";
}

/**
 * 在Bun中通过CSS选择器提取HTML文本（仅依赖htmlparser2 + css-select）
 * @param {string} html - 原始HTML字符串
 * @param {string} cssSelector - CSS选择器（如 .content > h1、#title、p.desc:first-child）
 * @param {boolean} isSingle - 是否只取第一个结果（默认true）
 * @returns {string|string[]} 提取的文本（单文本/文本数组）
 */
function extractTextByCSS(html: string, cssSelector: string, isSingle = true) {
  try {
    // 1. 解析HTML为轻量DOM树（无浏览器环境模拟）
    const dom = parseDocument(html);

    // 2. 执行CSS选择器查询
    let matchedNodes: ReturnType<typeof selectAll> = [];
    if (isSingle) {
      // 匹配第一个节点
      const singleNode = selectOne(cssSelector, dom);
      if (singleNode) matchedNodes = [singleNode];
    } else {
      // 匹配所有节点
      matchedNodes = selectAll(cssSelector, dom);
    }

    // 3. 提取文本并过滤空白
    const textList = matchedNodes
      .map((node) => extractNodeText(node).trim())
      .filter((text) => text); // 过滤空文本

    // 4. 返回结果（适配单/多结果场景）
    return isSingle ? textList[0] || "" : textList;
  } catch (error) {
    console.error("CSS选择器提取文本失败：", error);
    return isSingle ? "" : [];
  }
}

const convertType = (rstype: string, rs2ts: Record<string, string>) => {
  for (const key in rs2ts) {
    rstype = rstype
      .replaceAll(`: ${key},`, `: ${rs2ts[key]};`)
      .replaceAll(`: Vec<${key}>,`, `: ${rs2ts[key]}[];`)
      .replaceAll(`: Option<${key}>,`, `?: ${rs2ts[key]};`)
      .replaceAll(`: Option<Vec<${key}>>,`, `?: ${rs2ts[key]}[];`);
  }
  return rstype;
};

const optionhtml = await Promise.all(
  optionhtmlurl.map(async (item) => {
    const rstype: string = extractTextByCSS(
      await ky.get(item).text(),
      ".rust > code:nth-child(1)"
    );

    return convertType(
      rstype
        // 代码格式转换
        .replaceAll("#[non_exhaustive]", "")
        .replace("pub struct", "export interface")
        .replaceAll("pub ", "")
        // 去除所有 Show 29 fields 字符串
        .replaceAll(/Show \d+ fields/g, ""),
      {
        // 类型转换
        String: "string",
        usize: "number",
        u32: "number",
        u64: "number",
        bool: "boolean",
        i64: "number",
        Duration: "number",
      }
    );
  })
);

const optioncode = `// Generate from https://docs.rs/opendal/latest/opendal/services/
${optionhtml.join("\n\n")}

export type OpendalOption = ${pascalCaseOptions
  .map((item) => `\n  | ${item}Config`)
  .join("")};`;

await Bun.write("./src/loader/protocal/opendal/options.ts", optioncode);
