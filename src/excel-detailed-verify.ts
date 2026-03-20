import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function detailedVerify() {
  console.log('开始详细验证天气现象改进效果...');
  
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
    console.log(`\n基础字段：`);
    ['序号', '站点名称', '站号', '年月', '创建时间', '日期'].forEach(header => {
      if (headers[header]) {
        console.log(`   ${header}`);
      }
    });
    
    console.log(`\n天气现象统计字段：`);
    const weatherStats = Object.keys(headers).filter(header => 
      ['露', '雨', '结冰', '雾', '霾', '雪', '雷暴', '大风', '沙尘', '浮尘', '扬沙'].includes(header)
    );
    console.log(`   ${weatherStats.join(', ')}`);
    
    console.log(`\n天气现象描述字段：`);
    const descField = Object.keys(headers).find(header => header.includes('天气现象'));
    console.log(`   ${descField}`);
    
    // 检查数据
    console.log(`\n详细数据（前3天）：`);
    
    for (let rowNum = 2; rowNum <= Math.min(5, weatherSheet.rowCount); rowNum++) {
      const row = weatherSheet.getRow(rowNum);
      
      // 获取日期
      const dateValue = row.getCell(headers['日期']).value;
      const date = dateValue?.toString() || 'N/A';
      
      // 获取天气现象描述
      const weatherDescValue = row.getCell(headers[descField!]).value;
      const weatherDesc = weatherDescValue?.toString() || 'N/A';
      
      // 获取有统计数据的天气现象
      const activePhenomena: string[] = [];
      weatherStats.forEach(phenomenon => {
        const countValue = row.getCell(headers[phenomenon]).value;
        const count = typeof countValue === 'number' ? countValue : 0;
        if (count > 0) {
          activePhenomena.push(`${phenomenon}(${count})`);
        }
      });
      
      console.log(`\n第${rowNum-1}天:`);
      console.log(`   日期：${date}`);
      console.log(`   天气现象描述：${weatherDesc}`);
      console.log(`   天气现象统计：${activePhenomena.length > 0 ? activePhenomena.join(', ') : '无'}`);
    }
    
    console.log(`\n🎉 详细验证完成！`);
    
  } catch (error) {
    console.error('❌ 验证失败：', error);
  }
}

detailedVerify();
