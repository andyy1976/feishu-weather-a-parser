/**
 * 气象A/Q文件解析器 - OpenClaw技能主入口
 * 适配Node.js环境，支持直接运行TypeScript代码
 */

const path = require('path');
const fs = require('fs/promises');
const { existsSync } = require('fs');

// 检查是否存在编译后的代码
const compiledPath = path.resolve(__dirname, 'dist');

if (existsSync(compiledPath)) {
  // 如果有编译后的代码，优先使用编译后的代码
  console.log('使用编译后的代码...');
  var AQFileParser = require(path.join(compiledPath, 'aq-file-parser')).AQFileParser;
} else {
  // 否则直接运行TypeScript代码
  console.log('使用TypeScript代码（需要ts-node）...');
  require('ts-node/register');
  var AQFileParser = require('./src/aq-file-parser').AQFileParser;
}

/**
 * OpenClaw技能主函数
 * @param {Object} params 技能参数
 * @param {string} params.filePath 气象A/Q文件的绝对路径
 * @param {string} [params.dbPath] SQLite数据库路径
 * @param {string} [params.outputDir] 导出文件的输出目录
 * @returns {Promise<Object>} 解析结果
 */
async function weatherAqParser(params) {
  // 验证必填参数
  if (!params || !params.filePath) {
    throw new Error('参数错误：filePath是必填项');
  }

  const { filePath, dbPath, outputDir } = params;

  // 验证文件是否存在
  if (!existsSync(filePath)) {
    throw new Error(`文件不存在：${filePath}`);
  }

  // 初始化解析器
  const parser = new AQFileParser({
    dbPath: dbPath ? path.resolve(dbPath) : undefined,
    outputDir: outputDir ? path.resolve(outputDir) : undefined,
  });

  try {
    // 执行解析
    console.log(`开始解析文件：${filePath}`);
    const result = await parser.parseFile(filePath);

    // 输出结果
    if (result.success) {
      console.log('✅ 解析成功！');
      console.log(`站点编号：${result.stationNum}`);
      console.log(`数据年月：${result.monthYear}`);
      console.log(result.message);
    } else {
      console.error('❌ 解析失败：', result.message);
      if (result.error) {
        console.error('错误详情：', result.error);
      }
    }

    return result;
  } catch (error) {
    console.error('❌ 技能执行异常：', error);
    throw error;
  } finally {
    // 关闭资源
    parser.close();
  }
}

/**
 * OpenClaw技能入口点
 * 该函数会被OpenClaw内核调用
 */
async function main(params) {
  try {
    return await weatherAqParser(params);
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error: error.stack
    };
  }
}

// 导出技能函数
module.exports = {
  main,
  weatherAqParser
};

// 本地测试入口
if (require.main === module) {
  console.log('=== 开始测试气象A/Q文件解析器 ===');
  
  // 从命令行参数获取文件路径
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('用法：node main.js <file_path>');
    process.exit(1);
  }

  console.log(`测试文件路径：${filePath}`);
  console.log(`文件存在：${existsSync(filePath)}`);

  // 执行本地测试
  main({
    filePath: path.resolve(filePath)
  }).catch(error => {
    console.error('测试失败：', error);
    console.error('错误堆栈：', error.stack);
    process.exit(1);
  });
}