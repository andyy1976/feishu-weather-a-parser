import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function verifyMonthlyWeatherStats() {
  console.log('开始验证天气现象月度统计功能...');
  
  // Excel文件路径
  const excelPath = path.resolve(__dirname, '../output/58401_202501_解析结果_测试.xlsx');
  
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
    
    console.log('✅ 找到天气现象工作表');
    
    // 查找月度统计部分（从工作表底部开始查找）
    let statsStartRow = -1;
    let statsHeadersRow = -1;
    
    // 从底部开始查找"月度统计"标题
    for (let i = weatherSheet.rowCount; i >= 1; i--) {
      const row = weatherSheet.getRow(i);
      if (row.getCell(1).value === '月度统计') {
        statsStartRow = i;
        statsHeadersRow = i + 1;
        break;
      }
    }
    
    if (statsStartRow === -1) {
      console.error('❌ 未找到月度统计部分！');
      return;
    }
    
    console.log('✅ 找到月度统计部分，起始行：', statsStartRow);
    
    // 检查统计数据
    if (statsHeadersRow < weatherSheet.rowCount) {
      console.log(`\n月度统计数据（出现次数>0的天气现象）：`);
      
      // 遍历统计数据行
      for (let rowNum = statsHeadersRow + 1; rowNum <= weatherSheet.rowCount; rowNum++) {
        const row = weatherSheet.getRow(rowNum);
        const phenomenonCell = row.getCell(1);
        const countCell = row.getCell(2);
        
        const phenomenon = phenomenonCell.value?.toString() || 'N/A';
        const count = countCell.value;
        
        if (phenomenon !== 'N/A' && count) {
          console.log(`   ${phenomenon}: ${count}次`);
        }
      }
      
      console.log(`\n🎉 月度统计验证完成！`);
    } else {
      console.error('❌ 月度统计部分中没有数据！');
    }
    
  } catch (error) {
    console.error('❌ 验证失败：', error);
  }
}

verifyMonthlyWeatherStats();
