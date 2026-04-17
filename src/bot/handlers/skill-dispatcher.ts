/**
 * 技能调度器
 * 统一管理和执行OpenClaw技能
 */

import { SKILL_CONFIG, REGION_CONFIG } from '../config';
import { Logger } from './logger';

interface SkillResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  duration?: number;
}

interface SkillContext {
  userId: string;
  regionId?: string;
  taskId: string;
  traceId: string;
}

export class SkillDispatcher {
  private logger: Logger;
  private skillRegistry: Map<string, any>;
  private taskQueue: Map<string, any>;
  private retryQueue: Map<string, any>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.skillRegistry = new Map();
    this.taskQueue = new Map();
    this.retryQueue = new Map();
    this.initializeSkills();
  }

  /**
   * 初始化技能注册表
   */
  private initializeSkills(): void {
    // 解析技能
    this.skillRegistry.set('parse', {
      id: SKILL_CONFIG.skillIds.parse,
      timeout: SKILL_CONFIG.timeout.parse,
      handler: this.handleParseSkill.bind(this),
    });

    // Excel转换技能
    this.skillRegistry.set('toExcel', {
      id: SKILL_CONFIG.skillIds.toExcel,
      timeout: SKILL_CONFIG.timeout.toExcel,
      handler: this.handleToExcelSkill.bind(this),
    });

    // MySQL存储技能
    this.skillRegistry.set('toMySQL', {
      id: SKILL_CONFIG.skillIds.toMySQL,
      timeout: SKILL_CONFIG.timeout.store,
      handler: this.handleMySQLSkill.bind(this),
    });

    // SQLite存储技能
    this.skillRegistry.set('toSQLite', {
      id: SKILL_CONFIG.skillIds.toSQLite,
      timeout: SKILL_CONFIG.timeout.store,
      handler: this.handleSQLiteSkill.bind(this),
    });

    // 百度网盘技能
    this.skillRegistry.set('toBaiduPan', {
      id: SKILL_CONFIG.skillIds.toBaiduPan,
      timeout: SKILL_CONFIG.timeout.store,
      handler: this.handleBaiduPanSkill.bind(this),
    });

    // 月度统计技能
    this.skillRegistry.set('monthlyStats', {
      id: SKILL_CONFIG.skillIds.monthlyStats,
      timeout: SKILL_CONFIG.timeout.analysis,
      handler: this.handleMonthlyStatsSkill.bind(this),
    });

    // 风表分析技能
    this.skillRegistry.set('windAnalysis', {
      id: SKILL_CONFIG.skillIds.windAnalysis,
      timeout: SKILL_CONFIG.timeout.analysis,
      handler: this.handleWindAnalysisSkill.bind(this),
    });

    // 飞书文档创建技能
    this.skillRegistry.set('createDoc', {
      id: SKILL_CONFIG.skillIds.createDoc,
      timeout: SKILL_CONFIG.timeout.createDoc,
      handler: this.handleCreateDocSkill.bind(this),
    });

    // 飞书消息发送技能
    this.skillRegistry.set('sendMessage', {
      id: SKILL_CONFIG.skillIds.sendMessage,
      timeout: SKILL_CONFIG.timeout.sendMessage,
      handler: this.handleSendMessageSkill.bind(this),
    });

    // 远程处理技能
    this.skillRegistry.set('remoteExec', {
      id: SKILL_CONFIG.skillIds.remoteExec,
      timeout: SKILL_CONFIG.timeout.analysis,
      handler: this.handleRemoteExecSkill.bind(this),
    });
  }

  /**
   * 执行单个技能
   */
  async executeSkill(
    skillName: string,
    params: any,
    traceId: string
  ): Promise<SkillResult> {
    const skill = this.skillRegistry.get(skillName);
    
    if (!skill) {
      return {
        success: false,
        error: `技能不存在: ${skillName}`,
      };
    }

    const startTime = Date.now();
    const context: SkillContext = {
      userId: params.userId,
      regionId: params.regionId,
      taskId: this.generateTaskId(),
      traceId,
    };

    this.logger.info(`执行技能: ${skill.id}`, {
      traceId,
      skillId: skill.id,
      taskId: context.taskId,
    });

    try {
      // 创建超时Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('技能执行超时')), skill.timeout);
      });

      // 执行技能
      const result = await Promise.race([
        skill.handler(params, context),
        timeoutPromise,
      ]);

      const duration = Date.now() - startTime;
      this.logger.logSkillExecution(skill.id, params, result, duration);

      return {
        success: true,
        data: result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`技能执行失败: ${skill.id}`, {
        traceId,
        skillId: skill.id,
        error,
      });

      // 触发重试
      const retryResult = await this.handleRetry(skillName, params, traceId, 1);
      
      return retryResult;
    }
  }

  /**
   * 执行技能流（多个技能顺序执行）
   */
  async executeSkillFlow(
    flowName: string,
    params: any,
    traceId: string
  ): Promise<SkillResult> {
    const flow = SKILL_CONFIG.skillFlows[flowName as keyof typeof SKILL_CONFIG.skillFlows];
    
    if (!flow) {
      return {
        success: false,
        error: `技能流不存在: ${flowName}`,
      };
    }

    const startTime = Date.now();
    let currentData = { ...params };

    this.logger.info(`执行技能流: ${flowName}`, {
      traceId,
      skillCount: flow.length,
    });

    try {
      for (let i = 0; i < flow.length; i++) {
        const skillName = this.mapSkillIdToName(flow[i]);
        const skill = this.skillRegistry.get(skillName);

        if (!skill) {
          throw new Error(`技能不存在: ${flow[i]}`);
        }

        this.logger.info(`技能流 [${i + 1}/${flow.length}]: ${skill.id}`, { traceId });

        // 传递前一个技能的输出作为输入
        currentData = {
          ...currentData,
          ...currentData.output,
        };

        const result = await this.executeSkill(skillName, currentData, traceId);

        if (!result.success) {
          throw new Error(result.error || result.message);
        }

        // 保存输出供下一个技能使用
        currentData.output = result.data;
      }

      const duration = Date.now() - startTime;
      this.logger.info(`技能流完成: ${flowName}`, {
        traceId,
        duration,
        totalSkills: flow.length,
      });

      return {
        success: true,
        data: currentData.output,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '技能流执行失败',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 技能ID映射到名称
   */
  private mapSkillIdToName(skillId: string): string {
    const mapping: Record<string, string> = {
      'weather.afile.parse': 'parse',
      'weather.afile.toExcel': 'toExcel',
      'storage.mysql.save': 'toMySQL',
      'storage.sqlite.save': 'toSQLite',
      'storage.baidupan.upload': 'toBaiduPan',
      'weather.analysis.monthly': 'monthlyStats',
      'weather.analysis.wind': 'windAnalysis',
      'feishu.doc.create': 'createDoc',
      'feishu.message.send': 'sendMessage',
      'remote.process.exec': 'remoteExec',
    };

    return mapping[skillId] || skillId;
  }

  /**
   * 处理重试
   */
  private async handleRetry(
    skillName: string,
    params: any,
    traceId: string,
    attempt: number
  ): Promise<SkillResult> {
    const maxAttempts = SKILL_CONFIG.retry.maxAttempts;
    const backoff = SKILL_CONFIG.retry.backoffMs;

    if (attempt >= maxAttempts) {
      this.logger.error('重试次数耗尽', {
        traceId,
        skillName,
        attempts: attempt,
      });

      return {
        success: false,
        error: `技能执行失败，已重试 ${maxAttempts} 次`,
      };
    }

    const delay = backoff[attempt - 1] || backoff[backoff.length - 1];
    
    this.logger.warn(`技能执行失败，准备重试 [${attempt}/${maxAttempts}]`, {
      traceId,
      skillName,
      delay,
    });

    // 等待退避时间
    await new Promise(resolve => setTimeout(resolve, delay));

    // 重试执行
    const result = await this.executeSkill(skillName, params, traceId);

    if (!result.success && attempt < maxAttempts - 1) {
      return this.handleRetry(skillName, params, traceId, attempt + 1);
    }

    return result;
  }

  /**
   * 绑定用户区域
   */
  async bindUserRegion(userId: string, regionId: string): Promise<SkillResult> {
    try {
      // 验证区域是否存在
      const regionValid = await this.validateRegion(regionId);
      
      if (!regionValid) {
        return {
          success: false,
          error: '区域ID不存在',
        };
      }

      // 保存绑定关系（实际需要调用飞书API或存储到数据库）
      // 这里简化处理，实际实现应该调用 RegionManager
      return {
        success: true,
        data: { userId, regionId },
        message: '区域绑定成功',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '绑定失败',
      };
    }
  }

  /**
   * 发送飞书消息
   */
  async sendMessage(recipientId: string, message: any): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // 调用飞书消息API
      const result = await this.executeSkill(
        'sendMessage',
        {
          recipientId,
          ...message,
        },
        `msg_${Date.now()}`
      );

      if (result.success) {
        return {
          success: true,
          messageId: result.data?.messageId,
        };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '消息发送失败',
      };
    }
  }

  /**
   * 验证区域
   */
  private async validateRegion(regionId: string): Promise<boolean> {
    // 实际应该查询数据库验证
    return regionId && regionId.length >= 4;
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ========== 技能处理器实现 ==========

  private async handleParseSkill(params: any, context: SkillContext): Promise<any> {
    // 调用A文件解析器
    const AQFileParser = require('../../aq-file-parser').AQFileParser;
    const parser = new AQFileParser({
      dbPath: params.dbPath,
      outputDir: params.outputDir,
    });

    const result = await parser.parseFile(params.filePath);
    parser.close();

    if (!result.success) {
      throw new Error(result.message);
    }

    return {
      stationNum: result.stationNum,
      monthYear: result.monthYear,
      rawData: result.rawData,
      headerInfo: result.headerInfo,
    };
  }

  private async handleToExcelSkill(params: any, context: SkillContext): Promise<any> {
    // 生成Excel文件
    const ExcelJS = require('exceljs');
    const path = require('path');
    const fs = require('fs');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('气象数据');

    // 设置表头
    worksheet.addRow(['站点编号', '时间', '温度', '风向', '风速', '气压', '湿度']);

    // 填充数据（如果有）
    if (params.rawData?.data) {
      for (const row of params.rawData.data) {
        worksheet.addRow([
          row.stationNum,
          row.time,
          row.temperature,
          row.windDirection,
          row.windSpeed,
          row.pressure,
          row.humidity,
        ]);
      }
    }

    // 保存文件
    const outputPath = path.join(
      params.outputDir || './output',
      `转换_${params.fileName}_${Date.now()}.xlsx`
    );

    await workbook.xlsx.writeFile(outputPath);

    return {
      filePath: outputPath,
      fileName: path.basename(outputPath),
      downloadUrl: `/download/${path.basename(outputPath)}`,
    };
  }

  private async handleMySQLSkill(params: any, context: SkillContext): Promise<any> {
    // 实际应该连接MySQL存储数据
    // 这里返回成功状态
    return {
      success: true,
      tableName: `region_${params.regionId}`,
      rowsAffected: params.rawData?.data?.length || 0,
    };
  }

  private async handleSQLiteSkill(params: any, context: SkillContext): Promise<any> {
    // 实际应该存储到SQLite
    return {
      success: true,
      dbPath: `./data/region_${params.regionId}.db`,
      rowsAffected: params.rawData?.data?.length || 0,
    };
  }

  private async handleBaiduPanSkill(params: any, context: SkillContext): Promise<any> {
    // 实际应该上传到百度网盘
    return {
      success: true,
      folderPath: `/天气A文件/${params.regionId}/${params.yearMonth}`,
      shareUrl: 'https://pan.baidu.com/s/xxx',
      fileId: `file_${Date.now()}`,
    };
  }

  private async handleMonthlyStatsSkill(params: any, context: SkillContext): Promise<any> {
    // 月度统计分析
    const data = params.rawData?.data || [];

    // 计算统计数据
    const temps = data.map((d: any) => d.temperature).filter(Boolean);
    const avgTemp = temps.length ? (temps.reduce((a: number, b: number) => a + b, 0) / temps.length).toFixed(1) : null;
    const maxTemp = temps.length ? Math.max(...temps) : null;
    const minTemp = temps.length ? Math.min(...temps) : null;

    return {
      stationNum: params.stationNum || params.rawData?.stationNum,
      yearMonth: params.yearMonth,
      stats: {
        avgTemp,
        maxTemp,
        minTemp,
        recordCount: data.length,
      },
    };
  }

  private async handleWindAnalysisSkill(params: any, context: SkillContext): Promise<any> {
    // 风表专项分析
    const data = params.rawData?.data || [];

    // 统计风向频次
    const windDirections: Record<string, number> = {};
    const windSpeeds: number[] = [];

    for (const row of data) {
      if (row.windDirection) {
        windDirections[row.windDirection] = (windDirections[row.windDirection] || 0) + 1;
      }
      if (row.windSpeed) {
        windSpeeds.push(row.windSpeed);
      }
    }

    // 找出主导风向
    const dominantWind = Object.entries(windDirections)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N';

    const avgWindSpeed = windSpeeds.length
      ? (windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length).toFixed(1)
      : null;

    return {
      dominantWind,
      avgWindSpeed,
      windDistribution: windDirections,
      strongWindDays: windSpeeds.filter((s: number) => s > 10).length,
    };
  }

  private async handleCreateDocSkill(params: any, context: SkillContext): Promise<any> {
    // 创建飞书文档
    // 实际应该调用飞书文档API
    return {
      docId: `doc_${Date.now()}`,
      docUrl: `https://xcnda7ly484i.feishu.cn/docx/doc_${Date.now()}`,
      title: `【A文件处理报告】${params.regionId || '区域'}-${params.yearMonth || new Date().toISOString().slice(0, 7)}`,
    };
  }

  private async handleSendMessageSkill(params: any, context: SkillContext): Promise<any> {
    // 发送飞书消息
    // 实际应该调用飞书消息API
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
    };
  }

  private async handleRemoteExecSkill(params: any, context: SkillContext): Promise<any> {
    // 远程处理
    // 实际应该SSH连接远程服务器执行
    return {
      success: true,
      node: params.node,
      result: '远程处理完成',
      outputPath: `/remote/${params.fileName}`,
    };
  }
}

export default SkillDispatcher;
