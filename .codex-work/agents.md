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
- 桌面端右侧工作区内部采用“列表在左、想法/编辑区在右”的双栏布局；Todo 列表和想法历史、备忘录列表分别有独立滚动边界。窗口宽度较窄时自动恢复为上下堆叠。
- Todo 支持点击选中并记录专属想法；想法保存在对应 Todo 的 `thoughts` 字段中，兼容没有该字段的旧数据。
- 备忘录支持标题、纯文本正文、多篇列表、自动保存和直接删除。
- 中间专注任务卡点击打开详情，右侧“开始”才启动计时；活动任务标题也可打开详情。
- 任务详情支持查看完成专注次数、累计时长、放弃次数，编辑名称/计时类型、选择浅色预设和应用内二次确认删除。
- 番茄钟任务保存 `focusMinutes` 和 `breakMinutes`；旧任务读取时默认补齐为 25/5。运行中的番茄钟固定按专注 -> 休息 -> 完成流转，休息结束才增加完成番茄数。
- 运行界面仅保留暂停/继续与放弃；暂停不写历史，放弃时专注累计不足 5 秒不写入历史并弹窗提示，休息阶段放弃记录为 `abandoned` 但不计完成。
- 专注任务可选浅绿、浅蓝、浅黄、浅粉、浅橙、浅棕、浅紫、薄荷色；旧任务无颜色时固定回退为浅绿。
- 新建专注任务表单可直接选择上述颜色，颜色会随任务保存；打开新建表单时默认选择浅绿，取消或创建后重置颜色和时长输入。
- 新专注记录包含 `taskId`；旧记录无 ID 时按任务名称匹配，改名时同步迁移匹配记录。
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
- `npm run git:session-check`：检查未提交改动、未设置 upstream，以及相对远程分支的待推送/落后提交；任一项需要处理时返回退出码 1

## Codex 会话结束检查

- `.codex/hooks.json` 注册 `SessionEnd` hook；真正结束 Codex 主会话时运行 `.codex/hooks/session_end_git_check.ps1`。
- hook 只报告状态，不自动 commit 或 push；`SessionEnd` 是提示性生命周期事件，不能阻止会话关闭。
- Codex CLI 中如提示新 hook 待信任，使用 `/hooks` 检查并信任仓库 hook；未信任时使用 `npm run git:session-check` 手动执行同一检查。

## 计时闭环状态

- 计时快照使用 `momofocus.timer`，按 `Date.now()` 真实时间恢复倒计时和正计时。
- 快速记录使用 `momofocus.quickNotes`；声音和系统通知设置使用 `momofocus.settings`。
- Electron 原生通知通过 `electron/preload.cjs` 暴露的受限 `momoFocusNative.notify` API 调用，主窗口保持隔离上下文。
- 计时开始时可通过 `momofocus.settings.floatingWindowOn` 自动打开 Electron 始终置顶浮窗；浮窗通过 `?floating=1` 路由读取 `momofocus.timer` 和任务数据，每 500ms 刷新，关闭浮窗不停止计时。
- 正计时启动后持续计时；番茄钟专注结束自动进入休息并开始计时，休息结束停止并完成本轮。快捷键为 `Space`（暂停/继续）、`S` 或 `Escape`（放弃）。
- 番茄钟专注结束自动播放提示音并开始任务自定义休息；休息结束再次播放提示音并停止。声音由 `momofocus.settings` 的 `soundOn` 控制。
- 计时快照额外保存 `sessionStartedAt`，用于暂停或重启后保持历史记录的原始日期归属。

## 最近验证

- 2026-09-27：增加首页专注历史逐条删除入口，删除后同步 `momofocus.sessions` 与统计数据；移除专注任务行右侧 ChevronDown 图标。`npm run format:check`、`npm run build`、`git diff --check` 通过，运行态页面加载成功并完成状态生命周期、兼容性、无障碍和响应式 code review。

- 2026-09-22：`npm run build` 通过。
- 2026-09-22：`git diff --check` 通过。
- 2026-09-22：Vite 开发页面启动成功，动态日期和首页交互入口可见。
- 2026-09-22：Todo 专属想法记录功能构建通过，`git diff --check` 通过；旧 Todo 数据兼容为空想法列表。
- 2026-09-22：图标路径、项目格式化和打包输出忽略规则已更新；`npm run format:check`、`npm run build`、`git diff --check` 通过。
- 2026-09-22：`npm run electron:build` 已完成前端构建、Electron 复制和解包阶段，但因下载 `winCodeSign` 时网络连接被重置而未完成安装器签名资源处理。
- 2026-09-23：首页标语可原位编辑并通过 `momofocus.slogan` 持久化，侧栏专注统计入口改为强调按钮；`npm run build`、`npm run format:check`、`git diff --check` 通过。
- 2026-09-23：任务卡详情与开始动作分离，增加任务统计、编辑、颜色预设、删除确认及会话任务 ID 兼容；`npm run build`、`npm run format:check`、`git diff --check` 通过，浏览器交互确认详情打开不会启动计时、明确开始可启动计时。
- 2026-09-24：固定番茄钟专注/休息状态机，增加任务独立时长、5 秒放弃阈值和暂停不落历史规则；`npm run format:check`、`npm run build`、`git diff --check` 通过，浏览器交互确认自定义任务创建、启动、暂停和放弃入口。
- 2026-09-24：统计页“时长分布”改为按任务汇总累计专注时长并显示任务占比，兼容带任务 ID 与旧记录按任务名聚合；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成代码复核。
- 2026-09-24：统计页重构为独立的专注时段分布、累计专注和今日专注区域；日 / 周 / 月 / 自定义只控制分布卡片，累计统计支持起始日期，时段柱状图改为圆滑胶囊柱并修复 22—02 跨午夜分组；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成代码复核。
- 2026-09-24：完成清新马卡龙视觉升级，统一主题变量和任务色板，优化首页、计时器、任务列表、Todo / 备忘录、统计页和任务详情弹窗；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成窄屏浏览器运行态检查与 code review。开发检查时发现 `5173` 已有 Vite 服务，因此复用现有 localhost 页面验证。
- 2026-09-25：修正任务入口配色，任务列表“开始”文字改为黑色，“新建专注任务”按钮移除绿色背景并改为透明底色；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成针对性 code review。
- 2026-09-25：将首页“慢一点，也很好。”的悬停色改为深薄荷绿，并让两行同步变色；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成针对性 code review。
- 2026-09-25：新建专注任务时增加颜色选择并保存所选预设；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成针对性 code review。
- 2026-09-26：将备忘录列表选中指示条从薄荷绿调整为天空蓝，同时保持任务列表选中态不变；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成针对性 code review。
- 2026-09-26：扩大备忘录编辑器和正文输入区，桌面端使用可伸展编辑布局，窄屏保留 420px 编辑器和 320px 正文最小高度；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成桌面/窄屏样式 code review。运行态窄屏检查确认正文区域约 338px 可见且页面可继续滚动。
- 2026-09-26：将 Todo 想法区和备忘录编辑区移到各自列表右侧，桌面端扩展右侧工作区宽度并设置列表独立滚动；中等及窄窗口自动堆叠。`npm run format:check`、`npm run build`、`git diff --check` 通过；运行态确认桌面双栏尺寸和 700px 窄窗口无横向溢出，并完成 code review。
- 2026-09-26：增加专注开始时自动显示的 Electron 始终置顶浮窗，浮窗可独立关闭；菜单增加“开始时显示浮窗”开关，设置兼容旧数据。`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过；运行态因机器已有 `5173` 服务改用 `5174` 启动，Electron 输出缓存权限警告但无脚本加载错误，窗口自动化枚举未捕获窗口。
- 2026-09-27：Todo 新增区域增加“保存”按钮，保留回车新增；空输入时按钮禁用。`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成浏览器运行态检查和 code review。
- 2026-09-27：将任务浮窗升级为圆形番茄与绿色环形进度条，悬停向右展开显示时间和暂停/继续、关闭任务操作；增加 Electron 原生右键关闭菜单，浮窗控制复用主窗口 IPC，专注结束进入休息时保持显示，整轮完成或放弃后关闭。`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过，并完成代码复核。

## 打包与资源约定

- Windows 安装包、快捷方式、卸载器和 Electron 主窗口统一使用 `assets/tomato.ico`。
- Electron 主进程通过 `app.getAppPath()` 定位打包后的 `assets/tomato.ico`，避免依赖开发目录层级。
- `release/` 是唯一标准打包输出目录；`release-*` 目录均视为历史临时产物，不纳入版本控制。
- 只有 `npm run electron:build` 成功后，`release/` 中的桌面程序才包含最新修改。

## iOS 原生版

- `ios/MomoFocus.xcodeproj`：SwiftUI iOS 工程，Bundle ID 为 `com.momofocus.ios`，最低 iOS 16.1。
- `ios/MomoFocus/`：主应用、模型、本地存储、计时状态机和 SwiftUI 页面。
- `ios/MomoFocusLiveActivity/`：ActivityKit Widget Extension，负责锁屏实时活动和灵动岛布局。
- `ios/MomoFocusTests/`、`ios/MomoFocusUITests/`：单元测试和启动 UI 测试。
- `codemagic.yaml`：macOS 云构建和 App Store 分发导出配置。
- `generated/ios/INSTALL.md`：签名、构建、安装和 TestFlight 说明。
- iOS 本地数据使用 `UserDefaults` + Codable，存储键使用 `momofocus.ios.*`，不迁移桌面端 localStorage，不做云同步。
- Windows 不能执行 `xcodebuild` 或 Apple 签名；必须在 macOS/Xcode 或 Codemagic 上完成 IPA 构建。
