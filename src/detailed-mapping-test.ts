import * as dotenv from "dotenv";
import { resolve } from "path";
import { AQFileParser } from "./aq-file-parser";

// 加载环境配置
dotenv.config();

/**
 * 详细测试数据映射过程
 */
async function detailedMappingTest() {
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
    console.log("=== 详细测试气温数据映射 ===");
    console.log("==============================================");
    
    const tbStartLine = 2 + parser["monthConfig"].takePC + parser["monthConfig"].takeHPC + 1;
    
    // 读取前2天的原始数据行
    for (let day = 0; day < 2; day++) {
      const line1 = lines[tbStartLine + day * 2].trim();
      const line2 = lines[tbStartLine + day * 2 + 1].trim();
      
      console.log(`\n--- 第 ${day + 1} 天 ---`);
      console.log(`原始第1行：${line1}`);
      console.log(`原始第2行：${line2}`);
      
      // 分割列
      const columns1 = line1.split(/\s+/).filter((c: string) => c !== "");
      const columns2 = line2.split(/\s+/).filter((c: string) => c !== "");
      
      console.log(`第1行列数量：${columns1.length}`);
      console.log(`第1行列内容：${columns1.join(", ")}`);
      console.log(`第2行列数量：${columns2.length}`);
      console.log(`第2行列内容：${columns2.join(", ")}`);
      
      // 测试mapHourColumns函数
      const testRow: Record<string, any> = {
        Id: day + 1,
        stationname: "罗田",
        stationnum: "58401",
        monthyear: "202501",
        createtime: new Date().toISOString(),
        date: `202501${(day + 1).toString().padStart(2, "0")}`,
      };
      
      // 确保只取前12个数据列
      const validColumns1 = columns1.slice(0, 12);
      const validColumns2 = columns2.slice(0, 12);
      
      console.log(`\n测试第1行映射（取前12列）：`);
      validColumns1.forEach((col: string, index: number) => {
        const hourColumns = ["h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04", "h05", "h06", "h07", "h08"];
        testRow[hourColumns[index]] = parser["formatValue"]("tbdatatable", col);
        console.log(`  列${index + 1}: ${col} → ${hourColumns[index]} = ${testRow[hourColumns[index]]}`);
      });
      
      console.log(`\n测试第2行映射（取前12列）：`);
      validColumns2.forEach((col: string, index: number) => {
        const hourColumns = ["h09", "h10", "h11", "h12", "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"];
        testRow[hourColumns[index]] = parser["formatValue"]("tbdatatable", col);
        console.log(`  列${index + 1}: ${col} → ${hourColumns[index]} = ${testRow[hourColumns[index]]}`);
      });
      
      console.log(`\n映射完成后的行数据：`);
      console.log(`  21时: ${testRow.h21}`);
      console.log(`  22时: ${testRow.h22}`);
      console.log(`  23时: ${testRow.h23}`);
      console.log(`  24时: ${testRow.h24}`);
      console.log(`  01时: ${testRow.h01}`);
      console.log(`  02时: ${testRow.h02}`);
      console.log(`  03时: ${testRow.h03}`);
      console.log(`  04时: ${testRow.h04}`);
      console.log(`  05时: ${testRow.h05}`);
      console.log(`  06时: ${testRow.h06}`);
      console.log(`  07时: ${testRow.h07}`);
      console.log(`  08时: ${testRow.h08}`);
      console.log(`  09时: ${testRow.h09}`);
      console.log(`  10时: ${testRow.h10}`);
      console.log(`  11时: ${testRow.h11}`);
      console.log(`  12时: ${testRow.h12}`);
      console.log(`  13时: ${testRow.h13}`);
      console.log(`  14时: ${testRow.h14}`);
      console.log(`  15时: ${testRow.h15}`);
      console.log(`  16时: ${testRow.h16}`);
      console.log(`  17时: ${testRow.h17}`);
      console.log(`  18时: ${testRow.h18}`);
      console.log(`  19时: ${testRow.h19}`);
      console.log(`  20时: ${testRow.h20}`);
    }
    
    console.log("\n✅ 详细映射测试完成！");
    
  } catch (error) {
    console.error("❌ 测试失败：", error);
  }
}

// 执行测试
detailedMappingTest().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
