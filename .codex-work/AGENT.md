# MomoFocus Agent 工作说明

> 这是本项目的持续更新工作记忆。每次开始新任务、完成一个功能、修复一个缺陷或改变开发命令后，都应先阅读本文，并在验证通过后同步更新“当前状态”“验证记录”和“下一步工作”。
>
> 当前快照时间：2026-09-21（Asia/Shanghai）

## 1. 项目概览

- 项目名称：MomoFocus / 番茄小窝
- 项目类型：Windows 优先的 Electron 桌面应用
- 产品定位：带番茄钟、正计时、待办、快速记录和专注统计的个人专注工作区
- 前端技术：React 18、TypeScript 5、Vite 6、Lucide React
- 桌面容器：Electron 33，使用 CommonJS 主进程
- 包管理：npm，锁文件为 `package-lock.json`，lockfileVersion 3
- 当前版本：`0.1.0`
- 当前 Git 状态：`main` 分支，工作区在生成本文档前干净，HEAD 与 `origin/main` 对齐
- 最近提交：`7224fbb feat: add focus insights and tomato app icon`

## 2. 目录结构

```text
.
├─ assets/              应用图标与番茄素材（svg/png/ico）
├─ electron/
│  └─ main.cjs          Electron 主进程，创建窗口并加载 Vite/构建后的页面
├─ src/
│  ├─ App.tsx           主要 UI、计时状态、任务/待办/笔记/统计逻辑
│  ├─ main.tsx          React 挂载入口
│  ├─ styles.css        全局样式、布局、响应式和动画
│  └─ vite-env.d.ts     Vite 类型声明
├─ index.html           Vite 页面入口
├─ vite.config.ts       Vite 配置，开发服务器端口为 5173
├─ tsconfig.json        前端 TypeScript 配置
├─ tsconfig.node.json   Vite 配置的 Node 侧 TypeScript 配置
├─ package.json         脚本、依赖和 Electron Builder 配置
├─ README.md            面向开发者的快速开始说明
└─ .codex-work/
   └─ AGENT.md          本文档，项目协作和状态记录
```

## 3. 运行方式

在项目根目录执行：

```powershell
npm install
npm run dev
```

`npm run dev` 会并行启动：

- Vite 开发服务器：`http://127.0.0.1:5173`
- Electron 窗口：等待 Vite 可访问后启动

常用命令：

```powershell
# 类型检查并构建前端 dist
npm run build

# 仅预览 Vite 构建结果
npm run preview

# 构建前端并生成 Windows NSIS 安装包到 release/
npm run electron:build
```

当前 `package.json` 没有单独的 lint、unit test 或 e2e test 脚本。修改代码后，至少运行 `npm run build`；涉及计时、统计、响应式布局或打包时，还应手工检查对应场景。

## 4. 当前功能状态

### 已实现

- 番茄钟模式：专注 25 分钟、短休息 5 分钟、长休息 15 分钟
- 正计时模式：按任务自由记录专注时长
- 任务创建与任务类型选择
- 任务选择、专注累计时长、完成番茄轮数和专注历史
- 开始、暂停、重置、跳过计时
- 普通待办：新增、完成/取消完成、删除、完成进度显示
- 快速记录入口和最近记录展示
- 今日/本周/本月/自定义日期范围的统计视图
- 统计指标：总专注时长、记录次数、已完成轮次、放弃次数、平均每日时长、时段分布
- 桌面窗口图标、自动隐藏菜单栏、开发/生产页面加载分支
- 基于 CSS 的响应式布局和 `prefers-reduced-motion` 兼容

### 当前限制与风险

- 任务、待办、笔记和专注记录只保存在 React 内存中，应用重启后会丢失；目前没有 `localStorage`、数据库或 Electron 持久化层。
- `soundOn` 目前只切换界面状态和提示气泡，没有真正播放计时完成提示音。
- 移动端菜单按钮目前只有视觉入口，没有展开菜单的交互逻辑。
- 主界面日期文案存在静态展示内容，若产品需要跨日期长期使用，应统一由日期工具生成。
- `src/App.tsx` 集中了大量状态、业务逻辑和 JSX，继续增加功能前应考虑拆分 hooks、类型和视图组件。
- 暂无自动化测试；计时边界、暂停后累计、跨日统计、自定义日期范围和 Electron 打包属于高风险手工回归区域。
- 统计视图使用当前内存中的会话数据，因此重启后没有历史数据可分析。

## 5. 关键实现约定

- 计时器以 `Date.now()` 计算真实经过时间，间隔器仅负责触发 UI 刷新，不应把 interval 次数当作真实时长。
- `recordFocus` 负责把当前计时写入任务和会话历史；停止、切换模式、切换任务和重置时要注意是否需要先记录未完成会话。
- `dateKey` 用本地时区生成 `YYYY-MM-DD`，涉及统计日期时应复用该函数，不要直接使用未修正的 `toISOString().slice(0, 10)`。
- Pomodoro 完成轮次只应在 `focus` 模式完成时增加；休息模式不应增加任务轮数。
- Electron 主进程保持 `contextIsolation: true`、`nodeIntegration: false`。新增原生能力时优先设计受限 preload/API，不要直接打开 Node 注入。
- Vite 使用 `base: './'`，生产包通过 `loadFile` 加载 `dist/index.html`；修改资源路径时需同时验证开发和打包场景。
- UI 文案以中文为主，品牌名保留 `MomoFocus`；新增样式应尽量复用现有 CSS 变量和响应式断点。

## 6. 修改前后工作流

1. 阅读本文和 `README.md`，查看 `git status --short --branch`。
2. 先定位影响范围；不要覆盖用户已有的未提交改动。
3. 涉及大规模重构、部署或大量文件变更时，先创建带说明的 Git 备份提交；普通单文件文档更新不强制创建备份提交。
4. 实施改动后运行与范围匹配的验证，最低要求是 `npm run build`。
5. 自主做一次 code review：检查状态生命周期、计时边界、日期/时区、空状态、键盘交互、响应式和 Electron 生产加载。
6. 验证通过后更新本文档的“当前状态”“验证记录”和“下一步工作”；如果功能、命令、目录或风险变化，也要同步对应章节。
7. 最终说明改了什么、验证了什么，以及遗留的已知限制。

## 7. 验证记录

| 日期 | 命令/检查 | 结果 | 说明 |
| --- | --- | --- | --- |
| 2026-09-21 | `git status --short --branch` | 通过 | 生成本文档前工作区干净，位于 `main` |
| 2026-09-21 | 项目结构与关键源码检查 | 通过 | 已确认 Electron/Vite/React/TypeScript 入口和当前功能范围 |
| 2026-09-21 | `npm run build` | 通过 | `tsc -b` 与 Vite 生产构建均成功，生成 `dist/` |

## 8. 下一步工作

- [ ] 评估并实现任务、待办、笔记和会话的持久化
- [ ] 为计时器生命周期、统计筛选和日期边界补充自动化测试
- [ ] 修复或明确声音设置的真实提示音行为
- [ ] 完成移动端菜单按钮交互
- [ ] 拆分 `src/App.tsx`，降低单文件复杂度
- [ ] 增加 Electron 安装包的实际安装/启动验收记录

## 9. 文档维护规则

- 本文档是活文档，不要只在任务结束时更新；完成可验证的小步骤后就同步勾选或补充记录。
- “已实现”只记录当前代码已经存在且经过验证的行为；计划中的功能放入“下一步工作”。
- 发现新限制、构建问题、约定或沟通规则时，立即补充到对应章节。
- 不把临时日志、密钥、用户数据或构建产物写入本文档；构建产物继续由 `.gitignore` 忽略。
- 若后续项目改为使用根目录 `AGENT.md`，应保留本文档中的内容并更新这里的路径说明，避免出现两份互相矛盾的工作记忆。
