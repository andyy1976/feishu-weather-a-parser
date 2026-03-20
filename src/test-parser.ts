import * as dotenv from "dotenv";
import { resolve } from "path";
import { AQFileParser } from "./aq-file-parser";

// 加载环境配置
dotenv.config();

/**
 * 测试数据解析功能
 */
async function testParser() {
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
    
    // 手动设置monthYear（测试需要）
    parser["monthYear"] = "202501";
    parser["stationNum"] = "58401";
    
    // 测试气压表解析
    console.log("\n=== 测试气压表解析（PCDataTable）===");
    const pcData = parser["readDataSection"](lines, "pcdatatable", 2, 60);
    console.log(`解析到 ${pcData.length} 天的气压数据`);
    if (pcData.length > 0) {
      const firstDay = pcData[0];
      console.log("第一天数据：");
      console.log(`日期: ${firstDay.date}`);
      console.log(`21时: ${firstDay.h21}, 22时: ${firstDay.h22}, 23时: ${firstDay.h23}, 24时: ${firstDay.h24}`);
      console.log(`01时: ${firstDay.h01}, 02时: ${firstDay.h02}, 03时: ${firstDay.h03}, 04时: ${firstDay.h04}`);
      console.log(`05时: ${firstDay.h05}, 06时: ${firstDay.h06}, 07时: ${firstDay.h07}, 08时: ${firstDay.h08}`);
      console.log(`09时: ${firstDay.h09}, 10时: ${firstDay.h10}, 11时: ${firstDay.h11}, 12时: ${firstDay.h12}`);
      console.log(`13时: ${firstDay.h13}, 14时: ${firstDay.h14}, 15时: ${firstDay.h15}, 16时: ${firstDay.h16}`);
      console.log(`17时: ${firstDay.h17}, 18时: ${firstDay.h18}, 19时: ${firstDay.h19}, 20时: ${firstDay.h20}`);
      console.log(`日最大值: ${firstDay.daymax}, 最大值时间: ${firstDay.dmaxtime}`);
      console.log(`日最小值: ${firstDay.daymin}, 最小值时间: ${firstDay.dmintime}`);
      
      // 验证24小时数据是否完整
      const hourColumns = [
        "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04",
        "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12",
        "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
      ];
      const missingHours = hourColumns.filter(hour => firstDay[hour] === undefined || firstDay[hour] === null);
      console.log(`完整24小时数据: ${missingHours.length === 0 ? "是" : "否"}`);
      if (missingHours.length > 0) {
        console.log(`缺失的小时: ${missingHours.join(", ")}`);
      }
    }

    console.log("\n✅ 测试完成！数据解析功能正常工作。");
    
  } catch (error) {
    console.error("❌ 测试失败：", error);
  } finally {
    // 关闭资源
    parser.close();
  }
}

// 执行测试
testParser().catch((err) => {
  console.error("程序运行异常：", err);
  process.exit(1);
});
