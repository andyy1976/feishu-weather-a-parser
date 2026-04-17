/**
 * 飞书机器人配置
 * 飞书天气A文件机器人 - OpenClaw技能生态样板解决方案
 */

// 飞书开放平台配置
export const FEISHU_CONFIG = {
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  botName: process.env.FEISHU_BOT_NAME || '天气A文件助手',
  
  // 回调配置
  webhookPath: process.env.WEBHOOK_PATH || '/webhook/feishu',
  port: parseInt(process.env.PORT || '3000'),
  
  // 支持的消息类型
  supportedMessageTypes: ['text', 'file', 'post'],
  
  // 支持的文件类型
  supportedFileTypes: ['.a', '.A', '.q', '.Q'],
  
  // 支持的指令
  commands: {
    help: '/help',
    convert: '/convert',
    analysis: '/analysis',
    remote: '/remote',
    stats: '/stats',
    bind: '/bind',
  },
} as const;

// 技能调度配置
export const SKILL_CONFIG = {
  // 技能ID映射
  skillIds: {
    parse: 'weather.afile.parse',
    toExcel: 'weather.afile.toExcel',
    toMySQL: 'storage.mysql.save',
    toSQLite: 'storage.sqlite.save',
    toBaiduPan: 'storage.baidupan.upload',
    monthlyStats: 'weather.analysis.monthly',
    windAnalysis: 'weather.analysis.wind',
    createDoc: 'feishu.doc.create',
    sendMessage: 'feishu.message.send',
    remoteExec: 'remote.process.exec',
  },
  
  // 技能组合配置
  skillFlows: {
    convertOnly: ['weather.afile.parse', 'weather.afile.toExcel'],
    convertAndStore: ['weather.afile.parse', 'weather.afile.toExcel', 'storage.mysql.save'],
    fullAnalysis: ['weather.afile.parse', 'weather.analysis.monthly', 'weather.analysis.wind', 'feishu.doc.create'],
    remoteProcess: ['remote.process.exec', 'storage.baidupan.upload', 'feishu.message.send'],
  },
  
  // 超时配置（毫秒）
  timeout: {
    parse: 30000,
    toExcel: 60000,
    store: 30000,
    analysis: 120000,
    createDoc: 30000,
    sendMessage: 10000,
  },
  
  // 重试配置
  retry: {
    maxAttempts: 3,
    backoffMs: [10000, 30000, 60000, 120000],
  },
} as const;

// 区域管理配置
export const REGION_CONFIG = {
  levels: {
    province: 1,
    city: 2,
    county: 3,
    township: 4,
  },
  
  // 缓存配置
  cache: {
    regionTTL: 12 * 60 * 60 * 1000, // 12小时
    statsTTL: 12 * 60 * 60 * 1000,
  },
  
  // 数据隔离
  isolation: {
    enabled: true,
    filterByRegion: true,
  },
} as const;

// 存储配置
export const STORAGE_CONFIG = {
  sqlite: {
    basePath: process.env.SQLITE_PATH || './data/storage',
    fileExtension: '.db',
  },
  
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    database: process.env.MYSQL_DATABASE || 'weather_data',
    tablePrefix: 'region_',
  },
  
  baidupan: {
    uploadPath: '/天气A文件',
    createFolderByRegion: true,
  },
} as const;

// 日志配置
export const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  
  // 日志字段
  fields: {
    traceId: 'trace_id',
    tenantId: 'tenant_id',
    userId: 'user_id',
    regionId: 'region_id',
    taskId: 'task_id',
    skillId: 'skill_id',
  },
  
  // 告警阈值
  alert: {
    successRateThreshold: 0.95,
    queueThreshold: 100,
  },
} as const;

export default {
  FEISHU_CONFIG,
  SKILL_CONFIG,
  REGION_CONFIG,
  STORAGE_CONFIG,
  LOG_CONFIG,
};
