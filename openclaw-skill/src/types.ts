/**
 * 月份数据行数配置
 * 完全对齐原C# MonthConfig逻辑
 */
export interface MonthConfig {
  takePC: number;
  takeHPC: number;
  takeTB: number;
  takeIBL: number;
  takeEA: number;
  takeUB: number;
  takeVB: number;
  takeR61: number;
  takeR62: number;
  takeW0: number;
  takeLA: number;
  takeFN1: number;
  takeFN2: number;
  takeFN3: number;
  takeDB: number;
  takeKB: number;
  takeS2: number;
  takeBA: number;
}

/**
 * 解析结果返回
 */
export interface ParseResult {
  success: boolean;
  message: string;
  stationNum?: string;
  monthYear?: string;
  data?: Record<string, any[]>; // 解析后的全要素数据
  error?: Error;
}

/**
 * 文件头信息
 */
export interface FileHeader {
  stationNum: string;
  longitude: string;
  latitude: string;
  year: string;
  month: string;
  monthYear: string;
}

/**
 * 数据段起始行配置
 */
export interface StartLines {
  [key: string]: number;
}
