/**
 * 飞书天气A文件机器人服务入口
 * 使用Koa框架搭建HTTP服务，接收飞书回调
 */

import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import * as dotenv from 'dotenv';

// 加载环境配置
dotenv.config();

import { FEISHU_CONFIG } from './config';
import { MessageProcessor } from './message-processor';
import { Logger } from './handlers/logger';
import { FeishuAPI } from './feishu-api';

// 初始化
const app = new Koa();
const router = new Router();
const logger = new Logger();
const processor = new MessageProcessor();
const feishuAPI = new FeishuAPI();

// 中间件：错误处理
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    logger.error('请求处理异常', { error: err });
    ctx.status = err.status || 500;
    ctx.body = {
      code: ctx.status,
      msg: err.message || 'Internal Server Error',
    };
  }
});

// 中间件：日志
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.debug(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

// 中间件：请求体解析
app.use(bodyParser());

// 健康检查
router.get('/health', (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    botName: FEISHU_CONFIG.botName,
  };
});

// 飞书事件回调
router.post(FEISHU_CONFIG.webhookPath, async (ctx) => {
  const body = ctx.request.body as any;
  
  // 验证URL（GET请求）
  if (ctx.query?.challenge) {
    ctx.body = { challenge: ctx.query.challenge };
    return;
  }

  // 处理事件回调
  logger.info('收到飞书回调', { metadata: body });

  try {
    // 处理消息事件
    if (body.event?.event_type === 'im.message.receive_v1') {
      const result = await processor.processMessage(body);
      
      ctx.body = {
        code: 0,
        msg: 'success',
        result,
      };
    } else {
      ctx.body = {
        code: 0,
        msg: 'event received',
      };
    }
  } catch (error) {
    logger.error('回调处理失败', { error });
    ctx.body = {
      code: 1,
      msg: 'process failed',
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
});

// 交互卡片回调
router.post('/webhook/card', async (ctx) => {
  const body = ctx.request.body as any;
  
  logger.info('收到卡片回调', { metadata: body });

  try {
    const result = await processor.processMessage({
      ...body,
      messageType: 'card',
      content: JSON.stringify(body.action?.value || {}),
    });

    ctx.body = {
      code: 0,
      msg: 'success',
      result,
    };
  } catch (error) {
    ctx.body = {
      code: 1,
      msg: 'process failed',
    };
  }
});

// 技能执行接口（供内部调用）
router.post('/api/skill/execute', async (ctx) => {
  const { skillName, params } = ctx.request.body as any;

  if (!skillName) {
    ctx.status = 400;
    ctx.body = { code: 400, msg: 'skillName is required' };
    return;
  }

  try {
    const result = await processor.processMessage({
      messageId: `api_${Date.now()}`,
      chatId: '',
      senderId: 'api',
      messageType: 'text',
      content: skillName,
      createTime: Date.now(),
      traceId: `api_${Date.now()}`,
    });

    ctx.body = {
      code: 0,
      msg: 'success',
      result,
    };
  } catch (error) {
    ctx.body = {
      code: 1,
      msg: 'execution failed',
    };
  }
});

// 日志查询接口
router.get('/api/logs', async (ctx) => {
  const { level, userId, regionId, startTime, endTime } = ctx.query;

  const logs = logger.getLogs({
    level: level as any,
    userId: userId as string,
    regionId: regionId as string,
    startTime: startTime ? parseInt(startTime as string) : undefined,
    endTime: endTime ? parseInt(endTime as string) : undefined,
  });

  ctx.body = {
    code: 0,
    data: logs,
  };
});

// 审计日志导出
router.get('/api/audit/export', async (ctx) => {
  const { startTime, endTime } = ctx.query;

  if (!startTime || !endTime) {
    ctx.status = 400;
    ctx.body = { code: 400, msg: 'startTime and endTime are required' };
    return;
  }

  const logs = logger.exportAuditLogs(
    parseInt(startTime as string),
    parseInt(endTime as string)
  );

  ctx.body = {
    code: 0,
    data: logs,
    count: logs.length,
  };
});

// 启动服务
const PORT = FEISHU_CONFIG.port;

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🌤️  飞书天气A文件机器人启动成功                             ║
║                                                               ║
║     端口: ${PORT}                                                  ║
║     名称: ${FEISHU_CONFIG.botName}                                    ║
║     回调: ${FEISHU_CONFIG.webhookPath}                                  ║
║                                                               ║
║     健康检查: http://localhost:${PORT}/health                     ║
║     技能接口: http://localhost:${PORT}/api/skill/execute         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  logger.info('机器人服务已启动', {
    metadata: {
      port: PORT,
      botName: FEISHU_CONFIG.botName,
    }
  });
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭...');
  logger.info('机器人服务关闭中...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到SIGINT信号，正在关闭...');
  logger.info('机器人服务关闭中...');
  process.exit(0);
});

export default app;
