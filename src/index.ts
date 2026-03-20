import * as dotenv from "dotenv";
import { resolve } from "path";
import { AQFileParser } from "./aq-file-parser";

// 加载环境配置
dotenv.config();

/**
 * 本地运行示例
 */
async function main() {
  // 从环境变量获取配置
  const filePath = resolve(process.env.FILE_PATH || "");
  const dbPath = process.env.DB_PATH ? resolve(process.env.DB_PATH) : undefined;
  const outputDir = process.env.OUTPUT_DIR ? resolve(process.env.OUTPUT_DIR) : undefined;

  // 初始化解析器
  const parser = new AQFileParser({
    dbPath,
    outputDir,
  });

  // 执行解析
  console.log(`开始解析文件：${filePath}`);
  const result = await parser.parseFile(filePath);

  // 输出结果
  if (result.success) {
    console.log("✅ 解析成功！");
    console.log(`站点编号：${result.stationNum}`);
    console.log(`数据年月：${result.monthYear}`);
    console.log(result.message);
  } else {
    console.error("❌ 解析失败：", result.message);
    if (result.error) {
      console.error("错误详情：", result.error);
    }
  }

  // 关闭资源
  parser.close();
}

// 执行
main().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
