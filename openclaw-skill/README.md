# 气象A/Q文件解析器 - OpenClaw技能

## 技能概述

气象A/Q文件解析器是一个OpenClaw技能，用于解析气象A/Q格式的观测数据文件，生成Excel报表并支持数据库存储。该技能100%对齐原C# AFileHelper.cs逻辑，确保数据解析的准确性和兼容性。

## 功能特点

- ✅ **精准解析**: 100%对齐原C# AFileHelper.cs逻辑，准确解析气象数据
- ✅ **Excel导出**: 生成包含详细气象数据和月度统计的Excel报表
- ✅ **数据库存储**: 支持将解析结果存储到SQLite数据库
- ✅ **月度统计**: 自动计算各项气象数据的月度统计指标
- ✅ **数据验证**: 验证解析后的数据完整性和准确性
- ✅ **错误处理**: 完善的错误处理机制，提供详细的错误信息
- ✅ **配置灵活**: 支持通过参数、环境变量和配置文件进行配置

## 支持的数据类型

技能支持解析以下气象数据类型：

- 气压（pcdatatable）
- 海气压（hpcdatatable）
- 气温（tbdatatable）
- 露点温度（ibldatatable）
- 水汽压（eadatatable）
- 相对湿度（ubdatatable）
- 能见度（vbdatatable）
- 蒸发量（ladatatable）
- 二分钟平均风速（fn1datatable）
- 十分钟平均风速（fn2datatable）
- 最大风极大风（fn3datatable）
- 逐小时降水量（r62datatable）
- 逐日累积降水量（r61datatable）
- 浅层地温（db1-db6datatable）
- 深层地温（kb1-kb3datatable）
- 草面（雪面）温度（badatatable）
- 日照时数（s2datatable）
- 天气现象（w0datatable）

## 安装和配置

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/weather-aq-parser/weather-aq-parser.git
   cd weather-aq-parser
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **编译代码**
   ```bash
   npm run build
   ```

4. **安装技能依赖**
   ```bash
   cd openclaw-skill
   npm install
   ```

### 配置文件

技能支持通过以下方式进行配置：

1. **环境变量**
   ```env
   # .env文件示例
   FILE_PATH=D:/weather/A58401-202501.TXT
   DB_PATH=D:/weather/weather.db
   OUTPUT_DIR=D:/weather/output
   ```

2. **配置文件**
   编辑 `openclaw-skill/config.yaml` 文件，修改默认配置

## 使用方法

### 本地测试

1. **基本使用**
   ```bash
   cd openclaw-skill
   node main.js "D:/weather/A58401-202501.TXT"
   ```

2. **使用完整参数**
   ```bash
   cd openclaw-skill
   node -e "
     const { main } = require('./main');
     main({
       filePath: 'D:/weather/A58401-202501.TXT',
       dbPath: 'D:/weather/weather.db',
       outputDir: 'D:/weather/output'
     }).then(console.log).catch(console.error);
   "
   ```

### OpenClaw集成

在OpenClaw中使用该技能，需要将技能目录添加到OpenClaw的技能路径中，然后通过以下方式调用：

```javascript
const result = await openclaw.invoke('weather-aq-parser', {
  filePath: 'D:/weather/A58401-202501.TXT',
  dbPath: 'D:/weather/weather.db',
  outputDir: 'D:/weather/output'
});
```

## 参数说明

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
|--------|------|------|--------|------|
| filePath | string | 是 | - | 气象A/Q文件的绝对路径 |
| dbPath | string | 否 | - | SQLite数据库路径（不填则不启用数据库存储） |
| outputDir | string | 否 | ./output | 导出文件的输出目录 |

## 返回结果格式

```javascript
{
  "success": true,  // 解析是否成功
  "stationNum": "58401",  // 站点编号
  "monthYear": "202501",  // 数据年月
  "message": "解析成功，Excel导出路径：D:/weather/output/58401_202501_解析结果.xlsx",  // 结果消息
  "error": null  // 错误信息（仅当success为false时存在）
}
```

## 示例

### 示例1: 基本使用（仅生成Excel）

```javascript
{
  "filePath": "D:/weather/A58401-202501.TXT",
  "outputDir": "D:/weather/output"
}
```

**返回结果**
```javascript
{
  "success": true,
  "stationNum": "58401",
  "monthYear": "202501",
  "message": "解析成功，Excel导出路径：D:/weather/output/58401_202501_解析结果.xlsx",
  "error": null
}
```

### 示例2: 完整使用（生成Excel并存储到数据库）

```javascript
{
  "filePath": "D:/weather/A58401-202501.TXT",
  "dbPath": "D:/weather/weather.db",
  "outputDir": "D:/weather/output"
}
```

**返回结果**
```javascript
{
  "success": true,
  "stationNum": "58401",
  "monthYear": "202501",
  "message": "解析成功，Excel导出路径：D:/weather/output/58401_202501_解析结果.xlsx",
  "error": null
}
```

## 故障排除

### 常见问题

1. **编译错误**
   ```
   编译后的代码不存在，请先运行 npm run build
   ```
   **解决方案**: 先运行 `npm run build` 编译TypeScript代码

2. **文件不存在**
   ```
   文件不存在：D:/weather/A58401-202501.TXT
   ```
   **解决方案**: 检查文件路径是否正确，确保文件存在

3. **数据库错误**
   ```
   无法打开数据库文件：D:/weather/weather.db
   ```
   **解决方案**: 检查数据库文件路径是否正确，确保目录存在且有写权限

4. **内存不足**
   ```
   JavaScript heap out of memory
   ```
   **解决方案**: 增加Node.js的内存限制，例如 `node --max-old-space-size=512 main.js`

### 日志查看

技能会生成日志文件 `weather-aq-parser.log`，可以通过查看日志文件了解详细的运行情况和错误信息。

## 开发和贡献

### 项目结构

```
weather-aq-parser/
├── src/                    # 源代码目录
│   ├── aq-file-parser.ts   # 核心解析器
│   ├── config.ts           # 配置文件
│   ├── types.ts            # 类型定义
│   ├── index.ts            # 主入口
│   └── ...                 # 其他辅助文件
├── dist/                   # 编译后的代码
├── openclaw-skill/         # OpenClaw技能目录
│   ├── main.js             # 技能主逻辑
│   ├── SKILL.md            # 技能定义
│   ├── config.yaml         # 配置文件
│   ├── package.json        # 依赖管理
│   └── README.md           # 技能文档
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript配置
└── README.md               # 项目文档
```

### 开发流程

1. **克隆仓库**
   ```bash
   git clone https://github.com/weather-aq-parser/weather-aq-parser.git
   cd weather-aq-parser
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **修改代码**
   - 核心解析逻辑：`src/aq-file-parser.ts`
   - 配置：`src/config.ts`
   - 类型定义：`src/types.ts`

4. **编译代码**
   ```bash
   npm run build
   ```

5. **测试技能**
   ```bash
   cd openclaw-skill
   node main.js "D:/weather/A58401-202501.TXT"
   ```

### 贡献指南

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

ISC License

## 联系方式

如有问题或建议，请通过以下方式联系我们：

- 项目地址：https://github.com/weather-aq-parser/weather-aq-parser
- 邮箱：weather-aq-parser@example.com

## 更新日志

### v1.0.0 (2026-03-20)

- 首次发布气象A/Q文件解析器OpenClaw技能
- 支持所有主要气象数据类型的解析
- 实现Excel导出和数据库存储功能
- 添加月度统计计算
- 完善的错误处理和日志记录