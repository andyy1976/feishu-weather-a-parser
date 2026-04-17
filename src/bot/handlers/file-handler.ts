/**
 * 文件消息处理器
 * 处理用户发送的A/Q文件
 */

import { MessageContext, MessageType } from '../message-processor';
import { SkillDispatcher } from './skill-dispatcher';
import { RegionManager } from './region-manager';
import { Logger } from './logger';
import { FEISHU_CONFIG } from '../config';
import { InteractiveCard } from '../messages/interactive-card';

export class FileHandler {
  private skillDispatcher: SkillDispatcher;
  private regionManager: RegionManager;
  private logger: Logger;

  constructor(
    skillDispatcher: SkillDispatcher,
    regionManager: RegionManager,
    logger: Logger
  ) {
    this.skillDispatcher = skillDispatcher;
    this.regionManager = regionManager;
    this.logger = logger;
  }

  /**
   * 处理文件消息
   */
  async handle(context: MessageContext): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const fileKey = context.fileKey;

    if (!fileKey) {
      return {
        success: false,
        error: '未找到文件key',
      };
    }

    this.logger.info('收到文件消息', {
      traceId: context.traceId,
      userId: context.senderId,
      fileKey,
    });

    // 1. 下载文件
    const fileResult = await this.downloadFile(context, fileKey);
    if (!fileResult.success) {
      return this.sendErrorMessage(context, fileResult.error || '文件下载失败');
    }

    // 2. 验证文件类型
    const fileExt = this.getFileExtension(fileResult.fileName || '');
    if (!FEISHU_CONFIG.supportedFileTypes.includes(fileExt)) {
      return this.sendErrorMessage(
        context,
        `不支持的文件格式：${fileExt}\n\n仅支持：A/Q 气象文件`
      );
    }

    // 3. 解析文件
    const parseResult = await this.skillDispatcher.executeSkill(
      'parse',
      {
        filePath: fileResult.filePath,
        fileName: fileResult.fileName,
        regionId: context.regionId,
        userId: context.senderId,
      },
      context.traceId
    );

    if (!parseResult.success) {
      return this.sendErrorMessage(context, `文件解析失败：${parseResult.message}`);
    }

    // 4. 保存文件信息用于后续操作
    const fileContext = {
      fileKey,
      filePath: fileResult.filePath,
      fileName: fileResult.fileName,
      stationNum: parseResult.data?.stationNum,
      monthYear: parseResult.data?.monthYear,
      traceId: context.traceId,
    };

    // 5. 发送交互卡片让用户选择操作
    return await this.sendOperationCard(context, fileContext);
  }

  /**
   * 下载飞书文件
   */
  private async downloadFile(context: MessageContext, fileKey: string): Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    error?: string;
  }> {
    try {
      // 发送下载中消息
      await this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: '📥 正在下载文件...' }
      });

      // 调用飞书API下载文件
      const result = await this.skillDispatcher.executeSkill(
        'feishu.download',
        { fileKey, userId: context.senderId },
        context.traceId
      );

      if (result.success) {
        return {
          success: true,
          filePath: result.data?.filePath,
          fileName: result.data?.fileName,
        };
      } else {
        return {
          success: false,
          error: result.message,
        };
      }
    } catch (error) {
      this.logger.error('文件下载异常', { traceId: context.traceId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : '文件下载失败',
      };
    }
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
  }

  /**
   * 发送操作选择卡片
   */
  private async sendOperationCard(
    context: MessageContext,
    fileContext: {
      fileKey: string;
      filePath: string;
      fileName: string;
      stationNum?: string;
      monthYear?: string;
      traceId: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const card = new InteractiveCard();
    
    // 构建卡片内容
    const cardContent = {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: 'plain_text',
          content: '📄 文件解析成功',
        },
        subtitle: {
          tag: 'plain_text',
          content: `${fileContext.fileName}`,
        },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**📍 站点编号：** ${fileContext.stationNum || '未知'}\n**📅 数据月份：** ${fileContext.monthYear || '未知'}\n**🔢 追踪ID：** \`${fileContext.traceId}\``,
          },
        },
        { tag: 'hr' },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: '**请选择操作：**',
          },
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '📊 转换为Excel',
              },
              type: 'primary',
              value: {
                action: 'convert_only',
                fileKey: fileContext.fileKey,
                filePath: fileContext.filePath,
              },
            },
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '💾 转换并存储',
              },
              type: 'default',
              value: {
                action: 'convert_and_store',
                fileKey: fileContext.fileKey,
                filePath: fileContext.filePath,
              },
            },
          ],
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '📈 完整分析报告',
              },
              type: 'default',
              value: {
                action: 'full_analysis',
                fileKey: fileContext.fileKey,
                filePath: fileContext.filePath,
              },
            },
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '🔧 远程处理',
              },
              type: 'default',
              value: {
                action: 'remote_process',
                fileKey: fileContext.fileKey,
                filePath: fileContext.filePath,
              },
            },
          ],
        },
        { tag: 'hr' },
        {
          tag: 'note',
          elements: [
            {
              tag: 'plain_text',
              text: '💡 提示：选择操作后，系统将自动处理并通知您',
            },
          ],
        },
      ],
    };

    return this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'interactive',
      content: cardContent,
    });
  }

  /**
   * 发送错误消息
   */
  private async sendErrorMessage(context: MessageContext, error: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    return this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'text',
      content: { text: `❌ ${error}` },
    });
  }
}
