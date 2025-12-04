# Navi

一个本地 Web 服务 + CLI 工具，用于辅助管理本地知识库，工作流, 社交媒体点赞，订阅稍后阅读。

## 项目概述

Navi 是一个本地化的个人知识管理和内容管理平台，提供 Web 界面和命令行工具，帮助你：
- 📚 **本地知识库增强**：增强现有知识库的功能，提供搜索、关联、索引等增强能力
- 📖 **每日阅读**：记录和管理每日阅读内容，追踪阅读进度和笔记
- 🔄 **工作流**：自定义工作流程，自动化日常任务
- 👍 **社交媒体点赞**：收集和管理社交媒体上的点赞内容
- 📌 **订阅稍后阅读**：订阅和管理稍后阅读列表，支持多种来源

## 核心特性

### 1. 本地知识库增强
- 全文搜索：快速检索现有知识库内容
- 智能索引：自动索引和更新知识库内容
- 关联关系：自动发现和建立知识点之间的关联
- 内容增强：为现有知识库添加元数据、标签等增强信息

### 2. 工作流
- 自定义流程：创建和管理个人工作流程
- 任务自动化：自动化重复性任务
- 流程模板：使用预设模板快速创建流程

### 3. 社交媒体点赞
- 内容收集：收集点赞的内容
- 内容分类：对收集的内容进行分类和标签
- 内容回顾：定期回顾和管理收集的内容

### 4. 订阅稍后阅读
- 多源订阅：支持从多个来源订阅内容
- 稍后阅读列表：管理待阅读的内容队列
- 阅读提醒：设置提醒，确保及时阅读
- 阅读状态：追踪阅读状态和进度

## 技术栈

- **前端**：Next.js 16 + React 19 + TypeScript
- **UI 组件**：Radix UI + Tailwind CSS
- **数据库**：SQLite (Prisma ORM)
- **认证**：TOTP 双因素认证
- **状态管理**：Zustand + SWR

## 快速开始

### 安装依赖

```bash
cd studio
npm install
```

### 配置环境变量

创建 `.env` 文件并配置：

```env
DB_FILE_NAME=file:./local.db
TOTP_SECRET=your-totp-secret
```

### 初始化数据库

```bash
npm run db:push
npm run db:generate
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5500

## 项目结构

```
navi/
├── studio/          # Web 服务（Next.js 应用）
│   ├── app/         # Next.js 应用路由
│   ├── components/  # React 组件
│   ├── modules/     # 业务模块
│   └── prisma/      # 数据库 schema
├── cli/             # CLI 工具（开发中）
└── proofs/          # 概念验证代码
```

## 开发

### 数据库管理

```bash
# 推送 schema 变更
npm run db:push

# 生成 Prisma Client
npm run db:generate

# 打开 Prisma Studio
npm run db:studio
```

### 构建生产版本

```bash
npm run build
npm run start
```

## 贡献指南

欢迎贡献代码、提出建议或报告问题！

## 许可证

[待定]
