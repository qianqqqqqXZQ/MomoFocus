# MomoFocus 项目备忘

## 概述

MomoFocus（番茄小窝）是一个 React + Vite 前端、Electron 桌面壳的专注计时应用。

## 结构

- `src/App.tsx`：计时、待办、Todo/备忘录右侧面板和统计页面组件及状态逻辑
- `src/styles.css`：主题变量、布局和响应式样式
- `electron/main.cjs`：Electron 主进程
- `assets/`：应用图标资源

## 当前功能约定

- 右侧面板默认显示 `Todo`，可切换到 `备忘录`。
- Todo 支持点击选中并记录专属想法；想法保存在对应 Todo 的 `thoughts` 字段中，兼容没有该字段的旧数据。
- 备忘录支持标题、纯文本正文、多篇列表、自动保存和直接删除。
- `localStorage` keys：`momofocus.todos`、`momofocus.notes`、`momofocus.tasks`、`momofocus.sessions`、`momofocus.slogan`。
- localStorage 读取失败或数据结构异常时回退到默认数据；存储写入失败不会阻塞内存中的界面操作。

## 命令

- `npm run dev`：启动 Vite 与 Electron 开发环境
- `npm run build`：运行 TypeScript 项目构建并生成 Vite 产物
- `npm run electron:build`：构建桌面安装包
- 修改代码后用 `npm run dev` 加载当前源码；`release/` 中的 exe 是上次打包版本，不会随源码自动更新
- `git diff --check`：检查改动中的空白错误
- `npm run format`：使用 Prettier 格式化源码和配置
- `npm run format:check`：检查源码和配置是否符合统一格式

## 计时闭环状态

- 计时快照使用 `momofocus.timer`，按 `Date.now()` 真实时间恢复倒计时和正计时。
- 快速记录使用 `momofocus.quickNotes`；声音和系统通知设置使用 `momofocus.settings`。
- Electron 原生通知通过 `electron/preload.cjs` 暴露的受限 `momoFocusNative.notify` API 调用，主窗口保持隔离上下文。
- 阶段完成后自动切换到下一阶段但不自动开始；快捷键为 `Space`、`R`、`S` 和 `Escape`。

## 最近验证

- 2026-09-22：`npm run build` 通过。
- 2026-09-22：`git diff --check` 通过。
- 2026-09-22：Vite 开发页面启动成功，动态日期和首页交互入口可见。
- 2026-09-22：Todo 专属想法记录功能构建通过，`git diff --check` 通过；旧 Todo 数据兼容为空想法列表。
- 2026-09-22：图标路径、项目格式化和打包输出忽略规则已更新；`npm run format:check`、`npm run build`、`git diff --check` 通过。
- 2026-09-22：`npm run electron:build` 已完成前端构建、Electron 复制和解包阶段，但因下载 `winCodeSign` 时网络连接被重置而未完成安装器签名资源处理。
- 2026-09-23：首页标语可原位编辑并通过 `momofocus.slogan` 持久化，侧栏专注统计入口改为强调按钮；`npm run build`、`npm run format:check`、`git diff --check` 通过。

## 打包与资源约定

- Windows 安装包、快捷方式、卸载器和 Electron 主窗口统一使用 `assets/tomato.ico`。
- Electron 主进程通过 `app.getAppPath()` 定位打包后的 `assets/tomato.ico`，避免依赖开发目录层级。
- `release/` 是唯一标准打包输出目录；`release-*` 目录均视为历史临时产物，不纳入版本控制。
- 只有 `npm run electron:build` 成功后，`release/` 中的桌面程序才包含最新修改。
