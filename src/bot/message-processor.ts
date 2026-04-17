/**
 * 飞书消息处理器
 * 统一处理文本、文件、卡片消息
 */

import { FEISHU_CONFIG } from './config';
import { TextHandler } from './handlers/text-handler';
import { FileHandler } from './handlers/file-handler';
import { CardHandler } from './handlers/card-handler';
import { SkillDispatcher } from './handlers/skill-dispatcher';
import { RegionManager } from './handlers/region-manager';
import { Logger } from './handlers/logger';

// 消息类型枚举
export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  POST = 'post',
  CARD = 'card',
  IMAGE = 'image',
}

// 消息上下文
export interface MessageContext {
  messageId: string;
  chatId: string;
  senderId: string;
  messageType: MessageType;
  content: string;
  fileKey?: string;
  createTime: number;
  regionId?: string;
  traceId: string;
}

// 消息处理器主类
export class MessageProcessor {
  private textHandler: TextHandler;
  private fileHandler: FileHandler;
  private cardHandler: CardHandler;
  private skillDispatcher: SkillDispatcher;
  private regionManager: RegionManager;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.regionManager = new RegionManager(this.logger);
    this.skillDispatcher = new SkillDispatcher(this.logger);
    this.textHandler = new TextHandler(this.skillDispatcher, this.logger);
    this.fileHandler = new FileHandler(this.skillDispatcher, this.regionManager, this.logger);
    this.cardHandler = new CardHandler(this.skillDispatcher, this.logger);
  }

  /**
   * 处理接收到的飞书消息
   */
  async processMessage(payload: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const context = this.buildContext(payload);
    
    this.logger.info('接收到消息', {
      traceId: context.traceId,
      messageType: context.messageType,
      senderId: context.senderId,
    });

    try {
      // 更新用户区域信息
      if (!context.regionId) {
        context.regionId = await this.regionManager.getRegionByUserId(context.senderId);
      }

      // 根据消息类型分发处理
      switch (context.messageType) {
        case MessageType.TEXT:
          return await this.textHandler.handle(context);
        
        case MessageType.FILE:
          return await this.fileHandler.handle(context);
        
        case MessageType.CARD:
          return await this.cardHandler.handle(context);
        
        default:
          return {
            success: false,
            error: `不支持的消息类型: ${context.messageType}`,
          };
      }
    } catch (error) {
      this.logger.error('消息处理异常', { traceId: context.traceId, error });
      return {
        success: false,
        error: `处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 从飞书回调构建消息上下文
   */
  private buildContext(payload: any): MessageContext {
    const event = payload?.event || payload;
    
    return {
      messageId: event?.message_id || '',
      chatId: event?.chat_id || '',
      senderId: event?.sender?.sender_id?.user_id || event?.user_id || '',
      messageType: this.parseMessageType(event?.msg_type || event?.message_type),
      content: this.decodeContent(event?.content || ''),
      fileKey: event?.file_key || event?.fileKeys?.[0],
      createTime: event?.create_time || Date.now(),
      traceId: this.generateTraceId(),
    };
  }

  /**
   * 解析消息类型
   */
  private parseMessageType(msgType: string): MessageType {
    switch (msgType) {
      case 'text':
        return MessageType.TEXT;
      case 'file':
        return MessageType.FILE;
      case 'post':
        return MessageType.POST;
      case 'card':
        return MessageType.CARD;
      case 'image':
        return MessageType.IMAGE;
      default:
        return MessageType.TEXT;
    }
  }

  /**
   * 解码消息内容
   */
  private decodeContent(content: string): string {
    try {
      const decoded = JSON.parse(content);
      return decoded.text || decoded.content || decoded.i18n_key || '';
    } catch {
      return content;
    }
  }

  /**
   * 生成追踪ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default MessageProcessor;
