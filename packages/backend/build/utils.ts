import { existsSync } from "fs"; // 引入文件存在性检查（Bun 兼容 Node.js fs 模块）

/**
 * 向文件头部添加文本
 * @param {string} filePath 文件路径（相对路径或绝对路径）
 * @param {string} headerText 要添加的头部文本
 */
export async function prependTextToFile(filePath: string, headerText: string) {
  // 1. 检查文件是否存在
  if (!existsSync(filePath)) {
    console.error(`错误：文件 ${filePath} 不存在`);
    return;
  }

  // 2. 读取原文件内容（指定编码，确保中文等特殊字符不出现乱码）
  const originalFile = Bun.file(filePath);
  const originalContent = await originalFile.text();

  // 3. 拼接新内容（尾部添加换行符，保证原文件内容从新行开始）
  const newContent = `${headerText}\n${originalContent}`;

  // 4. 写入文件（覆盖原文件，保持原编码）
  await Bun.write(filePath, newContent);
}
