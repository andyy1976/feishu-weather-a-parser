import * as dotenv from "dotenv";
import { resolve } from "path";
import { AQFileParser } from "./aq-file-parser";

// 加载环境配置
dotenv.config();

/**
 * 测试解析后的数据结构是否与Excel导出的列顺序一致
 */
async function dataStructureTest() {
  // 从环境变量获取配置
  const filePath = resolve(process.env.FILE_PATH || "");

  // 初始化解析器，禁用数据库和Excel导出
  const parser = new AQFileParser({
    dbPath: undefined, // 禁用数据库
    outputDir: undefined, // 禁用Excel导出
  });

  try {
    // 读取文件内容
    console.log(`开始读取文件：${filePath}`);
    const fs = require("fs");
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    
    // 手动设置monthYear和stationNum（测试需要）
    parser["monthYear"] = "202501";
    parser["stationNum"] = "58401";
    parser["monthConfig"] = parser["getMonthConfig"]("01", "2025");
    
    // 测试气温数据（TBDataTable）
    console.log("\n==============================================");
    console.log("=== 测试气温数据结构 ===");
    console.log("==============================================");
    
    const tbStartLine = 2 + parser["monthConfig"].takePC + parser["monthConfig"].takeHPC + 1;
    const tbTakeCount = parser["monthConfig"].takeTB;
    
    const tbData = parser["readDataSection"](lines, "tbdatatable", tbStartLine, tbTakeCount);
    console.log(`解析到 ${tbData.length} 天的气温数据`);
    
    if (tbData.length > 0) {
      const firstRow = tbData[0];
      console.log("\n第1天数据结构：");
      console.log(JSON.stringify(firstRow, null, 2));
      
      // 检查小时字段的存在性和顺序
      console.log("\n小时字段顺序检查：");
      const hourColumns = ["h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04", 
                          "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12", 
                          "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"];
      
      hourColumns.forEach((hour, index) => {
        console.log(`  ${index + 1}. ${hour}: ${firstRow[hour]}`);
      });
      
      // 检查原始数据行
      console.log("\n原始数据行：");
      const line1 = lines[tbStartLine].trim();
      const line2 = lines[tbStartLine + 1].trim();
      console.log(`第1行：${line1}`);
      console.log(`第2行：${line2}`);
      
      // 手动解析原始数据
      const columns1 = line1.split(/\s+/).filter((c: string) => c !== "");
      const columns2 = line2.split(/\s+/).filter((c: string) => c !== "");
      
      console.log("\n手动解析：");
      console.log("第1行列：");
      columns1.forEach((col: string, index: number) => {
        const hour = ["h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04", "h05", "h06", "h07", "h08"][index];
        const value = parseFloat(col);
        console.log(`  ${index + 1}. ${col} → ${hour} = ${value}`);
      });
      
      console.log("\n第2行列：");
      columns2.forEach((col: string, index: number) => {
        const hour = ["h09", "h10", "h11", "h12", "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"][index];
        const value = parseFloat(col);
        console.log(`  ${index + 1}. ${col} → ${hour} = ${value}`);
      });
    }
    
    console.log("\n✅ 数据结构测试完成！");
    
  } catch (error) {
    console.error("❌ 测试失败：", error);
  }
}

// 执行测试
dataStructureTest().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
