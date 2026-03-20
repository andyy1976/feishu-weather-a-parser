import * as fs from 'fs/promises';
import { WEATHER_CODE_MAP } from './config';

async function fullDebug() {
  console.log('开始完整调试W0数据解析...');
  
  // 读取测试文件
  const filePath = 'D:/YiShaAdmin-master/YiShaAdmin-master/A文件最新测试2026.2.6/罗田观测站2025.01/A58401-202501.TXT';
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const lines = fileContent.split('\r\n');
  
  // 查找W0数据段的起始行
  let w0StartLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('W0')) {
      w0StartLine = i;
      break;
    }
  }
  
  if (w0StartLine === -1) {
    console.error('❌ 未找到W0数据段');
    return;
  }
  
  console.log(`✅ 找到W0数据段，起始行：${w0StartLine}`);
  
  // 定义天气现象代码对应的统计列名
  const weatherColumnMap: Record<string, string> = {
    '01': 'tianqi01', // 露
    '02': 'tianqi02', // 雨
    '03': 'tianqi03', // 结冰
    '05': 'tianqi05', // 霾
    '06': 'tianqi06', // 浮沉
    '07': 'tianqi07', // 扬沙
    '10': 'tianqi10', // 轻雾
    '15': 'tianqi15', // 大风
    '16': 'tianqi16', // 积雪
    '31': 'tianqi31', // 沙尘暴
    '42': 'tianqi42', // 雾
    '48': 'tianqi48', // 雾凇
    '50': 'tianqi50', // 毛毛雨
    '56': 'tianqi56', // 雨凇
    '60': 'tianqi60', // 雨
    '68': 'tianqi68', // 雨夹雪
    '70': 'tianqi70', // 雪
    '80': 'tianqi80', // 阵雨
    '83': 'tianqi83', // 阵性雨夹雪
    '85': 'tianqi85', // 阵雪
    '89': 'tianqi89', // 冰雹
  };
  
  // 解析前3天的W0数据
  for (let day = 1; day <= 3; day++) {
    const lineIndex = w0StartLine + day;
    if (lineIndex >= lines.length) break;
    
    const line = lines[lineIndex].trim();
    if (!line) continue;
    
    console.log(`\n=== 第${day}天 W0数据解析 ===`);
    console.log(`原始行: "${line}"`);
    
    // 初始化天气现象统计
    const row: Record<string, any> = {};
    for (const code in weatherColumnMap) {
      row[weatherColumnMap[code]] = 0;
    }
    
    // 处理天气现象数据（完整的解析过程）
    let tempStr = line.trim();
    console.log(`1. 初始处理: "${tempStr}"`);
    
    if (tempStr.length > 1) {
      // 清理字符串格式
      if (tempStr.endsWith('.')) {
        tempStr = tempStr.substring(0, tempStr.length - 1);
        console.log(`2. 移除末尾.: "${tempStr}"`);
      }
      
      tempStr = tempStr.split(')')[0];
      console.log(`3. 移除)后: "${tempStr}"`);
      
      tempStr = tempStr.replace(';', ',');
      console.log(`4. 替换;为,: "${tempStr}"`);
      
      if (tempStr.startsWith('(')) {
        tempStr = tempStr.substring(1);
        console.log(`5. 移除前(: "${tempStr}"`);
      }
      
      tempStr = tempStr.trim();
      console.log(`6. 最终清理: "${tempStr}"`);
      
      // 分割并处理每个天气代码
      const codes = tempStr.split(',');
      console.log(`7. 分割代码: ${JSON.stringify(codes)}`);
      
      for (const code of codes) {
        const trimmedCode = code.trim();
        if (!trimmedCode) {
          console.log(`8. 跳过空代码: "${code}"`);
          continue;
        }
        
        console.log(`8. 处理代码: "${trimmedCode}"`);
        
        // 提取天气代码（取前两位数字）
        const weatherCode = trimmedCode.match(/^\d+/)?.[0] || '';
        console.log(`9. 提取数字部分: "${weatherCode}"`);
        
        if (weatherCode.length >= 2) {
          const firstTwo = weatherCode.substring(0, 2);
          console.log(`10. 前两位代码: "${firstTwo}"`);
          
          // 检查是否在WEATHER_CODE_MAP中
          const description = WEATHER_CODE_MAP[firstTwo] || '未映射';
          console.log(`11. 中文描述: "${description}"`);
          
          // 统计天气现象出现次数
          if (weatherColumnMap[firstTwo]) {
            const colName = weatherColumnMap[firstTwo];
            row[colName] = (row[colName] || 0) + 1;
            console.log(`12. 统计列: ${colName} = ${row[colName]}`);
          }
        } else {
          console.log(`10. 代码长度不足2位，跳过`);
        }
      }
      
      // 生成天气现象描述
      const weatherDescriptions: string[] = [];
      for (const code in weatherColumnMap) {
        if (row[weatherColumnMap[code]] > 0) {
          weatherDescriptions.push(WEATHER_CODE_MAP[code]);
        }
      }
      
      const finalDescription = weatherDescriptions.length > 0 ? weatherDescriptions.join('、') : '无';
      row.tianqixianxiang = finalDescription;
      
      console.log(`13. 最终天气现象描述: "${finalDescription}"`);
      console.log(`14. 统计结果: ${JSON.stringify(row)}`);
    }
  }
}

fullDebug().catch(err => {
  console.error('❌ 调试失败：', err);
  process.exit(1);
});
