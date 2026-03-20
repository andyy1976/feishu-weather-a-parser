import * as dotenv from "dotenv";
import { resolve } from "path";
import { AQFileParser } from "./aq-file-parser";

// 加载环境配置
dotenv.config();

/**
 * 测试第一行数据的字段完整性
 */
async function firstRowTest() {
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
    
    // 1. 测试气温数据（TBDataTable）
    console.log("\n==============================================");
    console.log("=== 1. 测试气温数据第一行完整性 ===");
    console.log("==============================================");
    
    const tbStartLine = 2 + parser["monthConfig"].takePC + parser["monthConfig"].takeHPC + 1;
    const tbTakeCount = parser["monthConfig"].takeTB;
    
    const tbData = parser["readDataSection"](lines, "tbdatatable", tbStartLine, tbTakeCount);
    console.log(`解析到 ${tbData.length} 天的气温数据`);
    
    if (tbData.length > 0) {
      const firstRow = tbData[0];
      const keys = Object.keys(firstRow);
      
      console.log(`第一行字段数量：${keys.length}`);
      console.log(`所有字段：${keys.join(", ")}`);
      
      // 检查小时字段
      const hourColumns = [
        "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04",
        "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12",
        "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
      ];
      
      console.log("\n24小时字段检查：");
      hourColumns.forEach(hour => {
        if (firstRow[hour] !== undefined && firstRow[hour] !== null) {
          console.log(`${hour}: ${firstRow[hour]} (存在)`);
        } else {
          console.log(`${hour}: ${firstRow[hour]} (缺失或无效)`);
        }
      });
    }
    
    // 2. 测试露点温度数据（IBLDataTable）
    console.log("\n==============================================");
    console.log("=== 2. 测试露点温度数据第一行完整性 ===");
    console.log("==============================================");
    
    const iblStartLine = tbStartLine + tbTakeCount + 2;
    const iblTakeCount = parser["monthConfig"].takeIBL;
    
    const iblData = parser["readDataSection"](lines, "ibldatatable", iblStartLine, iblTakeCount);
    console.log(`解析到 ${iblData.length} 天的露点温度数据`);
    
    if (iblData.length > 0) {
      const firstRow = iblData[0];
      const keys = Object.keys(firstRow);
      
      console.log(`第一行字段数量：${keys.length}`);
      console.log(`所有字段：${keys.join(", ")}`);
      
      // 检查小时字段
      const hourColumns = [
        "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04",
        "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12",
        "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
      ];
      
      console.log("\n24小时字段检查：");
      hourColumns.forEach(hour => {
        if (firstRow[hour] !== undefined && firstRow[hour] !== null) {
          console.log(`${hour}: ${firstRow[hour]} (存在)`);
        } else {
          console.log(`${hour}: ${firstRow[hour]} (缺失或无效)`);
        }
      });
    }
    
    // 3. 测试逐小时降水量数据（R61DataTable）
    console.log("\n==============================================");
    console.log("=== 3. 测试逐小时降水量数据第一行完整性 ===");
    console.log("==============================================");
    
    const takeUB = parser["monthConfig"].takeUB;
    const takeVB = parser["monthConfig"].takeVB;
    const takeEA = parser["monthConfig"].takeEA;
    const r61StartLine = 2 + parser["monthConfig"].takePC + parser["monthConfig"].takeHPC + 
                        parser["monthConfig"].takeTB + parser["monthConfig"].takeIBL + 
                        takeEA + takeUB + takeVB + 1;
    const r61TakeCount = parser["monthConfig"].takeR61;
    
    const r61Data = parser["readDataSection"](lines, "r61datatable", r61StartLine, r61TakeCount);
    console.log(`解析到 ${r61Data.length} 天的逐小时降水量数据`);
    
    if (r61Data.length > 0) {
      const firstRow = r61Data[0];
      const keys = Object.keys(firstRow);
      
      console.log(`第一行字段数量：${keys.length}`);
      console.log(`所有字段：${keys.join(", ")}`);
      
      // 检查小时字段
      const hourColumns = [
        "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04",
        "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12",
        "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
      ];
      
      console.log("\n24小时字段检查：");
      hourColumns.forEach(hour => {
        if (firstRow[hour] !== undefined && firstRow[hour] !== null) {
          console.log(`${hour}: ${firstRow[hour]} (存在)`);
        } else {
          console.log(`${hour}: ${firstRow[hour]} (缺失或无效)`);
        }
      });
    }
    
    console.log("\n✅ 第一行数据测试完成！");
    
  } catch (error) {
    console.error("❌ 测试失败：", error);
  }
}

// 执行测试
firstRowTest().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
