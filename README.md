# 📊 StockRadar — 美股量化评分系统

基于 Yahoo Finance 数据的多因子量化选股工具。React 单页前端 + FastAPI 后端代理，支持美股/港股的实时评分、K 线图和完整三张财报。

## ✨ 功能

- **多因子评分**：5 维度量化模型（收入增长 / 盈利质量 / 财务健康 / 回报效率 / 估值合理性），满分 100
- **实时行情**：批量获取股票实时价格，颜色区分涨跌
- **K 线图**：Canvas 绘制 OHLCV 蜡烛图，支持多时间范围
- **三张财报**：利润表 / 资产负债表 / 现金流量表，Tab 切换展示
- **分类浏览**：科技/半导体/电动车/金融/消费/医药/中概/港股，8 大板块
- **搜索筛选**：探索页面支持实时搜索过滤

## 🏗 架构

```
浏览器 (localhost:9000)  →  FastAPI 后端 (api_finance.py)
                                │
                          HTTP 代理 (需自行配置)
                                │
                          Yahoo Finance HTML 页面
```

**为什么走代理抓 HTML？** Yahoo 的 JSON API 已废弃（404），yfinance 等方案 IP 被 429 限流，第三方 API 免费额度不够。唯一稳定方案：后端通过代理 + 浏览器级 Header 请求 Yahoo HTML 页面，前端 DOMParser 提取数据。

## 🚀 快速开始

### 前置条件

- Python 3.7+
- HTTP 代理（Clash / V2Ray 等），需能访问 Yahoo Finance。默认读取环境变量 `PROXY_URL`，不设置则直连
- 安装依赖：

```bash
pip install fastapi uvicorn requests
```

### 启动

```bash
# 1. 确保 Clash 代理已启动

# 2. 启动后端
python api_finance.py 9000

# 3. 浏览器打开
# http://127.0.0.1:9000
```

## 📈 评分模型

| 维度 | 权重 | 关键指标 |
|------|------|----------|
| 收入增长 | 20 分 | 营收同比增速 |
| 盈利质量 | 20 分 | 净利率、利润增速 |
| 财务健康 | 20 分 | 负债率、流动比率 |
| 回报效率 | 20 分 | ROE |
| 估值合理性 | 20 分 | PEG、P/E |

### 评级

| 总分 | 评级 | 含义 |
|------|------|------|
| ≥80 | STRONG_BUY | 强力看涨 |
| ≥65 | BUY | 偏多看好 |
| ≥45 | HOLD | 中性持有 |
| ≥25 | CAUTION | 谨慎观望 |
| <25 | AVOID | 建议规避 |

## 📁 项目结构

```
├── api_finance.py          # FastAPI 后端：代理转发 + 评分引擎
├── stock_analyzer.html     # React CDN 前端单页（核心）
├── stock_analyzer.tsx      # React TSX 源码
├── database.py             # SQLite 数据库模型
└── save_data.py            # 数据采集脚本（Akshare → SQLite）
```

## ⚠️ 注意事项

- **代理必须配置好**：访问 Yahoo Finance 需要代理（国内网络），请设置环境变量 `PROXY_URL` 或在 `api_finance.py` 中修改。没配代理则请求 Yahoo 会失败
- **不要直接请求 Yahoo**：浏览器不能直接 fetch Yahoo Finance（CORS），必须走后端 `/api/proxy`
- **Sec-Fetch Header 是关键的**：没有 `Sec-Fetch-Dest: document` 等 Header，Yahoo 返回 404
- 本项目仅供学习参考，不构成投资建议

## 📄 License

MIT
