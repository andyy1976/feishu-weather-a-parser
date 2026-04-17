# 飞书天气A文件机器人

**OpenClaw技能生态样板解决方案**

---

## 项目概述

本项目是面向全国乡镇气象站的**天气A文件处理机器人**，基于飞书平台，采用 OpenClaw 技能标准化架构，实现：

- 📄 A/Q 文件智能解析
- 📊 数据统计与分析
- 📑 飞书文档自动生成
- 🔐 区域数据隔离
- 🔧 远程处理能力

## 技术架构

```
┌─────────────────────────────────────────┐
│           飞书平台（用户入口）            │
│   机器人交互 | 文件接收 | 消息推送        │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│        OpenClaw 技能调度中心              │
│   技能注册 | 队列管理 | 重试容错          │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│          标准化技能库                    │
│  解析类 | 转换类 | 存储类 | 分析类 | 集成类 │
└─────────────────────────────────────────┘
```

## 目录结构

```
feishu-weather-a-parser/
├── src/
│   ├── bot/                    # 飞书机器人核心
│   │   ├── index.ts            # 模块导出
│   │   ├── server.ts           # 服务入口
│   │   ├── config.ts           # 配置文件
│   │   ├── message-processor.ts # 消息处理器
│   │   ├── feishu-api.ts       # 飞书API封装
│   │   ├── handlers/           # 处理器
│   │   │   ├── text-handler.ts    # 文本消息处理
│   │   │   ├── file-handler.ts    # 文件消息处理
│   │   │   ├── card-handler.ts    # 卡片交互处理
│   │   │   ├── skill-dispatcher.ts # 技能调度器
│   │   │   ├── region-manager.ts  # 区域管理
│   │   │   └── logger.ts          # 日志模块
│   │   └── messages/           # 消息组件
│   │       └── interactive-card.ts # 交互卡片
│   │
│   ├── aq-file-parser.ts       # A/Q文件解析器
│   ├── types.ts                # 类型定义
│   ├── config.ts               # 配置文件
│   └── index.ts                # 主入口
│
├── openclaw-skill/             # OpenClaw技能包
│   ├── SKILL.md                # 技能定义
│   ├── main.js                 # 技能入口
│   └── src/                    # 技能源码
│
├── dist/                       # 编译输出
├── test-output/               # 测试输出
└── README.md                   # 项目文档
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# 飞书配置
FEISHU_APP_ID=cli_xxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx
FEISHU_BOT_NAME=天气A文件助手
PORT=3000

# 存储配置
SQLITE_PATH=./data/storage
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=weather_data

# 日志
LOG_LEVEL=info
```

### 3. 启动服务

**开发模式：**
```bash
npm run dev:bot
```

**生产模式：**
```bash
npm run build
npm run start:bot
```

### 4. 配置飞书回调

在飞书开放平台配置：
- 回调地址：`https://your-domain.com/webhook/feishu`
- 事件订阅：`im.message.receive_v1`

## 机器人指令

| 指令 | 说明 |
|------|------|
| `/help` | 显示帮助信息 |
| `/convert [文件key]` | 转换文件为Excel |
| `/analysis [月份]` | 生成月度分析报告 |
| `/stats [站点] [年月]` | 查询统计数据 |
| `/remote [节点] [文件key]` | 远程服务器处理 |
| `/bind [区域ID]` | 绑定用户区域 |

## 交互卡片操作

发送 A/Q 文件后，可选择以下操作：

1. **📊 转换为Excel** - 仅转换格式
2. **💾 转换并存储** - 转换后存入数据库
3. **📈 完整分析报告** - 生成统计报告+飞书文档
4. **🔧 远程处理** - 使用边缘节点处理

## API 接口

### 健康检查

```
GET /health
```

### 执行技能

```
POST /api/skill/execute
{
  "skillName": "parse",
  "params": {
    "filePath": "/path/to/file.A",
    "regionId": "130000"
  }
}
```

### 查询日志

```
GET /api/logs?level=info&userId=xxx
```

### 导出审计日志

```
GET /api/audit/export?startTime=xxx&endTime=xxx
```

## 技能列表

| 技能ID | 名称 | 分类 |
|--------|------|------|
| weather.afile.parse | A文件解析 | 转换类 |
| weather.afile.toExcel | 转Excel | 转换类 |
| storage.mysql.save | MySQL存储 | 存储类 |
| storage.sqlite.save | SQLite存储 | 存储类 |
| storage.baidupan.upload | 百度网盘 | 存储类 |
| weather.analysis.monthly | 月度统计 | 分析类 |
| weather.analysis.wind | 风表分析 | 分析类 |
| feishu.doc.create | 创建文档 | 飞书集成 |
| feishu.message.send | 发送消息 | 飞书集成 |
| remote.process.exec | 远程处理 | 远程类 |

## 部署方式

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/bot/server.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - FEISHU_APP_ID=${FEISHU_APP_ID}
      - FEISHU_APP_SECRET=${FEISHU_APP_SECRET}
    volumes:
      - ./data:/app/data
```

## License

MIT
