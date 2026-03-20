import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function verifyWeatherPhenomenon() {
  console.log('开始验证天气现象改进效果...');
  
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
      return false;
    }
    
    console.log(`✅ 找到天气现象工作表，共 ${weatherSheet.rowCount} 行数据`);
    
    // 检查列头
    const headers: Record<string, number> = {};
    weatherSheet.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value) {
        headers[cell.value.toString()] = colNumber;
      }
    });
    
    console.log(`\n列头信息：`);
    console.log(Object.keys(headers));
    
    // 验证1：是否有小时列（如h00, h01等）
    const hasHourColumns = Object.keys(headers).some(header => 
      /^h\d{2}$/.test(header) || /^h\d{1}$/.test(header)
    );
    
    console.log(`\n验证结果：`);
    console.log(`1. 是否包含小时列：${hasHourColumns ? '❌ 是（不符合要求）' : '✅ 否（符合要求）'}`);
    
    // 验证2：是否有天气现象列
    const hasWeatherColumn = Object.keys(headers).some(header => 
      header.includes('天气现象')
    );
    
    console.log(`2. 是否包含天气现象列：${hasWeatherColumn ? '✅ 是（符合要求）' : '❌ 否（不符合要求）'}`);
    
    // 验证3：天气现象是否为中文描述（不是数字代码）
    if (hasWeatherColumn) {
      const weatherColumnIndex = Object.keys(headers).findIndex(header => header.includes('天气现象')) + 1;
      
      console.log(`\n天气现象样本（前5行）：`);
      
      let allValid = true;
      for (let rowNum = 2; rowNum <= Math.min(7, weatherSheet.rowCount); rowNum++) {
        const row = weatherSheet.getRow(rowNum);
        const dateCell = row.getCell(1);
        const weatherCell = row.getCell(weatherColumnIndex);
        
        const date = dateCell.value?.toString() || 'N/A';
        const weather = weatherCell.value?.toString() || 'N/A';
        
        console.log(`   日期：${date}，天气现象：${weather}`);
        
        // 检查是否为纯数字代码（如0005, 0002等）
        if (/^\d{4}$/.test(weather)) {
          allValid = false;
        }
      }
      
      console.log(`\n3. 天气现象是否为中文描述：${allValid ? '✅ 是（符合要求）' : '❌ 否（仍有数字代码）'}`);
    }
    
    console.log(`\n🎉 验证完成！`);
    return true;
    
  } catch (error) {
    console.error('❌ 验证失败：', error);
    return false;
  }
}

verifyWeatherPhenomenon().then(success => {
  if (success) {
    console.log('\n✅ 天气现象改进验证通过！');
    process.exit(0);
  } else {
    console.log('\n❌ 天气现象改进验证失败！');
    process.exit(1);
  }
});
