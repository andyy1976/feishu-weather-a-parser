import * as dotenv from "dotenv";
import { resolve } from "path";
import { AQFileParser } from "./aq-file-parser";

// 加载环境配置
dotenv.config();

/**
 * 针对性测试脚本：验证气温、露点温度和逐小时降水量数据的完整性
 */
async function targetedTest() {
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
    
    // 获取正确的月份配置
    parser["monthConfig"] = parser["getMonthConfig"]("01", "2025");
    console.log("月份配置:", parser["monthConfig"]);
    
    // 1. 测试气温数据（TBDataTable）
    console.log("\n=== 测试气温数据（TBDataTable）===");
    // 气压表之后是海气压表，然后是气温表
    // 根据C#代码，PC是takePC行，HPC是takeHPC行，所以TB的起始行是 PC + takePC + takeHPC
    const takePC = parser["monthConfig"].takePC;
    const takeHPC = parser["monthConfig"].takeHPC;
    const tbStartLine = 2 + takePC + takeHPC + 1; // +1是分隔行
    const tbTakeCount = parser["monthConfig"].takeTB;
    
    try {
      const tbData = parser["readDataSection"](lines, "tbdatatable", tbStartLine, tbTakeCount);
      console.log(`解析到 ${tbData.length} 天的气温数据`);
      
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
        
        const missingHours = hourColumns.filter(hour => firstDay[hour] === undefined || firstDay[hour] === null);
        console.log(`完整24小时数据: ${missingHours.length === 0 ? "是" : "否"}`);
        
        if (missingHours.length > 0) {
          console.log(`缺失的小时: ${missingHours.join(", ")}`);
        } else {
          // 显示部分数据示例
          console.log(`21时: ${firstDay.h21}, 22时: ${firstDay.h22}, 23时: ${firstDay.h23}, 24时: ${firstDay.h24}`);
          console.log(`01时: ${firstDay.h01}, 02时: ${firstDay.h02}, 03时: ${firstDay.h03}, 04时: ${firstDay.h04}`);
          console.log(`09时: ${firstDay.h09}, 10时: ${firstDay.h10}, 11时: ${firstDay.h11}, 12时: ${firstDay.h12}`);
          console.log(`19时: ${firstDay.h19}, 20时: ${firstDay.h20}`);
        }
      }
    } catch (error) {
      console.error("气温数据测试失败:", error);
    }

    // 2. 测试露点温度数据（IBLDataTable）
    console.log("\n=== 测试露点温度数据（IBLDataTable）===");
    const iblStartLine = tbStartLine + tbTakeCount + 2; // +2是分隔行
    const iblTakeCount = parser["monthConfig"].takeIBL;
    
    try {
      const iblData = parser["readDataSection"](lines, "ibldatatable", iblStartLine, iblTakeCount);
      console.log(`解析到 ${iblData.length} 天的露点温度数据`);
      
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
        
        const missingHours = hourColumns.filter(hour => firstDay[hour] === undefined || firstDay[hour] === null);
        console.log(`完整24小时数据: ${missingHours.length === 0 ? "是" : "否"}`);
        
        if (missingHours.length > 0) {
          console.log(`缺失的小时: ${missingHours.join(", ")}`);
        } else {
          // 显示部分数据示例
          console.log(`09时: ${firstDay.h09}, 21时: ${firstDay.h21}`);
        }
      }
    } catch (error) {
      console.error("露点温度数据测试失败:", error);
    }

    // 3. 测试逐小时降水量数据（R61DataTable）
    console.log("\n=== 测试逐小时降水量数据（R61DataTable）===");
    // 根据C#代码，R61在VB之后，VB在UB之后
    const takeUB = parser["monthConfig"].takeUB;
    const takeVB = parser["monthConfig"].takeVB;
    const takeEA = parser["monthConfig"].takeEA;
    const r61StartLine = 2 + takePC + takeHPC + tbTakeCount + iblTakeCount + takeEA + takeUB + takeVB + 1; // 精确计算起始行
    const r61TakeCount = parser["monthConfig"].takeR61;
    
    try {
      // 先查看R61DataTable周围的行，了解数据格式
      console.log("R61DataTable周围的行：");
      for (let i = r61StartLine - 5; i < r61StartLine + 10; i++) {
        if (i >= 0 && i < lines.length) {
          console.log(`${i}: ${lines[i]}`);
        }
      }
      
      const r61Data = parser["readDataSection"](lines, "r61datatable", r61StartLine, r61TakeCount);
      console.log(`解析到 ${r61Data.length} 天的逐小时降水量数据`);
      
      if (r61Data.length > 0) {
        const firstDay = r61Data[0];
        console.log("第一天数据：");
        console.log(`日期: ${firstDay.date}`);
        console.log(`当前处理方式: 特殊表处理（h2008: ${firstDay.h2008}, h0820: ${firstDay.h0820}, h2020: ${firstDay.h2020}`);
      }
    } catch (error) {
      console.error("逐小时降水量数据测试失败:", error);
    }

    console.log("\n✅ 针对性测试完成！");
    
  } catch (error) {
    console.error("❌ 测试失败：", error);
  } finally {
    // 关闭资源
    parser.close();
  }
}

// 执行测试
targetedTest().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
