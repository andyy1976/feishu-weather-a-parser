/**
 * 卡片消息处理器
 * 处理用户在交互卡片上的点击操作
 */

import { MessageContext } from '../message-processor';
import { SkillDispatcher } from './skill-dispatcher';
import { Logger } from './logger';

interface CardAction {
  action: string;
  fileKey?: string;
  filePath?: string;
  value?: Record<string, any>;
}

export class CardHandler {
  private skillDispatcher: SkillDispatcher;
  private logger: Logger;

  constructor(skillDispatcher: SkillDispatcher, logger: Logger) {
    this.skillDispatcher = skillDispatcher;
    this.logger = logger;
  }

  /**
   * 处理卡片点击
   */
  async handle(context: MessageContext): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // 解析卡片value
    let actionData: CardAction;
    try {
      actionData = JSON.parse(context.content);
    } catch {
      return {
        success: false,
        error: '无效的卡片数据',
      };
    }

    const { action, fileKey, filePath } = actionData;

    this.logger.info('卡片操作', {
      traceId: context.traceId,
      userId: context.senderId,
      action,
    });

    // 发送处理中状态
    await this.sendProcessingStatus(context, action);

    // 根据操作类型执行对应技能
    switch (action) {
      case 'convert_only':
        return await this.handleConvertOnly(context, fileKey!, filePath!);

      case 'convert_and_store':
        return await this.handleConvertAndStore(context, fileKey!, filePath!);

      case 'full_analysis':
        return await this.handleFullAnalysis(context, fileKey!, filePath!);

      case 'remote_process':
        return await this.handleRemoteProcess(context, fileKey!, filePath!);

      default:
        return {
          success: false,
          error: `未知操作：${action}`,
        };
    }
  }

  /**
   * 仅转换Excel
   */
  private async handleConvertOnly(
    context: MessageContext,
    fileKey: string,
    filePath: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // 发送状态更新
      await this.updateTaskStatus(context, '解析中...');

      // 执行技能链
      const result = await this.skillDispatcher.executeSkillFlow(
        'convertOnly',
        {
          fileKey,
          filePath,
          userId: context.senderId,
          regionId: context.regionId,
        },
        context.traceId
      );

      if (result.success) {
        // 发送成功消息
        return this.skillDispatcher.sendMessage(context.senderId, {
          msg_type: 'interactive',
          content: this.createSuccessCard(
            '✅ 转换完成',
            `文件已转换为Excel格式`,
            result.data
          ),
        });
      } else {
        return this.sendErrorCard(context, result.message);
      }
    } catch (error) {
      this.logger.error('转换失败', { traceId: context.traceId, error });
      return this.sendErrorCard(context, error instanceof Error ? error.message : '转换失败');
    }
  }

  /**
   * 转换并存储
   */
  private async handleConvertAndStore(
    context: MessageContext,
    fileKey: string,
    filePath: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      await this.updateTaskStatus(context, '解析中...');

      // 执行技能链：解析 -> 转换Excel -> 存储MySQL
      const result = await this.skillDispatcher.executeSkillFlow(
        'convertAndStore',
        {
          fileKey,
          filePath,
          userId: context.senderId,
          regionId: context.regionId,
        },
        context.traceId
      );

      if (result.success) {
        return this.skillDispatcher.sendMessage(context.senderId, {
          msg_type: 'interactive',
          content: this.createSuccessCard(
            '💾 转换并存储完成',
            `数据已保存到数据库`,
            result.data
          ),
        });
      } else {
        return this.sendErrorCard(context, result.message);
      }
    } catch (error) {
      this.logger.error('存储失败', { traceId: context.traceId, error });
      return this.sendErrorCard(context, error instanceof Error ? error.message : '存储失败');
    }
  }

  /**
   * 完整分析报告
   */
  private async handleFullAnalysis(
    context: MessageContext,
    fileKey: string,
    filePath: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // 分阶段更新状态
      await this.updateTaskStatus(context, '解析中...');
      await this.delay(1000);
      await this.updateTaskStatus(context, '生成统计数据...');
      await this.delay(1000);
      await this.updateTaskStatus(context, '生成图表...');
      await this.delay(1000);
      await this.updateTaskStatus(context, '创建飞书文档...');

      // 执行完整分析技能链
      const result = await this.skillDispatcher.executeSkillFlow(
        'fullAnalysis',
        {
          fileKey,
          filePath,
          userId: context.senderId,
          regionId: context.regionId,
        },
        context.traceId
      );

      if (result.success) {
        return this.skillDispatcher.sendMessage(context.senderId, {
          msg_type: 'interactive',
          content: this.createReportCard(result.data),
        });
      } else {
        return this.sendErrorCard(context, result.message);
      }
    } catch (error) {
      this.logger.error('分析失败', { traceId: context.traceId, error });
      return this.sendErrorCard(context, error instanceof Error ? error.message : '分析失败');
    }
  }

  /**
   * 远程处理
   */
  private async handleRemoteProcess(
    context: MessageContext,
    fileKey: string,
    filePath: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      await this.updateTaskStatus(context, '连接远程服务器...');
      await this.delay(1000);
      await this.updateTaskStatus(context, '传输文件...');
      await this.delay(1000);
      await this.updateTaskStatus(context, '执行处理...');

      // 执行远程处理技能链
      const result = await this.skillDispatcher.executeSkillFlow(
        'remoteProcess',
        {
          fileKey,
          filePath,
          userId: context.senderId,
          regionId: context.regionId,
          node: this.selectNearestNode(context.regionId),
        },
        context.traceId
      );

      if (result.success) {
        return this.skillDispatcher.sendMessage(context.senderId, {
          msg_type: 'interactive',
          content: this.createSuccessCard(
            '🔧 远程处理完成',
            `节点：${result.data?.node || '未知'}\n处理结果已返回`,
            result.data
          ),
        });
      } else {
        return this.sendErrorCard(context, result.message);
      }
    } catch (error) {
      this.logger.error('远程处理失败', { traceId: context.traceId, error });
      return this.sendErrorCard(context, error instanceof Error ? error.message : '远程处理失败');
    }
  }

  /**
   * 选择最近的边缘节点
   */
  private selectNearestNode(regionId?: string): string {
    // 根据区域ID选择对应省份的边缘节点
    const nodeMap: Record<string, string> = {
      '11': 'node-hebei-01',  // 河北
      '12': 'node-tianjin-01',
      '13': 'node-hebei-01',
      '14': 'node-shanxi-01',
      '15': 'node-neimeng-01',
      // ... 更多省份映射
    };

    if (regionId) {
      const prefix = regionId.slice(0, 2);
      return nodeMap[prefix] || 'node-default-01';
    }

    return 'node-default-01';
  }

  /**
   * 发送处理状态
   */
  private async sendProcessingStatus(context: MessageContext, action: string): Promise<void> {
    const statusMessages: Record<string, string> = {
      convert_only: '📊 正在转换Excel...',
      convert_and_store: '💾 正在转换并存储...',
      full_analysis: '📈 正在生成分析报告...',
      remote_process: '🔧 正在远程处理...',
    };

    await this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'text',
      content: { text: statusMessages[action] || '⏳ 处理中...' }
    });
  }

  /**
   * 更新任务状态
   */
  private async updateTaskStatus(context: MessageContext, status: string): Promise<void> {
    this.logger.logTaskStatus(context.traceId, status);
    
    await this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'text',
      content: { text: `⏳ ${status}` }
    });
  }

  /**
   * 发送成功卡片
   */
  private createSuccessCard(title: string, description: string, data?: any): any {
    return {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: title },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: description,
          },
        },
        ...(data?.downloadUrl ? [{
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `📥 [点击下载Excel](${data.downloadUrl})`,
          },
        }] : []),
        ...(data?.docUrl ? [{
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `📄 [查看飞书文档](${data.docUrl})`,
          },
        }] : []),
        { tag: 'hr' },
        {
          tag: 'note',
          elements: [{
            tag: 'plain_text',
            text: '💡 如有疑问请输入 /help 获取帮助',
          }],
        },
      ],
    };
  }

  /**
   * 发送报告卡片
   */
  private createReportCard(data?: any): any {
    return {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: '📊 分析报告已生成' },
        subtitle: { tag: 'plain_text', content: data?.stationNum || '' },
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**📅 统计月份：** ${data?.monthYear || ''}\n**📍 站点编号：** ${data?.stationNum || ''}`,
          },
        },
        { tag: 'hr' },
        ...(data?.stats?.length ? [{
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**📈 统计数据：**\n${data.stats.join('\n')}`,
          },
        }] : []),
        {
          tag: 'action',
          actions: [{
            tag: 'button',
            text: { tag: 'plain_text', content: '📄 查看完整报告' },
            type: 'primary',
            value: { action: 'open_doc', docUrl: data?.docUrl },
          }],
        },
      ],
    };
  }

  /**
   * 发送错误卡片
   */
  private async sendErrorCard(context: MessageContext, error: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    return this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'interactive',
      content: {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: 'plain_text', content: '❌ 处理失败' },
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**错误原因：**\n${error}`,
            },
          },
          { tag: 'hr' },
          {
            tag: 'action',
            actions: [{
              tag: 'button',
              text: { tag: 'plain_text', content: '🔄 重试' },
              type: 'default',
              value: { action: 'retry' },
            }],
          },
        ],
      },
    });
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
