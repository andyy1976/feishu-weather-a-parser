/**
 * 交互卡片组件
 * 提供标准化的飞书卡片构建能力
 */

export interface CardConfig {
  wideScreenMode?: boolean;
  enableForward?: boolean;
}

export interface CardHeader {
  title: string;
  subtitle?: string;
  template?: 'blue' | 'wraning' | 'red' | 'green' | 'purple';
}

export interface CardAction {
  tag: 'button' | 'select' | 'overflow' | 'date_picker';
  text?: string;
  type?: 'primary' | 'default' | 'danger';
  value?: Record<string, any>;
  options?: Array<{ text: string; value: string }>;
}

export class InteractiveCard {
  private config: CardConfig = { wideScreenMode: true };
  private header?: CardHeader;
  private elements: any[] = [];

  /**
   * 设置卡片配置
   */
  setConfig(config: CardConfig): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * 设置卡片头部
   */
  setHeader(header: CardHeader): this {
    this.header = header;
    return this;
  }

  /**
   * 添加文本元素
   */
  addText(content: string, style?: 'normal' | 'bold' | 'italic'): this {
    const tag = style === 'bold' ? 'lark_md' : 'lark_md';
    this.elements.push({
      tag: 'div',
      text: {
        tag,
        content,
      },
    });
    return this;
  }

  /**
   * 添加Markdown文本
   */
  addMarkdown(content: string): this {
    this.elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content,
      },
    });
    return this;
  }

  /**
   * 添加图片
   */
  addImage(imgKey: string, alt?: string): this {
    this.elements.push({
      tag: 'img',
      img_key: imgKey,
      alt,
    });
    return this;
  }

  /**
   * 添加按钮组
   */
  addActions(actions: CardAction[]): this {
    this.elements.push({
      tag: 'action',
      actions: actions.map(action => this.buildAction(action)),
    });
    return this;
  }

  /**
   * 添加分割线
   */
  addDivider(): this {
    this.elements.push({ tag: 'hr' });
    return this;
  }

  /**
   * 添加备注
   */
  addNote(content: string): this {
    this.elements.push({
      tag: 'note',
      elements: [{
        tag: 'plain_text',
        text: content,
      }],
    });
    return this;
  }

  /**
   * 添加字段列表
   */
  addFields(fields: Array<{ name: string; value: string }>, isColumn: boolean = false): this {
    this.elements.push({
      tag: 'field',
      is_long_text: false,
      elements: fields.map(field => ({
        tag: 'lark_md',
        content: `**${field.name}** ${field.value}`,
      })),
    });
    return this;
  }

  /**
   * 添加下拉选择
   */
  addSelect(placeholder: string, options: Array<{ text: string; value: string }>, actionValue: string): this {
    this.elements.push({
      tag: 'action',
      actions: [{
        tag: 'select_static',
        placeholder,
        options,
        value: {
          action: actionValue,
        },
      }],
    });
    return this;
  }

  /**
   * 添加表格
   */
  addTable(headers: string[], rows: string[][]): this {
    const tableElement = {
      tag: 'table',
      columns: headers.map(h => ({
        title: h,
        width: `${Math.floor(100 / headers.length)}%`,
      })),
      cells: rows.map(row => 
        row.map(cell => [{
          tag: 'plain_text',
          text: cell,
        }])
      ),
    };
    this.elements.push(tableElement);
    return this;
  }

  /**
   * 构建按钮
   */
  private buildAction(action: CardAction): any {
    switch (action.tag) {
      case 'button':
        return {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: action.text || '',
          },
          type: action.type || 'default',
          value: action.value || {},
        };
      
      case 'select':
        return {
          tag: 'select_static',
          placeholder: action.text || '',
          options: action.options || [],
          value: action.value || {},
        };
      
      default:
        return action;
    }
  }

  /**
   * 构建最终卡片JSON
   */
  build(): any {
    const card: any = {
      config: {
        wide_screen_mode: this.config.wideScreenMode,
        enable_forward: this.config.enableForward,
      },
    };

    if (this.header) {
      card.header = {
        title: {
          tag: 'plain_text',
          content: this.header.title,
        },
      };

      if (this.header.subtitle) {
        card.header.subtitle = {
          tag: 'plain_text',
          content: this.header.subtitle,
        };
      }

      if (this.header.template) {
        card.header.template = this.header.template;
      }
    }

    card.elements = this.elements;

    return card;
  }

  /**
   * 静态方法：创建处理中卡片
   */
  static processing(message: string, traceId?: string): any {
    const card = new InteractiveCard();
    card.setHeader({ title: '⏳ 处理中', template: 'blue' });
    card.addMarkdown(message);
    if (traceId) {
      card.addMarkdown(`**🔢 追踪ID：** \`${traceId}\``);
    }
    card.addDivider();
    card.addNote('请稍候，处理完成后会通知您');
    return card.build();
  }

  /**
   * 静态方法：创建成功卡片
   */
  static success(title: string, message: string, links?: Array<{ text: string; url: string }>): any {
    const card = new InteractiveCard();
    card.setHeader({ title, template: 'green' });
    card.addMarkdown(message);
    
    if (links?.length) {
      card.addDivider();
      for (const link of links) {
        card.addMarkdown(`• [${link.text}](${link.url})`);
      }
    }
    
    card.addDivider();
    card.addNote('💡 如有疑问请输入 /help 获取帮助');
    return card.build();
  }

  /**
   * 静态方法：创建错误卡片
   */
  static error(title: string, error: string, canRetry: boolean = true): any {
    const card = new InteractiveCard();
    card.setHeader({ title, template: 'red' });
    card.addMarkdown(`**错误原因：**\n${error}`);
    
    if (canRetry) {
      card.addDivider();
      card.addActions([{
        tag: 'button',
        text: '🔄 重试',
        type: 'default',
        value: { action: 'retry' },
      }]);
    }
    
    return card.build();
  }

  /**
   * 静态方法：创建确认卡片
   */
  static confirm(title: string, message: string, confirmText: string = '确认', cancelText: string = '取消'): any {
    const card = new InteractiveCard();
    card.setHeader({ title });
    card.addMarkdown(message);
    card.addDivider();
    card.addActions([
      {
        tag: 'button',
        text: confirmText,
        type: 'primary',
        value: { action: 'confirm' },
      },
      {
        tag: 'button',
        text: cancelText,
        type: 'default',
        value: { action: 'cancel' },
      },
    ]);
    return card.build();
  }

  /**
   * 静态方法：创建统计报告卡片
   */
  static statsReport(data: {
    stationNum?: string;
    monthYear?: string;
    avgTemp?: string;
    maxTemp?: string;
    minTemp?: string;
    avgWindSpeed?: string;
    dominantWind?: string;
    docUrl?: string;
  }): any {
    const card = new InteractiveCard();
    card.setHeader({ 
      title: '📊 统计分析报告', 
      subtitle: `${data.stationNum || ''} - ${data.monthYear || ''}`,
      template: 'blue'
    });

    const stats = [];
    if (data.avgTemp) stats.push(`• 平均温度：${data.avgTemp}°C`);
    if (data.maxTemp) stats.push(`• 最高温度：${data.maxTemp}°C`);
    if (data.minTemp) stats.push(`• 最低温度：${data.minTemp}°C`);
    if (data.avgWindSpeed) stats.push(`• 平均风速：${data.avgWindSpeed}m/s`);
    if (data.dominantWind) stats.push(`• 主导风向：${data.dominantWind}`);

    if (stats.length) {
      card.addMarkdown(stats.join('\n'));
    }

    if (data.docUrl) {
      card.addDivider();
      card.addMarkdown(`[📄 查看完整报告](${data.docUrl})`);
    }

    return card.build();
  }
}

export default InteractiveCard;
