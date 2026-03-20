import * as dotenv from "dotenv";
import { resolve } from "path";
import { AQFileParser } from "./aq-file-parser";

// 加载环境配置
dotenv.config();

/**
 * 直接测试解析后的数据，跳过Excel导出
 */
async function directDataTest() {
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
    console.log("=== 1. 直接测试气温数据解析结果 ===");
    console.log("==============================================");
    
    const tbStartLine = 2 + parser["monthConfig"].takePC + parser["monthConfig"].takeHPC + 1;
    const tbTakeCount = parser["monthConfig"].takeTB;
    
    const tbData = parser["readDataSection"](lines, "tbdatatable", tbStartLine, tbTakeCount);
    console.log(`解析到 ${tbData.length} 天的气温数据`);
    
    if (tbData.length > 0) {
      const firstRow = tbData[0];
      console.log("\n第1天数据：");
      console.log(`日期: ${firstRow.date}`);
      console.log(`21时: ${firstRow.h21}`);
      console.log(`22时: ${firstRow.h22}`);
      console.log(`23时: ${firstRow.h23}`);
      console.log(`24时: ${firstRow.h24}`);
      console.log(`01时: ${firstRow.h01}`);
      console.log(`02时: ${firstRow.h02}`);
      console.log(`03时: ${firstRow.h03}`);
      console.log(`04时: ${firstRow.h04}`);
      console.log(`05时: ${firstRow.h05}`);
      console.log(`06时: ${firstRow.h06}`);
      console.log(`07时: ${firstRow.h07}`);
      console.log(`08时: ${firstRow.h08}`);
      console.log(`09时: ${firstRow.h09}`);
      console.log(`10时: ${firstRow.h10}`);
      console.log(`11时: ${firstRow.h11}`);
      console.log(`12时: ${firstRow.h12}`);
      console.log(`13时: ${firstRow.h13}`);
      console.log(`14时: ${firstRow.h14}`);
      console.log(`15时: ${firstRow.h15}`);
      console.log(`16时: ${firstRow.h16}`);
      console.log(`17时: ${firstRow.h17}`);
      console.log(`18时: ${firstRow.h18}`);
      console.log(`19时: ${firstRow.h19}`);
      console.log(`20时: ${firstRow.h20}`);
    }
    
    // 2. 测试露点温度数据（IBLDataTable）
    console.log("\n==============================================");
    console.log("=== 2. 直接测试露点温度数据解析结果 ===");
    console.log("==============================================");
    
    const iblStartLine = tbStartLine + parser["monthConfig"].takeTB + 2;
    const iblTakeCount = parser["monthConfig"].takeIBL;
    
    const iblData = parser["readDataSection"](lines, "ibldatatable", iblStartLine, iblTakeCount);
    console.log(`解析到 ${iblData.length} 天的露点温度数据`);
    
    if (iblData.length > 0) {
      const firstRow = iblData[0];
      console.log("\n第1天数据：");
      console.log(`日期: ${firstRow.date}`);
      console.log(`21时: ${firstRow.h21}`);
      console.log(`22时: ${firstRow.h22}`);
      console.log(`23时: ${firstRow.h23}`);
      console.log(`24时: ${firstRow.h24}`);
      console.log(`01时: ${firstRow.h01}`);
      console.log(`02时: ${firstRow.h02}`);
      console.log(`03时: ${firstRow.h03}`);
      console.log(`04时: ${firstRow.h04}`);
      console.log(`05时: ${firstRow.h05}`);
      console.log(`06时: ${firstRow.h06}`);
      console.log(`07时: ${firstRow.h07}`);
      console.log(`08时: ${firstRow.h08}`);
      console.log(`09时: ${firstRow.h09}`);
      console.log(`10时: ${firstRow.h10}`);
      console.log(`11时: ${firstRow.h11}`);
      console.log(`12时: ${firstRow.h12}`);
      console.log(`13时: ${firstRow.h13}`);
      console.log(`14时: ${firstRow.h14}`);
      console.log(`15时: ${firstRow.h15}`);
      console.log(`16时: ${firstRow.h16}`);
      console.log(`17时: ${firstRow.h17}`);
      console.log(`18时: ${firstRow.h18}`);
      console.log(`19时: ${firstRow.h19}`);
      console.log(`20时: ${firstRow.h20}`);
    }
    
    // 3. 测试逐小时降水量数据（R61DataTable）
    console.log("\n==============================================");
    console.log("=== 3. 直接测试逐小时降水量数据解析结果 ===");
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
      console.log("\n第1天数据：");
      console.log(`日期: ${firstRow.date}`);
      console.log(`21时: ${firstRow.h21}`);
      console.log(`22时: ${firstRow.h22}`);
      console.log(`23时: ${firstRow.h23}`);
      console.log(`24时: ${firstRow.h24}`);
      console.log(`01时: ${firstRow.h01}`);
      console.log(`02时: ${firstRow.h02}`);
      console.log(`03时: ${firstRow.h03}`);
      console.log(`04时: ${firstRow.h04}`);
      console.log(`05时: ${firstRow.h05}`);
      console.log(`06时: ${firstRow.h06}`);
      console.log(`07时: ${firstRow.h07}`);
      console.log(`08时: ${firstRow.h08}`);
      console.log(`09时: ${firstRow.h09}`);
      console.log(`10时: ${firstRow.h10}`);
      console.log(`11时: ${firstRow.h11}`);
      console.log(`12时: ${firstRow.h12}`);
      console.log(`13时: ${firstRow.h13}`);
      console.log(`14时: ${firstRow.h14}`);
      console.log(`15时: ${firstRow.h15}`);
      console.log(`16时: ${firstRow.h16}`);
      console.log(`17时: ${firstRow.h17}`);
      console.log(`18时: ${firstRow.h18}`);
      console.log(`19时: ${firstRow.h19}`);
      console.log(`20时: ${firstRow.h20}`);
    }
    
    console.log("\n✅ 直接数据测试完成！");
    
  } catch (error) {
    console.error("❌ 测试失败：", error);
  }
}

// 执行测试
directDataTest().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
