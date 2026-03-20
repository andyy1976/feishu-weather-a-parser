import * as dotenv from "dotenv";
import { resolve } from "path";
import { AQFileParser } from "./aq-file-parser";
import * as fs from "fs";

// 加载环境配置
dotenv.config();

/**
 * 数据完整性测试：检查数据在获取、保存和导出过程中的完整性
 */
async function dataIntegrityTest() {
  // 从环境变量获取配置
  const filePath = resolve(process.env.FILE_PATH || "");
  const dbPath = resolve("./test-db.db");
  const outputDir = resolve("./test-output");

  try {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 初始化解析器
    const parser = new AQFileParser({
      dbPath,
      outputDir,
    });

    // 1. 读取文件并解析数据
    console.log("\n==============================================");
    console.log("=== 1. 读取文件并解析数据 ===");
    console.log("==============================================");

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    
    // 手动设置monthYear和stationNum（测试需要）
    parser["stationNum"] = "58401";
    parser["monthYear"] = "202501";
    parser["monthConfig"] = parser["getMonthConfig"]("01", "2025");

    // 2. 测试气温数据(TBDataTable)
    console.log("\n==============================================");
    console.log("=== 2. 测试气温数据(TBDataTable) ===");
    console.log("==============================================");
    
    const tbStartLine = 2 + parser["monthConfig"].takePC + parser["monthConfig"].takeHPC + 1;
    const tbTakeCount = parser["monthConfig"].takeTB;
    
    console.log(`TBDataTable配置：startLine=${tbStartLine}, takeCount=${tbTakeCount}`);
    
    const tbData = parser["readDataSection"](lines, "tbdatatable", tbStartLine, tbTakeCount);
    console.log(`解析到 ${tbData.length} 天的气温数据`);
    
    if (tbData.length > 0) {
      const firstDay = tbData[0];
      console.log("\n第一天数据结构：");
      console.log(`日期: ${firstDay.date}`);
      console.log(`字段数量: ${Object.keys(firstDay).length}`);
      
      // 检查24小时数据完整性
      check24HourData(firstDay, "气温");
      
      // 查看具体数据
      console.log("\n具体数据：");
      for (let hour = 21; hour <= 24; hour++) {
        console.log(`h${hour}: ${firstDay[`h${hour}`]}`);
      }
      for (let hour = 1; hour <= 20; hour++) {
        const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
        console.log(`h${hourStr}: ${firstDay[`h${hourStr}`]}`);
      }
    }

    // 3. 测试露点温度数据(IBLDataTable)
    console.log("\n==============================================");
    console.log("=== 3. 测试露点温度数据(IBLDataTable) ===");
    console.log("==============================================");
    
    const iblStartLine = tbStartLine + tbTakeCount + 2;
    const iblTakeCount = parser["monthConfig"].takeIBL;
    
    console.log(`IBLDataTable配置：startLine=${iblStartLine}, takeCount=${iblTakeCount}`);
    
    const iblData = parser["readDataSection"](lines, "ibldatatable", iblStartLine, iblTakeCount);
    console.log(`解析到 ${iblData.length} 天的露点温度数据`);
    
    if (iblData.length > 0) {
      const firstDay = iblData[0];
      console.log("\n第一天数据结构：");
      console.log(`日期: ${firstDay.date}`);
      console.log(`字段数量: ${Object.keys(firstDay).length}`);
      
      // 检查24小时数据完整性
      check24HourData(firstDay, "露点温度");
      
      // 查看具体数据
      console.log("\n具体数据：");
      for (let hour = 21; hour <= 24; hour++) {
        console.log(`h${hour}: ${firstDay[`h${hour}`]}`);
      }
      for (let hour = 1; hour <= 20; hour++) {
        const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
        console.log(`h${hourStr}: ${firstDay[`h${hourStr}`]}`);
      }
    }

    // 4. 测试逐小时降水量数据(R61DataTable)
    console.log("\n==============================================");
    console.log("=== 4. 测试逐小时降水量数据(R61DataTable) ===");
    console.log("==============================================");
    
    // 根据C#代码，R61的起始行需要考虑是否有VB
    const takeUB = parser["monthConfig"].takeUB;
    const takeVB = parser["monthConfig"].takeVB;
    const r61StartLine = 2 + parser["monthConfig"].takePC + parser["monthConfig"].takeHPC + 
                        parser["monthConfig"].takeTB + parser["monthConfig"].takeIBL + 
                        parser["monthConfig"].takeEA + takeUB + takeVB + 1;
    const r61TakeCount = parser["monthConfig"].takeR61;
    
    console.log(`R61DataTable配置：startLine=${r61StartLine}, takeCount=${r61TakeCount}`);
    
    const r61Data = parser["readDataSection"](lines, "r61datatable", r61StartLine, r61TakeCount);
    console.log(`解析到 ${r61Data.length} 天的逐小时降水量数据`);
    
    if (r61Data.length > 0) {
      const firstDay = r61Data[0];
      console.log("\n第一天数据结构：");
      console.log(`日期: ${firstDay.date}`);
      console.log(`字段数量: ${Object.keys(firstDay).length}`);
      
      // 检查24小时数据完整性
      check24HourData(firstDay, "逐小时降水量");
      
      // 查看具体数据
      console.log("\n具体数据：");
      for (let hour = 21; hour <= 24; hour++) {
        console.log(`h${hour}: ${firstDay[`h${hour}`]}`);
      }
      for (let hour = 1; hour <= 20; hour++) {
        const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
        console.log(`h${hourStr}: ${firstDay[`h${hourStr}`]}`);
      }
      
      // 查看统计值
      console.log("\n统计值：");
      console.log(`日合计(htotal): ${firstDay.htotal}`);
      console.log(`≥0.1mm天数(h01days): ${firstDay.h01days}`);
      console.log(`≥50mm天数(h50days): ${firstDay.h50days}`);
    }

    // 5. 测试Excel导出
    console.log("\n==============================================");
    console.log("=== 5. 测试Excel导出 ===");
    console.log("==============================================");
    
    // 创建模拟数据
    const mockData = {
      tbdatatable: tbData.slice(0, 5), // 只取前5天数据
      ibldatatable: iblData.slice(0, 5),
      r61datatable: r61Data.slice(0, 5)
    };
    
    const mockHeader = {
      stationNum: "58401",
      monthYear: "202501",
      longitude: "115.45",
      latitude: "30.43",
      year: "2025",
      month: "01"
    };
    
    // 导出到Excel
    const excelPath = await parser["exportToExcel"](mockHeader, mockData);
    console.log(`Excel导出成功：${excelPath}`);
    
    // 6. 清理测试文件
    console.log("\n==============================================");
    console.log("=== 6. 清理测试文件 ===");
    console.log("==============================================");
    
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log(`删除测试数据库：${dbPath}`);
    }
    
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
      console.log(`删除测试输出目录：${outputDir}`);
    }
    
    console.log("\n✅ 数据完整性测试完成！");
    
  } catch (error) {
    console.error("❌ 测试失败：", error);
  }
}

/**
 * 检查24小时数据完整性
 */
function check24HourData(data: Record<string, any>, elementName: string) {
  const hourColumns = [
    "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04",
    "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12",
    "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
  ];
  
  const presentHours: string[] = [];
  const missingHours: string[] = [];
  const zeroHours: string[] = [];
  
  hourColumns.forEach(hour => {
    if (data[hour] !== undefined && data[hour] !== null) {
      if (data[hour] === 0) {
        zeroHours.push(hour);
      } else {
        presentHours.push(hour);
      }
    } else {
      missingHours.push(hour);
    }
  });
  
  console.log(`\n${elementName}24小时数据完整性：`);
  console.log(`  有效数据小时数: ${presentHours.length}/24`);
  console.log(`  零值数据小时数: ${zeroHours.length}/24`);
  console.log(`  缺失数据小时数: ${missingHours.length}/24`);
  
  if (missingHours.length > 0) {
    console.log(`  缺失的小时: ${missingHours.join(", ")}`);
  }
}

// 执行测试
dataIntegrityTest().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
