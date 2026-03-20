import * as fs from 'fs';
import * as path from 'path';
import { AQFileParser } from './aq-file-parser';

// 创建一个简单的测试脚本，直接验证解析后的数据
async function debugWeatherData() {
  console.log('开始调试天气现象数据解析...');
  
  const testFilePath = 'D:/YiShaAdmin-master/YiShaAdmin-master/A文件最新测试2026.2.6/罗田观测站2025.01/A58401-202501.TXT';
  
  try {
    // 初始化解析器
    const parser = new AQFileParser({
      dbPath: path.resolve(__dirname, '../output/weather_data.db'),
      outputDir: path.resolve(__dirname, '../output'),
    });
    
    // 调用解析方法
    const result = await parser.parseFile(testFilePath);
    
    if (!result.success) {
      console.error('❌ 解析失败：', result.message);
      if (result.error) {
        console.error('错误详情：', result.error);
      }
      return;
    }
    
    console.log('✅ 解析完成！');
    console.log(`站点编号：${result.stationNum}`);
    console.log(`数据年月：${result.monthYear}`);
    console.log(result.message);
    
    // 检查内部数据结构（需要访问类的内部属性）
    // 这里我们直接检查Excel文件，因为解析器的内部数据不对外暴露
    
    // 关闭资源
    parser.close();
    
    // 直接检查生成的Excel文件
    console.log('\n=== 检查Excel文件内容 ===');
    const excelPath = path.resolve(__dirname, '../output/58401_202501_解析结果.xlsx');
    
    if (fs.existsSync(excelPath)) {
      console.log('✅ Excel文件已生成');
      // 执行Excel验证
      const { execSync } = require('child_process');
      try {
        console.log('\n=== Excel验证结果 ===');
        execSync('npx ts-node src/excel-weather-verification.ts', { stdio: 'inherit' });
      } catch (err) {
        console.error('❌ Excel验证失败：', err);
      }
    } else {
      console.error('❌ Excel文件未找到');
    }
    
  } catch (error) {
    console.error('❌ 调试失败：', error);
  }
}

debugWeatherData();
