# MomoFocus

番茄小窝是一个基于 Electron、Vite、React 和 TypeScript 的桌面应用壳。

## 开始使用

```bash
npm install
npm run dev
```

开发命令会同时启动 Vite 开发服务器和 Electron 窗口，适用于 Windows PowerShell。

## 构建

构建前端资源：

```bash
npm run build
```

预览 Vite 构建结果：

```bash
npm run preview
```

构建桌面安装包：

```bash
npm run electron:build
```

当前桌面壳选择 Electron，是为了免去 Rust 环境要求，并保持桌面端开发配置简洁。
