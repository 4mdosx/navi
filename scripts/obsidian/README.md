# Obsidian 脚本使用说明

这个目录包含 2 个常用脚本，用于整理 Obsidian 笔记：

- 合并每日笔记为按周内容
- 打包备份整个 Vault

## 运行环境

- Node.js 18+（建议）
- macOS 自带 `zip` 命令（`backup-vault.mjs` 依赖）

## 配置文件

所有脚本都读取同一个配置文件：`config.js`

```js
export const config = {
  dailyDir: '...',
  weeklyDir: '...',
  attachmentsDir: '...',
  obsidianVaultDir: '...',
  unzipPassword: '...',
}
```

字段说明：

- `dailyDir`: 每日笔记目录，文件名需为 `YYYY-MM-DD.md`
- `weeklyDir`: 周报输出目录（`merge-weekly-notes.mjs` 使用）
- `attachmentsDir`: 日报附件目录（`merge-weekly-notes.mjs` 会从这里复制附件）
- `obsidianVaultDir`: 需要打包的 Obsidian Vault 目录
- `unzipPassword`: 备份 zip 的解压密码；留空则不加密

## 脚本说明与命令

在仓库根目录执行（推荐）：

### 1) 合并日记为周报

```bash
node scripts/obsidian/merge-weekly-notes.mjs
```

行为：

- 扫描 `dailyDir` 下所有 `YYYY-MM-DD.md`
- 按 ISO 周（周一作为一周开始）分组
- 在 `weeklyDir/<year-week>/content.md` 生成周内容
- 当正文包含 `![[10_daily/attachments/...]]` 时：
  - 自动从 `attachmentsDir` 复制附件到当前周目录
  - 自动将链接改写为周报目录路径
- 自动把日记中的一级标题 `#` 降级为 `##`，避免与日期标题冲突

输出文件示例：

```text
<weeklyDir>/2026-14/content.md
```

### 2) 备份 Obsidian Vault（zip）

```bash
node scripts/obsidian/backup-vault.mjs
```

行为：

- 打包 `obsidianVaultDir`
- 输出到 Vault 的父目录，文件名格式：
  `obsidian-backup-YYYY-MM-DD HH-MM.zip`
- 当 `unzipPassword` 不为空时，使用 zip 密码加密

## 建议执行顺序

如需每周整理，可按以下顺序：

1. `merge-weekly-notes.mjs`
2. `backup-vault.mjs`

## 注意事项

- `config.js` 里是本机绝对路径，换电脑后请先修改。
- `merge-weekly-notes.mjs` 只处理命名规范为 `YYYY-MM-DD.md` 的文件。
- `merge-weekly-notes.mjs` 会覆盖每周的 `content.md`，请避免在该文件手工改内容。
- `backup-vault.mjs` 使用系统 `zip -P`，密码会出现在命令行历史中；如需更高安全性，可后续改为交互式或更安全方案。
