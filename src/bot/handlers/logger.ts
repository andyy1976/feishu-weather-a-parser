/**
 * 日志处理器
 * 支持追踪、告警、审计
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  traceId?: string;
  userId?: string;
  regionId?: string;
  skillId?: string;
  taskId?: string;
  error?: Error;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  type: 'successRate' | 'queueLength' | 'errorRate';
  threshold: number;
  enabled: boolean;
}

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private alerts: AlertRule[] = [];

  constructor() {
    this.initAlertRules();
  }

  private initAlertRules(): void {
    this.alerts = [
      { type: 'successRate', threshold: 0.95, enabled: true },
      { type: 'queueLength', threshold: 100, enabled: true },
      { type: 'errorRate', threshold: 0.1, enabled: true },
    ];
  }

  debug(message: string, meta?: Partial<LogEntry>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Partial<LogEntry>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Partial<LogEntry>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Partial<LogEntry>): void {
    this.log('error', message, meta);
  }

  private log(level: LogLevel, message: string, meta?: Partial<LogEntry>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      traceId: meta?.traceId,
      userId: meta?.userId,
      regionId: meta?.regionId,
      skillId: meta?.skillId,
      taskId: meta?.taskId,
      error: meta?.error,
      duration: meta?.duration,
      metadata: meta?.metadata,
    };

    // 控制台输出
    const prefix = `[${level.toUpperCase()}]`;
    const time = new Date(entry.timestamp).toISOString();
    const context = [entry.traceId, entry.userId, entry.skillId].filter(Boolean).join(' | ');
    
    if (level === 'error' && entry.error) {
      console.error(`${prefix} ${time} ${context}`, message, entry.error);
    } else {
      console.log(`${prefix} ${time} ${context}`, message, meta?.metadata || '');
    }

    // 内存存储
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 检查告警规则
    this.checkAlerts(entry);
  }

  /**
   * 记录技能执行
   */
  logSkillExecution(skillId: string, params: any, result: any, duration: number): void {
    const level = result.success ? 'info' : 'error';
    this.log(level, `技能执行: ${skillId}`, {
      skillId,
      duration,
      metadata: {
        params,
        success: result.success,
        message: result.message,
      },
    });
  }

  /**
   * 记录任务状态
   */
  logTaskStatus(taskId: string, status: string, meta?: Record<string, any>): void {
    this.info(`任务状态变更: ${taskId}`, { taskId, metadata: { status, ...meta } });
  }

  /**
   * 记录区域操作
   */
  logRegionOperation(userId: string, regionId: string, operation: string): void {
    this.info(`区域操作`, { userId, regionId, metadata: { operation } });
  }

  /**
   * 检查告警规则
   */
  private checkAlerts(entry: LogEntry): void {
    if (!entry.metadata) return;

    for (const rule of this.alerts) {
      if (!rule.enabled) continue;

      switch (rule.type) {
        case 'successRate':
          if (entry.metadata.totalTasks && entry.metadata.failedTasks) {
            const rate = 1 - (entry.metadata.failedTasks / entry.metadata.totalTasks);
            if (rate < rule.threshold) {
              this.triggerAlert('successRate', rate, rule.threshold);
            }
          }
          break;
        
        case 'queueLength':
          if (entry.metadata.queueLength && entry.metadata.queueLength > rule.threshold) {
            this.triggerAlert('queueLength', entry.metadata.queueLength, rule.threshold);
          }
          break;
      }
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(type: string, value: number, threshold: number): void {
    const message = `告警: ${type} 低于阈值 (当前: ${value}, 阈值: ${threshold})`;
    this.warn(message, { metadata: { alertType: type, value, threshold } });
    
    // 实际部署时可发送飞书通知
    // await this.sendAlertNotification(message);
  }

  /**
   * 获取日志列表
   */
  getLogs(filters?: {
    level?: LogLevel;
    userId?: string;
    regionId?: string;
    startTime?: number;
    endTime?: number;
  }): LogEntry[] {
    let result = this.logs;

    if (filters?.level) {
      result = result.filter(l => l.level === filters.level);
    }
    if (filters?.userId) {
      result = result.filter(l => l.userId === filters.userId);
    }
    if (filters?.regionId) {
      result = result.filter(l => l.regionId === filters.regionId);
    }
    if (filters?.startTime) {
      result = result.filter(l => l.timestamp >= filters.startTime!);
    }
    if (filters?.endTime) {
      result = result.filter(l => l.timestamp <= filters.endTime!);
    }

    return result;
  }

  /**
   * 导出审计日志
   */
  exportAuditLogs(startTime: number, endTime: number): LogEntry[] {
    return this.getLogs({ startTime, endTime });
  }
}

export default Logger;
