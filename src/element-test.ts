import * as dotenv from "dotenv";
import { resolve } from "path";
import { AQFileParser } from "./aq-file-parser";
import * as fs from "fs";

// 加载环境配置
dotenv.config();

/**
 * 详细要素测试脚本：逐个检查气温、露点温度和逐小时降水量数据
 */
async function elementTest() {
  // 从环境变量获取配置
  const filePath = resolve(process.env.FILE_PATH || "");

  try {
    // 读取文件内容
    console.log(`开始读取文件：${filePath}`);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    
    // 初始化解析器
    const parser = new AQFileParser({
      dbPath: undefined, // 禁用数据库
      outputDir: undefined, // 禁用Excel导出
    });
    
    // 手动设置monthYear和stationNum（测试需要）
    parser["stationNum"] = "58401";
    parser["monthYear"] = "202501";
    parser["monthConfig"] = parser["getMonthConfig"]("01", "2025");
    
    // 1. 测试气温数据（TBDataTable）
    console.log("\n==============================================");
    console.log("=== 1. 测试气温数据（TBDataTable）===");
    console.log("==============================================");
    
    // 根据C#代码，TB的起始行是 PC + takePC + takeHPC + 1
    const takePC = parser["monthConfig"].takePC;
    const takeHPC = parser["monthConfig"].takeHPC;
    const tbStartLine = 2 + takePC + takeHPC + 1;
    const tbTakeCount = parser["monthConfig"].takeTB;
    
    console.log(`气温表配置：startLine=${tbStartLine}, takeCount=${tbTakeCount}`);
    console.log(`monthConfig.takeTB=${parser["monthConfig"].takeTB}`);
    
    // 查看气温表的原始数据
    console.log("\n气温表原始数据（前10行）：");
    for (let i = tbStartLine; i < tbStartLine + Math.min(10, tbTakeCount); i++) {
      if (i < lines.length) {
        console.log(`${i}: ${lines[i]}`);
      }
    }
    
    // 解析气温数据
    const tbData = parser["readDataSection"](lines, "tbdatatable", tbStartLine, tbTakeCount);
    console.log(`\n解析到 ${tbData.length} 天的气温数据`);
    
    if (tbData.length > 0) {
      const firstDay = tbData[0];
      console.log("第一天数据：");
      console.log(`日期: ${firstDay.date}`);
      
      // 检查24小时数据完整性
      const hourColumns = [
        "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04",
        "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12",
        "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
      ];
      
      console.log("\n24小时数据：");
      const presentHours: string[] = [];
      const missingHours: string[] = [];
      
      hourColumns.forEach(hour => {
        if (firstDay[hour] !== undefined && firstDay[hour] !== null && firstDay[hour] !== 0) {
          presentHours.push(`${hour}: ${firstDay[hour]}`);
        } else {
          missingHours.push(hour);
        }
      });
      
      console.log(`存在的数据: ${presentHours.join(", ")}`);
      console.log(`缺失的数据: ${missingHours.length === 0 ? "无" : missingHours.join(", ")}`);
      console.log(`数据完整性: ${presentHours.length}/24 小时`);
    }
    
    // 2. 测试露点温度数据（IBLDataTable）
    console.log("\n==============================================");
    console.log("=== 2. 测试露点温度数据（IBLDataTable）===");
    console.log("==============================================");
    
    const iblStartLine = tbStartLine + tbTakeCount + 2;
    const iblTakeCount = parser["monthConfig"].takeIBL;
    
    console.log(`露点温度表配置：startLine=${iblStartLine}, takeCount=${iblTakeCount}`);
    console.log(`monthConfig.takeIBL=${parser["monthConfig"].takeIBL}`);
    
    // 查看露点温度表的原始数据
    console.log("\n露点温度表原始数据（前10行）：");
    for (let i = iblStartLine; i < iblStartLine + Math.min(10, iblTakeCount); i++) {
      if (i < lines.length) {
        console.log(`${i}: ${lines[i]}`);
      }
    }
    
    // 解析露点温度数据
    const iblData = parser["readDataSection"](lines, "ibldatatable", iblStartLine, iblTakeCount);
    console.log(`\n解析到 ${iblData.length} 天的露点温度数据`);
    
    if (iblData.length > 0) {
      const firstDay = iblData[0];
      console.log("第一天数据：");
      console.log(`日期: ${firstDay.date}`);
      
      // 检查24小时数据完整性
      const hourColumns = [
        "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04",
        "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12",
        "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
      ];
      
      console.log("\n24小时数据：");
      const presentHours: string[] = [];
      const missingHours: string[] = [];
      
      hourColumns.forEach(hour => {
        if (firstDay[hour] !== undefined && firstDay[hour] !== null && firstDay[hour] !== 0) {
          presentHours.push(`${hour}: ${firstDay[hour]}`);
        } else {
          missingHours.push(hour);
        }
      });
      
      console.log(`存在的数据: ${presentHours.join(", ")}`);
      console.log(`缺失的数据: ${missingHours.length === 0 ? "无" : missingHours.join(", ")}`);
      console.log(`数据完整性: ${presentHours.length}/24 小时`);
    }
    
    // 3. 测试逐小时降水量数据（R61DataTable）
    console.log("\n==============================================");
    console.log("=== 3. 测试逐小时降水量数据（R61DataTable）===");
    console.log("==============================================");
    
    // 根据C#代码，R61的起始行需要考虑是否有VB
    const takeUB = parser["monthConfig"].takeUB;
    const takeVB = parser["monthConfig"].takeVB;
    const r61StartLine = 2 + takePC + takeHPC + tbTakeCount + parser["monthConfig"].takeIBL + parser["monthConfig"].takeEA + takeUB + takeVB + 1;
    const r61TakeCount = parser["monthConfig"].takeR61;
    
    console.log(`逐小时降水量表配置：startLine=${r61StartLine}, takeCount=${r61TakeCount}`);
    console.log(`monthConfig.takeR61=${parser["monthConfig"].takeR61}`);
    
    // 查看逐小时降水量表的原始数据
    console.log("\n逐小时降水量表原始数据（前15行）：");
    for (let i = r61StartLine - 5; i < r61StartLine + 20; i++) {
      if (i >= 0 && i < lines.length) {
        console.log(`${i}: ${lines[i]}`);
      }
    }
    
    // 解析逐小时降水量数据
    const r61Data = parser["readDataSection"](lines, "r61datatable", r61StartLine, r61TakeCount);
    console.log(`\n解析到 ${r61Data.length} 天的逐小时降水量数据`);
    
    if (r61Data.length > 0) {
      const firstDay = r61Data[0];
      console.log("第一天数据：");
      console.log(`日期: ${firstDay.date}`);
      
      // 检查24小时数据完整性
      const hourColumns = [
        "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04",
        "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12",
        "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
      ];
      
      console.log("\n24小时数据：");
      const presentHours: string[] = [];
      const missingHours: string[] = [];
      
      hourColumns.forEach(hour => {
        if (firstDay[hour] !== undefined && firstDay[hour] !== null && firstDay[hour] !== 0) {
          presentHours.push(`${hour}: ${firstDay[hour]}`);
        } else {
          missingHours.push(hour);
        }
      });
      
      console.log(`存在的数据: ${presentHours.join(", ")}`);
      console.log(`缺失的数据: ${missingHours.length === 0 ? "无" : missingHours.join(", ")}`);
      console.log(`数据完整性: ${presentHours.length}/24 小时`);
      
      // 检查是否有特殊字段
      const specialFields = ["h2008", "h0820", "h2020", "htotal"];
      console.log("\n特殊字段：");
      specialFields.forEach(field => {
        console.log(`${field}: ${firstDay[field] !== undefined ? firstDay[field] : "未定义"}`);
      });
    }
    
    // 4. 检查monthConfig配置
    console.log("\n==============================================");
    console.log("=== 4. 检查monthConfig配置 ===");
    console.log("==============================================");
    console.log(parser["monthConfig"]);
    
    console.log("\n✅ 要素测试完成！");
    
  } catch (error) {
    console.error("❌ 测试失败：", error);
  }
}

// 执行测试
elementTest().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
