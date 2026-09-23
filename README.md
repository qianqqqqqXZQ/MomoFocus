# MomoFocus

番茄小窝是一个基于 Electron、Vite、React 和 TypeScript 的桌面应用壳。

## 开始使用

```bash
npm install
npm run dev
```

每次修改代码后，在项目目录运行 `npm run dev`，会同时启动 Vite 和 Electron，并直接加载当前源码。不要通过旧 `release` 文件夹里的 exe 查看开发中的修改。

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

安装包和解包后的桌面程序输出到 `release/`。重新打包后再运行其中的程序，才会得到独立于开发环境的最新桌面版本。

当前桌面壳选择 Electron，是为了免去 Rust 环境要求，并保持桌面端开发配置简洁。
