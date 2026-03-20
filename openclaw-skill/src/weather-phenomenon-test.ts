import * as fs from 'fs/promises';
import * as path from 'path';
import { AQFileParser } from './aq-file-parser';

async function testWeatherPhenomenon() {
  console.log('开始测试天气现象解析...');
  
  // 创建解析器实例
  const parser = new AQFileParser();
  
  // 读取测试文件
  const filePath = 'D:/YiShaAdmin-master/YiShaAdmin-master/A文件最新测试2026.2.6/罗田观测站2025.01/A58401-202501.TXT';
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const lines = fileContent.split('\r\n');
  
  // 设置基本属性
  parser['stationNum'] = '58401';
  parser['monthYear'] = '202501';
  parser['monthConfig'] = parser['getMonthConfig']('01', '2025');
  
  // 查找W0数据段的起始行
  const startLines = parser['calculateAFileStartLines'](lines);
  
  // 测试天气现象解析
  console.log(`\n天气现象数据段配置：`);
  console.log(`startLine: ${startLines.W0}`);
  console.log(`takeCount: ${parser['monthConfig'].takeW0}`);
  
  // 调用readDataSection方法解析天气现象数据
  const weatherData = parser['readDataSection'](lines, 'w0datatable', startLines.W0, parser['monthConfig'].takeW0);
  
  console.log(`\n解析结果（前5天）：`);
  for (let i = 0; i < Math.min(5, weatherData.length); i++) {
    const dayData = weatherData[i];
    console.log(`日期：${dayData.date}，天气现象：${dayData.tianqixianxiang}`);
  }
  
  // 特别测试第6天（根据原始数据，这一天有天气现象）
  if (weatherData.length >= 6) {
    const sixthDay = weatherData[5];
    console.log(`\n第6天数据：`);
    console.log(`日期：${sixthDay.date}，天气现象：${sixthDay.tianqixianxiang}`);
  }
  
  // 验证没有小时输出
  if (weatherData.length > 0) {
    const firstDay = weatherData[0];
    const keys = Object.keys(firstDay);
    const hasHourColumns = keys.some(key => key.startsWith('h'));
    
    console.log(`\n验证结果：`);
    console.log(`- 是否包含小时列：${hasHourColumns ? '是' : '否'}`);
    console.log(`- 天气现象是否为中文描述：${typeof firstDay.tianqixianxiang === 'string' && firstDay.tianqixianxiang.length > 0 ? '是' : '否'}`);
  }
  
  console.log(`\n✅ 天气现象测试完成！`);
}

testWeatherPhenomenon().catch(err => {
  console.error('❌ 测试失败：', err);
  process.exit(1);
});
