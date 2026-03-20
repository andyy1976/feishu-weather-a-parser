import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function verifyWeatherPhenomenon() {
  console.log('开始验证天气现象改进最终效果...');
  
  // Excel文件路径
  const excelPath = path.resolve(__dirname, '../output/58401_202501_解析结果.xlsx');
  
  try {
    // 读取Excel文件
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    
    // 找到天气现象工作表
    const weatherSheet = workbook.getWorksheet('天气现象');
    if (!weatherSheet) {
      console.error('❌ 未找到天气现象工作表！');
      return;
    }
    
    console.log(`✅ 找到天气现象工作表，共 ${weatherSheet.rowCount} 行数据`);
    
    // 检查列头
    const headers: Record<string, number> = {};
    weatherSheet.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value) {
        headers[cell.value.toString()] = colNumber;
      }
    });
    
    console.log(`\n列头总数：${Object.keys(headers).length}`);
    
    // 显示所有列头
    console.log('\n所有列头：');
    Object.keys(headers).forEach((header, index) => {
      console.log(`   ${index + 1}. ${header}`);
    });
    
    // 验证1：是否有小时列（如h00, h01等）
    const hasHourColumns = Object.keys(headers).some(header => 
      /^(0[1-9]|1[0-9]|2[0-4])时$/.test(header)
    );
    
    console.log(`\n验证结果：`);
    console.log(`1. 是否包含小时列：${hasHourColumns ? '❌ 是（不符合要求）' : '✅ 否（符合要求）'}`);
    
    // 查看实际数据
    if (weatherSheet.rowCount > 1) {
      console.log(`\n详细数据（前5天）：`);
      
      for (let rowNum = 2; rowNum <= Math.min(7, weatherSheet.rowCount); rowNum++) {
        const row = weatherSheet.getRow(rowNum);
        const dateCell = row.getCell(headers['日期']);
        const date = dateCell.value?.toString() || 'N/A';
        
        // 获取天气现象描述
        const weatherDescField = Object.keys(headers).find(header => header.includes('天气现象'));
        const weatherDesc = row.getCell(headers[weatherDescField!]).value?.toString() || 'N/A';
        
        console.log(`\n   日期：${date}`);
        console.log(`   天气现象描述：${weatherDesc}`);
        
        // 检查所有可能的天气现象统计列
        console.log(`   天气现象统计：`);
        
        // 获取所有天气现象统计字段（通过列名判断）
        const weatherStatFields = Object.keys(headers).filter(header => 
          ['露', '雨', '结冰', '雾', '霾', '浮沉', '扬沙', '轻雾', '大风', '积雪'].includes(header)
        );
        
        let hasStats = false;
        for (const field of weatherStatFields) {
          const cell = row.getCell(headers[field]);
          const value = cell.value;
          if (value && value !== 0) {
            console.log(`      ${field}: ${value}`);
            hasStats = true;
          }
        }
        
        if (!hasStats) {
          console.log(`      无统计数据`);
        }
      }
    }
    
    console.log(`\n🎉 验证完成！`);
    
  } catch (error) {
    console.error('❌ 验证失败：', error);
  }
}

verifyWeatherPhenomenon();
