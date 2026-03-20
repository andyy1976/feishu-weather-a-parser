import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function verifyWeatherPhenomenonImprovement() {
  console.log('开始验证天气现象改进效果...');
  
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
    
    console.log(`\n列头信息（前10列）：`);
    const allHeaders = Object.keys(headers);
    console.log(allHeaders.slice(0, 10).join(', '));
    console.log(`... 共 ${allHeaders.length} 列数据`);
    
    // 验证1：是否有小时列（如h00, h01等）
    const hourColumnPattern = /^(0[1-9]|1[0-9]|2[0-4])时$/;
    const hasHourColumns = Object.keys(headers).some(header => 
      hourColumnPattern.test(header)
    );
    
    // 验证2：是否有天气现象统计列
    const weatherPhenomenonColumns = ['露', '雨', '结冰', '雾', '霾', '雪', '雷暴', '大风', '沙尘', '浮尘'];
    const hasWeatherStats = weatherPhenomenonColumns.some(phenomenon => 
      Object.keys(headers).includes(phenomenon)
    );
    
    // 验证3：是否有天气现象列
    const hasWeatherDescColumn = Object.keys(headers).some(header => 
      header.includes('天气现象')
    );
    
    console.log(`\n验证结果：`);
    console.log(`1. 是否包含小时列：${hasHourColumns ? '❌ 是（不符合要求）' : '✅ 否（符合要求）'}`);
    console.log(`2. 是否包含天气现象统计列：${hasWeatherStats ? '✅ 是（符合要求）' : '❌ 否（不符合要求）'}`);
    console.log(`3. 是否包含天气现象描述列：${hasWeatherDescColumn ? '✅ 是（符合要求）' : '❌ 否（不符合要求）'}`);
    
    // 验证4：查看具体数据
    if (hasWeatherDescColumn && weatherSheet.rowCount > 1) {
      console.log(`\n天气现象数据样本（前5天）：`);
      
      const weatherColumnIndex = Object.keys(headers).findIndex(header => header.includes('天气现象')) + 1;
      
      for (let rowNum = 2; rowNum <= Math.min(7, weatherSheet.rowCount); rowNum++) {
        const row = weatherSheet.getRow(rowNum);
        const dateCell = row.getCell(headers['日期']);
        const weatherCell = row.getCell(weatherColumnIndex);
        
        const date = dateCell.value?.toString() || 'N/A';
        const weather = weatherCell.value?.toString() || 'N/A';
        
        console.log(`   日期：${date}，天气现象：${weather}`);
      }
      
      // 查看天气现象统计数据
      console.log(`\n天气现象统计样本（第1天）：`);
      const firstDataRow = weatherSheet.getRow(2);
      weatherPhenomenonColumns.forEach(phenomenon => {
        if (headers[phenomenon]) {
          const count = firstDataRow.getCell(headers[phenomenon]).value;
          if (count && count !== 0) {
            console.log(`   ${phenomenon}：${count}次`);
          }
        }
      });
    }
    
    console.log(`\n🎉 验证完成！`);
    return !hasHourColumns && hasWeatherStats && hasWeatherDescColumn;
    
  } catch (error) {
    console.error('❌ 验证失败：', error);
    return false;
  }
}

verifyWeatherPhenomenonImprovement().then(success => {
  if (success) {
    console.log('\n✅ 天气现象改进验证完全通过！');
    process.exit(0);
  } else {
    console.log('\n❌ 天气现象改进验证未完全通过！');
    process.exit(1);
  }
});
