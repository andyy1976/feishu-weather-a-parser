# 气象A/Q文件解析器技能

## 基本信息
- **名称**: weather-aq-parser
- **版本**: 1.0.0
- **描述**: 解析气象A/Q文件，生成Excel报表并支持数据库存储
- **作者**: weather-aq-parser团队
- **依赖**: Node.js >= 16.0.0

## 功能介绍

该技能可以解析气象A/Q格式的观测数据文件，支持以下功能：

1. **文件解析**: 100%对齐原C# AFileHelper.cs逻辑，准确解析气象数据
2. **数据验证**: 验证解析后的数据完整性和准确性
3. **Excel导出**: 生成包含详细气象数据和月度统计的Excel报表
4. **数据库存储**: 可选支持将解析结果存储到SQLite数据库
5. **月度统计**: 自动计算各项气象数据的月度统计指标（平均值、最大值、最小值等）

## 参数说明

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
|--------|------|------|--------|------|
| filePath | string | 是 | - | 气象A/Q文件的绝对路径 |
| dbPath | string | 否 | - | SQLite数据库路径（不填则不启用数据库存储） |
| outputDir | string | 否 | ./output | 导出文件的输出目录 |

## 使用示例

### 示例1: 基本使用（仅生成Excel）
```javascript
{
  "filePath": "D:/weather/A58401-202501.TXT",
  "outputDir": "D:/weather/output"
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

## 返回格式

```javascript
{
  "success": true,  // 解析是否成功
  "stationNum": "58401",  // 站点编号
  "monthYear": "202501",  // 数据年月
  "message": "解析成功，Excel导出路径：D:/weather/output/58401_202501_解析结果.xlsx",  // 结果消息
  "error": null  // 错误信息（仅当success为false时存在）
}
```

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

## 配置文件

技能支持通过环境变量或配置文件进行配置：

```env
# .env文件示例
FILE_PATH=D:/weather/A58401-202501.TXT
DB_PATH=D:/weather/weather.db
OUTPUT_DIR=D:/weather/output
```

## 错误处理

技能会捕获并返回以下类型的错误：

- 文件不存在或无法读取
- 文件格式错误
- 数据解析错误
- 数据库操作错误
- Excel生成错误

所有错误都会包含详细的错误信息，便于排查问题。