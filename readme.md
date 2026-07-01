# Navi

本地 Web 服务，作为你每天打开的第一个页面 — 告诉你现在该做什么、长期任务进行到哪、该做实验或采集灵感了。

## 定位

**Navi = 每日启动点 + 任务上下文中心**

- **周计划**：追踪今天/本周正在做的任务，拖拽安排与执行
- **项目追踪**：封装长期项目的进展与周记，保持上下文
- **长期提醒**：实验、灵感采集、周期性任务的追踪层（进行中）
- **信息归档**：自动收集与归档关注的信息（规划中）

不在 Navi 里复刻 Obsidian 查看器或通用 Agent 管理器 — 电脑前用官方工具即可。Agent、Vault 等能力保留在代码中，供未来按项目按需搭建 Workspace 时调用。

## 路线图

| 阶段 | 内容 | 状态 |
|------|------|------|
| 一 | 隐藏非核心入口，聚焦日常模块 | 完成 |
| 二 | Dashboard Daily Hub、周计划补齐、长期任务 tracker | 完成 |
| 三 | 信息收集与归档（手动收件箱已接入，更多来源按需扩展） | 基础完成 |
| 四 | Workspace 按需搭建（类型已预留，有具体项目需求时启动） | 远期 |

## 技术栈

- **前端**：Next.js 16 + React 19 + TypeScript
- **UI 组件**：Radix UI + Tailwind CSS
- **数据库**：SQLite（Kysely + better-sqlite3）
- **认证**：TOTP 双因素认证
- **状态管理**：Zustand

## 快速开始

### 安装依赖

```bash
cd studio
npm install
```

### 配置环境变量

复制 `.env.template` 为 `.env` 并配置：

```env
DB_FILE_NAME=file:./local.db
SESSION_SECRET=your-session-secret
TOTP_SECRET=your-totp-secret
CURSOR_API_KEY=your-cursor-api-key
AGENT_LOCAL_CWD=/path/to/your/notes-or-code
```

### 初始化数据库

```bash
npm run db:init
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5500

## 项目结构

```
navi/
├── studio/              # Web 服务（Next.js 应用）
│   ├── app/             # 路由与 API
│   ├── feature/         # UI 功能模块
│   ├── backstage/       # 服务层（db、agent、projects、week-plan）
│   └── types/           # 共享类型
├── scripts/obsidian/    # Obsidian 维护脚本（合并周报、备份）
└── bridge/              # 独立工具脚本（AI commit 等）
```

## 开发

### 数据库

Schema 定义在 `studio/backstage/db/init-db.ts`，初始化：

```bash
cd studio && npm run db:init
```

### 构建生产版本

```bash
npm run build
npm run start
```

## 许可证

[待定]
