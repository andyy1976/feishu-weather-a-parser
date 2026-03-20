import { WEATHER_CODE_MAP } from './config';

async function debugWeatherCodes() {
  console.log('开始调试天气代码映射...');
  
  // 打印WEATHER_CODE_MAP的内容
  console.log('WEATHER_CODE_MAP内容：');
  console.log(JSON.stringify(WEATHER_CODE_MAP, null, 2));
  
  // 测试一些常见的天气代码
  const testCodes = ['05', '10', '42', '50', '60'];
  
  console.log('\n测试天气代码映射：');
  for (const code of testCodes) {
    console.log(`   代码 ${code}: ${WEATHER_CODE_MAP[code] || '未映射'}`);
  }
  
  // 检查所有可能的2位数字代码
  console.log('\n所有2位数字代码映射情况：');
  for (let i = 0; i < 100; i++) {
    const code = i < 10 ? `0${i}` : `${i}`;
    if (WEATHER_CODE_MAP[code]) {
      console.log(`   ${code}: ${WEATHER_CODE_MAP[code]}`);
    }
  }
}

debugWeatherCodes().catch(err => {
  console.error('❌ 调试失败：', err);
  process.exit(1);
});
