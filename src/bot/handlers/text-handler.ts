/**
 * 文本消息处理器
 * 处理用户输入的指令和文本
 */

import { MessageContext } from '../message-processor';
import { SkillDispatcher } from './skill-dispatcher';
import { Logger } from './logger';
import { FEISHU_CONFIG } from '../config';

export class TextHandler {
  private skillDispatcher: SkillDispatcher;
  private logger: Logger;

  constructor(skillDispatcher: SkillDispatcher, logger: Logger) {
    this.skillDispatcher = skillDispatcher;
    this.logger = logger;
  }

  /**
   * 处理文本消息
   */
  async handle(context: MessageContext): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const content = context.content.trim();

    // 检查是否为指令
    if (content.startsWith('/')) {
      return await this.handleCommand(context, content);
    }

    // 处理普通文本
    return await this.handlePlainText(context, content);
  }

  /**
   * 处理指令
   */
  private async handleCommand(context: MessageContext, command: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const [cmd, ...args] = command.split(' ');
    const normalizedCmd = cmd.toLowerCase();

    this.logger.info('处理指令', { traceId: context.traceId, command: normalizedCmd, args });

    switch (normalizedCmd) {
      case FEISHU_CONFIG.commands.help:
        return await this.sendHelp(context);

      case FEISHU_CONFIG.commands.convert:
        return await this.handleConvertCommand(context, args);

      case FEISHU_CONFIG.commands.analysis:
        return await this.handleAnalysisCommand(context, args);

      case FEISHU_CONFIG.commands.remote:
        return await this.handleRemoteCommand(context, args);

      case FEISHU_CONFIG.commands.stats:
        return await this.handleStatsCommand(context, args);

      case FEISHU_CONFIG.commands.bind:
        return await this.handleBindCommand(context, args);

      default:
        return await this.sendUnknownCommand(context, command);
    }
  }

  /**
   * 发送帮助信息
   */
  private async sendHelp(context: MessageContext): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const helpText = `
🌤️ **天气A文件助手 - 使用指南**

**📁 文件处理**
• 直接发送 A/Q 文件 → 自动识别并处理
• /convert [文件key] → 转换为Excel格式

**📊 数据分析**
• /analysis [月份] → 生成月度统计分析报告
• /stats [站点编号] [年月] → 查询历史统计

**🔧 远程处理**
• /remote [节点] [文件key] → 远程服务器处理

**⚙️ 区域绑定**
• /bind [区域ID] → 绑定当前用户所属区域

**❓ 获取帮助**
• /help → 显示本帮助信息

**💡 提示**：首次使用请先绑定区域（/bind [区域ID]）
`;

    return this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: '🌤️ 天气A文件助手',
            content: [[{
              tag: 'text',
              text: helpText
            }]]
          }
        }
      }
    });
  }

  /**
   * 处理转换指令
   */
  private async handleConvertCommand(context: MessageContext, args: string[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (args.length === 0) {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: '📝 请提供文件key：/convert [文件key]' }
      });
    }

    const fileKey = args[0];

    // 发送处理中消息
    await this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'interactive',
      content: this.createProcessingCard('正在转换文件...', context.traceId)
    });

    // 执行技能链
    const result = await this.skillDispatcher.executeSkillFlow(
      'convertOnly',
      { fileKey, userId: context.senderId, regionId: context.regionId },
      context.traceId
    );

    if (result.success) {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: {
          text: `✅ 转换完成！\n📄 文件：${result.data?.fileName || 'Excel文件'}\n🔗 下载链接：${result.data?.downloadUrl || '处理完成'}`
        }
      });
    } else {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: `❌ 转换失败：${result.message}` }
      });
    }
  }

  /**
   * 处理分析指令
   */
  private async handleAnalysisCommand(context: MessageContext, args: string[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const [month] = args;

    // 发送处理中消息
    await this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'interactive',
      content: this.createProcessingCard('正在生成分析报告...', context.traceId)
    });

    const result = await this.skillDispatcher.executeSkillFlow(
      'fullAnalysis',
      { 
        userId: context.senderId, 
        regionId: context.regionId,
        month: month || new Date().toISOString().slice(0, 7)
      },
      context.traceId
    );

    if (result.success) {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: {
          text: `📊 分析报告已生成！\n🔗 飞书文档：${result.data?.docUrl || '报告链接'}`
        }
      });
    } else {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: `❌ 分析失败：${result.message}` }
      });
    }
  }

  /**
   * 处理远程处理指令
   */
  private async handleRemoteCommand(context: MessageContext, args: string[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (args.length < 2) {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: '📝 请提供节点和文件：/remote [节点] [文件key]' }
      });
    }

    const [node, fileKey] = args;

    // 发送处理中消息
    await this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'interactive',
      content: this.createProcessingCard(`正在连接节点 ${node}...`, context.traceId)
    });

    const result = await this.skillDispatcher.executeSkillFlow(
      'remoteProcess',
      { node, fileKey, userId: context.senderId, regionId: context.regionId },
      context.traceId
    );

    if (result.success) {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: {
          text: `✅ 远程处理完成！\n📍 节点：${node}\n🔗 结果：${result.data?.resultUrl || '处理完成'}`
        }
      });
    } else {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: `❌ 远程处理失败：${result.message}` }
      });
    }
  }

  /**
   * 处理统计指令
   */
  private async handleStatsCommand(context: MessageContext, args: string[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (args.length < 2) {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: '📝 请提供站点编号和年月：/stats [站点编号] [年月，如202603]' }
      });
    }

    const [stationNum, yearMonth] = args;

    const result = await this.skillDispatcher.executeSkill(
      'monthlyStats',
      { stationNum, yearMonth, regionId: context.regionId },
      context.traceId
    );

    if (result.success) {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: {
          text: `📈 ${stationNum} 站点 ${yearMonth} 统计：\n${this.formatStats(result.data)}`
        }
      });
    } else {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: `❌ 查询失败：${result.message}` }
      });
    }
  }

  /**
   * 处理区域绑定指令
   */
  private async handleBindCommand(context: MessageContext, args: string[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (args.length === 0) {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: '📝 请提供区域ID：/bind [区域ID]' }
      });
    }

    const regionId = args[0];
    
    // 调用区域管理更新用户绑定
    const result = await this.skillDispatcher.bindUserRegion(context.senderId, regionId);

    if (result.success) {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: `✅ 区域绑定成功！\n🏛️ 区域ID：${regionId}\n📍 您已绑定到指定区域` }
      });
    } else {
      return this.skillDispatcher.sendMessage(context.senderId, {
        msg_type: 'text',
        content: { text: `❌ 绑定失败：${result.message}` }
      });
    }
  }

  /**
   * 处理未知指令
   */
  private async sendUnknownCommand(context: MessageContext, command: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'text',
      content: {
        text: `❓ 未知指令：${command}\n\n输入 /help 查看可用指令`
      }
    });
  }

  /**
   * 处理普通文本
   */
  private async handlePlainText(context: MessageContext, content: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // 检查是否为常见问题关键词
    const keywords = ['帮助', 'help', '使用', '怎么用', '操作'];
    const isHelpRequest = keywords.some(k => content.toLowerCase().includes(k));

    if (isHelpRequest) {
      return await this.sendHelp(context);
    }

    // 默认回复
    return this.skillDispatcher.sendMessage(context.senderId, {
      msg_type: 'text',
      content: {
        text: `📩 收到消息：${content}\n\n请发送 A/Q 格式文件进行处理，或输入 /help 查看帮助`
      }
    });
  }

  /**
   * 创建处理中卡片
   */
  private createProcessingCard(message: string, traceId: string): any {
    return {
      config: {
        wide_screen_mode: true
      },
      elements: [{
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `⏳ ${message}\n\n🔢 追踪ID: \`${traceId}\``
        }
      }, {
        tag: 'hr'
      }, {
        tag: 'note',
        elements: [{
          tag: 'plain_text',
          text: '请稍候，处理完成后会通知您'
        }]
      }]
    };
  }

  /**
   * 格式化统计数据
   */
  private formatStats(data: any): string {
    if (!data) return '暂无数据';

    const lines = [];
    if (data.avgTemp !== undefined) lines.push(`• 平均温度：${data.avgTemp}°C`);
    if (data.maxTemp !== undefined) lines.push(`• 最高温度：${data.maxTemp}°C`);
    if (data.minTemp !== undefined) lines.push(`• 最低温度：${data.minTemp}°C`);
    if (data.avgWindSpeed !== undefined) lines.push(`• 平均风速：${data.avgWindSpeed}m/s`);
    if (data.dominantWind !== undefined) lines.push(`• 主导风向：${data.dominantWind}`);

    return lines.length > 0 ? lines.join('\n') : '暂无数据';
  }
}
