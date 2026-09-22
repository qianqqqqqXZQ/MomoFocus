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
- 备忘录支持标题、纯文本正文、多篇列表、自动保存和直接删除。
- `localStorage` keys：`momofocus.todos`、`momofocus.notes`、`momofocus.tasks`、`momofocus.sessions`。
- localStorage 读取失败或数据结构异常时回退到默认数据；存储写入失败不会阻塞内存中的界面操作。

## 命令

- `npm run dev`：启动 Vite 与 Electron 开发环境
- `npm run build`：运行 TypeScript 项目构建并生成 Vite 产物
- `npm run electron:build`：构建桌面安装包
- `git diff --check`：检查改动中的空白错误

## 计时闭环状态

- 计时快照使用 `momofocus.timer`，按 `Date.now()` 真实时间恢复倒计时和正计时。
- 快速记录使用 `momofocus.quickNotes`；声音和系统通知设置使用 `momofocus.settings`。
- Electron 原生通知通过 `electron/preload.cjs` 暴露的受限 `momoFocusNative.notify` API 调用，主窗口保持隔离上下文。
- 阶段完成后自动切换到下一阶段但不自动开始；快捷键为 `Space`、`R`、`S` 和 `Escape`。

## 最近验证

- 2026-09-22：`npm run build` 通过。
- 2026-09-22：`git diff --check` 通过。
- 2026-09-22：Vite 开发页面启动成功，动态日期和首页交互入口可见。
