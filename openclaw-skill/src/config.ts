import { MonthConfig } from "./types";

/**
 * 数据段基础起始行配置（对齐原C#硬编码逻辑）
 */
export const BASE_START_LINES: Record<string, number> = {
  PC: 2,    // 气压
  HPC: 62,  // 海平面气压
  TB: 93,   // 气温
  IBL: 155, // 露点温度
  EA: 216,  // 水汽压
  UB: 277,  // 相对湿度
  VB: 338,  // 能见度
  R61: 399, // 降水量3时段
  R62: 430, // 逐小时降水量
  W0: 491,  // 天气现象
};

/**
 * 小月默认配置（4/6/9/11月）
 */
export const DEFAULT_MONTH_CONFIG: MonthConfig = {
  takePC: 60,
  takeHPC: 30,
  takeTB: 60,
  takeIBL: 60,
  takeEA: 60,
  takeUB: 60,
  takeVB: 60,
  takeR61: 120,  // 四行表：30天 × 4行/天 = 120行
  takeR62: 60,
  takeW0: 30,
  takeLA: 60,
  takeFN1: 120,
  takeFN2: 120,
  takeFN3: 30,
  takeDB: 60,
  takeKB: 60,
  takeS2: 30,
  takeBA: 60,
};

/**
 * 天气现象代码映射表
 */
export const WEATHER_CODE_MAP: Record<string, string> = {
  "01": "露",
  "02": "雨",
  "03": "结冰",
  "05": "霾",
  "06": "浮沉",
  "07": "扬沙",
  "10": "轻雾",
  "15": "大风",
  "16": "积雪",
  "31": "沙尘暴",
  "42": "雾",
  "48": "雾凇",
  "50": "毛毛雨",
  "56": "雨凇",
  "60": "雨",
  "68": "雨夹雪",
  "70": "雪",
  "80": "阵雨",
  "83": "阵性雨夹雪",
  "85": "阵雪",
  "89": "冰雹",
};
