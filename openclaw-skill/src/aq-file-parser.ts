import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import ExcelJS from "exceljs";
import Database from "better-sqlite3";
import {
  BASE_START_LINES,
  DEFAULT_MONTH_CONFIG,
  WEATHER_CODE_MAP,
} from "./config";
import {
  FileHeader,
  MonthConfig,
  ParseResult,
  StartLines,
} from "./types";

/**
 * A/Q气象文件核心解析器
 * 100%对齐原C# AFileHelper.cs逻辑，支持本地开箱即用
 */
export class AQFileParser {
  private stationNum: string = "";
  private monthYear: string = "";
  private monthConfig!: MonthConfig;
  private db?: Database.Database;
  private readonly outputDir: string;

  /**
   * 初始化解析器
   * @param options.dbPath 本地SQLite数据库路径（可选，不填则不启用数据库存储）
   * @param options.outputDir 导出文件输出目录（默认./output）
   */
  constructor(options?: {
    dbPath?: string;
    outputDir?: string;
  }) {
    this.outputDir = options?.outputDir || path.resolve(process.cwd(), "output");
    // 初始化输出目录
    if (!existsSync(this.outputDir)) {
      fs.mkdir(this.outputDir, { recursive: true });
    }
    // 初始化数据库
    if (options?.dbPath) {
      this.db = new Database(options.dbPath);
      this.initDbTables();
    }
  }

  /**
   * 解析文件入口方法
   * @param filePath 本地A/Q文件路径
   * @returns 解析结果
   */
  public async parseFile(filePath: string): Promise<ParseResult> {
    try {
      console.log(`开始解析文件：${filePath}`);
      
      // 1. 文件合法性校验
      const validateResult = await this.validateFile(filePath);
      if (!validateResult.valid) {
        console.error(`❌ 文件校验失败：${validateResult.message}`);
        return {
          success: false,
          message: validateResult.message,
        };
      }

      // 2. 读取文件内容
      console.log("📄 开始读取文件内容...");
      const fileContent = await fs.readFile(filePath, "utf-8");
      const lines = fileContent.split(/\r?\n/).filter((line) => line.trim() !== "");
      
      if (lines.length === 0) {
        console.error("❌ 文件内容为空");
        return { success: false, message: "文件内容为空" };
      }
      
      console.log(`✅ 读取文件成功，共 ${lines.length} 行`);

      // 3. 解析文件头
      console.log("🔍 开始解析文件头...");
      const headerResult = this.parseHeader(lines[0]);
      if (!headerResult.success) {
        console.error(`❌ 文件头解析失败：${headerResult.message}`);
        return { success: false, message: headerResult.message };
      }
      
      const header = headerResult.data!;
      this.stationNum = header.stationNum;
      this.monthYear = header.monthYear;
      
      console.log(`✅ 文件头解析成功：站点 ${header.stationNum}，年月 ${header.monthYear}`);

      // 4. 初始化当月配置
      console.log("⚙️ 初始化当月配置...");
      try {
        this.monthConfig = this.getMonthConfig(header.month, header.year);
        console.log("✅ 配置初始化成功");
      } catch (error) {
        console.error(`❌ 配置初始化失败：${(error as Error).message}`);
        return { 
          success: false, 
          message: `配置初始化失败：${(error as Error).message}` 
        };
      }

      // 5. 区分A/Q文件执行解析
      const parseData: Record<string, any[]> = {};
      const contentLines = lines.slice(1);
      
      try {
        if (this.stationNum.startsWith("Q")) {
          console.log("📊 开始解析Q文件...");
          Object.assign(parseData, await this.parseQFile(contentLines));
        } else {
          console.log("📊 开始解析A文件...");
          Object.assign(parseData, await this.parseAFile(contentLines));
        }
        
        console.log(`✅ 文件解析成功，解析到 ${Object.keys(parseData).length} 张数据表`);
      } catch (error) {
        console.error(`❌ 文件解析失败：${(error as Error).message}`);
        return { 
          success: false, 
          message: `文件解析失败：${(error as Error).message}`,
          error: error as Error
        };
      }

      // 6. 导出Excel（默认开启）
      console.log("📝 开始导出Excel...");
      let excelPath: string;
      try {
        excelPath = await this.exportToExcel(header, parseData);
        console.log(`✅ Excel导出成功：${excelPath}`);
      } catch (error) {
        console.error(`❌ Excel导出失败：${(error as Error).message}`);
        // Excel导出失败不影响整体解析结果，但会在消息中提示
        return {
          success: true,
          message: `文件解析成功，但Excel导出失败：${(error as Error).message}`,
          stationNum: this.stationNum,
          monthYear: this.monthYear,
          data: parseData,
          error: error as Error
        };
      }

      // 7. 写入数据库（若开启）
      if (this.db) {
        console.log("💾 开始写入数据库...");
        try {
          this.saveToDatabase(header, parseData);
          console.log("✅ 数据库写入成功");
        } catch (error) {
          console.error(`❌ 数据库写入失败：${(error as Error).message}`);
          // 数据库写入失败不影响整体解析结果，但会在消息中提示
          return {
            success: true,
            message: `文件解析和Excel导出成功，但数据库写入失败：${(error as Error).message}`,
            stationNum: this.stationNum,
            monthYear: this.monthYear,
            data: parseData,
            error: error as Error
          };
        }
      }

      return {
        success: true,
        message: `解析成功，Excel导出路径：${excelPath}`,
        stationNum: this.stationNum,
        monthYear: this.monthYear,
        data: parseData,
      };
    } catch (error) {
      const err = error as Error;
      console.error(`❌ 解析过程中发生未捕获异常：${err.message}`);
      console.error(err.stack);
      return {
        success: false,
        message: `解析失败：${err.message}`,
        error: err,
      };
    }
  }

  // ==================== 核心解析流程 ====================
  /**
   * 解析Q文件（简化气象文件）
   */
  private async parseQFile(lines: string[]): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};
    // 判断文件类型
    const isSevenElements = this.checkMarkerExist(lines, "PC");
    const isEightElements = isSevenElements && this.checkMarkerExist(
      lines.slice(BASE_START_LINES.UB + this.monthConfig.takeUB + 3),
      "VB"
    );

    if (isSevenElements || isEightElements) {
      // 7/8要素文件解析
      const startLines = this.calculateQFileStartLines(isEightElements);
      const noWaterAllMonth = this.checkNoWaterAllMonth(lines, startLines.R61);

      // 读取核心要素
      result.pcdatatable = this.readDataSection(lines, "pcdatatable", startLines.PC, this.monthConfig.takePC);
      result.hpcdatatable = this.readDataSection(lines, "hpcdatatable", startLines.HPC, this.monthConfig.takeHPC);
      result.tbdatatable = this.readDataSection(lines, "tbdatatable", startLines.TB, this.monthConfig.takeTB);
      result.ibldatatable = this.readDataSection(lines, "ibldatatable", startLines.IBL, this.monthConfig.takeIBL);
      result.eadatatable = this.readDataSection(lines, "eadatatable", startLines.EA, this.monthConfig.takeEA);
      result.ubdatatable = this.readDataSection(lines, "ubdatatable", startLines.UB, this.monthConfig.takeUB);

      if (isEightElements) {
        result.vbdatatable = this.readDataSection(lines, "vbdatatable", startLines.VB, this.monthConfig.takeVB);
      }
      if (!noWaterAllMonth) {
        result.r61datatable = this.readDataSection(lines, "r61datatable", startLines.R61, this.monthConfig.takeR61);
        result.r62datatable = this.readDataSection(lines, "r62datatable", startLines.R62, this.monthConfig.takeR62);
      }

      // 风数据
      result.fn1datatable = this.readDataSection(lines, "fn1datatable", startLines.FN1, this.monthConfig.takeFN1);
      result.fn2datatable = this.readDataSection(lines, "fn2datatable", startLines.FN2, this.monthConfig.takeFN2);
      result.fn3datatable = this.readDataSection(lines, "fn3datatable", startLines.FN3, this.monthConfig.takeFN3);
    } else {
      // 2/3/6要素/单要素文件解析
      const isTwoThreeSixElements = this.checkMarkerExist(lines.slice(2), "TB");
      if (isTwoThreeSixElements) {
        const startTB = 3;
        const isTwoThreeElements = this.checkMarkerExist(
          lines.slice(startTB + this.monthConfig.takeTB),
          "IB"
        );
        if (isTwoThreeElements) {
          // 2/3要素解析
          const startR61 = startTB + this.monthConfig.takeTB + 8;
          const noWaterAllMonth = this.checkNoWaterAllMonth(lines, startR61);
          const startR62 = startR61 + this.monthConfig.takeR61;

          result.tbdatatable = this.readDataSection(lines, "tbdatatable", startTB, this.monthConfig.takeTB);
          if (!noWaterAllMonth) {
            result.r61datatable = this.readDataSection(lines, "r61datatable", startR61, this.monthConfig.takeR61);
            result.r62datatable = this.readDataSection(lines, "r62datatable", startR62, this.monthConfig.takeR62);
          }
          // 3要素风数据
          if (this.checkMarkerExist(lines.slice(startR62 + this.monthConfig.takeR62 + 5), "FN")) {
            const startFN1 = startR62 + this.monthConfig.takeR62 + 6;
            const startFN2 = startFN1 + this.monthConfig.takeFN1;
            const startFN3 = startFN2 + this.monthConfig.takeFN2;
            result.fn1datatable = this.readDataSection(lines, "fn1datatable", startFN1, this.monthConfig.takeFN1);
            result.fn2datatable = this.readDataSection(lines, "fn2datatable", startFN2, this.monthConfig.takeFN2);
            result.fn3datatable = this.readDataSection(lines, "fn3datatable", startFN3, this.monthConfig.takeFN3);
          }
        } else {
          // 6要素解析
          const startIBL = startTB + this.monthConfig.takeTB + 2;
          const startEA = startIBL + this.monthConfig.takeIBL + 1;
          const startUB = startEA + this.monthConfig.takeEA + 1;
          const startR61 = startUB + this.monthConfig.takeUB + 5;
          const noWaterAllMonth = this.checkNoWaterAllMonth(lines, startR61);
          const startR62 = startR61 + this.monthConfig.takeR61;
          const startFN1 = startR62 + this.monthConfig.takeR62 + 6;
          const startFN2 = startFN1 + this.monthConfig.takeFN1;
          const startFN3 = startFN2 + this.monthConfig.takeFN2;

          result.tbdatatable = this.readDataSection(lines, "tbdatatable", startTB, this.monthConfig.takeTB);
          result.ibldatatable = this.readDataSection(lines, "ibldatatable", startIBL, this.monthConfig.takeIBL);
          result.eadatatable = this.readDataSection(lines, "eadatatable", startEA, this.monthConfig.takeEA);
          result.ubdatatable = this.readDataSection(lines, "ubdatatable", startUB, this.monthConfig.takeUB);
          if (!noWaterAllMonth) {
            result.r61datatable = this.readDataSection(lines, "r61datatable", startR61, this.monthConfig.takeR61);
            result.r62datatable = this.readDataSection(lines, "r62datatable", startR62, this.monthConfig.takeR62);
          }
          result.fn1datatable = this.readDataSection(lines, "fn1datatable", startFN1, this.monthConfig.takeFN1);
          result.fn2datatable = this.readDataSection(lines, "fn2datatable", startFN2, this.monthConfig.takeFN2);
          result.fn3datatable = this.readDataSection(lines, "fn3datatable", startFN3, this.monthConfig.takeFN3);
        }
      } else {
        // 单要素（仅降水量）解析
        const startR61 = 11;
        const noWaterAllMonth = this.checkNoWaterAllMonth(lines, startR61);
        const startR62 = startR61 + this.monthConfig.takeR61;
        if (!noWaterAllMonth) {
          result.r61datatable = this.readDataSection(lines, "r61datatable", startR61, this.monthConfig.takeR61);
          result.r62datatable = this.readDataSection(lines, "r62datatable", startR62, this.monthConfig.takeR62);
        }
      }
    }
    return result;
  }

  /**
   * 解析标准A文件
   */
  private async parseAFile(lines: string[]): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};
    // 计算各数据段起始行
    const startLines = this.calculateAFileStartLines(lines);
    // 检查全月无降水
    const noWaterAllMonth = this.checkNoWaterAllMonth(lines, startLines.R61);

    // 核心要素读取
    result.pcdatatable = this.readDataSection(lines, "pcdatatable", startLines.PC, this.monthConfig.takePC);
    result.hpcdatatable = this.readDataSection(lines, "hpcdatatable", startLines.HPC, this.monthConfig.takeHPC);
    result.tbdatatable = this.readDataSection(lines, "tbdatatable", startLines.TB, this.monthConfig.takeTB);
    result.ibldatatable = this.readDataSection(lines, "ibldatatable", startLines.IBL, this.monthConfig.takeIBL);
    result.eadatatable = this.readDataSection(lines, "eadatatable", startLines.EA, this.monthConfig.takeEA);
    result.ubdatatable = this.readDataSection(lines, "ubdatatable", startLines.UB, this.monthConfig.takeUB);
    result.vbdatatable = this.readDataSection(lines, "vbdatatable", startLines.VB, this.monthConfig.takeVB);

    // 降水量
    if (!noWaterAllMonth) {
      result.r61datatable = this.readDataSection(lines, "r61datatable", startLines.R61, this.monthConfig.takeR61);
      result.r62datatable = this.readDataSection(lines, "r62datatable", startLines.R62, this.monthConfig.takeR62);
    }

    // 天气现象
    result.w0datatable = this.readDataSection(lines, "w0datatable", startLines.W0, this.monthConfig.takeW0);

    // 蒸发量（可选）
    if (startLines.LA !== -1) {
      result.ladatatable = this.readDataSection(lines, "ladatatable", startLines.LA, this.monthConfig.takeLA);
    }

    // 风数据
    result.fn1datatable = this.readDataSection(lines, "fn1datatable", startLines.FN1, this.monthConfig.takeFN1);
    result.fn2datatable = this.readDataSection(lines, "fn2datatable", startLines.FN2, this.monthConfig.takeFN2);
    result.fn3datatable = this.readDataSection(lines, "fn3datatable", startLines.FN3, this.monthConfig.takeFN3);

    // 浅层地温（6层）
    for (let i = 1; i <= 6; i++) {
      result[`db${i}datatable`] = this.readDataSection(
        lines,
        `db${i}datatable`,
        startLines[`DB${i}`],
        this.monthConfig.takeDB
      );
    }

    // 深层地温（3层）
    for (let i = 1; i <= 3; i++) {
      result[`kb${i}datatable`] = this.readDataSection(
        lines,
        `kb${i}datatable`,
        startLines[`KB${i}`],
        this.monthConfig.takeKB
      );
    }

    // 日照时数
    result.s2datatable = this.readDataSection(lines, "s2datatable", startLines.S2, this.monthConfig.takeS2);

    // 草面/雪面温度（可选）
    if (startLines.BA !== -1) {
      result.badatatable = this.readDataSection(lines, "badatatable", startLines.BA, this.monthConfig.takeBA);
    }

    return result;
  }

  // ==================== 工具方法（100%对齐原C#逻辑） ====================
  /**
   * 文件合法性校验
   */
  private async validateFile(filePath: string): Promise<{ valid: boolean; message: string }> {
    try {
      // 检查文件是否存在
      if (!existsSync(filePath)) {
        return { valid: false, message: `文件不存在：${filePath}` };
      }

      // 检查文件扩展名
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== ".txt" && ext !== ".A" && ext !== ".Q") {
        return { valid: false, message: `不支持的文件格式，仅支持TXT/A/Q文件` };
      }

      // 检查文件是否可读取
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return { valid: false, message: `${filePath} 不是一个有效的文件` };
      }

      // 检查文件大小合理性（不超过100MB）
      const maxFileSize = 100 * 1024 * 1024; // 100MB
      if (stats.size > maxFileSize) {
        return { valid: false, message: `文件过大，最大支持100MB，当前文件大小：${(stats.size / (1024 * 1024)).toFixed(2)}MB` };
      }

      // 检查文件是否为空
      if (stats.size === 0) {
        return { valid: false, message: `文件为空：${filePath}` };
      }

      return { valid: true, message: "校验通过" };
    } catch (error) {
      return { valid: false, message: `文件校验失败：${(error as Error).message}` };
    }
  }

  /**
   * 解析文件头
   */
  private parseHeader(headerLine: string): { success: boolean; message: string; data?: FileHeader } {
    const headers = headerLine.trim().split(/\s+/).filter((h) => h !== "");
    if (headers.length < 4) {
      return { success: false, message: "文件头格式错误，字段不足" };
    }
    const stationNum = headers[0];
    const longitude = headers[1];
    const latitude = headers[2];
    const year = headers.at(-2);
    const month = headers.at(-1);

    if (!year || !month || year.length !== 4 || month.length !== 2) {
      return { success: false, message: "文件头年月格式错误，应为YYYY MM" };
    }

    return {
      success: true,
      message: "解析成功",
      data: {
        stationNum,
        longitude,
        latitude,
        year,
        month,
        monthYear: `${year}${month}`,
      },
    };
  }

  /**
   * 获取月份配置（处理闰年2月、大月小月）
   */
  private getMonthConfig(month: string, year: string): MonthConfig {
    const yearNum = parseInt(year);
    if (month === "02") {
      // 闰年判断
      const dayInFeb = (yearNum % 4 === 0 && yearNum % 100 !== 0) || yearNum % 400 === 0 ? 29 : 28;
      return {
        takePC: dayInFeb,
        takeHPC: Math.floor(dayInFeb / 2),
        takeTB: dayInFeb,
        takeIBL: dayInFeb,
        takeEA: dayInFeb,
        takeUB: dayInFeb,
        takeVB: dayInFeb,
        takeR61: Math.floor(dayInFeb / 2),
        takeR62: dayInFeb,
        takeFN1: dayInFeb * 4,
        takeFN2: dayInFeb * 4,
        takeFN3: dayInFeb,
        takeDB: dayInFeb,
        takeKB: dayInFeb,
        takeS2: Math.floor(dayInFeb / 2),
        takeBA: dayInFeb,
        takeLA: dayInFeb,
        takeW0: dayInFeb,
      };
    }

    // 大月
    if (["01", "03", "05", "07", "08", "10", "12"].includes(month)) {
      return {
        takePC: 62,
        takeHPC: 31,
        takeTB: 62,
        takeIBL: 62,
        takeEA: 62,
        takeUB: 62,
        takeVB: 62,
        takeR61: 124,  // 四行表：31天 × 4行/天 = 124行
        takeR62: 62,
        takeFN1: 124,
        takeFN2: 124,
        takeFN3: 31,
        takeDB: 62,
        takeKB: 62,
        takeS2: 31,
        takeBA: 62,
        takeLA: 62,
        takeW0: 31,
      };
    }

    // 小月默认配置
    return DEFAULT_MONTH_CONFIG;
  }

  /**
   * 检查标记是否存在
   */
  private checkMarkerExist(lines: string[], marker: string): boolean {
    return lines.some((line) => line.trim() === marker);
  }

  /**
   * 查找标记所在行号
   */
  private findMarkerLine(lines: string[], startLine: number, takeCount: number, marker: string): number {
    const targetLines = lines.slice(startLine, startLine + takeCount);
    for (let i = 0; i < targetLines.length; i++) {
      if (targetLines[i].trim() === marker) {
        return startLine + i;
      }
    }
    return -1;
  }

  /**
   * 检查全月无降水标记（0=）
   */
  private checkNoWaterAllMonth(lines: string[], startR61: number): boolean {
    const firstLine = lines.at(startR61)?.trim();
    if (firstLine === "0=") {
      this.monthConfig.takeR61 = 1;
      this.monthConfig.takeR62 = 0;
      return true;
    }
    return false;
  }

  /**
   * 计算Q文件数据段起始行
   */
  private calculateQFileStartLines(isEightElements: boolean): StartLines {
    const startLines: StartLines = {
      PC: BASE_START_LINES.PC,
      HPC: BASE_START_LINES.PC + this.monthConfig.takePC,
      TB: BASE_START_LINES.HPC + this.monthConfig.takeHPC + 1,
      IBL: BASE_START_LINES.TB + this.monthConfig.takeTB + 2,
      EA: BASE_START_LINES.IBL + this.monthConfig.takeIBL + 1,
      UB: BASE_START_LINES.EA + this.monthConfig.takeEA + 1,
    };

    if (isEightElements) {
      startLines.VB = startLines.UB + this.monthConfig.takeUB + 4;
      startLines.R61 = startLines.VB + this.monthConfig.takeVB + 1;
    } else {
      startLines.R61 = startLines.UB + this.monthConfig.takeUB + 5;
    }

    startLines.R62 = startLines.R61 + this.monthConfig.takeR61;
    startLines.FN1 = startLines.R62 + this.monthConfig.takeR62 + 6;
    startLines.FN2 = startLines.FN1 + this.monthConfig.takeFN1;
    startLines.FN3 = startLines.FN2 + this.monthConfig.takeFN2;

    return startLines;
  }

  /**
   * 计算A文件数据段起始行（含动态查找）
   */
  private calculateAFileStartLines(lines: string[]): StartLines {
    const startLines: StartLines = {
      PC: BASE_START_LINES.PC,
      HPC: BASE_START_LINES.PC + this.monthConfig.takePC,
      TB: BASE_START_LINES.HPC + this.monthConfig.takeHPC + 1,
      IBL: BASE_START_LINES.TB + this.monthConfig.takeTB + 2,
      EA: BASE_START_LINES.IBL + this.monthConfig.takeIBL + 1,
      UB: BASE_START_LINES.EA + this.monthConfig.takeEA + 1,
      VB: BASE_START_LINES.UB + this.monthConfig.takeUB + 4,
      R61: BASE_START_LINES.VB + this.monthConfig.takeVB + 1,
      R62: BASE_START_LINES.R61 + this.monthConfig.takeR61,
      W0: BASE_START_LINES.R62 + this.monthConfig.takeR62 + 2,
    };

    // 动态查找蒸发量LA
    const laLine = this.findMarkerLine(lines, startLines.W0, 100, "LA");
    startLines.LA = laLine === -1 ? -1 : laLine + 2;

    // 计算后续起始行
    const startZ0 = startLines.LA === -1
      ? startLines.W0 + this.monthConfig.takeW0 + 1
      : startLines.LA + this.monthConfig.takeLA + 1;
    startLines.FN1 = startZ0 + 31 + 2;
    startLines.FN2 = startLines.FN1 + this.monthConfig.takeFN1;
    startLines.FN3 = startLines.FN2 + this.monthConfig.takeFN2;

    // 浅层地温6层
    startLines.DB1 = startLines.FN3 + this.monthConfig.takeFN3 + 1;
    startLines.DB2 = startLines.DB1 + this.monthConfig.takeDB;
    startLines.DB3 = startLines.DB2 + this.monthConfig.takeDB;
    startLines.DB4 = startLines.DB3 + this.monthConfig.takeDB;
    startLines.DB5 = startLines.DB4 + this.monthConfig.takeDB;
    startLines.DB6 = startLines.DB5 + this.monthConfig.takeDB;

    // 深层地温3层
    startLines.KB1 = startLines.DB6 + this.monthConfig.takeDB + 1;
    startLines.KB2 = startLines.KB1 + this.monthConfig.takeKB;
    startLines.KB3 = startLines.KB2 + this.monthConfig.takeKB;

    startLines.S2 = startLines.KB3 + this.monthConfig.takeKB + 2;

    // 动态查找草面温度BA
    const baLine = this.findMarkerLine(lines, startLines.S2, 1, "S=");
    startLines.BA = baLine === -1 ? -1 : baLine + 1;

    return startLines;
  }

  /**
   * 读取数据段并格式化
   */
  private readDataSection(lines: string[], tableName: string, startLine: number, takeCount: number): any[] {
    if (takeCount <= 0 || startLine >= lines.length) return [];
    const dataLines = lines.slice(startLine, startLine + takeCount);
    const result: any[] = [];

    // 特殊表处理：每天1行
    const isSingleLineTable = tableName === "s2datatable" || tableName === "w0datatable" || 
                             tableName === "fn3datatable" || tableName === "hpcdatatable";
    
    // 风相关表和逐小时降水量表：每天4行，每行6个值
    const isFourLineTable = tableName === "fn1datatable" || tableName === "fn1ddatatable" || 
                           tableName === "fn2datatable" || tableName === "fn2ddatatable" || 
                           tableName === "r61datatable";
    
    // 普通表：每天2行，每行12个值
    const isTwoLineTable = !isSingleLineTable && !isFourLineTable;

    let dayIndex = 0;
    let currentRow: Record<string, any> | null = null;
    let processedLines = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      const columns = line.split(/\s+/).filter((c) => c !== "");
      
      // 跳过非数据行：检查是否包含预期数量的数据列
      if (isFourLineTable && columns.length < 6) continue;
      if (isTwoLineTable && columns.length < 12) continue;
      if (isSingleLineTable && columns.length < 4) continue;
      
      processedLines++;

      if (isSingleLineTable) {
        // 特殊表：每天1行
        const row: Record<string, any> = {
          Id: dayIndex + 1,
          stationname: "罗田",
          stationnum: this.stationNum,
          monthyear: this.monthYear,
          createtime: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
          date: `${this.monthYear}${this.getDate(dayIndex + 1)}`,
        };

        // 根据表名特殊处理
        if (tableName === "hpcdatatable") {
          // 海气压表特殊处理
          row.h02 = this.formatValue(tableName, columns[0]);
          row.h08 = this.formatValue(tableName, columns[1]);
          row.h14 = this.formatValue(tableName, columns[2]);
          row.h20 = this.formatValue(tableName, columns[3]?.replace("=", ""));
          // 计算日平均
          const h2 = parseFloat(columns[0]) / 10;
          const h8 = parseFloat(columns[1]) / 10;
          const h14 = parseFloat(columns[2]) / 10;
          const h20 = parseFloat(columns[3]?.replace("=", "")) / 10;
          row.daverage = Math.round(((h2 + h8 + h14 + h20) / 4) * 10) / 10;
        } else if (tableName === "fn3datatable") {
          // 最大风极大风表特殊处理
          // 直接使用格式化后的值
          row.dmaxs = this.formatValue("fn3datatable", columns[0]);
          row.dmaxd = columns[1];
          row.dmaxtime = this.getTime(columns[2]);
          row.daymins = this.formatValue("fn3datatable", columns[3]);
          row.daymind = columns[4];
          row.dmintime = this.getTime(columns[5]?.replace("=", ""));
          // 保留原始值作为备份
          row.dmaxs_raw = columns[0];
          row.daymins_raw = columns[3];
        } else if (tableName === "w0datatable") {
          // 天气现象表特殊处理：解析天气现象代码，转换为中文描述并统计次数
          
          // 天气现象表特殊处理：解析天气现象代码，转换为中文描述并统计次数
          
          // 定义天气现象代码对应的统计列名（根据实际的WEATHER_CODE_MAP内容）
          // 动态创建天气现象统计列
          const weatherColumnMap: Record<string, string> = {
            // 直接从WEATHER_CODE_MAP获取所有可能的代码
            '01': 'tianqi01', // 露
            '02': 'tianqi02', // 雨
            '03': 'tianqi03', // 结冰
            '05': 'tianqi05', // 霾
            '06': 'tianqi06', // 浮沉
            '07': 'tianqi07', // 扬沙
            '10': 'tianqi10', // 轻雾
            '15': 'tianqi15', // 大风
            '16': 'tianqi16', // 积雪
            '31': 'tianqi31', // 沙尘暴
            '42': 'tianqi42', // 雾
            '48': 'tianqi48', // 雾凇
            '50': 'tianqi50', // 毛毛雨
            '56': 'tianqi56', // 雨凇
            '60': 'tianqi60', // 雨
            '68': 'tianqi68', // 雨夹雪
            '70': 'tianqi70', // 雪
            '80': 'tianqi80', // 阵雨
            '83': 'tianqi83', // 阵性雨夹雪
            '85': 'tianqi85', // 阵雪
            '89': 'tianqi89', // 冰雹
          };
          
          // 初始化所有天气现象统计为0
          for (const code in weatherColumnMap) {
            row[weatherColumnMap[code]] = 0;
          }
          
          // 处理天气现象数据（与C#实现保持一致）
          // W0行的整个行都是天气现象数据
          let tempStr = line.trim();
          if (tempStr.length > 1) {
            // 清理字符串格式（与C#实现一致）
            tempStr = tempStr.trim();
            // 移除末尾的结束标记
            if (tempStr.endsWith('.')) tempStr = tempStr.substring(0, tempStr.length - 1);
            tempStr = tempStr.split(')')[0].replace(';', ',');
            if (tempStr.startsWith('(')) tempStr = tempStr.substring(1);
            tempStr = tempStr.trim();
            
            // 分割并处理每个天气代码（空格分隔的四位数字）
            const codes = tempStr.split(/\s+/).filter(code => code.trim() !== '');
            const weatherDescriptions: string[] = [];
            
            for (const code of codes) {
              const trimmedCode = code.trim();
              if (!trimmedCode || trimmedCode.length !== 4) continue;
              
              // 提取天气代码（取后两位数字，因为四位代码格式为XXYY，其中YY是天气现象代码）
              const lastTwo = trimmedCode.substring(2, 4);
              
              if (WEATHER_CODE_MAP[lastTwo]) {
                weatherDescriptions.push(WEATHER_CODE_MAP[lastTwo]);
              }
              
              // 统计天气现象出现次数
              if (weatherColumnMap[lastTwo]) {
                row[weatherColumnMap[lastTwo]] = (row[weatherColumnMap[lastTwo]] || 0) + 1;
              }
            }
            
            // 去重并组合天气现象描述
            const uniqueDescriptions = [...new Set(weatherDescriptions)];
            row.tianqixianxiang = uniqueDescriptions.length > 0 ? uniqueDescriptions.join('、') : "无";
          } else {
            row.tianqixianxiang = "无";
          }
          
          // 移除小时数据（用户要求不显示小时数据）
          for (let i = 21; i <= 24; i++) {
            delete row[`h${i}`];
          }
          for (let i = 1; i <= 20; i++) {
            delete row[`h${i < 10 ? `0${i}` : i}`];
          }
        } else if (tableName === "s2datatable") {
          // 日照时数表特殊处理
          columns.forEach((col, index) => {
            const cleanCol = col.endsWith("=") ? col.substring(0, col.length - 1) : col;
            row[`col${index}`] = this.formatValue(tableName, cleanCol);
          });
        }

        result.push(row);
        dayIndex++;
      }
      else if (isFourLineTable) {
        // 四行表：每天4行，每行6个值
        const lineIndex = i % 4;
        
        if (lineIndex === 0) {
          // 开始新的一天
          currentRow = {
            Id: dayIndex + 1,
            stationname: "罗田",
            stationnum: this.stationNum,
            monthyear: this.monthYear,
            createtime: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
            date: `${this.monthYear}${this.getDate(dayIndex + 1)}`,
          };
          
          // 第1行：21-24时和01-02时
          // 确保只取前6个数据列，避免非数据列干扰
          const validColumns = columns.slice(0, 6);
          this.mapHourColumns(currentRow, validColumns, ["h21", "h22", "h23", "h24", "h01", "h02"], tableName);
        } else if (lineIndex === 1 && currentRow) {
          // 第2行：03-08时
          // 确保只取前6个数据列，避免非数据列干扰
          const validColumns = columns.slice(0, 6);
          this.mapHourColumns(currentRow, validColumns, ["h03", "h04", "h05", "h06", "h07", "h08"], tableName);
        } else if (lineIndex === 2 && currentRow) {
          // 第3行：09-14时
          // 确保只取前6个数据列，避免非数据列干扰
          const validColumns = columns.slice(0, 6);
          this.mapHourColumns(currentRow, validColumns, ["h09", "h10", "h11", "h12", "h13", "h14"], tableName);
        } else if (lineIndex === 3 && currentRow) {
          // 第4行：15-20时
          // 确保只取前6个数据列，避免非数据列干扰
          const validColumns = columns.slice(0, 6);
          this.mapHourColumns(currentRow, validColumns, ["h15", "h16", "h17", "h18", "h19", "h20"], tableName);
          
          if (tableName === "r61datatable") {
            // 降水量表特殊处理：计算日合计
            const hourColumns = [
              "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04",
              "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12",
              "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
            ];
            
            // 计算日合计
            const total = hourColumns.reduce((sum, hour) => {
              return sum + ((currentRow as any)[hour] || 0);
            }, 0);
            
            (currentRow as any).htotal = Math.round(total * 10) / 10;
            (currentRow as any).h01days = (currentRow as any).htotal >= 0.1 ? 1 : 0;
            (currentRow as any).h50days = (currentRow as any).htotal >= 50 ? 1 : 0;
          } else {
            // 风数据处理：计算日平均值、日最大值和日最小值
            const hourColumns = [
              "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04", "h05", "h06", "h07", "h08",
              "h09", "h10", "h11", "h12", "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
            ];
            
            // 收集所有有效小时值
            const hourValues: number[] = [];
            for (const hour of hourColumns) {
              const value = currentRow[hour];
              if (typeof value === "number" && !isNaN(value)) {
                hourValues.push(value);
              }
            }
            
            if (hourValues.length > 0) {
              // 计算日平均值
              const h2 = currentRow.h02 || 0;
              const h8 = currentRow.h08 || 0;
              const h14 = currentRow.h14 || 0;
              const h20 = currentRow.h20 || 0;
              currentRow.daverage = Math.round(((h2 + h8 + h14 + h20) / 4) * 10) / 10;
              
              // 计算日最大值和日最小值
              currentRow.dmaxs = Math.max(...hourValues);
              currentRow.daymins = Math.min(...hourValues);
              
              // 计算最大值和最小值出现的时间
              const maxIndex = hourValues.indexOf(currentRow.dmaxs);
              const minIndex = hourValues.indexOf(currentRow.daymins);
              currentRow.dmaxtime = `${maxIndex + 21 > 24 ? maxIndex + 21 - 24 : maxIndex + 21}时`;
              currentRow.dmintime = `${minIndex + 21 > 24 ? minIndex + 21 - 24 : minIndex + 21}时`;
            } else {
              currentRow.daverage = null;
              currentRow.dmaxs = null;
              currentRow.daymins = null;
            }
          }
          
          result.push(currentRow);
          currentRow = null;
          dayIndex++;
        }
      }
      else if (isTwoLineTable) {
        // 普通表：每天2行，每行12个值
        const lineIndex = i % 2;
        
        if (lineIndex === 0) {
          // 开始新的一天
          currentRow = {
            Id: dayIndex + 1,
            stationname: "罗田",
            stationnum: this.stationNum,
            monthyear: this.monthYear,
            createtime: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
            date: `${this.monthYear}${this.getDate(dayIndex + 1)}`,
          };
          
          // 第1行：21-24时和01-08时
          // 确保只取前12个数据列，避免非数据列干扰
          const validColumns = columns.slice(0, 12);
          this.mapHourColumns(currentRow, validColumns, ["h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04", "h05", "h06", "h07", "h08"], tableName);
        } else if (lineIndex === 1 && currentRow) {
          // 第2行：09-20时
          // 确保只取前12个数据列，避免非数据列干扰
          const validColumns = columns.slice(0, 12);
          this.mapHourColumns(currentRow, validColumns, ["h09", "h10", "h11", "h12", "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"], tableName);
          
          // 计算统计值
          const hourColumns = [
            "h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04", "h05", "h06", "h07", "h08",
            "h09", "h10", "h11", "h12", "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"
          ];
          this.calculateStatistics(currentRow, tableName, hourColumns);
          
          result.push(currentRow);
          currentRow = null;
          dayIndex++;
        }
      }
    }
    return result;
  }

  /**
   * 将列映射到小时字段
   */
  private mapHourColumns(row: Record<string, any>, columns: string[], hourColumns: string[], tableName: string): void {
    columns.forEach((col, index) => {
      if (index < hourColumns.length) {
        // 移除末尾的等号
        const cleanCol = col.endsWith("=") ? col.substring(0, col.length - 1) : col;
        const value = this.formatValue(tableName, cleanCol);
        // 只设置非null值
        if (value !== null) {
          row[hourColumns[index]] = value;
        }
      }
    });
  }

  /**
   * 数值格式化（100%对齐原C# GetDecimal逻辑）
   */
  private formatValue(tableName: string, value: string): number | null {
    const lowerTableName = tableName.toLowerCase();
    
    // 辅助函数：检查字符串是否为空或空白
    const isNullOrWhiteSpace = (str: string): boolean => {
      return str === null || str === undefined || str.trim() === "";
    };
    
    // 统一处理空值或无效值
    if (isNullOrWhiteSpace(value) || value === "////" || value === "/////" || value === "//////" || value === "NaN") {
      return null;
    }
    
    // 辅助函数：安全解析浮点数
    const safeParseFloat = (str: string, defaultValue: number = 0): number => {
      const result = parseFloat(str);
      return isNaN(result) ? defaultValue : result;
    };

    // 特殊标记处理
    if (value.includes("PPC") || value === "C") {
      return 0;
    }
    
    if (value === "%%") {
      return 100;
    }

    // 各表特殊处理逻辑
    switch(lowerTableName) {
      case "ibldatatable":
        if (value === ",,,,") return -10;
        if (value.startsWith(",")) return -safeParseFloat(value.substring(1, 4)) / 10;
        return safeParseFloat(value) / 10;
        
      case "fn1datatable":
      case "fn2datatable":
        return safeParseFloat(value.substring(3, 6)) / 10;
        
      case "fn1ddatatable":
      case "fn2ddatatable":
        return safeParseFloat(value.substring(0, 3));
        
      case "fn3datatabled":
        return safeParseFloat(value.substring(3, 6));
        
      case "fn3datatable":
        return safeParseFloat(value.substring(0, 3)) / 10;
        
      case "pcdatatable":
      case "hpcdatatable":
        if (value.startsWith("0")) {
          return 1000 + safeParseFloat(value) / 10;
        }
        return safeParseFloat(value) / 10;
        
      case "vbdatatable":
        return safeParseFloat(value);
        
      case "r61datatable":
        if (value === ",,,,") return 0.01;
        return safeParseFloat(value) / 10;
        
      case "r62datatable":
        if (value.startsWith(";")) return 1000 + safeParseFloat(value.substring(1, 4));
        if (value.startsWith(":")) return 2000 + safeParseFloat(value.substring(1, 4));
        if (value.startsWith("/")) return 0;
        return safeParseFloat(value) / 10;
        
      case "ladatatable":
        if (value.startsWith(">")) return safeParseFloat(value.substring(1, 4));
        if (value === "///" || value === ",,,") return 0;
        return safeParseFloat(value) / 10;
        
      case "s2datatable":
        if (value === "NN") return 0;
        return safeParseFloat(value) / 10;
        
      case "ubdatatable":
        if (value === "//") return 0;
        return safeParseFloat(value);
        
      case "eadatatable":
        if (value === "///") return 0;
        return safeParseFloat(value) / 10;
        
      // 其他表的默认处理
      default:
        if (value === "////") return 0;
        return safeParseFloat(value) / 10;
    }
  }

  /**
   * 计算统计值（日最大值、最小值、平均值）
   */
  private calculateStatistics(row: Record<string, any>, tableName: string, hourColumns: string[]): void {
    // 提取24小时数据值
    const hourValues: number[] = [];
    for (const hourCol of hourColumns) {
      const value = row[hourCol];
      if (typeof value === "number" && !isNaN(value)) {
        hourValues.push(value);
      }
    }

    if (hourValues.length === 0) {
      // 确保即使没有有效小时值，统计字段也会被设置为null
      row.daymax = null;
      row.daymin = null;
      row.daverage = null;
      return;
    }

    // 计算最大值和最小值
    const maxValue = Math.max(...hourValues);
    const minValue = Math.min(...hourValues);
    const maxIndex = hourValues.indexOf(maxValue);
    const minIndex = hourValues.indexOf(minValue);

    // 设置统计值字段
    row.daymax = maxValue;
    row.dmaxtime = `${maxIndex + 1}时`;
    row.daymin = minValue;
    row.dmintime = `${minIndex + 1}时`;

    // 计算日平均值（特殊表处理）
    if (tableName === "ibldatatable" || tableName === "ladatatable" || tableName === "eadatatable" || 
        tableName.startsWith("db") || tableName.startsWith("kb")) {
      // 某些表使用4个特定时间点的平均值
      const hourlyValues: number[] = [row.h02, row.h08, row.h14, row.h20].filter(val => typeof val === "number" && !isNaN(val));
      if (hourlyValues.length > 0) {
        const sum = hourlyValues.reduce((acc, val) => acc + val, 0);
        row.daverage = Math.round((sum / hourlyValues.length) * 10) / 10;
      } else {
        row.daverage = null;
      }
    } else if (tableName === "ubdatatable") {
      // 相对湿度使用4个特定时间点的平均值，取整数
      const hourlyValues: number[] = [row.h02, row.h08, row.h14, row.h20].filter(val => typeof val === "number" && !isNaN(val));
      if (hourlyValues.length > 0) {
        const sum = hourlyValues.reduce((acc, val) => acc + val, 0);
        row.daverage = Math.round(sum / hourlyValues.length);
      } else {
        row.daverage = null;
      }
    } else if (tableName === "r62datatable") {
      // 逐小时降水量计算总量
      const total = hourValues.reduce((sum, val) => sum + val, 0);
      row.daytotal = Math.round(total * 10) / 10;
    } else if (tableName !== "r61datatable") {
      // 默认情况：计算所有小时值的平均值
      const avg = hourValues.reduce((sum, val) => sum + val, 0) / hourValues.length;
      row.daverage = Math.round(avg * 10) / 10;
    }
    
    // 确保所有统计值都有效
    if (isNaN(row.daymax)) row.daymax = null;
    if (isNaN(row.daymin)) row.daymin = null;
    if (row.daverage !== null && isNaN(row.daverage)) row.daverage = null;
  }

  /**
   * 时间格式化
   */
  private getTime(timeStr: string): string {
    if (!timeStr) return "";
    // 转换为 HH时MM分格式
    const hour = timeStr.substring(0, 2);
    const minute = timeStr.substring(2, 4);
    return `${hour}时${minute}分`;
  }

  /**
   * 日期格式化（补零）
   */
  private getDate(day: number): string {
    return day.toString().padStart(2, "0");
  }

  // ==================== 本地存储能力 ====================
  /**
   * 初始化数据库表
   */
  private initDbTables() {
    if (!this.db) return;
    // 通用表结构创建
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weather_file_header (
        id TEXT PRIMARY KEY,
        station_num TEXT NOT NULL,
        month_year TEXT NOT NULL,
        longitude TEXT,
        latitude TEXT,
        file_path TEXT,
        create_time TEXT NOT NULL,
        UNIQUE(station_num, month_year)
      );
    `);
  }

  /**
   * 数据写入数据库
   */
  private saveToDatabase(header: FileHeader, data: Record<string, any[]>) {
    if (!this.db) return;
    const db = this.db;
    
    try {
      const tx = db.transaction(() => {
        // 写入文件头
        try {
          db.prepare(`
            INSERT OR REPLACE INTO weather_file_header 
            (id, station_num, month_year, longitude, latitude, create_time)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            `${header.stationNum}${header.monthYear}`,
            header.stationNum,
            header.monthYear,
            header.longitude,
            header.latitude,
            new Date().toISOString()
          );
        } catch (error) {
          // 如果weather_file_header表不存在，创建它
          db.exec(`CREATE TABLE IF NOT EXISTS weather_file_header (
            id TEXT PRIMARY KEY,
            station_num TEXT,
            month_year TEXT,
            longitude REAL,
            latitude REAL,
            create_time TEXT
          )`);
          // 重新插入
          db.prepare(`
            INSERT OR REPLACE INTO weather_file_header 
            (id, station_num, month_year, longitude, latitude, create_time)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            `${header.stationNum}${header.monthYear}`,
            header.stationNum,
            header.monthYear,
            header.longitude,
            header.latitude,
            new Date().toISOString()
          );
        }

        // 动态创建表并写入数据
        for (const [tableName, rows] of Object.entries(data)) {
          if (rows.length === 0) continue;
          // 动态创建表
          const firstRow = rows[0];
          if (!firstRow) continue;
          
          // 创建表的安全实现，使用IF NOT EXISTS避免重复创建
          const columns = Object.keys(firstRow)
            .map((key) => `${key} TEXT`)
            .join(", ");
          db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`);
          
          // 更新表结构，添加缺失的字段
          try {
            const tableInfo = db.pragma(`table_info(${tableName})`) as Array<{name: string}>;
            const existingColumns = new Set(
              tableInfo.map((col) => col.name)
            );
            const requiredColumns = Object.keys(firstRow);
            
            for (const col of requiredColumns) {
              if (!existingColumns.has(col)) {
                db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${col} TEXT`);
              }
            }
          } catch (error) {
            console.error(`Error updating table structure for ${tableName}:`, error);
            // 如果更新表结构失败，跳过该表的数据插入
            continue;
          }
        
          // 批量插入数据 - 优化性能：使用better-sqlite3的批量插入
          try {
            const columnNames = Object.keys(firstRow);
            const placeholders = columnNames.map(() => "?").join(", ");
            const insertStmt = db.prepare(`
              INSERT INTO ${tableName} (${columnNames.join(", ")})
              VALUES (${placeholders})
            `);
            
            // 使用better-sqlite3的批量插入优化
            const insertBatch = db.transaction((batchRows: any[]) => {
              for (const row of batchRows) {
                // 确保每行数据的字段数量与表结构一致
                const values = columnNames.map(col => row[col] || "");
                insertStmt.run(values);
              }
            });
            
            // 分批次插入，每批次100行
            const batchSize = 100;
            for (let i = 0; i < rows.length; i += batchSize) {
              const batch = rows.slice(i, i + batchSize);
              insertBatch(batch);
            }
          } catch (error) {
            console.error(`Error inserting data into ${tableName}:`, error);
            // 记录错误但不中断整个事务
            continue;
          }
        }
      });
      
      tx();
      console.log("✅ 数据已成功写入数据库");
    } catch (error) {
      console.error("❌ 数据库操作失败:", error);
      throw new Error(`数据库操作失败: ${(error as Error).message}`);
    }
  }

  /**
   * 计算天气现象月度统计
   * @param weatherData 天气现象数据
   * @returns 月度统计结果
   */
  private calculateMonthlyWeatherStats(weatherData: any[]): Record<string, number> {
    const stats: Record<string, number> = {};
    
    // 初始化所有天气现象统计为0
    Object.values(WEATHER_CODE_MAP).forEach(description => {
      stats[description] = 0;
    });
    
    // 统计每个天气现象在整个月中的出现次数
    for (const dayData of weatherData) {
      // 遍历所有天气现象统计列
      for (const key in dayData) {
        if (key.startsWith('tianqi') && dayData[key] > 0) {
          // 获取天气代码（如 'tianqi05' -> '05'）
          const code = key.substring(6);
          // 获取对应的中文描述
          const description = WEATHER_CODE_MAP[code];
          if (description) {
            stats[description] = (stats[description] || 0) + dayData[key];
          }
        }
      }
    }
    
    return stats;
  }

  /**
   * 计算通用月度统计（针对不同类型的数据表）
   * @param tableName 数据表名
   * @param data 数据数组
   * @returns 月度统计结果
   */
  private calculateMonthlyStats(tableName: string, data: any[]): any {
    if (!data || data.length === 0) {
      return null;
    }
    
    const stats: any = {
      tableName,
      monthYear: data[0].monthyear || '',
      stationNum: data[0].stationnum || '',
      stationName: data[0].stationname || ''
    };
    
    // 根据不同的数据表类型应用不同的统计逻辑
    if (['badatatable', 'kb1datatable', 'kb2datatable', 'kb3datatable', 'db1datatable', 
        'db2datatable', 'db3datatable', 'db4datatable', 'db5datatable', 'db6datatable',
        'pcdatatable', 'hpcdatatable', 'tbdatatable', 'ibldatatable', 'eadatatable', 
        'ubdatatable', 'vbdatatable', 'ladatatable'].includes(tableName)) {
      // 筛选有效数据（排除null和NaN）
      const validData = data.filter(item => 
        item.daverage !== null && !isNaN(item.daverage) &&
        item.daymax !== null && !isNaN(item.daymax) &&
        item.daymin !== null && !isNaN(item.daymin)
      );
      
      if (validData.length === 0) return null;
      
      // 统计daverage的平均值
      const sum = validData.reduce((acc, dayData) => acc + dayData.daverage, 0);
      stats.monthlyAverage = parseFloat((sum / validData.length).toFixed(1));
      
      // 统计daymax的最大值和对应时间
      const maxItem = validData.reduce((max, current) => {
        return current.daymax > max.daymax ? current : max;
      }, validData[0]);
      stats.maxValue = maxItem.daymax;
      stats.maxValueTime = maxItem.dmaxtime || '';
      stats.maxValueDate = maxItem.date || '';
      
      // 统计daymin的最小值和对应时间
      const minItem = validData.reduce((min, current) => {
        return current.daymin < min.daymin ? current : min;
      }, validData[0]);
      stats.minValue = minItem.daymin;
      stats.minValueTime = minItem.dmintime || '';
      stats.minValueDate = minItem.date || '';
    } 
    else if (tableName === 's2datatable' || tableName === 'r61datatable' || tableName === 'r62datatable') {
      // 筛选有效数据（排除null和NaN）
      const validData = data.filter(item => 
        item.daytotal !== null && !isNaN(item.daytotal) &&
        item.daymax !== null && !isNaN(item.daymax) &&
        item.daymin !== null && !isNaN(item.daymin)
      );
      
      if (validData.length === 0) return null;
      
      // 统计daytotal的总和
      const total = validData.reduce((acc, dayData) => acc + dayData.daytotal, 0);
      stats.monthlyTotal = parseFloat(total.toFixed(1));
      
      // 统计daymax的最大值
      const maxItem = validData.reduce((max, current) => {
        return current.daymax > max.daymax ? current : max;
      }, validData[0]);
      stats.maxValue = maxItem.daymax;
      stats.maxValueDate = maxItem.date || '';
      
      // 统计daymin的最小值
      const minItem = validData.reduce((min, current) => {
        return current.daymin < min.daymin ? current : min;
      }, validData[0]);
      stats.minValue = minItem.daymin;
      stats.minValueDate = minItem.date || '';
    }
    else if (tableName === 'fn1datatable' || tableName === 'fn2datatable' || tableName === 'fn3datatable') {
      // 风速相关表的统计
      // 筛选有效数据（排除null和NaN）
      const validData = data.filter(item => 
        item.daverage !== null && !isNaN(item.daverage) &&
        item.dmaxs !== null && !isNaN(item.dmaxs) &&
        item.daymins !== null && !isNaN(item.daymins)
      );
      
      if (validData.length === 0) return null;
      
      const sum = validData.reduce((acc, dayData) => acc + dayData.daverage, 0);
      stats.monthlyAverage = parseFloat((sum / validData.length).toFixed(1));
      
      // 统计最大风速
      const maxWindItem = validData.reduce((max, current) => {
        return current.dmaxs > max.dmaxs ? current : max;
      }, validData[0]);
      stats.maxWindSpeed = maxWindItem.dmaxs;
      stats.maxWindDirection = maxWindItem.dmaxd || '';
      stats.maxWindDate = maxWindItem.date || '';
      
      // 统计极大风速
      const extremeWindItem = validData.reduce((max, current) => {
        return current.daymins > max.daymins ? current : max;
      }, validData[0]);
      stats.extremeWindSpeed = extremeWindItem.daymins;
      stats.extremeWindDirection = extremeWindItem.daymind || '';
      stats.extremeWindDate = extremeWindItem.date || '';
    }
    
    return stats;
  }

  /**
   * 导出Excel文件
   */
  private async exportToExcel(header: FileHeader, data: Record<string, any[]>): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    
    // 要素名称映射
    const elementNameMap: Record<string, string> = {
      pcdatatable: "气压",
      hpcdatatable: "海气压",
      tbdatatable: "气温",
      ibldatatable: "露点温度",
      eadatatable: "水汽压",
      ubdatatable: "相对湿度",
      vbdatatable: "能见度",
      r61datatable: "逐日累积降水量",
      r62datatable: "逐小时降水量",
      w0datatable: "天气现象",
      ladatatable: "蒸发量",
      fn1datatable: "二分钟平均风速",
      fn2datatable: "十分钟平均风速",
      fn3datatable: "最大风极大风",
      db1datatable: "0CM浅层地温",
      db2datatable: "5CM浅层地温",
      db3datatable: "10CM浅层地温",
      db4datatable: "15CM浅层地温",
      db5datatable: "20CM浅层地温",
      db6datatable: "40CM浅层地温",
      kb1datatable: "80CM深层地温",
      kb2datatable: "160CM深层地温",
      kb3datatable: "320CM深层地温",
      s2datatable: "日照时数",
      badatatable: "草面（雪面）温度"
    };
    
    // 基础信息sheet
    const infoSheet = workbook.addWorksheet("文件信息");
    infoSheet.columns = [
      { header: "站点编号", key: "stationNum", width: 15 },
      { header: "年月", key: "monthYear", width: 12 },
      { header: "经度", key: "longitude", width: 15 },
      { header: "纬度", key: "latitude", width: 15 },
      { header: "解析时间", key: "parseTime", width: 25 },
    ];
    infoSheet.addRow({
      stationNum: header.stationNum,
      monthYear: header.monthYear,
      longitude: header.longitude,
      latitude: header.latitude,
      parseTime: new Date().toLocaleString("zh-CN"),
    });

    // 每个要素一个sheet
    for (const [tableName, rows] of Object.entries(data)) {
      if (rows.length === 0) continue;
      
      // 使用中文要素名称作为sheet名
      const sheetName = elementNameMap[tableName] || tableName;
      const sheet = workbook.addWorksheet(sheetName);
      
      // 字段名映射
      const fieldNameMap: Record<string, string> = {
        Id: "序号",
        stationname: "站点名称",
        stationnum: "站号",
        monthyear: "年月",
        createtime: "创建时间",
        date: "日期",
        // 天气现象统计列（与实际的WEATHER_CODE_MAP对应）
        tianqi01: "露",
        tianqi02: "雨",
        tianqi03: "结冰",
        tianqi05: "霾",
        tianqi06: "浮沉",
        tianqi07: "扬沙",
        tianqi10: "轻雾",
        tianqi15: "大风",
        tianqi16: "积雪",
        tianqi31: "沙尘暴",
        tianqi42: "雾",
        tianqi48: "雾凇",
        tianqi50: "毛毛雨",
        tianqi56: "雨凇",
        tianqi60: "雨",
        tianqi68: "雨夹雪",
        tianqi70: "雪",
        tianqi80: "阵雨",
        tianqi83: "阵性雨夹雪",
        tianqi85: "阵雪",
        tianqi89: "冰雹",
        // 小时字段（如果有需要可以显示）
        h21: "21时",
        h22: "22时",
        h23: "23时",
        h24: "24时",
        h01: "01时",
        h02: "02时",
        h03: "03时",
        h04: "04时",
        h05: "05时",
        h06: "06时",
        h07: "07时",
        h08: "08时",
        h09: "09时",
        h10: "10时",
        h11: "11时",
        h12: "12时",
        h13: "13时",
        h14: "14时",
        h15: "15时",
        h16: "16时",
        h17: "17时",
        h18: "18时",
        h19: "19时",
        h20: "20时",
        // 统计字段
        daymax: "日最大值",
        dmaxtime: "最大值时间",
        daymin: "日最小值",
        dmintime: "最小值时间",
        daverage: "日平均值",
        daytotal: "日总量",
        h2008: "20-08时",
        h0820: "08-20时",
        h2020: "20-20时",
        htotal: "日合计",
        h01days: "≥0.1mm天数",
        h50days: "≥50mm天数",
        dmaxs: "最大风速",
        dmaxd: "最大风向",
        daymins: "极大风速",
        daymind: "极大风向",
        tianqixianxiang: "天气现象"
      };
      
      // 确保列按照固定顺序排列，避免因Object.keys()顺序不确定导致的问题
      // 基础字段
      const baseColumns = ["Id", "stationname", "stationnum", "monthyear", "createtime", "date"];
      // 按时间顺序排列的小时字段（注意：与解析顺序一致）
      const timeColumns = ["h21", "h22", "h23", "h24", "h01", "h02", "h03", "h04", 
                          "h05", "h06", "h07", "h08", "h09", "h10", "h11", "h12", 
                          "h13", "h14", "h15", "h16", "h17", "h18", "h19", "h20"];
      // 统计字段
      const statColumns = ["daymax", "dmaxtime", "daymin", "dmintime", "daverage", "daytotal", 
                          "htotal", "h2008", "h0820", "h2020", "h01days", "h50days", 
                          "dmaxs", "dmaxd", "daymins", "daymind", "tianqixianxiang"];
      
      // 合并所有列并去重：只添加数据中实际存在的统计列
      const dataKeys = Object.keys(rows[0]);
      const actualStatColumns = statColumns.filter(col => dataKeys.includes(col));
      
      // 天气现象表特殊处理：不包含小时字段
      let sortedColumns: string[];
      if (tableName === "w0datatable") {
        // 收集所有天气现象统计字段（tianqi01到tianqi27）
        const weatherStatColumns = dataKeys.filter(key => key.startsWith('tianqi'));
        
        // 天气现象表列顺序：基础字段 -> 天气现象统计字段 -> 天气现象描述
        sortedColumns = [
          ...baseColumns,
          ...weatherStatColumns,
          'tianqixianxiang'
        ];
      } else {
        // 其他表保持原有逻辑
        const allColumns = [...new Set([...baseColumns, ...timeColumns, ...actualStatColumns, ...dataKeys])];
        
        // 确保基础字段和时间字段始终存在
        baseColumns.forEach(col => {
          if (!allColumns.includes(col)) {
            allColumns.push(col);
          }
        });
        timeColumns.forEach(col => {
          if (!allColumns.includes(col)) {
            allColumns.push(col);
          }
        });
        
        // 重新排序：基础字段 -> 时间字段 -> 实际存在的统计字段
        sortedColumns = [
          ...baseColumns,
          ...timeColumns,
          ...actualStatColumns.filter(col => !baseColumns.includes(col) && !timeColumns.includes(col))
        ];
      }
      
      // 设置列
      sheet.columns = sortedColumns.map((key) => ({
        header: fieldNameMap[key] || key,
        key,
        width: 15,
      }));
      
      // 确保数据处理逻辑正确，只处理存在的字段
      const processedRows = rows.map(row => {
        const processedRow: Record<string, any> = { ...row };
        
        // 天气现象表特殊处理：不添加小时字段（用户要求不显示小时数据）
        if (tableName !== "w0datatable") {
          // 确保所有小时字段都有值（不修改有效数据，仅保证字段存在）
          timeColumns.forEach(hour => {
            if (!(hour in processedRow)) {
              processedRow[hour] = 0;
            }
          });
        }
        
        return processedRow;
      });
      
      // 写入数据
      sheet.addRows(processedRows);
      
      // 添加月度统计（天气现象表已在单独部分处理）
      if (tableName !== 'w0datatable') {
        const monthlyStats = this.calculateMonthlyStats(tableName, rows);
        if (monthlyStats) {
          // 添加空行分隔
          sheet.addRow([]);
          
          // 添加月度统计标题
          const titleRow = sheet.addRow(['月度统计']);
          titleRow.font = { bold: true, size: 16 };
          sheet.mergeCells(titleRow.number, 1, titleRow.number, 2);
          
          // 添加统计数据
          if (['badatatable', 'kb1datatable', 'kb2datatable', 'kb3datatable', 'db1datatable', 
              'db2datatable', 'db3datatable', 'db4datatable', 'db5datatable', 'db6datatable',
              'pcdatatable', 'hpcdatatable', 'tbdatatable', 'ibldatatable', 'eadatatable', 
              'ubdatatable', 'vbdatatable', 'ladatatable'].includes(tableName)) {
            // 温度/气压/湿度类型的统计
            sheet.addRow(['月度平均值', monthlyStats.monthlyAverage]);
            sheet.addRow(['最大值', monthlyStats.maxValue, `出现时间: ${monthlyStats.maxValueDate} ${monthlyStats.maxValueTime}`]);
            sheet.addRow(['最小值', monthlyStats.minValue, `出现时间: ${monthlyStats.minValueDate} ${monthlyStats.minValueTime}`]);
          } else if (tableName === 's2datatable' || tableName === 'r61datatable' || tableName === 'r62datatable') {
            // 日照时数类型的统计
            sheet.addRow(['月度总日照', monthlyStats.monthlyTotal]);
            sheet.addRow(['最大日日照', monthlyStats.maxValue, `出现日期: ${monthlyStats.maxValueDate}`]);
            sheet.addRow(['最小日日照', monthlyStats.minValue, `出现日期: ${monthlyStats.minValueDate}`]);
          } else if (tableName === 'fn1datatable' || tableName === 'fn2datatable' || tableName === 'fn3datatable') {
            // 风速类型的统计
            sheet.addRow(['月度平均风速', monthlyStats.monthlyAverage]);
            sheet.addRow(['最大风速', monthlyStats.maxWindSpeed, `风向: ${monthlyStats.maxWindDirection}, 出现日期: ${monthlyStats.maxWindDate}`]);
            sheet.addRow(['极大风速', monthlyStats.extremeWindSpeed, `风向: ${monthlyStats.extremeWindDirection}, 出现日期: ${monthlyStats.extremeWindDate}`]);
          }
        }
      }
    }

    // 添加天气现象月度统计（直接添加到天气现象工作表底部）
    if (data['w0datatable'] && data['w0datatable'].length > 0) {
      const weatherSheet = workbook.getWorksheet('天气现象');
      if (weatherSheet) {
        const monthlyStats = this.calculateMonthlyWeatherStats(data['w0datatable']);
        
        // 在天气现象工作表底部添加月度统计
        const lastRowIndex = weatherSheet.rowCount;
        
        // 添加空行分隔
        weatherSheet.addRow([]);
        
        // 添加月度统计标题
        const titleRow = weatherSheet.addRow(['月度统计']);
        titleRow.font = { bold: true, size: 16 };
        weatherSheet.mergeCells(titleRow.number, 1, titleRow.number, 2);
        
        // 添加统计数据
        const headerRow = weatherSheet.addRow(['天气现象', '月度出现次数']);
        headerRow.font = { bold: true, size: 14 };
        
        // 填充统计数据
        for (const [phenomenon, count] of Object.entries(monthlyStats)) {
          if (count > 0) { // 只显示出现过的天气现象
            weatherSheet.addRow([phenomenon, count]);
          }
        }
      }
    }

    // 保存文件
    const fileName = `${header.stationNum}_${header.monthYear}_解析结果.xlsx`;
    const filePath = path.resolve(this.outputDir, fileName);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * 关闭数据库连接
   */
  public close() {
    if (this.db) {
      this.db.close();
    }
  }
}
