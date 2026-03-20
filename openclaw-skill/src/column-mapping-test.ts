import * as dotenv from "dotenv";
import { resolve } from "path";
import { AQFileParser } from "./aq-file-parser";

// 加载环境配置
dotenv.config();

/**
 * 详细测试列映射问题
 */
async function columnMappingTest() {
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
    console.log("=== 1. 详细测试气温数据列映射 ===");
    console.log("==============================================");
    
    const tbStartLine = 2 + parser["monthConfig"].takePC + parser["monthConfig"].takeHPC + 1;
    const tbTakeCount = parser["monthConfig"].takeTB;
    
    console.log(`TBDataTable配置：startLine=${tbStartLine}, takeCount=${tbTakeCount}`);
    
    // 查看气温表的前4行（2天数据）
    console.log("\n气温表前4行原始数据：");
    for (let i = tbStartLine; i < tbStartLine + 4; i++) {
      if (i < lines.length) {
        const line = lines[i].trim();
        const columns = line.split(/\s+/).filter((c: string) => c !== "");
        console.log(`${i}: 列数=${columns.length}, 内容=${line}`);
        console.log(`   列数据: ${columns}`);
      }
    }
    
    // 手动解析前2天数据
    const tbDataLines = lines.slice(tbStartLine, tbStartLine + 4);
    let dayIndex = 0;
    let currentRow: Record<string, any> | null = null;
    
    console.log("\n手动解析过程：");
    for (let i = 0; i < tbDataLines.length; i++) {
      const line = tbDataLines[i].trim();
      if (!line) continue;
      const columns = line.split(/\s+/).filter((c: string) => c !== "");
      const lineIndex = i % 2;
      
      console.log(`\n第${i+1}行（lineIndex=${lineIndex}）：`);
      console.log(`   列数：${columns.length}`);
      console.log(`   列数据：${columns}`);
      
      if (lineIndex === 0) {
        // 开始新的一天
        currentRow = {
          Id: dayIndex + 1,
          date: `${parser["monthYear"]}${(dayIndex + 1).toString().padStart(2, "0")}`,
        };
        
        console.log("   开始新的一天，行类型：第1行（21-24时和01-08时）");
        console.log("   应该映射的小时列：h21, h22, h23, h24, h01, h02, h03, h04, h05, h06, h07, h08");
        
        // 第1行：21-24时和01-08时
        parser["mapHourColumns"](currentRow, columns, ["h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04", "h05", "h06", "h07", "h08"], "tbdatatable");
        
        console.log("   映射后的数据：");
        console.log("   21时: ", currentRow.h21);
        console.log("   22时: ", currentRow.h22);
        console.log("   23时: ", currentRow.h23);
        console.log("   24时: ", currentRow.h24);
        console.log("   01时: ", currentRow.h01);
        console.log("   02时: ", currentRow.h02);
        console.log("   03时: ", currentRow.h03);
        console.log("   04时: ", currentRow.h04);
        console.log("   05时: ", currentRow.h05);
        console.log("   06时: ", currentRow.h06);
        console.log("   07时: ", currentRow.h07);
        console.log("   08时: ", currentRow.h08);
        
      } else if (lineIndex === 1 && currentRow) {
        // 第2行：09-20时
        console.log("   行类型：第2行（09-20时）");
        console.log("   应该映射的小时列：h09, h10, h11, h12, h13, h14, h15, h16, h17, h18, h19, h20");
        
        parser["mapHourColumns"](currentRow, columns, ["h09", "h10", "h11", "h12", "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"], "tbdatatable");
        
        console.log("   映射后的数据：");
        console.log("   09时: ", currentRow.h09);
        console.log("   10时: ", currentRow.h10);
        console.log("   11时: ", currentRow.h11);
        console.log("   12时: ", currentRow.h12);
        console.log("   13时: ", currentRow.h13);
        console.log("   14时: ", currentRow.h14);
        console.log("   15时: ", currentRow.h15);
        console.log("   16时: ", currentRow.h16);
        console.log("   17时: ", currentRow.h17);
        console.log("   18时: ", currentRow.h18);
        console.log("   19时: ", currentRow.h19);
        console.log("   20时: ", currentRow.h20);
        
        dayIndex++;
        currentRow = null;
      }
    }
    
    // 2. 测试逐小时降水量数据（R61DataTable）
    console.log("\n==============================================");
    console.log("=== 2. 详细测试逐小时降水量数据列映射 ===");
    console.log("==============================================");
    
    const takeUB = parser["monthConfig"].takeUB;
    const takeVB = parser["monthConfig"].takeVB;
    const takeEA = parser["monthConfig"].takeEA;
    const r61StartLine = 2 + parser["monthConfig"].takePC + parser["monthConfig"].takeHPC + 
                        parser["monthConfig"].takeTB + parser["monthConfig"].takeIBL + 
                        takeEA + takeUB + takeVB + 1;
    const r61TakeCount = parser["monthConfig"].takeR61;
    
    console.log(`R61DataTable配置：startLine=${r61StartLine}, takeCount=${r61TakeCount}`);
    
    // 查看R61DataTable的前8行（2天数据）
    console.log("\nR61DataTable前8行原始数据：");
    for (let i = r61StartLine; i < r61StartLine + 8; i++) {
      if (i < lines.length) {
        const line = lines[i].trim();
        const columns = line.split(/\s+/).filter((c: string) => c !== "");
        console.log(`${i}: 列数=${columns.length}, 内容=${line}`);
        console.log(`   列数据: ${columns}`);
      }
    }
    
    console.log("\n✅ 列映射测试完成！");
    
  } catch (error) {
    console.error("❌ 测试失败：", error);
  }
}

// 执行测试
columnMappingTest().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
