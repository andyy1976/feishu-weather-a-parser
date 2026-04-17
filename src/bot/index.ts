/**
 * 飞书天气A文件机器人入口
 * 统一导出所有模块
 */

// 核心模块
export { MessageProcessor, MessageType } from './message-processor';
export { MessageContext } from './message-processor';

// 配置
export { FEISHU_CONFIG, SKILL_CONFIG, REGION_CONFIG, STORAGE_CONFIG, LOG_CONFIG } from './config';

// 处理器
export { TextHandler } from './handlers/text-handler';
export { FileHandler } from './handlers/file-handler';
export { CardHandler } from './handlers/card-handler';
export { SkillDispatcher } from './handlers/skill-dispatcher';
export { RegionManager, Region, UserRegionBinding } from './handlers/region-manager';
export { Logger, LogEntry, LogLevel } from './handlers/logger';

// 消息组件
export { InteractiveCard, CardConfig, CardHeader, CardAction } from './messages/interactive-card';

// 飞书API封装
export { FeishuAPI } from './feishu-api';

import { MessageProcessor } from './message-processor';
import { Logger } from './handlers/logger';
import { FEISHU_CONFIG } from './config';

/**
 * 创建并启动飞书机器人
 */
export function createBot(): {
  processor: MessageProcessor;
  logger: Logger;
  start: () => Promise<void>;
  stop: () => Promise<void>;
} {
  const logger = new Logger();
  const processor = new MessageProcessor();

  // 启动服务
  const start = async (): Promise<void> => {
    logger.info('飞书天气A文件机器人启动中...', {
      metadata: {
        appId: FEISHU_CONFIG.appId,
        botName: FEISHU_CONFIG.botName,
        port: FEISHU_CONFIG.port,
      }
    });

    // 实际应该启动HTTP服务器监听飞书回调
    // 这里只是示例
    logger.info('机器人已启动，等待消息...');
  };

  // 停止服务
  const stop = async (): Promise<void> => {
    logger.info('飞书天气A文件机器人停止中...');
    // 清理资源
  };

  return {
    processor,
    logger,
    start,
    stop,
  };
}

export default createBot;
