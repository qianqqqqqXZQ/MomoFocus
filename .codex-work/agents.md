# MomoFocus 项目备忘

## 概述

MomoFocus（番茄小窝）是一个 React + Vite 前端、Electron 桌面壳的专注计时应用。

## 结构

- `src/App.tsx`：计时、待办、快速记录和统计页面组件及状态逻辑
- `src/styles.css`：主题变量、布局和响应式样式
- `electron/main.cjs`：Electron 主进程
- `assets/`：应用图标资源

## 命令

- `npm run dev`：启动 Vite 与 Electron 开发环境
- `npm run build`：运行 TypeScript 项目构建并生成 Vite 产物
- `npm run electron:build`：构建桌面安装包
