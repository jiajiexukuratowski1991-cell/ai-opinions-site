# AI Opinions Site

基于 Notion 中 `All Articles` 数据源里已生成的观点字段，构建一个可搜索、可筛选、可阅读详情的 AI 观点展示网站。

## 当前功能

- 从 Notion 导出观点数据到 `public/opinions.json`
- 首页展示统计、Top 信号、全部观点卡片
- 支持关键词搜索
- 支持按分类 / 机会级别 / 来源筛选
- 支持详情弹窗查看：一句话总结 / 核心判断 / 我的观点 / 原文摘要

## 使用方式

```bash
cd ai-opinions-site
npm install
npm run export:data
npm run dev
```

默认开发地址：
- `http://127.0.0.1:1800`

## 构成

- `scripts/export-notion-opinions.mjs`：从 Notion 拉取观点化字段
- `src/App.jsx`：前端界面
- `public/opinions.json`：本地静态数据文件

## 当前数据来源

当前直接读取 Notion `All Articles` 数据源中的这些字段：

- `Name`
- `One-line Summary`
- `Core Judgment`
- `My View`
- `Opportunity Level`
- `Content Angle`
- `Category`
- `Category Guess`
- `Source`
- `Excerpt`
- `URL`
- `Publish Time`
- `Total Score`
- `AI Score`
- `Finance Score`
- `Novelty Score`

## 下一步建议

- 增加观点详情页路由
- 增加“方法论 / 趋势 / Agent / 商业化”等主题聚类
- 增加“每日 Top 观点”与“可写成内容的选题”专区
- 支持直接从网站跳 Notion page 或原文
