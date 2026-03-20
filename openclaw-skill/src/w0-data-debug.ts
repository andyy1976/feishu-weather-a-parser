import * as fs from 'fs/promises';

async function debugW0Data() {
  console.log('开始调试W0数据解析...');
  
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
  
  // 读取前几天的W0数据
  console.log(`\n原始W0数据（前5天）：`);
  for (let i = w0StartLine + 1; i <= w0StartLine + 6; i++) {
    if (i >= lines.length) break;
    
    const line = lines[i].trim();
    if (!line) continue;
    
    console.log(`\n第${i - w0StartLine}天原始数据：`);
    console.log(`   ${line}`);
    
    // 分割并解析
    const columns = line.split(/\s+/).filter(c => c !== '');
    console.log(`   分割后字段数：${columns.length}`);
    console.log(`   前6个字段（基础信息）：`);
    for (let j = 0; j < Math.min(6, columns.length); j++) {
      console.log(`     字段${j+1}：${columns[j]}`);
    }
    
    // 天气现象部分
    if (columns.length > 6) {
      const weatherPart = columns.slice(6);
      console.log(`   天气现象部分（${weatherPart.length}个字段）：`);
      console.log(`     ${weatherPart.join(' ')}`);
      
      // 应用清理逻辑
      let tempStr = weatherPart.join(' ');
      console.log(`   原始天气字符串：${tempStr}`);
      
      tempStr = tempStr.trim();
      console.log(`   清理后：${tempStr}`);
      
      if (tempStr.endsWith('.')) tempStr = tempStr.substring(0, tempStr.length - 1);
      console.log(`   移除末尾.后：${tempStr}`);
      
      tempStr = tempStr.split(')')[0].replace(';', ',');
      console.log(`   移除)和替换;后：${tempStr}`);
      
      if (tempStr.startsWith('(')) tempStr = tempStr.substring(1);
      console.log(`   移除开头(后：${tempStr}`);
      
      tempStr = tempStr.trim();
      console.log(`   最终处理结果：${tempStr}`);
      
      // 分割并解析每个天气代码
      const codes = tempStr.split(',');
      console.log(`   分割后代码：${codes}`);
      
      for (const code of codes) {
        const trimmedCode = code.trim();
        if (!trimmedCode) continue;
        
        console.log(`   处理代码：${trimmedCode}`);
        const weatherCode = trimmedCode.match(/^\d+/)?.[0] || '';
        console.log(`   提取数字部分：${weatherCode}`);
        
        if (weatherCode.length >= 2) {
          const firstTwo = weatherCode.substring(0, 2);
          console.log(`   前两位代码：${firstTwo}`);
        }
      }
    }
  }
}

debugW0Data().catch(err => {
  console.error('❌ 调试失败：', err);
  process.exit(1);
});
