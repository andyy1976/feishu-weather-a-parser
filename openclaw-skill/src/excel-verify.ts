import * as dotenv from "dotenv";
import { resolve } from "path";
import * as XLSX from "xlsx";

// 加载环境配置
dotenv.config();

/**
 * 直接验证Excel文件内容
 */
async function verifyExcelContent() {
  const outputDir = process.env.OUTPUT_DIR ? resolve(process.env.OUTPUT_DIR) : "./output";
  const fileName = "58401_202501_解析结果.xlsx";
  const filePath = resolve(outputDir, fileName);

  try {
    console.log(`开始验证Excel文件：${filePath}`);
    
    // 读取Excel文件
    const workbook = XLSX.readFile(filePath);
    
    // 1. 检查气温数据
    console.log("\n==============================================");
    console.log("=== 1. 验证气温数据 ===");
    console.log("==============================================");
    
    const tempSheet = workbook.Sheets["气温"];
    if (tempSheet) {
      // 转换为JSON格式
      const tempData: any[][] = XLSX.utils.sheet_to_json(tempSheet, { header: 1 });
      
      console.log(`气温工作表行数：${tempData.length}`);
      console.log("列标题：");
      console.log(tempData[0]);
      
      // 检查前3天数据
      console.log("\n前3天数据：");
      for (let i = 1; i <= Math.min(3, tempData.length - 1); i++) {
        const row = tempData[i];
        console.log(`第${i}天：${row}`);
      }
      
      // 统计小时列数量
      const hourColumns = [];
      for (let col = 5; col < tempData[0].length; col++) {
        const header = tempData[0][col];
        if (typeof header === "string" && header.includes("时")) {
          hourColumns.push(header);
        }
      }
      
      console.log(`\n气温小时列数量：${hourColumns.length}`);
      console.log(`小时列：${hourColumns.join(", ")}`);
      
      // 检查数据完整性
      const firstDayData: any[] = tempData[1];
      console.log(`\n第一天数据：`);
      for (let col = 5; col < tempData[0].length; col++) {
        const header = tempData[0][col];
        const value = firstDayData[col];
        console.log(`${header}: ${value}`);
      }
    } else {
      console.log("❌ 未找到气温工作表");
    }

    // 2. 检查露点温度数据
    console.log("\n==============================================");
    console.log("=== 2. 验证露点温度数据 ===");
    console.log("==============================================");
    
    const dewSheet = workbook.Sheets["露点温度"];
    if (dewSheet) {
      // 转换为JSON格式
      const dewData: any[][] = XLSX.utils.sheet_to_json(dewSheet, { header: 1 });
      
      console.log(`露点温度工作表行数：${dewData.length}`);
      console.log("列标题：");
      console.log(dewData[0]);
      
      // 检查前3天数据
      console.log("\n前3天数据：");
      for (let i = 1; i <= Math.min(3, dewData.length - 1); i++) {
        const row = dewData[i];
        console.log(`第${i}天：${row}`);
      }
      
      // 统计小时列数量
      const hourColumns = [];
      for (let col = 5; col < dewData[0].length; col++) {
        const header = dewData[0][col];
        if (typeof header === "string" && header.includes("时")) {
          hourColumns.push(header);
        }
      }
      
      console.log(`\n露点温度小时列数量：${hourColumns.length}`);
      console.log(`小时列：${hourColumns.join(", ")}`);
      
      // 检查数据完整性
      const firstDayData: any[] = dewData[1];
      console.log(`\n第一天数据：`);
      for (let col = 5; col < dewData[0].length; col++) {
        const header = dewData[0][col];
        const value = firstDayData[col];
        console.log(`${header}: ${value}`);
      }
    } else {
      console.log("❌ 未找到露点温度工作表");
    }

    // 3. 检查逐小时降水量数据
    console.log("\n==============================================");
    console.log("=== 3. 验证逐小时降水量数据 ===");
    console.log("==============================================");
    
    const rainSheet = workbook.Sheets["逐小时降水量"];
    if (rainSheet) {
      // 转换为JSON格式
      const rainData: any[][] = XLSX.utils.sheet_to_json(rainSheet, { header: 1 });
      
      console.log(`逐小时降水量工作表行数：${rainData.length}`);
      console.log("列标题：");
      console.log(rainData[0]);
      
      // 检查前3天数据
      console.log("\n前3天数据：");
      for (let i = 1; i <= Math.min(3, rainData.length - 1); i++) {
        const row = rainData[i];
        console.log(`第${i}天：${row}`);
      }
      
      // 统计小时列数量
      const hourColumns = [];
      for (let col = 5; col < rainData[0].length; col++) {
        const header = rainData[0][col];
        if (typeof header === "string" && header.includes("时")) {
          hourColumns.push(header);
        }
      }
      
      console.log(`\n逐小时降水量小时列数量：${hourColumns.length}`);
      console.log(`小时列：${hourColumns.join(", ")}`);
      
      // 检查数据完整性
      const firstDayData: any[] = rainData[1];
      console.log(`\n第一天数据：`);
      for (let col = 5; col < rainData[0].length; col++) {
        const header = rainData[0][col];
        const value = firstDayData[col];
        console.log(`${header}: ${value}`);
      }
    } else {
      console.log("❌ 未找到逐小时降水量工作表");
    }

    console.log("\n✅ Excel验证完成！");
    
  } catch (error) {
    console.error("❌ 验证失败：", error);
  }
}

// 执行验证
verifyExcelContent().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
